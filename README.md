<p align="center">
  <img src="banner.png?v=2" alt="My Translator — Real-time Speech Translation">
</p>

<p align="center">
  <img src="https://img.shields.io/github/v/release/khoa-le/my-translator?color=green&label=release" alt="Latest Release">
  <img src="https://img.shields.io/badge/built_with-Tauri-orange?logo=tauri" alt="Built with Tauri">
  <img src="https://img.shields.io/badge/macOS-Apple%20Silicon%20%7C%20Intel-black?logo=apple" alt="macOS">
  <img src="https://img.shields.io/badge/Windows-10%2F11-blue?logo=windows" alt="Windows">
  <img src="https://img.shields.io/badge/iOS-16%2B-lightgrey?logo=apple" alt="iOS">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
</p>

**My Translator** is a real-time speech translation app for macOS, Windows and iPhone, built with Tauri. It captures audio directly from your system or microphone, transcribes it, and displays translations in a minimal overlay — with no intermediary server involved.

> 📖 Installation guides: [macOS (EN)](docs/installation_guide.md) · [macOS (VI)](docs/installation_guide_vi.md) · [Windows (EN)](docs/installation_guide_win.md) · [Windows (VI)](docs/installation_guide_win_vi.md)

---

## How It Works

```
System Audio / Mic → 16kHz PCM → Soniox API (STT + Translation) → Overlay UI
                                                                    ↓ (optional)
                                          LLM Revise (Gemini/Claude/Ollama) · TTS (Edge/Google/ElevenLabs) → 🔊

On Stop (Meeting mode) → transcript → minutes (Gemini or Claude Code) → Gmail → your inbox
```

| Feature | Detail |
|---------|--------|
| **Latency** | ~2–3s |
| **Languages** | 70+ (source) → any target, one-way & two-way |
| **Cost** | ~$0.12/hr (Soniox API) |
| **TTS** | 3 providers (Edge free, Google, ElevenLabs) |
| **Platform** | macOS (ARM + Intel) · Windows · iOS (iPhone, mic only) |
| **Signed** | macOS signed & notarized by CI when the Apple signing secrets are configured; local builds are ad-hoc signed |
| **Auto-Update** | Desktop, from this repo's GitHub Releases (needs the updater signing key in CI) |

---

## Features

### 📖 Dual Panel View

Two display modes:
- **Single** (default) — Translation text only, clean and focused
- **Dual** — Source | Translation side-by-side, each panel scrolls independently

Toggle with the panel button (bottom-right on hover).

### 🔄 Smart Scroll

Auto-scroll only when you're at the bottom. Scroll up to read old content without being yanked back down.

### 🔤 Quick Font Size

A- / A+ floating controls (bottom-right on hover). Font size adjustable up to 140px — great for presentations.

### 🔄 Two-Way Translation

Translate conversations between two languages simultaneously — ideal for bilingual meetings.

- **One-way**: Source language → Target language (e.g., Japanese → Vietnamese)
- **Two-way**: Language A ↔ Language B (e.g., Vietnamese ↔ Japanese) — the app detects who is speaking and translates to the other language automatically

**Setup for video calls** (Zoom, Google Meet, MS Teams):
1. Audio Source: **Both** (System + Mic)
2. Translation Type: **Two-way**
3. Set Language A and Language B

> **Note**: TTS narration is automatically disabled in two-way mode to prevent audio feedback loops (TTS output → mic recapture → re-translation).

### 🎙️ TTS Narration

Read translations aloud in one-way mode — 3 providers:

| | Edge TTS ⭐ | Google Chirp 3 HD | ElevenLabs |
|-|-------------|-------------------|------------|
| **Cost** | Free | Free 1M chars/mo | ~$5/mo+ |
| **Quality** | ★★★★☆ Neural | ★★★★★ Near-human | ★★★★★ Premium |
| **Vietnamese** | ✅ 2 voices | ✅ 6 voices | ✅ Yes |
| **Setup** | None | Google Cloud API key | API key |
| **Speed control** | ✅ | ✅ 0.5x–2.0x | ❌ |

TTS is **OFF by default** — toggle with the TTS button or `⌘ T`.

> 📖 TTS guide: [English](docs/tts_guide.md) · [Tiếng Việt](docs/tts_guide_vi.md)

### 📖 Custom Translation Terms

Define how domain-specific words should be translated:

```
Original sin = Tội nguyên tổ
Christ = Kitô
Pneumonia = Viêm phổi
```

Add terms in Settings → Translation → Translation terms. Great for religious, medical, or technical content.

### ✍️ LLM Revise

Optionally send each Soniox translation to a light LLM (Gemini Flash, Claude Haiku, or local Ollama) that rewrites it in your tone / persona. Display modes: replace, wait, or show both. Settings → Translation → Enable LLM Revise.

### 📝 Meeting Mode — minutes by email

Turn on **Meeting mode** (Settings → Translation) and pressing **Stop** turns the session transcript into structured meeting minutes and emails them to you:

- **Gemini** — reuses the LLM Revise Gemini key/model; minutes in the target language (~10 s)
- **Claude Code** (desktop) — runs your local `claude` CLI with your `meeting-minutes` skill; both language versions (~40 s). Prompt is editable in Settings
- Sent via Gmail SMTP with a Gmail **app password**

> 📖 Setup details: [FAQs — What's "Meeting mode"?](FAQs.md#whats-meeting-mode)

### 🕓 Session History

Every session is auto-saved as a `.md` transcript when you stop or clear. Browse, read and copy past sessions from the 🕓 Sessions screen.

### 📱 iOS (iPhone)

Same translation flow on iPhone with a light mobile theme. Microphone only — system audio capture isn't available on iOS. See [FAQs — iOS](FAQs.md#ios--installation--usage) for building and installing.

### 🖥️ Local Mode (Apple Silicon only)

Experimental offline mode using MLX + Whisper + Gemma — runs 100% on-device. JA/EN/ZH/KO → VI/EN.

---

## Privacy

**Your audio never touches our servers — because there are none.**

- App connects **directly** to APIs you configure — no relay, no middleman
- **You own your API keys** — stored locally in `settings.json` (plain text), sent only to the provider they belong to
- **No account, no telemetry, no analytics** — zero tracking
- Transcripts saved as `.md` files locally, per session
- **Opt-in features send text to third parties**: LLM Revise sends each translated line to your chosen LLM provider; Meeting mode sends the full transcript to Gemini or to Claude Code (Anthropic), and emails the minutes through Gmail

---

## Tech Stack

- **[Tauri 2](https://tauri.app/)** — Rust backend + WebView frontend
- **[ScreenCaptureKit](https://developer.apple.com/documentation/screencapturekit)** — macOS system audio
- **[WASAPI](https://learn.microsoft.com/en-us/windows/win32/coreaudio/wasapi)** — Windows system audio
- **[cpal](https://github.com/RustAudio/cpal)** — Cross-platform microphone
- **[Soniox](https://soniox.com)** — Real-time STT + translation
- **[Edge TTS](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/index-text-to-speech)** — Free neural TTS (default)
- **[Google Cloud TTS](https://cloud.google.com/text-to-speech)** — Chirp 3 HD (near-human quality)
- **[ElevenLabs](https://elevenlabs.io)** — Premium TTS
- **[Gemini](https://ai.google.dev/) / [Claude](https://www.anthropic.com/) / [Ollama](https://ollama.com/)** — LLM Revise & meeting minutes
- **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** — optional local meeting-minutes generator
- **[lettre](https://github.com/lettre/lettre)** — Gmail SMTP for minutes email

---

## Build from Source

```bash
git clone https://github.com/khoa-le/my-translator.git
cd my-translator
npm install
npx tauri build --bundles app,dmg -c '{"bundle":{"createUpdaterArtifacts":false}}'
```

Requires: Rust (stable), Node.js 18+, macOS 13+ or Windows 10+. The override skips updater artifacts, which need a signing key only CI has. Full walkthrough: [Getting-Started.md](Getting-Started.md). iOS builds: [FAQs](FAQs.md#ios--installation--usage).

---

## Credits

Forked from [phuc-nt/my-translator](https://github.com/phuc-nt/my-translator). This fork adds iOS support and Meeting mode.

---

## License

MIT
