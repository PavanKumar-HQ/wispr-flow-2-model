use std::time::Instant;
use tauri::{AppHandle, Emitter, State};
use serde::{Deserialize, Serialize};

use crate::AppState;
use crate::model_manifest::{self, ModelInfo};
use crate::model_manager;
use crate::audio_service::AudioCaptureService;
use crate::formatter::{format_transcript, FormattingConfig};
use crate::safety_service::{TargetSnapshot, insert_text_safely};
use crate::history_service::HistoryRecord;
use crate::settings_service::{save_settings, AppSettings};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DictationStatus {
    pub state: String, // "idle", "recording", "transcribing", "success", "error"
    pub message: Option<String>,
    pub last_transcript: Option<String>,
}

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
pub fn start_dictation(state: State<'_, AppState>, app: AppHandle) -> Result<(), String> {
    let snapshot = TargetSnapshot::capture_current();
    {
        let mut target_lock = state.active_target.lock().unwrap();
        *target_lock = Some(snapshot);
    }

    {
        let mut audio = state.audio.lock().unwrap();
        audio.start_recording()?;
    }

    {
        let mut start_lock = state.recording_start.lock().unwrap();
        *start_lock = Some(Instant::now());
    }

    let _ = app.emit("dictation-state-changed", DictationStatus {
        state: "recording".to_string(),
        message: Some("Listening naturally... Press shortcut again to complete".to_string()),
        last_transcript: None,
    });

    Ok(())
}

#[tauri::command]
pub fn stop_dictation(state: State<'_, AppState>, app: AppHandle) -> Result<String, String> {
    let _ = app.emit("dictation-state-changed", DictationStatus {
        state: "transcribing".to_string(),
        message: Some("Processing local speech recognition...".to_string()),
        last_transcript: None,
    });

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
        return Err(format!("Model {} is not yet downloaded. Please install it in Model Settings.", current_info.name));
    }

    {
        let mut engine = state.whisper.lock().unwrap();
        if !engine.is_loaded() {
            engine.load_model(&model_path)?;
        }
    }

    let raw_transcript = {
        let mut engine = state.whisper.lock().unwrap();
        engine.transcribe(&audio_samples, Some(&settings.language))?
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

    let mut insertion_status = "inserted";
    let target_app_name = target_snapshot.as_ref().and_then(|s| s.platform_app_id.clone());

    if let Some(ref snapshot) = target_snapshot {
        match insert_text_safely(&formatted_transcript, snapshot) {
            Ok(_) => {
                insertion_status = "inserted";
            }
            Err(e) => {
                eprintln!("Safe insertion guarded: {}", e);
                insertion_status = "preserved_for_recovery";
            }
        }
    }

    if settings.retain_history && !formatted_transcript.is_empty() {
        let _ = state.history.insert_record(
            &raw_transcript,
            &formatted_transcript,
            duration_sec,
            insertion_status,
            target_app_name.as_deref(),
        );
    }

    let _ = app.emit("dictation-state-changed", DictationStatus {
        state: if insertion_status == "inserted" { "success".to_string() } else { "warning".to_string() },
        message: if insertion_status == "inserted" {
            Some("Dictation inserted successfully!".to_string())
        } else {
            Some("Active window changed during speech. Preserved safely in history!".to_string())
        },
        last_transcript: Some(formatted_transcript.clone()),
    });

    Ok(formatted_transcript)
}

#[tauri::command]
pub fn toggle_dictation(state: State<'_, AppState>, app: AppHandle) -> Result<String, String> {
    let is_rec = {
        let audio = state.audio.lock().unwrap();
        audio.is_recording()
    };

    if is_rec {
        stop_dictation(state, app)
    } else {
        start_dictation(state, app)?;
        Ok("Recording started".to_string())
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
    let info = manifest.iter().find(|m| m.id == model_id)
        .ok_or_else(|| format!("Unknown model: {}", model_id))?;

    let model_path = models_dir.join(&info.filename);
    if !model_path.exists() {
        return Err(format!("Model file {} does not exist on disk", info.filename));
    }

    let mut engine = state.whisper.lock().unwrap();
    engine.load_model(&model_path)?;

    let sample_rate = 16000;
    let mut test_audio = Vec::with_capacity(sample_rate);
    for i in 0..sample_rate {
        let t = i as f32 / sample_rate as f32;
        let sample = (2.0 * std::f32::consts::PI * 440.0 * t).sin() * 0.1;
        test_audio.push(sample);
    }

    let result = engine.transcribe(&test_audio, Some("en"))?;
    Ok(format!("Smoke test passed! Engine initialized successfully with {}. Output: '{}'", info.name, result))
}

