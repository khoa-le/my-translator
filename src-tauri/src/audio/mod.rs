pub mod microphone;

#[cfg(target_os = "macos")]
pub mod system_audio;

#[cfg(target_os = "windows")]
pub mod wasapi;

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
mod system_audio_stub;

// Re-export SystemAudioCapture from the correct platform module
#[cfg(target_os = "macos")]
pub use system_audio::SystemAudioCapture;

#[cfg(target_os = "windows")]
pub use wasapi::SystemAudioCapture;

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
pub use system_audio_stub::SystemAudioCapture;

/// Target audio format for Soniox: PCM s16le, 16kHz, mono
pub const TARGET_SAMPLE_RATE: u32 = 16000;
pub const TARGET_CHANNELS: u16 = 1;
