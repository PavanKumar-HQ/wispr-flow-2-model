fn main() {
    #[cfg(target_os = "macos")]
    {
        // Ensure clang_rt.osx is linked for __isPlatformVersionAtLeast in macOS SDK
        if let Ok(output) = std::process::Command::new("clang")
            .args(["--print-search-dirs"])
            .output()
        {
            let text = String::from_utf8_lossy(&output.stdout);
            for line in text.lines() {
                if line.starts_with("libraries: =") {
                    let dir = line.trim_start_matches("libraries: =");
                    let darwin_dir = std::path::Path::new(dir).join("lib/darwin");
                    if darwin_dir.exists() {
                        println!("cargo:rustc-link-search=native={}", darwin_dir.display());
                        println!("cargo:rustc-link-lib=clang_rt.osx");
                    }
                }
            }
        }
    }
    tauri_build::build()
}
