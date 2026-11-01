#[cfg(test)]
mod smoke_tests {
    use crate::model_manager;
    use crate::whisper_service::WhisperEngine;
    use crate::history_service::HistoryDatabase;
    use std::f32::consts::PI;

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

        // Generate 2.0s test audio of 440Hz tone
        let sample_rate = 16000;
        let mut audio = Vec::with_capacity(sample_rate * 2);
        for i in 0..(sample_rate * 2) {
            let t = i as f32 / sample_rate as f32;
            let sample = (2.0 * PI * 440.0 * t).sin() * 0.1;
            audio.push(sample);
        }

        let trans_res = engine.transcribe(&audio, Some("en"));
        assert!(trans_res.is_ok(), "Failed to transcribe: {:?}", trans_res.err());
        println!("Smoke transcription result: '{}'", trans_res.unwrap());
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
}
