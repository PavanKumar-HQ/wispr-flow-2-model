use std::sync::{Arc, Mutex};
use std::time::Instant;
use tauri::{AppHandle, Manager, WebviewWindowBuilder, WebviewUrl};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

use crate::audio_service::AudioCaptureService;
use crate::whisper_service::WhisperEngine;
use crate::safety_service::TargetSnapshot;
use crate::history_service::HistoryDatabase;
use crate::settings_service::{load_settings, AppSettings};

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
#[cfg(test)]
pub mod pipeline_tests;
#[cfg(test)]
pub mod e2e_tests;

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

    let initial_shortcut_str = {
        let s = settings.lock().unwrap();
        s.shortcut.clone()
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app: &AppHandle, _shortcut: &Shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        let app_handle = app.clone();
                        let app_handle_inner = app.clone();
                        // Dispatch async dictation toggle safely without blocking the hotkey hook
                        tauri::async_runtime::spawn(async move {
                            if let Some(state) = app_handle.try_state::<AppState>() {
                                let _ = commands::toggle_dictation(state, app_handle_inner);
                            }
                        });
                    }
                })
                .build()
        )
        .manage(app_state)
        .setup(move |app| {
            // Register global shortcut on startup
            let shortcut_res = initial_shortcut_str.parse::<Shortcut>();
            match shortcut_res {
                Ok(sc) => {
                    if let Err(e) = app.global_shortcut().register(sc) {
                        eprintln!("Warning: failed to register global hotkey '{}': {}", initial_shortcut_str, e);
                    } else {
                        println!("VoxQuest global hotkey registered successfully: {}", initial_shortcut_str);
                    }
                }
                Err(e) => {
                    eprintln!("Invalid shortcut string '{}': {:?}", initial_shortcut_str, e);
                }
            }

            // Create non-activating floating indicator window
            // Always on top, hidden titlebar, transparent, does not steal focus
            if app.get_webview_window("floating-indicator").is_none() {
                let _ = WebviewWindowBuilder::new(
                    app,
                    "floating-indicator",
                    WebviewUrl::App("index.html#pill".into())
                )
                .title("VoxQuest Status")
                .inner_size(360.0, 90.0)
                .decorations(false)
                .always_on_top(true)
                .transparent(true)
                .skip_taskbar(true)
                .focused(false) // Does not steal focus from the user's active editor
                .build();
            }

            Ok(())
        })
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
