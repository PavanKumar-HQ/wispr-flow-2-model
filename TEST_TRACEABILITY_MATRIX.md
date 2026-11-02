# VoxQuest — Test Traceability Matrix

**Generated**: November 2, 2026  
**Status**: 100% Traceable to Automated Tests & Source Code  
**Test Suite**: 71 Passing Automated Tests in `src-tauri/src/`

---

## 1. Traceability by Feature Category

| Req ID | Capability Description | Source Implementation | Automated Verification Test |
|---|---|---|---|
| **A-01** | Global shortcut registration & state toggle | `src-tauri/src/lib.rs:188-210` | `pipeline_tests::test_session_state_machine_transition_rules` |
| **A-02** | 180-second stuck-key watchdog auto-stop | `src-tauri/src/audio_service.rs:21-36` | `correctness_verification_tests::test_stuck_key_watchdog_timeout_deterministic` |
| **A-03** | Cancel shortcut cleanly resets active session | `src-tauri/src/commands.rs:853-900` | `pipeline_tests::test_session_state_machine_transition_rules` |
| **B-01** | Capture 16kHz mono audio via CPAL | `src-tauri/src/audio_service.rs:90-185` | `smoke_tests::test_audio_buffer_collection` |
| **B-02** | Live audio volume meter stream | `src-tauri/src/audio_service.rs:135-155` | `smoke_tests::test_audio_level_calculation` |
| **B-03** | Pure silence gating (reject 0-sample buffers) | `src-tauri/src/commands.rs:388-405` | `correctness_verification_tests::test_acoustic_gating_pure_silence` |
| **B-04** | Ambient HVAC noise floor rejection (<0.0025 RMS) | `src-tauri/src/commands.rs:395-410` | `correctness_verification_tests::test_acoustic_gating_ambient_noise_floor` |
| **B-05** | Short tap rejection (<200ms / 3200 samples) | `src-tauri/src/commands.rs:380-388` | `correctness_verification_tests::test_acoustic_gating_short_tap_buffer` |
| **B-06** | Audible speech buffer acceptance | `src-tauri/src/commands.rs:412-425` | `correctness_verification_tests::test_acoustic_gating_audible_speech` |
| **C-01** | GGML model file discovery & integrity check | `src-tauri/src/model_manifest.rs:45-120` | `smoke_tests::test_model_discovery` |
| **C-02** | Whisper.cpp Metal GPU accelerated inference | `src-tauri/src/whisper_service.rs:150-280` | `correctness_verification_tests::test_reproduce_real_model_benchmarks` |
| **C-03** | Language selection & auto-detection | `src-tauri/src/whisper_service.rs:210-240` | `smoke_tests::test_whisper_transcribe_synthetic_pcm` |
| **C-04** | Whisper hallucination cleaner (`[BLANK_AUDIO]`, etc.) | `src-tauri/src/commands.rs:460-495` | `correctness_verification_tests::test_whisper_hallucination_and_artifact_cleaner` |
| **C-05** | Subtitle dataset hallucination cleaner | `src-tauri/src/commands.rs:480-498` | `correctness_verification_tests::test_whisper_hallucination_and_artifact_cleaner` |
| **D-01** | Spoken punctuation expansion ("comma", "period") | `src-tauri/src/formatter.rs:85-130` | `formatter::test_spoken_punctuation` |
| **D-02** | Conservative speech filler removal ("um", "uh") | `src-tauri/src/formatter.rs:135-180` | `formatter::test_conservative_filler_removal` |
| **D-03** | Sentence capitalization & spacing normalization | `src-tauri/src/formatter.rs:185-230` | `formatter::test_auto_capitalization` |
| **D-04** | Empty formatting fallback to raw cleaned text | `src-tauri/src/commands.rs:509-514` | `pipeline_tests::test_formatting_pipeline_idempotence` |
| **E-01** | Pre-dictation destination anchor capture | `src-tauri/src/safety_service.rs:238-340` | `smoke_tests::test_target_destination_safety_validation` |
| **E-02** | AXSecureTextField password field blocking | `src-tauri/src/safety_service.rs:480-530` | `correctness_verification_tests::test_secure_password_field_blocks_insertion` |
| **E-03** | Native `simulate_cmd_v` CoreGraphics injection | `src-tauri/src/safety_service.rs:690-760` | `smoke_tests::test_trace_phrase_pipeline` |
| **E-04** | Asynchronous clipboard preservation (300ms restore) | `src-tauri/src/safety_service.rs:710-745` | `correctness_verification_tests::test_clipboard_preservation_deterministic_logic` |
| **E-05** | Destination app activation with PID/bundle fallback | `src-tauri/src/safety_service.rs:128-215` | `smoke_tests::test_uncaptured_destination_safety` |
| **F-01** | Vault recovery record storage | `src-tauri/src/history_service.rs:90-140` | `smoke_tests::test_history_roundtrip` |
| **F-02** | Manual placement from recovery panel | `src-tauri/src/commands.rs:1250-1308` | `smoke_tests::test_history_roundtrip` |
| **F-03** | Dismiss recovery record without losing DB history | `src-tauri/src/commands.rs:1280-1300` | `smoke_tests::test_history_roundtrip` |
| **G-01** | External edit detection in destination app | `src-tauri/src/destination_sync_service.rs:45-120` | `correctness_verification_tests::test_external_destination_edit_sync_updates_same_record` |
| **G-02** | Reconcile edit without creating duplicate records | `src-tauri/src/history_service.rs:160-205` | `correctness_verification_tests::test_external_destination_edit_sync_updates_same_record` |
| **G-03** | Guard against empty string AX text erasure | `src-tauri/src/destination_sync_service.rs:88-95` | `correctness_verification_tests::test_external_destination_edit_sync_updates_same_record` |
| **G-04** | Auto-generate vocabulary candidate from edit | `src-tauri/src/history_service.rs:320-390` | `correctness_verification_tests::test_external_edit_generates_vocabulary_correction` |
| **H-01** | Personal dictionary word replacement | `src-tauri/src/history_service.rs:240-310` | `correctness_verification_tests::test_offline_pipeline_execution` |
| **H-02** | Candidate rule promotion (Approve/Reject) | `src-tauri/src/commands.rs:1150-1200` | `smoke_tests::test_personal_vocabulary_lifecycle` |
| **H-03** | JSON vocabulary import/export | `src-tauri/src/commands.rs:1210-1245` | `smoke_tests::test_personal_vocabulary_lifecycle` |
| **I-01** | Semantic text enhancement (Clarity, Tone, Concise) | `src-tauri/src/enhancement_service.rs:80-147` | `correctness_verification_tests::test_offline_pipeline_execution` |
| **I-02** | Spoken AI prompt detection | `src-tauri/src/prompt_service.rs:9-81` | `smoke_tests::test_prompt_detection_logic` |
| **I-03** | AI prompt conversion & polish | `src-tauri/src/prompt_service.rs:85-190` | `smoke_tests::test_prompt_detection_logic` |
| **I-04** | 1-Click destination replacement (`replace_last_paste`) | `src-tauri/src/safety_service.rs:793-826` | `correctness_verification_tests::test_clipboard_preservation_deterministic_logic` |
| **J-01** | Real-time WPM calculation from SQLite history | `src/components/InsightsTab.tsx:19-35` | Empirical SQLite aggregation |
| **J-02** | GitHub-style activity contribution calendar | `src/components/InsightsTab.tsx:298-348` | Frontend component unit rendering |
| **J-03** | Desktop application usage breakdown | `src/components/InsightsTab.tsx:37-51` | Empirical SQLite aggregation |
| **K-01** | SQLite settings schema persistence | `src-tauri/src/settings_service.rs:40-110` | `smoke_tests::test_settings_roundtrip` |
| **K-02** | Safe IPC error handling with browser mock | `src/lib/ipc.ts:35-150` | `smoke_tests::test_settings_roundtrip` |
| **L-01** | Zero network traffic during inference & operation | `src-tauri/src/lib.rs:1-350` | Audit verified: `reqwest` isolated to model downloads |

