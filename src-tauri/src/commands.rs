use std::time::Instant;
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

use crate::AppState;
use crate::audio_service::AudioCaptureService;
use crate::session_state::{SessionState, SessionSnapshot};
use crate::model_manifest::{self, ModelInfo};
use crate::model_manager;
use crate::formatter::{format_transcript, FormattingConfig};
use crate::safety_service::{TargetSnapshot, insert_text_safely};
use crate::history_service::HistoryRecord;
use crate::settings_service::{save_settings, AppSettings};

// DictationStatus alias for backward compatibility
pub type DictationStatus = SessionSnapshot;

#[tauri::command]
pub fn get_models(state: State<'_, AppState>) -> Vec<ModelInfo> {
    let _ = state;
    model_manager::list_models()
}

#[tauri::command]
pub fn download_model(app: AppHandle, model_id: String) -> Result<String, String> {
    let app_handle = app.clone();
    std::thread::spawn(move || {
        let res = model_manager::download_model_sync(&model_id, |downloaded, total| {
            let pct = if total > 0 { (downloaded as f64 / total as f64 * 100.0) as u32 } else { 0 };
            let _ = app_handle.emit("model-download-progress", serde_json::json!({
                "model_id": model_id,
                "downloaded": downloaded,
                "total": total,
                "percent": pct
            }));
        });

        match res {
            Ok(path) => {
                let _ = app_handle.emit("model-download-complete", serde_json::json!({
                    "model_id": model_id,
                    "path": path.to_string_lossy().to_string()
                }));
            }
            Err(e) => {
                let _ = app_handle.emit("model-download-error", serde_json::json!({
                    "model_id": model_id,
                    "error": e
                }));
            }
        }
    });

    Ok("Download started".to_string())
}

#[tauri::command]
pub fn get_session_snapshot(state: State<'_, AppState>) -> SessionSnapshot {
    let session_lock = state.active_session.lock().unwrap();
    session_lock.clone()
}

#[tauri::command]
pub fn start_dictation(state: State<'_, AppState>, app: AppHandle) -> Result<SessionSnapshot, String> {
    let mut session_lock = state.active_session.lock().unwrap();
    if session_lock.state.is_active() {
        return Err("A dictation session is already active".to_string());
    }

    if !session_lock.state.can_transition_to(SessionState::Starting) {
        return Err(format!("Cannot transition from {} to starting", session_lock.state));
    }

    let session_id = Uuid::new_v4().to_string();
    let snapshot = TargetSnapshot::capture_current();
    let target_app_name = snapshot.platform_app_id.clone();

    // Store target snapshot
    {
        let mut target_lock = state.active_target.lock().unwrap();
        *target_lock = Some(snapshot);
    }

    // Start physical audio recording
    {
        let mut audio = state.audio.lock().unwrap();
        if let Err(e) = audio.start_recording() {
            session_lock.state = SessionState::Failed;
            session_lock.message = Some(format!("Microphone error: {}", e));
            let snap = session_lock.clone();
            let _ = app.emit("dictation-session-changed", &snap);
            return Err(e);
        }
    }

    {
        let mut start_lock = state.recording_start.lock().unwrap();
        *start_lock = Some(Instant::now());
    }

    session_lock.session_id = session_id.clone();
    session_lock.state = SessionState::Recording;
    session_lock.message = Some("Listening naturally across all windows... Press shortcut or click pill to finish.".to_string());
    session_lock.elapsed_seconds = 0.0;
    session_lock.last_transcript = None;
    session_lock.target_app = target_app_name;
    session_lock.recovery_id = None;

    let snap = session_lock.clone();
    let _ = app.emit("dictation-session-changed", &snap);

    Ok(snap)
}

#[tauri::command]
pub fn stop_dictation(state: State<'_, AppState>, app: AppHandle) -> Result<SessionSnapshot, String> {
    let session_id = {
        let mut session_lock = state.active_session.lock().unwrap();
        if session_lock.state != SessionState::Recording {
            return Err("Cannot stop: session is not in recording state".to_string());
        }
        session_lock.state = SessionState::Transcribing;
        session_lock.message = Some("Transcribing audio locally via whisper.cpp...".to_string());
        let snap = session_lock.clone();
        let _ = app.emit("dictation-session-changed", &snap);
        session_lock.session_id.clone()
    };

    let audio_samples = {
        let mut audio = state.audio.lock().unwrap();
        audio.stop_recording()?
    };

    let duration_sec = {
        let start_lock = state.recording_start.lock().unwrap();
        start_lock.map(|s| s.elapsed().as_secs_f32()).unwrap_or(0.0)
    };

    let settings = {
        let s = state.settings.lock().unwrap();
        s.clone()
    };

    let models_dir = model_manager::get_voxquest_models_dir();
    let manifest = model_manifest::get_official_manifest();
    let current_info = manifest.iter()
        .find(|m| m.id == settings.default_model_id)
        .or_else(|| manifest.iter().find(|m| m.recommended))
        .ok_or_else(|| "No model manifest found".to_string())?;

    let model_path = models_dir.join(&current_info.filename);
    if !model_path.exists() {
        let mut session_lock = state.active_session.lock().unwrap();
        session_lock.state = SessionState::Failed;
        session_lock.message = Some(format!("Model {} is not downloaded. Please install it in Model Settings.", current_info.name));
        let snap = session_lock.clone();
        let _ = app.emit("dictation-session-changed", &snap);
        return Err(format!("Model {} is not installed", current_info.name));
    }

    {
        let mut engine = state.whisper.lock().unwrap();
        if !engine.is_loaded() {
            engine.load_model(&model_path)?;
        }
    }

    let raw_transcript = {
        let mut engine = state.whisper.lock().unwrap();
        let lang = if settings.language == "auto" { None } else { Some(settings.language.as_str()) };
        engine.transcribe(&audio_samples, lang)?
    };

    let fmt_cfg = FormattingConfig {
        spoken_punctuation: settings.spoken_punctuation,
        conservative_filler_removal: settings.conservative_filler_removal,
        auto_capitalization: settings.auto_capitalization,
    };
    let formatted_transcript = format_transcript(&raw_transcript, &fmt_cfg);

    let target_snapshot = {
        let mut t = state.active_target.lock().unwrap();
        t.take()
    };

    let target_app_name = target_snapshot.as_ref().and_then(|s| s.platform_app_id.clone());

    // Evaluate destination resolution policy
    let should_insert = if settings.insertion_policy == "active_at_stop" {
        // Target whatever valid editable window is currently active at stop time
        let current_snap = TargetSnapshot::capture_current();
        !current_snap.is_secure_input
    } else {
        // Safe default: original destination must match
        target_snapshot.as_ref().map(|s| s.is_destination_safe()).unwrap_or(false)
    };

    let mut record_id: Option<i64> = None;

    let mut session_lock = state.active_session.lock().unwrap();
    // Verify session ID has not been superceded
    if session_lock.session_id != session_id {
        return Err("Session was cancelled or superceded".to_string());
    }

    if should_insert && !formatted_transcript.trim().is_empty() {
        session_lock.state = SessionState::Inserting;
        let snap = session_lock.clone();
        let _ = app.emit("dictation-session-changed", &snap);

        if let Some(ref snapshot) = target_snapshot {
            match insert_text_safely(&formatted_transcript, snapshot) {
                Ok(_) => {
                    if settings.retain_history {
                        record_id = state.history.insert_record(
                            &raw_transcript,
                            &formatted_transcript,
                            duration_sec,
                            "inserted",
                            target_app_name.as_deref(),
                        ).ok();
                    }
                    session_lock.state = SessionState::Completed;
                    session_lock.message = Some("Dictated text inserted successfully into target field.".to_string());
                    session_lock.last_transcript = Some(formatted_transcript.clone());
                    session_lock.recovery_id = record_id;
                }
                Err(e) => {
                    eprintln!("Insertion guarded: {}", e);
                    if settings.retain_history {
                        record_id = state.history.insert_record(
                            &raw_transcript,
                            &formatted_transcript,
                            duration_sec,
                            "recovery_required",
                            target_app_name.as_deref(),
                        ).ok();
                    }
                    session_lock.state = SessionState::RecoveryRequired;
                    session_lock.message = Some("Original field was unavailable. Preserved safely for one-click recovery!".to_string());
                    session_lock.last_transcript = Some(formatted_transcript.clone());
                    session_lock.recovery_id = record_id;
                }
            }
        }
    } else {
        // Destination mismatch, navigation occurred, or empty text
        if settings.retain_history && !formatted_transcript.trim().is_empty() {
            record_id = state.history.insert_record(
                &raw_transcript,
                &formatted_transcript,
                duration_sec,
                "recovery_required",
                target_app_name.as_deref(),
            ).ok();
        }

        if formatted_transcript.trim().is_empty() {
            session_lock.state = SessionState::Completed;
            session_lock.message = Some("Dictation was silent or had no audible speech.".to_string());
            session_lock.last_transcript = None;
        } else {
            session_lock.state = SessionState::RecoveryRequired;
            session_lock.message = Some("Destination changed during dictation. Preserved safely for manual copy or insertion.".to_string());
            session_lock.last_transcript = Some(formatted_transcript.clone());
            session_lock.recovery_id = record_id;
        }
    }

    let final_snap = session_lock.clone();
    let _ = app.emit("dictation-session-changed", &final_snap);

    Ok(final_snap)
}

#[tauri::command]
pub fn cancel_dictation(state: State<'_, AppState>, app: AppHandle) -> Result<SessionSnapshot, String> {
    let mut session_lock = state.active_session.lock().unwrap();
    if session_lock.state == SessionState::Recording || session_lock.state == SessionState::Starting {
        let _ = {
            let mut audio = state.audio.lock().unwrap();
            if audio.is_recording() {
                let _ = audio.stop_recording();
            }
        };

        {
            let mut target_lock = state.active_target.lock().unwrap();
            *target_lock = None;
        }

        session_lock.state = SessionState::Cancelled;
        session_lock.message = Some("Dictation session cancelled by user.".to_string());
        session_lock.last_transcript = None;

        let snap = session_lock.clone();
        let _ = app.emit("dictation-session-changed", &snap);
        return Ok(snap);
    }

    Ok(session_lock.clone())
}

#[tauri::command]
pub fn retry_insertion(state: State<'_, AppState>, app: AppHandle, history_id: i64) -> Result<bool, String> {
    let record = state.history.get_record(history_id)?
        .ok_or_else(|| format!("History record {} not found", history_id))?;

    let current_target = TargetSnapshot::capture_current();
    if current_target.is_secure_input {
        return Err("Cannot insert into a secure password field.".to_string());
    }

    match insert_text_safely(&record.formatted_text, &current_target) {
        Ok(_) => {
            let _ = state.history.update_status(history_id, "inserted_via_retry");
            let mut session_lock = state.active_session.lock().unwrap();
            session_lock.state = SessionState::Completed;
            session_lock.message = Some("Text inserted via retry.".to_string());
            let snap = session_lock.clone();
            let _ = app.emit("dictation-session-changed", &snap);
            Ok(true)
        }
        Err(e) => Err(format!("Retry insertion failed: {}", e)),
    }
}

#[tauri::command]
pub fn toggle_dictation(state: State<'_, AppState>, app: AppHandle) -> Result<SessionSnapshot, String> {
    let is_rec = {
        let session_lock = state.active_session.lock().unwrap();
        session_lock.state == SessionState::Recording
    };

    if is_rec {
        stop_dictation(state, app)
    } else {
        start_dictation(state, app)
    }
}

#[tauri::command]
pub fn get_history(state: State<'_, AppState>, limit: Option<u32>) -> Result<Vec<HistoryRecord>, String> {
    state.history.list_records(limit.unwrap_or(50))
}

#[tauri::command]
pub fn clear_history(state: State<'_, AppState>) -> Result<(), String> {
    state.history.clear_all()
}

#[tauri::command]
pub fn delete_history_item(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    state.history.delete_record(id)
}

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> AppSettings {
    let s = state.settings.lock().unwrap();
    s.clone()
}

#[tauri::command]
pub fn save_settings_cmd(state: State<'_, AppState>, new_settings: AppSettings) -> Result<(), String> {
    save_settings(&new_settings)?;
    let mut s = state.settings.lock().unwrap();
    *s = new_settings;
    Ok(())
}

#[tauri::command]
pub fn get_audio_devices() -> Result<Vec<String>, String> {
    AudioCaptureService::list_input_devices()
}

#[tauri::command]
pub fn smoke_test_transcription(state: State<'_, AppState>, model_id: String) -> Result<String, String> {
    let models_dir = model_manager::get_voxquest_models_dir();
    let manifest = model_manifest::get_official_manifest();
    let info = manifest.into_iter().find(|m| m.id == model_id)
        .ok_or_else(|| format!("Unknown model: {}", model_id))?;

    let model_path = models_dir.join(&info.filename);
    if !model_path.exists() {
        return Err(format!("Model file {} not found on disk. Please download it first.", info.filename));
    }

    let mut engine = state.whisper.lock().unwrap();
    engine.load_model(&model_path)?;

    let sample_rate = 16000;
    let mut audio = Vec::with_capacity(sample_rate * 2);
    for i in 0..(sample_rate * 2) {
        let t = i as f32 / sample_rate as f32;
        let sample = (2.0 * std::f32::consts::PI * 440.0 * t).sin() * 0.1;
        audio.push(sample);
    }

    let transcript = engine.transcribe(&audio, Some("en"))?;
    Ok(format!("Local whisper.cpp inference successful on '{}'! Output: '{}'", info.name, transcript))
}
