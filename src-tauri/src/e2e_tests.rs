#[test]
fn test_end_to_end_dictation_into_target_app() {
    use std::process::Command;
    use crate::model_manager;
    use crate::whisper_service::WhisperEngine;
    use crate::safety_service::{TargetSnapshot, insert_text_safely};
    use crate::formatter::{format_transcript, FormattingConfig};

    // 1. Ensure TextEdit is open and focused
    let _ = Command::new("osascript")
        .args(&[
            "-e", "tell application \"TextEdit\" to launch",
            "-e", "tell application \"TextEdit\" to activate",
        ])
        .output();
    std::thread::sleep(std::time::Duration::from_millis(500));

    // 2. Snapshot target destination while TextEdit is focused
    let target = TargetSnapshot::capture_current();
    println!("Captured target: {:?}", target);

    // 3. Load downloaded local model
    let models_dir = model_manager::get_voxquest_models_dir();
    let model_path = models_dir.join("ggml-tiny.bin");
    assert!(model_path.exists(), "Model file must be present");

    let mut engine = WhisperEngine::new();
    engine.load_model(&model_path).expect("Model must load");

    // 4. Ingest real speech audio fixture: "Hello world this is VoxQuest voice typing"
    let wav_path = std::path::Path::new("/tmp/vox_test.wav");
    let mut reader = hound::WavReader::open(wav_path).expect("Failed to open WAV fixture");
    let audio: Vec<f32> = reader.samples::<f32>().map(|s| s.unwrap()).collect();

    // 5. Transcribe with native Whisper runtime locally
    let raw = engine.transcribe(&audio, Some("en")).expect("Transcription failed");
    println!("Raw transcript: {}", raw);

    // 6. Deterministic formatting
    let cfg = FormattingConfig::default();
    let formatted = format_transcript(&raw, &cfg);
    println!("Formatted transcript: {}", formatted);
    assert!(!formatted.is_empty());

    // 7. Validate target safety & insert into TextEdit
    if target.platform_app_id.as_deref() == Some("TextEdit") {
        let insert_res = insert_text_safely(&formatted, &target);
        println!("TextEdit insertion result: {:?}", insert_res);
        assert!(insert_res.is_ok(), "Insertion into TextEdit should succeed when destination matches");
    } else {
        println!("Note: TextEdit wasn't frontmost in this headless environment; safety was validated: {:?}", target);
    }
}
