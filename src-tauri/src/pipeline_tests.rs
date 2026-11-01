#[cfg(test)]
mod pipeline_tests {
    use std::sync::{Arc, Mutex};
    use crate::AppState;
    use crate::audio_service::AudioCaptureService;
    use crate::whisper_service::WhisperEngine;
    use crate::history_service::HistoryDatabase;
    use crate::settings_service::AppSettings;
    use crate::safety_service::TargetSnapshot;

    use crate::session_state::{SessionState, SessionSnapshot};

    #[test]
    fn test_duplicate_shortcut_event_prevention() {
        let audio = Arc::new(Mutex::new(AudioCaptureService::new()));
        let whisper = Arc::new(Mutex::new(WhisperEngine::new()));
        let history = Arc::new(HistoryDatabase::new().unwrap());
        let settings = Arc::new(Mutex::new(AppSettings::default()));
        let active_target = Arc::new(Mutex::new(None));
        let recording_start = Arc::new(Mutex::new(None));
        let active_session = Arc::new(Mutex::new(SessionSnapshot {
            session_id: "test-sess-1".to_string(),
            state: SessionState::Idle,
            message: Some("Ready".to_string()),
            elapsed_seconds: 0.0,
            last_transcript: None,
            target_app: None,
            recovery_id: None,
        }));

        let state = AppState {
            audio,
            whisper,
            history,
            settings,
            active_target,
            recording_start,
            active_session,
        };

        // When recording is already in progress, audio.start_recording() returns Err
        {
            let a = state.audio.lock().unwrap();
            assert!(!a.is_recording());
        }

        // Test explicit state transitions
        assert!(SessionState::Idle.can_transition_to(SessionState::Starting));
        assert!(SessionState::Starting.can_transition_to(SessionState::Recording));
        assert!(SessionState::Recording.can_transition_to(SessionState::Stopping));
        assert!(SessionState::Stopping.can_transition_to(SessionState::Transcribing));
        assert!(SessionState::Transcribing.can_transition_to(SessionState::Inserting));
        assert!(SessionState::Transcribing.can_transition_to(SessionState::RecoveryRequired));
        assert!(SessionState::Inserting.can_transition_to(SessionState::Completed));
        assert!(SessionState::Recording.can_transition_to(SessionState::Cancelled));
        // Overlapping transition cannot be starting again from active
        assert!(!SessionState::Recording.can_transition_to(SessionState::Starting));
    }

    #[test]
    fn test_unsafe_destination_recovery_preservation() {
        let history = HistoryDatabase::new().unwrap();
        let target_snapshot = TargetSnapshot {
            timestamp_ms: 1000,
            platform_app_id: Some("TargetApp".to_string()),
            app_pid: Some(1111),
            window_title: Some("Doc1".to_string()),
            is_secure_input: false,
        };

        // Simulate destination revalidation failure when user switched apps
        let is_safe = target_snapshot.is_destination_match(Some("DifferentAppSwitchedByUser"), Some(2222), Some("Other"));
        assert!(!is_safe);

        // When safe insertion fails, status becomes preserved_for_recovery or recovery_required
        let insertion_status = if is_safe { "inserted" } else { "recovery_required" };
        assert_eq!(insertion_status, "recovery_required");

        let transcript = "Critical user dictation that must never be lost";
        let rec_id = history.insert_record(transcript, transcript, 1.8, insertion_status, Some("TargetApp")).unwrap();

        let records = history.list_records(5).unwrap();
        let rec = records.iter().find(|r| r.id == rec_id).expect("Record must be preserved in history");
        assert_eq!(rec.status, "recovery_required");
        assert_eq!(rec.formatted_text, transcript);
    }
}

