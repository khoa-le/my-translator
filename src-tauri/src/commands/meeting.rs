use std::fs;
use std::path::PathBuf;

use chrono::Local;
use lettre::message::header::ContentType;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor};
use serde::Serialize;
use tauri::{AppHandle, Manager, State};

use crate::settings::SettingsState;

/// One generated minutes file (e.g. `meeting_minutes_2026-09-29.md`)
#[derive(Serialize)]
pub struct MinutesFile {
    pub name: String,
    pub content: String,
}

/// Default prompt for the `claude` CLI; editable in Settings → Meeting mode.
pub const DEFAULT_CLAUDE_PROMPT: &str = "Use the meeting-minutes skill on ./transcript.md. \
Write the output files into the current directory. \
Do not ask questions; if the primary language is ambiguous, use the translated (non-source) language.";

/// GUI apps don't inherit the shell PATH, so look in the usual install spots first.
fn claude_binary() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_default();
    [
        home.join(".local/bin/claude"),
        PathBuf::from("/opt/homebrew/bin/claude"),
        PathBuf::from("/usr/local/bin/claude"),
    ]
    .into_iter()
    .find(|p| p.exists())
    .unwrap_or_else(|| PathBuf::from("claude"))
}

/// Run the local Claude Code CLI (default prompt: the user's `meeting-minutes` skill).
/// Works in `app_data_dir()/minutes/<timestamp>/`; returns the generated files,
/// primary (unsuffixed) language first.
#[tauri::command]
#[allow(unreachable_code, unused_variables)]
pub async fn generate_minutes_claude_code(
    app: AppHandle,
    state: State<'_, SettingsState>,
    transcript: String,
) -> Result<Vec<MinutesFile>, String> {
    #[cfg(target_os = "ios")]
    return Err("Claude Code minutes are only available on desktop".into());

    let prompt = {
        let settings = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
        match settings.claude_code_prompt.trim() {
            "" => DEFAULT_CLAUDE_PROMPT.to_string(),
            p => p.to_string(),
        }
    };

    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?
        .join("minutes")
        .join(Local::now().format("%Y-%m-%d_%H-%M-%S").to_string());
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create minutes dir: {}", e))?;
    fs::write(dir.join("transcript.md"), transcript)
        .map_err(|e| format!("Failed to write transcript: {}", e))?;

    let run_dir = dir.clone();
    let output = tauri::async_runtime::spawn_blocking(move || {
        std::process::Command::new(claude_binary())
            .args([
                "-p",
                &prompt,
                "--permission-mode",
                "acceptEdits",
                "--allowedTools",
                "Read Write Glob Skill",
            ])
            .current_dir(&run_dir)
            // Set when the app is launched from a Claude Code terminal; blocks nested runs
            .env_remove("CLAUDECODE")
            .output()
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| format!("Failed to run claude CLI: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "claude exited with {}: {}",
            output.status,
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    let mut files: Vec<MinutesFile> = fs::read_dir(&dir)
        .map_err(|e| format!("Failed to read minutes dir: {}", e))?
        .flatten()
        .filter_map(|entry| {
            let name = entry.file_name().to_string_lossy().to_string();
            // Any Markdown the prompt produced, so custom prompts can pick their own filenames
            if !name.ends_with(".md") || name == "transcript.md" {
                return None;
            }
            let content = fs::read_to_string(entry.path()).ok()?;
            Some(MinutesFile { name, content })
        })
        .collect();

    if files.is_empty() {
        return Err("Claude Code finished but wrote no .md file next to transcript.md".into());
    }
    // `meeting_minutes_DATE.md` (primary) sorts before `meeting_minutes_DATE_JA.md`
    files.sort_by_key(|f| f.name.len());
    Ok(files)
}

/// Email the minutes through Gmail SMTP using the credentials in settings.
/// Returns the recipient address.
#[tauri::command]
pub async fn send_minutes_email(
    state: State<'_, SettingsState>,
    subject: String,
    body: String,
) -> Result<String, String> {
    let settings = state
        .0
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?
        .clone();

    let username = settings.smtp_username.trim().to_string();
    // Google shows app passwords as "abcd efgh ijkl mnop"
    let password: String = settings.smtp_password.split_whitespace().collect();
    if username.is_empty() || password.is_empty() {
        return Err("Set your Gmail address and app password in Settings → Meeting".into());
    }
    let to = match settings.minutes_email_to.trim() {
        "" => username.clone(),
        addr => addr.to_string(),
    };

    let email = Message::builder()
        .from(username.parse().map_err(|e| format!("Invalid sender address: {}", e))?)
        .to(to.parse().map_err(|e| format!("Invalid recipient address: {}", e))?)
        .subject(subject)
        .header(ContentType::TEXT_PLAIN)
        .body(body)
        .map_err(|e| format!("Failed to build email: {}", e))?;

    let mailer = AsyncSmtpTransport::<Tokio1Executor>::relay("smtp.gmail.com")
        .map_err(|e| format!("SMTP setup failed: {}", e))?
        .credentials(Credentials::new(username, password))
        .build();

    mailer
        .send(email)
        .await
        .map_err(|e| format!("Failed to send email: {}", e))?;

    Ok(to)
}
