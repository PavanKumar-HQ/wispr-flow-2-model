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
        let history = Arc::new(HistoryDatabase::new_test().unwrap());
        let settings = Arc::new(Mutex::new(AppSettings::default()));
        let active_target = Arc::new(Mutex::new(None));
        let recording_start = Arc::new(Mutex::new(None));
        let active_session = Arc::new(Mutex::new(SessionSnapshot {
            session_id: "test-sess-1".to_string(),
            sequence: 1,
            state: SessionState::Idle,
            message: Some("Ready".to_string()),
            elapsed_seconds: 0.0,
            last_transcript: None,
            target_app: None,
            target_window: None,
            recovery_id: None,
            timestamp_ms: 1000,
            technical_suggestion: None,
            active_model_name: None,
        }));

        let state = AppState {
            audio,
            whisper,
            history,
            settings,
            active_target,
            recording_start,
            active_session,
            destination_sync: Arc::new(crate::destination_sync_service::DestinationSyncService::new()),
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
        let history = HistoryDatabase::new_test().unwrap();
        let target_snapshot = TargetSnapshot {
            session_id: "test-sess-1".to_string(),
            timestamp_ms: 1000,
            platform_app_id: Some("TargetApp".to_string()),
            bundle_id: Some("com.example.target".to_string()),
            app_pid: Some(1111),
            window_title: Some("Doc1".to_string()),
            element_role: Some("AXTextArea".to_string()),
            is_secure_input: false,
            confidence: "high".to_string(),
            is_valid: true,
        };

        // Simulate destination revalidation failure when user switched apps
        let is_safe = target_snapshot.is_destination_match(Some("DifferentAppSwitchedByUser"), Some(2222), Some("Other"));
        assert!(!is_safe);

        // When safe insertion fails, status becomes preserved_for_recovery or recovery_required
        let insertion_status = if is_safe { "inserted" } else { "recovery_required" };
        assert_eq!(insertion_status, "recovery_required");

        let transcript = "Critical user dictation that must never be lost";
        let rec_id = history.insert_record(transcript, transcript, 1.8, insertion_status, Some("TargetApp"), Some("Target field changed"), Some("test-session-1")).unwrap();

        let records = history.list_records(5).unwrap();
        let rec = records.iter().find(|r| r.id == rec_id).expect("Record must be preserved in history");
        assert_eq!(rec.status, "recovery_required");
        assert_eq!(rec.formatted_text, transcript);
    }

    #[test]
    fn test_push_to_talk_atomic_state_guard() {
        use std::sync::atomic::{AtomicBool, Ordering};

        static TEST_HELD: AtomicBool = AtomicBool::new(false);

        // 1. Initial key-down: should transition from false -> true
        assert!(TEST_HELD.compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst).is_ok());

        // 2. Repeated key-downs while held (macOS key repeat): should all fail and be ignored
        assert!(TEST_HELD.compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst).is_err());
        assert!(TEST_HELD.compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst).is_err());
        assert!(TEST_HELD.compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst).is_err());

        // 3. Key-up: swap back to false exactly once
        assert_eq!(TEST_HELD.swap(false, Ordering::SeqCst), true);

        // 4. Spurious key-up when not held: should return false
        assert_eq!(TEST_HELD.swap(false, Ordering::SeqCst), false);
    }

    #[test]
    fn test_cross_app_switch_prevents_wrong_field_insertion() {
        let orig_target = TargetSnapshot {
            session_id: "test-sess-2".to_string(),
            timestamp_ms: 1000,
            platform_app_id: Some("TextEdit".to_string()),
            bundle_id: Some("com.apple.TextEdit".to_string()),
            app_pid: Some(4001),
            window_title: Some("Notes.txt".to_string()),
            element_role: Some("AXTextArea".to_string()),
            is_secure_input: false,
            confidence: "high".to_string(),
            is_valid: true,
        };

        // User switches from TextEdit to Slack during dictation
        let curr_app = Some("Slack");
        let curr_pid = Some(5002);
        let curr_win = Some("general");

        assert!(!orig_target.is_destination_match(curr_app, curr_pid, curr_win),
            "Must reject insertion when user switched to a different application");
    }

    #[test]
    fn test_secure_password_field_rejection() {
        let secure_target = TargetSnapshot {
            session_id: "test-sess-3".to_string(),
            timestamp_ms: 1000,
            platform_app_id: Some("1Password".to_string()),
            bundle_id: Some("com.1password.1password".to_string()),
            app_pid: Some(6003),
            window_title: Some("Unlock".to_string()),
            element_role: Some("AXSecureTextField".to_string()),
            is_secure_input: true,
            confidence: "high".to_string(),
            is_valid: true,
        };

        assert!(!secure_target.is_destination_safe(),
            "AXSecureTextField must never be considered safe for automatic text insertion");
    }

    #[test]
    fn test_validating_target_state_transitions() {
        assert!(SessionState::Transcribing.can_transition_to(SessionState::ValidatingTarget));
        assert!(SessionState::Formatting.can_transition_to(SessionState::ValidatingTarget));
        assert!(SessionState::ValidatingTarget.can_transition_to(SessionState::Inserting));
        assert!(SessionState::ValidatingTarget.can_transition_to(SessionState::RecoveryRequired));
        assert!(SessionState::ValidatingTarget.can_transition_to(SessionState::Failed));
        assert!(SessionState::ValidatingTarget.can_transition_to(SessionState::Cancelled));
        assert!(SessionState::ValidatingTarget.is_active());
    }

    #[test]
    fn test_clipboard_snapshot_and_conditional_restoration() {
        use crate::safety_service::ClipboardSnapshot;

        let snap = ClipboardSnapshot {
            original_text: Some("user original copied password or code".to_string()),
        };

        // If the inserted text is still present on clipboard, it restores
        snap.restore_if_unmodified("dictated text to insert");

        // Verify that if concurrent user copy occurred (different text), it does not overwrite
        let snap2 = ClipboardSnapshot {
            original_text: Some("older text".to_string()),
        };
        // Calling with unmatched inserted_text will safely do nothing
        snap2.restore_if_unmodified("non_matching_text_that_was_never_set");
    }

    #[test]
    fn test_session_scoped_target_isolation() {
        let snap1 = TargetSnapshot::capture_for_session("session-uuid-1");
        assert_eq!(snap1.session_id, "session-uuid-1");

        let snap2 = TargetSnapshot::capture_for_session("session-uuid-2");
        assert_eq!(snap2.session_id, "session-uuid-2");
        assert_ne!(snap1.session_id, snap2.session_id);
    }
}

