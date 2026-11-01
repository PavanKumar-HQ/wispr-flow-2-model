pub mod model_manifest;
pub mod model_manager;
pub mod audio_service;
pub mod whisper_service;
pub mod formatter;
pub mod safety_service;
pub mod history_service;
pub mod settings_service;
pub mod commands;
#[cfg(test)]
pub mod smoke_tests;

use std::sync::{Arc, Mutex};
use std::time::Instant;

use crate::audio_service::AudioCaptureService;
use crate::whisper_service::WhisperEngine;
use crate::safety_service::TargetSnapshot;
use crate::history_service::HistoryDatabase;
use crate::settings_service::{load_settings, AppSettings};

pub struct AppState {
    pub audio: Arc<Mutex<AudioCaptureService>>,
    pub whisper: Arc<Mutex<WhisperEngine>>,
    pub history: Arc<HistoryDatabase>,
    pub settings: Arc<Mutex<AppSettings>>,
    pub active_target: Arc<Mutex<Option<TargetSnapshot>>>,
    pub recording_start: Arc<Mutex<Option<Instant>>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let history_db = Arc::new(HistoryDatabase::new().expect("Failed to initialize History SQLite DB"));
    let settings = Arc::new(Mutex::new(load_settings()));
    let audio_service = Arc::new(Mutex::new(AudioCaptureService::new()));
    let whisper_engine = Arc::new(Mutex::new(WhisperEngine::new()));
    let active_target = Arc::new(Mutex::new(None));
    let recording_start = Arc::new(Mutex::new(None));

    let app_state = AppState {
        audio: Arc::clone(&audio_service),
        whisper: Arc::clone(&whisper_engine),
        history: Arc::clone(&history_db),
        settings: Arc::clone(&settings),
        active_target: Arc::clone(&active_target),
        recording_start: Arc::clone(&recording_start),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            commands::get_models,
            commands::download_model,
            commands::start_dictation,
            commands::stop_dictation,
            commands::toggle_dictation,
            commands::get_history,
            commands::clear_history,
            commands::delete_history_item,
            commands::get_settings,
            commands::save_settings_cmd,
            commands::get_audio_devices,
            commands::smoke_test_transcription
        ])
        .run(tauri::generate_context!())
        .expect("error while running VoxQuest application");
}
