fn main() {
    #[cfg(target_os = "macos")]
    println!("cargo:rustc-link-arg=-Wl,-rpath,/usr/lib/swift");

    // Android: cpal's oboe backend is C++ — link the NDK's libc++ statically,
    // otherwise the .so fails to load with "cannot locate symbol __cxa_pure_virtual"
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("android") {
        println!("cargo:rustc-link-lib=c++_static");
        println!("cargo:rustc-link-lib=c++abi");
    }

    tauri_build::build()
}
