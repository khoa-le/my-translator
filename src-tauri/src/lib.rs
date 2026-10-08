mod audio;
mod commands;
mod settings;

use audio::microphone::MicCapture;
use audio::SystemAudioCapture;
use commands::audio::AudioState;
use commands::local_pipeline::LocalPipelineState;
use settings::{Settings, SettingsState};
use std::sync::Mutex;
#[cfg(mobile)]
use tauri::{Emitter, Listener};

#[tauri::command]
fn get_platform_info() -> String {
    format!(
        r#"{{"os":"{}","arch":"{}","version":"{}","mobile":{}}}"#,
        std::env::consts::OS,
        std::env::consts::ARCH,
        env!("CARGO_PKG_VERSION"),
        cfg!(mobile)
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load settings from disk (or defaults)
    let initial_settings = Settings::load();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
                app.handle().plugin(tauri_plugin_process::init())?;
            }
            #[cfg(mobile)]
            {
                let handle = app.handle().clone();
                app.listen("tauri://resume", move |_| {
                    let _ = handle.emit("app-resume", ());
                });
            }
            Ok(())
        })
        .manage(SettingsState(Mutex::new(initial_settings)))
        .manage(AudioState {
            system_audio: Mutex::new(SystemAudioCapture::new()),
            microphone: Mutex::new(MicCapture::new()),
            active_receiver: Mutex::new(None),
        })
        .manage(LocalPipelineState {
            process: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            commands::settings::get_settings,
            commands::settings::save_settings,
            commands::audio::start_capture,
            commands::audio::stop_capture,
            commands::audio::check_permissions,
            commands::transcript::save_transcript,
            commands::transcript::open_transcript_dir,
            commands::transcript::list_transcripts,
            commands::transcript::read_transcript,
            commands::local_pipeline::start_local_pipeline,
            commands::local_pipeline::send_audio_to_pipeline,
            commands::local_pipeline::stop_local_pipeline,
            commands::local_pipeline::check_mlx_setup,
            commands::local_pipeline::run_mlx_setup,
            commands::edge_tts::edge_tts_speak,
            commands::meeting::generate_minutes_claude_code,
            commands::meeting::send_minutes_email,
            get_platform_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
