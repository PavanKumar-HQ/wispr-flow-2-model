#[cfg(test)]
mod tests {
    use crate::safety_service::TargetSnapshot;

    #[test]
    fn test_e2e_mock_target_destination_validation() {
        // Fast mock validation without launching external applications
        let target = TargetSnapshot {
            timestamp_ms: 1000,
            platform_app_id: Some("TextEdit".to_string()),
            app_pid: Some(51702),
            window_title: Some("Untitled.txt".to_string()),
            is_secure_input: false,
        };

        // When TextEdit matches
        assert!(target.is_destination_match(Some("TextEdit"), Some(51702), Some("Untitled.txt")));
        // When user switches apps during dictation
        assert!(!target.is_destination_match(Some("Slack"), Some(99999), Some("General")));
    }

    /// Real external macOS TextEdit integration test.
    /// Guarded behind `#[ignore]` so it NEVER runs during ordinary `cargo test`.
    /// Run explicitly with: `cargo test -- --ignored test_real_macos_textedit_insertion`
    #[test]
    #[ignore]
    fn test_real_macos_textedit_insertion() {
        use std::process::Command;
        use crate::model_manager;
        use crate::whisper_service::WhisperEngine;
        use crate::safety_service::{TargetSnapshot, insert_text_safely};
        use crate::formatter::{format_transcript, FormattingConfig};

        // 1. Ensure TextEdit is open and focused (bounded single launch)
        let _ = Command::new("osascript")
            .args(&[
                "-e", "tell application \"TextEdit\" to launch",
                "-e", "tell application \"TextEdit\" to activate",
            ])
            .output();
        std::thread::sleep(std::time::Duration::from_millis(500));

        let target = TargetSnapshot::capture_current();

        let models_dir = model_manager::get_voxquest_models_dir();
        let model_path = models_dir.join("ggml-tiny.bin");
        if !model_path.exists() {
            eprintln!("Skipping real TextEdit test: ggml-tiny.bin not downloaded");
            return;
        }

        let mut engine = WhisperEngine::new();
        engine.load_model(&model_path).expect("Model must load");

        let wav_path = std::path::Path::new("/tmp/vox_test.wav");
        if !wav_path.exists() {
            eprintln!("Skipping real TextEdit test: /tmp/vox_test.wav fixture not found");
            return;
        }

        let mut reader = hound::WavReader::open(wav_path).expect("Failed to open WAV fixture");
        let audio: Vec<f32> = reader.samples::<f32>().map(|s| s.unwrap()).collect();

        let raw = engine.transcribe(&audio, Some("en")).expect("Transcription failed");
        let cfg = FormattingConfig::default();
        let formatted = format_transcript(&raw, &cfg);

        if target.platform_app_id.as_deref() == Some("TextEdit") {
            let insert_res = insert_text_safely(&formatted, &target);
            assert!(insert_res.is_ok(), "Insertion into TextEdit should succeed when destination matches");
        }
    }
}
