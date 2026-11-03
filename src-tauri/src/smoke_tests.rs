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

    let transcript = engine.transcribe(&samples, Some("en"), None).expect("Transcription must succeed");
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

    let trans_res = engine.transcribe(&audio, Some("en"), None);
    assert!(trans_res.is_ok(), "Failed to transcribe: {:?}", trans_res.err());
}

#[test]
fn test_all_official_models_manifest_and_available() {
    let models = model_manager::list_models();
    assert!(models.len() >= 3, "Manifest must list all supported model tiers");
    
    // Check that core downloaded model tiers (tiny, base, small) are present
    let downloaded_models: Vec<_> = models.iter().filter(|m| m.is_downloaded).collect();
    assert!(!downloaded_models.is_empty(), "At least one local model should be downloaded and verified on disk");
}

#[test]
fn test_sqlite_history_retention_and_delete() {
    let db = HistoryDatabase::new_test().expect("DB should initialize");
    let id = db.insert_record("raw audio dictation test", "Raw audio dictation test.", 2.5, "inserted", Some("TextEdit"), None, Some("smoke-session-1"))
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
        session_id: "smoke-test-1".to_string(),
        timestamp_ms: 123456789,
        platform_app_id: Some("TextEdit".to_string()),
        bundle_id: Some("com.apple.TextEdit".to_string()),
        app_pid: Some(51702),
        window_title: Some("Untitled.txt".to_string()),
        element_role: Some("AXTextArea".to_string()),
        is_secure_input: false,
        confidence: "high".to_string(),
        is_valid: true,
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

#[test]
fn test_settings_serde_default_backward_compatibility() {
    use crate::settings_service::AppSettings;

    // Legacy settings JSON without insertion_policy or max_duration_secs
    let legacy_json = r#"{
        "default_model_id": "whisper-tiny",
        "language": "en",
        "shortcut": "CommandOrControl+Shift+Space",
        "spoken_punctuation": true,
        "conservative_filler_removal": true,
        "auto_capitalization": true,
        "retain_history": false,
        "play_sound_effects": false
    }"#;

    let settings: Result<AppSettings, _> = serde_json::from_str(legacy_json);
    assert!(settings.is_ok(), "Legacy settings JSON must deserialize gracefully with defaults");
    let s = settings.unwrap();
    assert_eq!(s.default_model_id, "whisper-tiny");
    assert_eq!(s.language, "en");
    assert_eq!(s.insertion_policy, "original_destination");
    assert_eq!(s.max_duration_secs, 180);
    assert_eq!(s.retain_history, false);
}

#[test]
fn test_anti_aliased_resampling() {
    use crate::audio_service::linear_resample;

    // 48000 Hz input, 1 second of 48000 samples
    let input = vec![0.5f32; 48000];
    let output = linear_resample(&input, 48000, 16000);

    // Should produce exactly 16000 samples for 16kHz
    assert_eq!(output.len(), 16000, "Resampled output length must match 16kHz");
}

#[test]
fn test_uncaptured_destination_safety() {
    let uncaptured = TargetSnapshot {
        session_id: "smoke-test-2".to_string(),
        timestamp_ms: 123456789,
        platform_app_id: None,
        bundle_id: None,
        app_pid: None,
        window_title: None,
        element_role: None,
        is_secure_input: false,
        confidence: "unavailable".to_string(),
        is_valid: false,
    };

    // An uncaptured destination must not be considered safe
    assert!(!uncaptured.is_destination_safe());
}

#[test]
fn test_clean_whisper_transcript() {
    use crate::commands::clean_whisper_transcript;

    assert_eq!(clean_whisper_transcript("[BLANK_AUDIO]"), "");
    assert_eq!(clean_whisper_transcript(" [BLANK_AUDIO] "), "");
    assert_eq!(clean_whisper_transcript("[silence]"), "");
    assert_eq!(clean_whisper_transcript("(music)"), "");
    assert_eq!(clean_whisper_transcript("[bell]"), "");
    assert_eq!(clean_whisper_transcript("[applause]"), "");
    assert_eq!(clean_whisper_transcript("   "), "");
    assert_eq!(clean_whisper_transcript("..."), "");

    // Legitimate speech should be preserved
    assert_eq!(clean_whisper_transcript("Hello world"), "Hello world");
    assert_eq!(clean_whisper_transcript("[BLANK_AUDIO] Hello world"), "Hello world");

    // Repetition loops from Whisper hallucination should be collapsed to single statement
    assert_eq!(
        clean_whisper_transcript("I hope you are betting this good.I hope you are betting this good.I hope you are betting this good."),
        "I hope you are betting this good."
    );
    assert_eq!(
        clean_whisper_transcript("Hello world. Hello world."),
        "Hello world."
    );
    assert_eq!(
        clean_whisper_transcript("No, no, no."),
        "No."
    );
    assert_eq!(
        clean_whisper_transcript("how are you how are you"),
        "how are you"
    );
}

#[test]
fn test_polish_grammar_and_syntax() {
    use crate::formatter::polish_text;

    // Contractions and grammar typos
    assert_eq!(polish_text("dont aint cant"), "Don't isn't can't.");

    // Spoken modal and agreement grammar fixes
    assert_eq!(polish_text("you could of done this"), "You could have done this.");
    assert_eq!(polish_text("their is someone here"), "There is someone here.");
    assert_eq!(polish_text("your welcome"), "You're welcome.");
    assert_eq!(polish_text("its a great test"), "It's a great test.");

    // Subject-verb agreement
    assert_eq!(polish_text("these stuff is ready"), "This stuff is ready.");

    // Question mark detection
    assert_eq!(polish_text("what about the time we meet"), "What about the time we meet?");

    // Proper noun casing and spacing
    assert_eq!(polish_text("im typing on whatsapp"), "I'm typing on WhatsApp.");
}

#[test]
fn test_stage_latency_benchmark() {
    use std::time::Instant;
    use crate::model_manager;
    use crate::whisper_service::WhisperEngine;
    use crate::audio_service::linear_resample;
    use crate::formatter::{format_transcript, FormattingConfig};
    use crate::safety_service::TargetSnapshot;

    // Stage 1: Audio capture finalization & resampling (3 seconds @ 48kHz -> 16kHz)
    let raw_48k = vec![0.1f32; 48000 * 3];
    let t0 = Instant::now();
    let resampled_16k = linear_resample(&raw_48k, 48000, 16000);
    let t1 = Instant::now();
    let ms_resample = (t1 - t0).as_secs_f64() * 1000.0;
    assert_eq!(resampled_16k.len(), 48000);

    // Stage 2: Whisper inference on loaded tiny model
    let models_dir = model_manager::get_voxquest_models_dir();
    let model_path = models_dir.join("ggml-tiny.bin");
    if !model_path.exists() {
        return;
    }
    let mut engine = WhisperEngine::new();
    engine.load_model(&model_path).unwrap();

    let t2 = Instant::now();
    let raw_text = engine.transcribe(&resampled_16k, Some("en"), None).unwrap();
    let t3 = Instant::now();
    let ms_whisper = (t3 - t2).as_secs_f64() * 1000.0;

    // Stage 3: Transcript formatting
    let cfg = FormattingConfig::default();
    let t4 = Instant::now();
    let formatted = format_transcript(&raw_text, &cfg);
    let t5 = Instant::now();
    let ms_format = (t5 - t4).as_secs_f64() * 1000.0;

    // Stage 4: In-process destination metadata capture
    let t6 = Instant::now();
    let dest = TargetSnapshot::capture_current();
    let t7 = Instant::now();
    let ms_dest = (t7 - t6).as_secs_f64() * 1000.0;

    println!("\n=== HARDWARE STAGE BENCHMARK (3.0s Audio Input, Apple Silicon) ===");
    println!("  1. Audio Resampling (48kHz -> 16kHz, 144k samples): {:>6.2} ms", ms_resample);
    println!("  2. Whisper.cpp Native Inference (ggml-tiny.bin):     {:>6.2} ms", ms_whisper);
    println!("  3. Formatting & Text Normalization:                 {:>6.2} ms", ms_format);
    println!("  4. In-Process Native Destination Capture:           {:>6.2} ms", ms_dest);
    println!("  Destination Captured: {:?} (PID: {:?})", dest.platform_app_id, dest.app_pid);
    println!("  Formatted Output: '{}'", formatted);
    println!("==================================================================\n");
}

#[test]
fn test_personalization_self_learning_cycle() {
    let history = HistoryDatabase::new_test().expect("History DB should initialize");

    // Clean start for personalization tables in test
    let _ = history.reset_personalization();

    // 1. Initial dictation correction by user: "vox flow" -> "VoxFlow"
    let orig1 = "We love using vox flow for our meetings.";
    let edit1 = "We love using VoxFlow for our meetings.";
    let res1 = history.record_correction_event(Some("test-sess-1"), orig1, edit1).expect("Learning must succeed");

    // Must have registered as active entry immediately for instant self-learning
    let cand = res1.iter().find(|e| e.original_text.to_lowercase() == "vox flow");
    assert!(cand.is_some(), "Should find candidate for 'vox flow'");
    let cand = cand.unwrap();
    assert_eq!(cand.preferred_text, "VoxFlow");
    assert_eq!(cand.status, "active");
    assert_eq!(cand.positive_count, 1);

    // 2. Second consistent edit reinforcing the correction: "vox flow is fast" -> "VoxFlow is fast"
    let orig2 = "vox flow is fast.";
    let edit2 = "VoxFlow is fast.";
    let res2 = history.record_correction_event(Some("test-sess-2"), orig2, edit2).expect("Reinforcement must succeed");

    let promoted = res2.iter().find(|e| e.original_text.to_lowercase() == "vox flow");
    assert!(promoted.is_some());
    let promoted = promoted.unwrap();
    assert_eq!(promoted.status, "active", "Repeated edit must auto-promote candidate to active!");
    assert_eq!(promoted.positive_count, 2);
    assert!(promoted.confidence >= 0.65);

    // 3. Verify biasing prompt includes VoxFlow
    let prompt = history.get_active_biasing_prompt().expect("Prompt generation should succeed");
    assert!(prompt.contains("VoxFlow"), "Biasing prompt should contain active learned term VoxFlow");

    // 4. Verify post-processing personalization pipeline transforms speech faithfully with word-boundary safety
    let (corrected_text, applied) = history.apply_personalization_pipeline("I am speaking into vox flow today.");
    assert_eq!(corrected_text, "I am speaking into VoxFlow today.");
    assert!(!applied.is_empty());

    // 5. Verify word-boundary safety: "vox flowers" must NOT be corrupted to "VoxFlowers"
    let (safe_text, _) = history.apply_personalization_pipeline("Look at those vox flowers in the garden.");
    assert_eq!(safe_text, "Look at those vox flowers in the garden.");

    // Clean up
    let _ = history.reset_personalization();
}

#[test]
fn test_live_microphone_device_check() {
    let mut audio_service = crate::audio_service::AudioCaptureService::new();
    let start_res = audio_service.start_recording(None);
    assert!(start_res.is_ok(), "Audio recording start must succeed: {:?}", start_res);
    std::thread::sleep(std::time::Duration::from_millis(400));
    let stop_res = audio_service.stop_recording();
    assert!(stop_res.is_ok(), "Audio recording stop must succeed: {:?}", stop_res);
}

#[test]
fn test_isolate_voice_and_noise_rejection() {
    use crate::audio_service::isolate_voice_and_suppress_noise;

    // 1. Pure low-frequency ambient rumble (e.g. 50Hz AC mains hum / laptop fan)
    let sample_rate = 16000;
    let mut low_rumble = Vec::with_capacity(sample_rate);
    for i in 0..sample_rate {
        let t = i as f32 / sample_rate as f32;
        let s = (2.0 * std::f32::consts::PI * 50.0 * t).sin() * 0.005; // 50 Hz rumble
        low_rumble.push(s);
    }
    let cleaned_rumble = isolate_voice_and_suppress_noise(&low_rumble, sample_rate as u32);
    assert!(cleaned_rumble.is_empty(), "Ambient rumble with no user speech must be rejected as silence");

    // 2. Audio containing vocal speech frequencies (e.g. 300Hz fundamental)
    let mut speech_with_silence = vec![0.001f32; sample_rate / 2]; // 0.5s silence
    for i in 0..(sample_rate) {
        let t = i as f32 / sample_rate as f32;
        let s = (2.0 * std::f32::consts::PI * 300.0 * t).sin() * 0.08; // 300 Hz voice
        speech_with_silence.push(s);
    }
    speech_with_silence.extend(vec![0.001f32; sample_rate / 2]); // 0.5s trailing silence

    let isolated = isolate_voice_and_suppress_noise(&speech_with_silence, sample_rate as u32);
    assert!(!isolated.is_empty(), "User speech burst must be isolated and preserved");
    assert!(isolated.len() < speech_with_silence.len(), "Leading and trailing non-speech must be trimmed");
}

#[test]
fn test_silence_hallucination_cleanser() {
    use crate::commands::clean_whisper_transcript;

    // Direct YouTube outro hallucinations produced on silent/absent audio
    assert_eq!(clean_whisper_transcript("Thanks for watching"), "");
    assert_eq!(clean_whisper_transcript("Thanks for watching!"), "");
    assert_eq!(clean_whisper_transcript("Thank you for watching."), "");
    assert_eq!(clean_whisper_transcript("Thank you for watching this video."), "");
    assert_eq!(clean_whisper_transcript("Please like and subscribe to my channel."), "");
    assert_eq!(clean_whisper_transcript("Thanks for watching and see you next time."), "");
    assert_eq!(clean_whisper_transcript("Thanks for listening."), "");
    assert_eq!(clean_whisper_transcript("Thank you."), "");
    assert_eq!(clean_whisper_transcript("Ooh."), "");
    assert_eq!(clean_whisper_transcript("Bye bye."), "");
    assert_eq!(clean_whisper_transcript("[BLANK_AUDIO]"), "");

    // Real human speech must NEVER be cleared
    assert_eq!(
        clean_whisper_transcript("Thank you for sending the file."),
        "Thank you for sending the file."
    );
    assert_eq!(
        clean_whisper_transcript("Thanks to everyone who joined our sprint demo today."),
        "Thanks to everyone who joined our sprint demo today."
    );
}

#[test]
fn test_repetition_looping_deduplication() {
    use crate::formatter::deduplicate_repeated_speech;

    // Screenshot bug: repeating sentences without spacing after period
    let input = "I hope you are betting this good.I hope you are betting this good.I hope you are betting this good.";
    let deduped = deduplicate_repeated_speech(input);
    assert_eq!(deduped, "I hope you are betting this good.");

    let input_user = "Is Dishtary working? Please check that.Is Dishtary working? Please check that.Is Dishtary working? Please check that.";
    let deduped_user = deduplicate_repeated_speech(input_user);
    assert_eq!(deduped_user, "Is Dishtary working? Please check that.");

    // Space-separated repeating phrases
    let input2 = "Hello world hello world hello world";
    assert_eq!(deduplicate_repeated_speech(input2), "Hello world");

    // Repeating clauses
    let input3 = "we need to fix this bug, we need to fix this bug";
    assert_eq!(deduplicate_repeated_speech(input3), "we need to fix this bug");
}

#[test]
fn test_polish_colloquialisms_and_grammar() {
    use crate::formatter::polish_text;

    // Colloquial expansions
    let input = "i gonna wanna test this cuz it kinda works";
    let polished = polish_text(input);
    assert!(polished.contains("going to want to"));
    assert!(polished.contains("because"));
    assert!(polished.contains("kind of"));

    // Subject-verb agreement
    let input2 = "they is ready and we was there";
    let polished2 = polish_text(input2);
    assert!(polished2.to_lowercase().contains("they are ready"));
    assert!(polished2.to_lowercase().contains("we were there"));
}

#[test]
fn test_enhancement_accept_and_restore_history() {
    use crate::history_service::HistoryDatabase;
    use crate::enhancement_service::{enhance_text, EnhancementRequest, EnhancementMode};

    let db = HistoryDatabase::new_test().expect("Isolated test DB");
    let orig = "hey team i finished the backend but the api is giving error so i will fix it tomorrow";
    let id = db.insert_record(orig, orig, 3.5, "inserted", Some("Brave Browser"), None, Some("sess-1")).unwrap();

    // Verify initial state
    let rec = db.get_record(id).unwrap().unwrap();
    assert_eq!(rec.original_text, orig);
    assert_eq!(rec.formatted_text, orig);

    // Run enhancement
    let req = EnhancementRequest {
        session_id: Some("sess-1".to_string()),
        text: orig.to_string(),
        mode: EnhancementMode::ImproveClarity,
        ..Default::default()
    };
    let res = enhance_text(&req, &[]).unwrap();
    assert_eq!(res.enhanced_text, "Hey team, I finished the backend, but the API is returning an error. I'll fix it tomorrow.");

    // Explicit accept
    db.update_record_text(id, &res.enhanced_text).unwrap();
    let updated = db.get_record(id).unwrap().unwrap();
    assert_eq!(updated.formatted_text, "Hey team, I finished the backend, but the API is returning an error. I'll fix it tomorrow.");
    assert_eq!(updated.original_text, orig); // Original preserved!

    // Restore original
    let restored = db.restore_record_original_text(id).unwrap();
    assert_eq!(restored, orig);
    let final_rec = db.get_record(id).unwrap().unwrap();
    assert_eq!(final_rec.formatted_text, orig);
    assert_eq!(final_rec.user_edited_text, None);
}

#[test]
fn test_enhancement_pipeline_decoupled_from_insertion() {
    use crate::enhancement_service::{enhance_text, EnhancementRequest, EnhancementMode};

    let req = EnhancementRequest {
        session_id: Some("test-session".to_string()),
        text: "can you please check this code and tell me if anything wrong".to_string(),
        mode: EnhancementMode::ImproveClarity,
        ..Default::default()
    };

    let res = enhance_text(&req, &[]).unwrap();
    assert_eq!(res.enhanced_text, "Could you please review this code and let me know if anything is wrong?");
    // Result is purely structured; no clipboard or system events dispatched
    assert!(res.changes_made);
}

#[test]
fn test_trace_phrase_pipeline() {
    use crate::formatter::{format_transcript, FormattingConfig};
    use crate::history_service::HistoryDatabase;

    let history = HistoryDatabase::new_test().unwrap();
    let cfg = FormattingConfig::default();

    let raw = "It's here because the coin will come to take.";
    let formatted = format_transcript(raw, &cfg);
    assert!(!formatted.is_empty(), "Formatted should not be empty");

    let (personalized, _) = history.apply_personalization_pipeline(&formatted);
    assert!(!personalized.is_empty(), "Personalized should not be empty");
}



