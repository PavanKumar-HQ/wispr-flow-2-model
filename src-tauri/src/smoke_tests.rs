use crate::model_manager;
use crate::whisper_service::WhisperEngine;
use crate::history_service::HistoryDatabase;
use crate::safety_service::TargetSnapshot;
use std::f32::consts::PI;

#[test]
fn test_live_whisper_known_speech_audio() {
    let models_dir = model_manager::get_voxquest_models_dir();
    let tiny_path = models_dir.join("ggml-tiny.bin");
    if !tiny_path.exists() {
        eprintln!("Skipping speech test: ggml-tiny.bin not downloaded yet");
        return;
    }

    // Read the known spoken waveform from /tmp/vox_test.wav (spoken text: "Hello world this is VoxQuest voice typing")
    let wav_path = std::path::Path::new("/tmp/vox_test.wav");
    assert!(wav_path.exists(), "Audio fixture /tmp/vox_test.wav must exist");

    let mut reader = hound::WavReader::open(wav_path).expect("Failed to open WAV fixture");
    let spec = reader.spec();
    assert_eq!(spec.sample_rate, 16000, "WAV must be 16kHz");
    assert_eq!(spec.channels, 1, "WAV must be mono");

    let samples: Vec<f32> = reader.samples::<f32>().map(|s| s.unwrap()).collect();
    assert!(!samples.is_empty(), "Audio samples must not be empty");

    let mut engine = WhisperEngine::new();
    engine.load_model(&tiny_path).expect("Model should load");

    let transcript = engine.transcribe(&samples, Some("en")).expect("Transcription must succeed");
    println!("Transcribed known speech output: '{}'", transcript);

    let lower = transcript.to_lowercase();
    assert!(
        lower.contains("hello") || lower.contains("world") || lower.contains("typing") || lower.contains("vox"),
        "Transcript should faithfully match the spoken speech fixture, got: '{}'",
        transcript
    );
}

#[test]
fn test_live_whisper_smoke_inference() {
    let models_dir = model_manager::get_voxquest_models_dir();
    let tiny_path = models_dir.join("ggml-tiny.bin");
    if !tiny_path.exists() {
        eprintln!("Skipping smoke test: ggml-tiny.bin not downloaded yet");
        return;
    }

    let mut engine = WhisperEngine::new();
    let load_res = engine.load_model(&tiny_path);
    assert!(load_res.is_ok(), "Failed to load model: {:?}", load_res.err());

    let sample_rate = 16000;
    let mut audio = Vec::with_capacity(sample_rate * 2);
    for i in 0..(sample_rate * 2) {
        let t = i as f32 / sample_rate as f32;
        let sample = (2.0 * PI * 440.0 * t).sin() * 0.1;
        audio.push(sample);
    }

    let trans_res = engine.transcribe(&audio, Some("en"));
    assert!(trans_res.is_ok(), "Failed to transcribe: {:?}", trans_res.err());
}

#[test]
fn test_sqlite_history_retention_and_delete() {
    let db = HistoryDatabase::new().expect("DB should initialize");
    let id = db.insert_record("raw audio dictation test", "Raw audio dictation test.", 2.5, "inserted", Some("TextEdit"))
        .expect("Should insert record");
    
    let records = db.list_records(10).expect("Should list records");
    assert!(records.iter().any(|r| r.id == id));

    db.delete_record(id).expect("Should delete record");
    let records_after = db.list_records(10).expect("Should list records");
    assert!(!records_after.iter().any(|r| r.id == id));
}

#[test]
fn test_target_destination_safety_validation() {
    let snapshot = TargetSnapshot {
        timestamp_ms: 123456789,
        platform_app_id: Some("TextEdit".to_string()),
        app_pid: Some(51702),
        window_title: Some("Untitled.txt".to_string()),
        is_secure_input: false,
    };

    // Safe when current matches original app, pid, and window
    assert!(snapshot.is_destination_match(Some("TextEdit"), Some(51702), Some("Untitled.txt")));

    // Unsafe when app changed (e.g. user switched to Slack or Chrome)
    assert!(!snapshot.is_destination_match(Some("Slack"), Some(55555), Some("General")));
    assert!(!snapshot.is_destination_match(Some("Google Chrome"), Some(66666), Some("New Tab")));

    // Unsafe if switched to VoxQuest itself
    assert!(!snapshot.is_destination_match(Some("VoxQuest"), Some(1234), Some("Settings")));
    assert!(!snapshot.is_destination_match(Some("tauri-app"), Some(1234), Some("tauri-app")));

    // Unsafe if target window title within same app changed
    assert!(!snapshot.is_destination_match(Some("TextEdit"), Some(51702), Some("SecretCredentials.txt")));
}
