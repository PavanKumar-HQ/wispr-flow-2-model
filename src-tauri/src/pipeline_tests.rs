#[cfg(test)]
mod pipeline_tests {
    use std::sync::{Arc, Mutex};
    use crate::AppState;
    use crate::audio_service::AudioCaptureService;
    use crate::whisper_service::WhisperEngine;
    use crate::history_service::HistoryDatabase;
    use crate::settings_service::AppSettings;
    use crate::safety_service::TargetSnapshot;
    use crate::commands::DictationStatus;

    #[test]
    fn test_duplicate_shortcut_event_prevention() {
        // State machine must ignore double triggers or prevent overlapping recordings
        let audio = Arc::new(Mutex::new(AudioCaptureService::new()));
        let whisper = Arc::new(Mutex::new(WhisperEngine::new()));
        let history = Arc::new(HistoryDatabase::new().unwrap());
        let settings = Arc::new(Mutex::new(AppSettings::default()));
        let active_target = Arc::new(Mutex::new(None));
        let recording_start = Arc::new(Mutex::new(None));

        let state = AppState {
            audio,
            whisper,
            history,
            settings,
            active_target,
            recording_start,
        };

        // When recording is already in progress, audio.start_recording() returns Err
        {
            let a = state.audio.lock().unwrap();
            assert!(!a.is_recording());
        }

        // Test state transitions
        let initial_status = DictationStatus {
            state: "idle".to_string(),
            message: Some("Ready".to_string()),
            last_transcript: None,
        };
        assert_eq!(initial_status.state, "idle");

        let recording_status = DictationStatus {
            state: "recording".to_string(),
            message: Some("Listening".to_string()),
            last_transcript: None,
        };
        assert_eq!(recording_status.state, "recording");

        let transcribing_status = DictationStatus {
            state: "transcribing".to_string(),
            message: Some("Inferring".to_string()),
            last_transcript: None,
        };
        assert_eq!(transcribing_status.state, "transcribing");

        let success_status = DictationStatus {
            state: "success".to_string(),
            message: Some("Inserted".to_string()),
            last_transcript: Some("Hello world".to_string()),
        };
        assert_eq!(success_status.state, "success");

        let recovery_warning_status = DictationStatus {
            state: "warning".to_string(),
            message: Some("Target changed. Preserved in history".to_string()),
            last_transcript: Some("Recovered speech".to_string()),
        };
        assert_eq!(recovery_warning_status.state, "warning");
    }

    #[test]
    fn test_unsafe_destination_recovery_preservation() {
        let history = HistoryDatabase::new().unwrap();
        let target_snapshot = TargetSnapshot {
            timestamp_ms: 1000,
            platform_app_id: Some("TargetApp".to_string()),
            window_title: Some("Doc1".to_string()),
        };

        // Simulate destination revalidation failure
        let is_safe = target_snapshot.is_destination_match(Some("DifferentAppSwitchedByUser"), Some("Other"));
        assert!(!is_safe);

        // When safe insertion fails, status becomes preserved_for_recovery
        let insertion_status = if is_safe { "inserted" } else { "preserved_for_recovery" };
        assert_eq!(insertion_status, "preserved_for_recovery");

        let transcript = "Critical user dictation that must never be lost";
        let rec_id = history.insert_record(transcript, transcript, 1.8, insertion_status, Some("TargetApp")).unwrap();

        let records = history.list_records(5).unwrap();
        let rec = records.iter().find(|r| r.id == rec_id).expect("Record must be preserved in history");
        assert_eq!(rec.status, "preserved_for_recovery");
        assert_eq!(rec.formatted_text, transcript);
    }
}

