# Getting Started — Build macOS from Source

Step-by-step guide to build **My Translator** for macOS from source code.

---

## Prerequisites

| Tool | Minimum | Verified | Check Command |
|------|---------|----------|---------------|
| macOS | 13.0 (Ventura) | 26.6 (Tahoe) | `sw_vers` |
| Rust | stable | 1.95.0 | `rustc --version` |
| Node.js | 18+ | 24.14.1 | `node --version` |
| npm | (bundled) | 11.8.0 | `npm --version` |
| Xcode CLT | 14+ | — | `xcode-select --install` |

---

## Step 1 — Install Xcode Command Line Tools

The build requires Swift libraries (libswift_Concurrency.dylib) for `screencapturekit`.

```bash
xcode-select --install
```

If already installed, verify:

```bash
xcode-select -p
# Expected: /Library/Developer/CommandLineTools
# or:       /Applications/Xcode.app/Contents/Developer
```

---

## Step 2 — Install Rust

Via rustup (recommended):

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Restart your terminal, then verify:

```bash
rustc --version
cargo --version
```

> If you already have Rust, ensure it's up to date: `rustup update stable`

The Apple Silicon build uses the default `aarch64-apple-darwin` target (included with rustup). For Intel cross-compilation, see the [Intel Cross-Compilation](#intel-cross-compilation-optional) section below.

---

## Step 3 — Install Node.js

Recommended: use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm).

```bash
# Using fnm (fast)
brew install fnm
fnm install 20
fnm use 20

# Or using nvm
nvm install 20
nvm use 20
```

Verify:

```bash
node --version  # should be 18+
npm --version
```

---

## Step 4 — Clone the Repository

```bash
git clone https://github.com/khoa-le/my-translator.git
cd my-translator
```

---

## Step 5 — Install npm Dependencies

```bash
npm install
```

This installs:
- `@tauri-apps/cli` v2 — the Tauri build toolchain
- `@tauri-apps/plugin-process` — process management
- `@tauri-apps/plugin-updater` — auto-update support

---

## Step 6 — Build the App

### Debug build (faster compile, larger binary, dev-friendly)

```bash
npm run tauri build -- --debug
```

Output at: `src-tauri/target/debug/bundle/macos/MyTranslator.app`

### Release build (optimized, smaller binary)

```bash
npm run tauri build
```

Outputs:
- `.app` bundle: `src-tauri/target/release/bundle/macos/MyTranslator.app`
- `.dmg` installer: `src-tauri/target/release/bundle/dmg/MyTranslator_<version>_aarch64.dmg`

> **No updater signing key?** `tauri.conf.json` sets `createUpdaterArtifacts: true`, which needs `TAURI_SIGNING_PRIVATE_KEY` (only CI has it). Without it the `.app` is still built, but the command ends with `Error A public key has been found, but no private key`. For a clean local build, skip the updater artifacts:
>
> ```bash
> npx tauri build --bundles app,dmg -c '{"bundle":{"createUpdaterArtifacts":false}}'
> ```

### Dev mode (hot-reload, no bundling)

```bash
npm run tauri dev
```

This starts a dev server with hot-reload. Useful during development.

---

## Step 7 — First Launch

### Via Finder

Open the `.app` bundle directly:

```bash
open src-tauri/target/release/bundle/macos/MyTranslator.app
```

Or mount the `.dmg`, drag to Applications, and launch from there.

### Grant Screen Recording Permission

On first launch, macOS will prompt for **Screen & System Audio Recording** permission:

1. Click **Open System Settings** when prompted
2. Find **My Translator** in the list
3. Toggle the switch ON
4. macOS asks to **Quit & Reopen** — click that button

> This permission is required. Without it, system audio capture won't work.

### Code Signing Note

The CI pipeline signs and notarizes releases with an Apple Developer certificate. Local builds are **unsigned**. macOS will show a security warning on first launch:

1. Open **System Settings → Privacy & Security**
2. Scroll to the bottom — you'll see "My Translator was blocked"
3. Click **Open Anyway**

Or from Terminal:

```bash
xattr -cr src-tauri/target/release/bundle/macos/MyTranslator.app
```

---

## Intel Cross-Compilation (Optional)

To build for Intel Macs from Apple Silicon:

### Add the Intel target

```bash
rustup target add x86_64-apple-darwin
```

### Build

```bash
npm run tauri build -- --target x86_64-apple-darwin
```

Output at: `src-tauri/target/x86_64-apple-darwin/release/bundle/macos/`

---

## Project Structure

```
my-translator/
  src/                    # Frontend (HTML/CSS/JS, no build step)
    index.html            # Single page; views toggled by .view.active
    js/
      app.js              # Main controller (TranslationApp)
      ui.js               # Transcript rendering
      soniox.js           # Soniox STT + translation client
      audio-player.js     # TTS audio playback
      edge-tts.js         # Edge TTS (via Rust proxy)
      google-tts.js       # Google Chirp 3 HD TTS
      elevenlabs-tts.js   # ElevenLabs TTS
      llm-polish.js       # LLM Revise (Gemini / Claude / Ollama)
      meeting-minutes.js  # Meeting mode — Gemini minutes generator
      settings.js         # Settings persistence
      updater.js          # Desktop auto-update UI
    styles/
      main.css            # All styles (iOS overrides under .ios-app)
  src-tauri/              # Rust backend
    Cargo.toml            # Rust dependencies
    tauri.conf.json       # Tauri configuration (bundle, updater endpoint)
    build.rs              # Build script (rpath setup, macOS only)
    Entitlements.plist    # macOS entitlements
    capabilities/         # default.json (desktop) · ios.json (iOS)
    gen/apple/project.yml # iOS xcodegen source (only tracked file under gen/)
    src/
      main.rs             # Binary entry — calls my_translator_lib::run()
      lib.rs              # Tauri builder + command registration
      settings.rs         # Settings struct + JSON persistence
      audio/              # microphone.rs · system_audio.rs (macOS) · wasapi.rs (Windows) · system_audio_stub.rs (iOS/Linux)
      commands/           # audio · transcript · settings · edge_tts · local_pipeline · meeting
    icons/                # App icons (all sizes)
  scripts/
    local_pipeline.py     # Local MLX translation pipeline
    setup_mlx.py          # MLX venv + model bootstrap
  docs/                   # User documentation + changelog
```

---

## Troubleshooting

### `error: linking with cc failed` / missing symbols

The `screencapturekit` crate needs Swift Concurrency. Ensure Xcode Command Line Tools are installed and the path is set:

```bash
xcode-select -p
```

If it points to Xcode.app but you don't have Xcode:

```bash
sudo xcode-select --switch /Library/Developer/CommandLineTools
```

### `dyld: Library not loaded: @rpath/libswift_Concurrency.dylib`

The `build.rs` adds `/usr/lib/swift` to the rpath. This library lives in the dyld shared cache on macOS 15+. If you're on an older macOS, ensure `/usr/lib/swift/libswift_Concurrency.dylib` exists.

### Cargo build hangs on screencapturekit

The `screencapturekit` crate (v1.5) compiles Swift code. The first build can take 5–10 minutes.

### `No API key` at runtime

Build succeeded, but the app needs a Soniox API key to function. See the [Installation Guide](docs/installation_guide.md) Step 5 for setup instructions.

### Build takes too long

- Debug builds compile faster: `npm run tauri build -- --debug`
- Release builds are optimized (default Cargo release profile, no LTO) — the first build compiles all dependencies and takes a few minutes; later builds take well under a minute
- Subsequent builds are faster due to incremental compilation

---

## Build Verification Checklist

- [ ] `rustc --version` reports stable
- [ ] `node --version` ≥ 18
- [ ] `xcode-select -p` returns a valid path
- [ ] `npm install` completes without errors
- [ ] `npm run tauri build` produces `MyTranslator.app`
- [ ] App launches and shows the overlay window
- [ ] Screen Recording permission granted in System Settings
