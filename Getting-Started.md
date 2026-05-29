# Getting Started — Build macOS from Source

Step-by-step guide to build **My Translator** for macOS from source code.

---

## Prerequisites

| Tool | Minimum | Verified | Check Command |
|------|---------|----------|---------------|
| macOS | 13.0 (Ventura) | 26.3 (Sequoia) | `sw_vers` |
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
git clone https://github.com/phuc-nt/my-translator.git
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
- `.dmg` installer: `src-tauri/target/release/bundle/dmg/MyTranslator_0.6.0_aarch64.dmg`

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
  src/                  # Frontend (HTML/CSS/JS)
    index.html          # Main entry point
    js/                 # JavaScript modules
      app.js            # Core app logic
      soniox.js         # Soniox STT + translation client
      edge-tts.js       # Edge TTS provider
      google-tts.js     # Google Cloud TTS provider
      elevenlabs-tts.js # ElevenLabs TTS provider
      audio-player.js   # TTS audio playback
      settings.js       # Settings persistence
      ui.js             # UI rendering and controls
      updater.js        # Auto-update logic
      llm-polish.js     # LLM-based translation refinement
    styles/
      main.css          # App stylesheet
  src-tauri/            # Rust backend
    Cargo.toml          # Rust dependencies
    tauri.conf.json     # Tauri configuration
    build.rs            # Build script (rpath setup)
    src/
      main.rs           # Tauri command handlers
      lib.rs            # Library entry point
    icons/              # App icons (all sizes)
    Entitlements.plist  # macOS entitlements
  scripts/              # Helper scripts
    local_pipeline.py   # Local MLX translation pipeline
    setup_mlx.py        # MLX model downloader
  docs/                 # User documentation
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
- Release builds run LTO and optimizations — first build may take 10–20 minutes
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
