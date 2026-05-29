# FAQs

Common questions for using and operating My Translator. Grouped by audience.

---

## Using the app

### What does this app do?
Real-time speech-to-text + translation, with optional TTS narration of the translated text. Works on macOS, Windows, and iOS (iPhone). Two engines: Soniox (cloud) and Local MLX (offline, macOS Apple Silicon only).

### How do I get started?
1. Open Settings (⚙ icon).
2. Pick an engine — **Soniox** (recommended, just paste an API key) or **Local MLX** (free but heavy setup).
3. Set source + target languages.
4. Press **▶ Start** and speak.

### Where do I get a Soniox API key?
Sign up at [console.soniox.com](https://console.soniox.com) → Account → API Keys. Free tier covers a few hours/month; paid is ~$0.12/hour. Paste the key into Settings → Translation → Soniox API Key.

### Soniox vs Local MLX — which should I use?
| | Soniox (cloud) | Local MLX (offline) |
|---|---|---|
| Latency | ~300 ms | ~3–4 s |
| Cost | ~$0.12/hr | Free |
| Languages | 70+ | Limited (whisper subset) |
| Privacy | Audio sent to Soniox | Stays on your Mac |
| Setup | Paste API key | Download ~5 GB models |
| Platforms | All | macOS Apple Silicon only |

### How do I set up Local MLX?
Settings → Translation → Engine: "Local MLX (Offline)" → press Save. The setup modal will install a Python venv and download models (~5 GB, ~10 min on first run). One-time. Not available on iOS or Intel Macs.

### What's "Two-way translation"?
Speech in **Language A** → translates to **B**; speech in **B** → translates to **A**. Anything else is transcribed but not translated. Good for two-person bilingual conversations. Configure in Settings → Translation Type.

### What's "LLM Revise"?
Optional post-processor that takes the Soniox translation and rewrites it in your chosen tone (formal, casual, business, custom persona). Adds 0.5–2 s latency depending on display mode. Provider can be Gemini, Claude, or Ollama (local). Settings → "Enable LLM Revise".

### Which TTS should I pick?
- **Edge TTS** — Free, decent quality, ~7 voices included. Good default.
- **Google Chirp 3 HD** — Premium quality, requires Google Cloud API key + billing.
- **ElevenLabs** — Best for English/expressive voices, paid only.

### Can I capture system audio (Zoom/YouTube/etc.)?
- **macOS**: Yes — Settings → Audio Source: System (uses ScreenCaptureKit, grants permission first time).
- **Windows**: Yes — uses WASAPI loopback.
- **iOS**: No. Apple's sandboxing requires a ReplayKit Broadcast Extension, not implemented. Mic only.

### Where are transcripts saved?
- macOS: `~/Library/Application Support/My Translator/transcripts/`
- Windows: `%APPDATA%\My Translator\transcripts\`
- iOS: Sandboxed app container — view via the Sessions screen (🕓 icon).

### How do I change the font size / colors during a live session?
Floating controls bottom of the overlay: **A−** / **A+** for size. Color picker (white/yellow/cyan) is desktop only — iOS forces dark text for readability on its light theme.

### How do I save the current transcript?
Press **Clear** (🗑) or stop the session — the transcript is auto-saved as a timestamped `.md` file. View it later in Sessions (🕓).

---

## iOS — installation & usage

### How do I install MyTranslator on my iPhone?
Two paths:

**A. Standalone (recommended for daily use)**
```bash
npx tauri ios build --ci
xcrun devicectl device install app --device <your-udid> src-tauri/gen/apple/build/arm64/MyTranslator.ipa
```
The IPA is fully self-contained — no Mac dependency after install.

**B. Dev mode (for development iteration)**
```bash
npx tauri ios dev "<Device Name>" --host $(ipconfig getifaddr en0)
```
Rebuilds on file change. Phone must be on same Wi-Fi as Mac. App loads its frontend from the Mac and asks for "Local Network" permission.

### iPhone says "Untrusted Developer" — now what?
Settings → General → **VPN & Device Management** → tap the developer cert (`orovn.purchase@oro.com`) → **Trust**. One-time per device per cert.

### iPhone is asking for "Local Network" permission — why?
You're running the **dev** build (`tauri ios dev --host`), which loads its frontend from your Mac over the LAN. Either:
- Grant permission (Settings → Privacy & Security → Local Network → MyTranslator), then force-quit and reopen, OR
- Switch to the **release IPA** (`tauri ios build`), which bundles the frontend and never needs LAN.

### How do I find my iPhone's UDID?
```bash
xcrun xctrace list devices
```
Look under the "== Devices ==" section. For Khoa's iPhone the UDID is `00008120-0008358E0C28C01E`.

### My iPhone shows up by name but Tauri says it can't find it.
The name argument needs the **exact** apostrophe character. `Khoa's Phone` uses U+2019 (`'`), not the ASCII `'`. Copy the name directly from `xcrun xctrace list devices` output.

### The installed app expired or won't open.
With a free Apple ID, dev-signed apps expire in **7 days**. Reinstall:
```bash
npx tauri ios build --ci
xcrun devicectl device install app --device <udid> src-tauri/gen/apple/build/arm64/MyTranslator.ipa
```
With a paid Apple Developer Program account ($99/yr), certs last 1 year and you unlock TestFlight.

### How do I uninstall from my iPhone?
Long-press the app icon → Remove App → Delete App. Same as any iOS app.

### Can I install on someone else's iPhone?
- Sideload: register their UDID in your Apple Developer account, rebuild, share the IPA, they install via Apple Configurator / Xcode.
- TestFlight (paid Developer Program only): upload, invite their Apple ID — clean install via TestFlight app.
- Free Apple ID: install only on devices you've signed into Xcode with that Apple ID.

---

## Building & developing

### How do I build for macOS / Windows?
```bash
npm install
npm run tauri dev       # dev mode with hot reload of Rust
npm run tauri build     # release installer in src-tauri/target/release/bundle/
```

### How do I run on iOS Simulator?
```bash
xcrun simctl list devices booted    # see what's running
npx tauri ios dev "iPhone 16e"
```
Pick any iPhone simulator name. First run takes 5–10 min (full Rust cross-compile + cocoapods).

### How do I update the app version?
1. Bump `version` in `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json` (keep them in sync).
2. Bump `version` in `package.json`.
3. iOS: also bump `CFBundleShortVersionString` and `CFBundleVersion` in `src-tauri/gen/apple/project.yml`, then run `xcodegen generate` in `src-tauri/gen/apple/`.
4. Add an entry to `CHANGELOG.md`.
5. Commit, tag (`git tag v0.X.Y`), push tag — CI publishes the desktop release.

### Where do the build outputs go?
- Desktop: `src-tauri/target/release/bundle/` (DMG, MSI, AppImage, etc.)
- iOS IPA: `src-tauri/gen/apple/build/arm64/MyTranslator.ipa`
- iOS DerivedData (intermediate): `~/Library/Developer/Xcode/DerivedData/my-translator-*/`

### How do I add a new Tauri command (Rust → JS)?
1. Write `pub fn my_command(...)` with `#[tauri::command]` in `src-tauri/src/commands/<area>.rs`.
2. Register it in `src-tauri/src/lib.rs::invoke_handler![ ..., commands::area::my_command ]`.
3. Add permission entry in `src-tauri/capabilities/default.json` (and `ios.json` if iOS-accessible). Or rely on `core:default` for auto-allow.
4. Call from JS: `await window.__TAURI__.core.invoke('my_command', { arg1: ... })`.

### How do I add an iOS-only or desktop-only command?
Wrap the function in `#[cfg(target_os = "ios")]` or `#[cfg(desktop)]`. If a command exists on all platforms but should error on iOS, use the early-return pattern:
```rust
#[tauri::command]
#[allow(unreachable_code, unused_variables)]
pub fn my_command(...) -> Result<..., String> {
    #[cfg(target_os = "ios")]
    return Err("Not supported on iOS".into());
    // ... desktop body
}
```

### Cargo build fails with AudioToolbox / coreaudio undefined symbols.
That's the iOS link step. Fix: edit `src-tauri/gen/apple/project.yml` → make sure `dependencies:` includes `AudioToolbox.framework`, `AVFoundation.framework`, `CoreAudio.framework`. Then `cd src-tauri/gen/apple && xcodegen generate`. Re-run `tauri ios dev/build`.

### "Could not find an iOS Simulator matching {t}" — what now?
Tauri's CLI couldn't parse the device argument. Either:
- You're targeting a real device and forgot `--host`. Add `--host $(ipconfig getifaddr en0)`.
- The device name has the wrong apostrophe character. Copy it from `xcrun xctrace list devices`.

### A stale `tauri ios dev` is blocking my new build.
```bash
pkill -9 -f tauri
pkill -9 -f xcodebuild
```
Then re-run. File lock contention is the usual symptom.

### Tauri prompts to reinit Xcode project — should I?
Generally no. `tauri ios init` regenerates `src-tauri/gen/apple/` and would wipe our `project.yml` edits (AudioToolbox etc.). Only re-init after backing up `project.yml` or be ready to redo the framework additions + `xcodegen generate`.

---

## Troubleshooting

### Microphone not capturing.
- **macOS**: System Settings → Privacy & Security → Microphone → enable My Translator.
- **Windows**: Settings → Privacy → Microphone → enable.
- **iOS**: Settings → Privacy & Security → Microphone → enable.
Restart the app after granting.

### Translations not appearing despite mic working.
1. Check status indicator — green dot = connected to Soniox / pipeline running.
2. Open Settings → verify Soniox API key (no extra whitespace).
3. Check network — Soniox needs WSS to `stt-rt.soniox.com`.
4. View logs: macOS Console.app, search "MyTranslator"; iOS via `Console.app` connected to device.

### TTS audio cuts off or doesn't play.
- Edge TTS: silent fail if Microsoft's edge endpoint times out. Try a different voice.
- Google TTS: check API key is valid and Text-to-Speech API is enabled in the Google Cloud project.
- ElevenLabs: check key + remaining credits.
- iOS: Make sure ringer is on / not in silent mode (system audio routing).

### App crashes on launch after a fresh install.
Reset settings: delete the settings.json in `app_data_dir()` (see "Where are transcripts saved?" for the path). Reopen — defaults will load.

### Very high latency.
- Soniox: try Settings → Endpoint Delay slider lower (default 3 s).
- Local MLX: expected ~3–4 s — that's whisper's small model. Use a faster ASR engine in `scripts/local_pipeline.py` if needed.
- LLM Revise: adds 0.5–2 s. Switch to "Replace" display mode for faster perceived feedback.

### Updater says "no update available" but there is one.
Updater hits `https://github.com/phuc-nt/my-translator/releases/latest/download/latest.json`. Make sure the latest GH release has `latest.json` attached (CI does this).

### Local MLX setup fails.
- Need Apple Silicon (arm64) Mac. Intel is not supported.
- Need Python 3.11+ via Homebrew (`/opt/homebrew/bin/python3`).
- Disk: ~5 GB free for models.
- Check `/tmp/personal_translator_pipeline.log` for setup errors.

---

## Project facts

- **Versions**: Tauri 2 (CLI 2.10.x), Rust 2021 edition, Node 18+ recommended.
- **Bundle ID**: `com.personal.translator`.
- **Apple Team ID**: `8TVC9U8H52` (configured in `tauri.conf.json`).
- **Min iOS**: 16.0. **Min macOS**: 13.0.
- **License**: see `LICENSE`.
