use std::sync::{Arc, Mutex};
use std::time::Instant;
use tauri::{AppHandle, Manager, WebviewWindowBuilder, WebviewUrl};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

#[cfg(target_os = "macos")]
use objc::{sel, sel_impl};


#[cfg(target_os = "macos")]
pub fn run_on_main_thread<F: FnOnce() + Send + 'static>(f: F) {
    use std::ffi::c_void;
    extern "C" {
        fn dispatch_async_f(queue: *mut c_void, context: *mut c_void, work: extern "C" fn(*mut c_void));
        static _dispatch_main_q: c_void;
    }
    extern "C" fn tramp<F: FnOnce()>(context: *mut c_void) {
        let b = unsafe { Box::from_raw(context as *mut F) };
        b();
    }
    let b = Box::new(f);
    unsafe {
        let queue = &_dispatch_main_q as *const _ as *mut c_void;
        dispatch_async_f(queue, Box::into_raw(b) as *mut c_void, tramp::<F>);
    }
}

#[cfg(not(target_os = "macos"))]
pub fn run_on_main_thread<F: FnOnce() + Send + 'static>(f: F) {
    f();
}

use crate::audio_service::AudioCaptureService;
use crate::whisper_service::WhisperEngine;
use crate::safety_service::TargetSnapshot;
use crate::history_service::HistoryDatabase;
use crate::settings_service::{load_settings, AppSettings};
use crate::session_state::{SessionState, SessionSnapshot};

pub mod session_state;
pub mod model_manifest;
pub mod model_manager;
pub mod audio_service;
pub mod whisper_service;
pub mod formatter;
pub mod safety_service;
pub mod history_service;
pub mod personalization_service;
pub mod prompt_service;
pub mod enhancement_service;
pub mod destination_sync_service;
pub mod cloud_speech_service;
pub mod settings_service;
pub mod commands;
#[cfg(test)]
pub mod smoke_tests;
#[cfg(test)]
pub mod pipeline_tests;
#[cfg(test)]
pub mod e2e_tests;
#[cfg(test)]
pub mod correctness_verification_tests;
#[cfg(test)]
pub mod noisy_speech_benchmark;

static LAST_SHORTCUT_EVENT: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
static IS_SHORTCUT_HELD: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);
static SESSION_STARTED_BY_HOTKEY: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);
static SHORTCUT_PRESS_TIME: Mutex<Option<Instant>> = Mutex::new(None);

#[cfg(target_os = "macos")]
#[link(name = "CoreGraphics", kind = "framework")]
extern "C" {
    fn CGEventSourceKeyState(state_id: i32, key: u16) -> bool;
    fn CGEventSourceFlagsState(state_id: i32) -> u64;
}

#[cfg(target_os = "macos")]
pub fn is_key_physically_pressed(key_code: u16) -> bool {
    unsafe {
        CGEventSourceKeyState(1, key_code) || CGEventSourceKeyState(0, key_code)
    }
}

#[cfg(target_os = "macos")]
pub fn get_modifier_flags() -> u64 {
    unsafe {
        CGEventSourceFlagsState(1) | CGEventSourceFlagsState(0)
    }
}

pub fn is_session_started_by_hotkey() -> bool {
    SESSION_STARTED_BY_HOTKEY.load(std::sync::atomic::Ordering::SeqCst)
}

/// Checks whether the user is physically holding the shortcut key combination down right now.
pub fn is_shortcut_physically_held(shortcut_str: &str) -> bool {
    #[cfg(target_os = "macos")]
    {
        let lower = shortcut_str.to_lowercase();
        let flags = get_modifier_flags();

        // Check if shortcut uses Command / Cmd (including CommandOrControl on macOS)
        let needs_cmd = lower.contains("commandorcontrol")
            || lower.contains("command")
            || lower.contains("cmd")
            || lower.contains("super");

        let cmd_held = if needs_cmd {
            (flags & 0x00100000 != 0) || is_key_physically_pressed(55) || is_key_physically_pressed(54)
        } else {
            false
        };

        // Check Shift
        let needs_shift = lower.contains("shift");
        let shift_held = if needs_shift {
            (flags & 0x00020000 != 0) || is_key_physically_pressed(56) || is_key_physically_pressed(60)
        } else {
            false
        };

        // Check Alt / Option
        let needs_alt = lower.contains("alt") || lower.contains("option");
        let alt_held = if needs_alt {
            (flags & 0x00080000 != 0) || is_key_physically_pressed(58) || is_key_physically_pressed(61)
        } else {
            false
        };

        // Check Control ONLY if explicitly specified without "commandorcontrol"
        let stripped_of_coc = lower.replace("commandorcontrol", "");
        let needs_ctrl = stripped_of_coc.contains("control") || stripped_of_coc.contains("ctrl");
        let ctrl_held = if needs_ctrl {
            (flags & 0x00040000 != 0) || is_key_physically_pressed(59) || is_key_physically_pressed(62)
        } else {
            false
        };

        // Check primary key
        let key_code = if lower.ends_with("+k") || lower.ends_with(" k") || lower == "k" {
            Some(40) // K
        } else if lower.ends_with("+space") || lower.ends_with(" space") || lower == "space" {
            Some(49) // Space
        } else if lower.ends_with("+d") || lower.ends_with(" d") || lower == "d" {
            Some(2) // D
        } else if lower.ends_with("+j") || lower.ends_with(" j") || lower == "j" {
            Some(38) // J
        } else if lower.ends_with("+f") || lower.ends_with(" f") || lower == "f" {
            Some(3) // F
        } else if lower.ends_with("+r") || lower.ends_with(" r") || lower == "r" {
            Some(15) // R
        } else {
            None
        };

        let key_held = if let Some(code) = key_code {
            is_key_physically_pressed(code)
        } else {
            false
        };

        let has_modifiers = needs_cmd || needs_shift || needs_alt || needs_ctrl;

        if has_modifiers {
            // As long as ANY configured modifier (e.g. Command) or the primary key is physically held,
            // the user is holding the push-to-talk hotkey!
            // Dictation only stops when all components have been physically released.
            cmd_held || shift_held || alt_held || ctrl_held || key_held
        } else if let Some(_) = key_code {
            key_held
        } else {
            is_shortcut_held()
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        is_shortcut_held()
    }
}

pub fn is_shortcut_held() -> bool {
    IS_SHORTCUT_HELD.load(std::sync::atomic::Ordering::SeqCst)
}

pub fn is_shortcut_active() -> bool {
    SHORTCUT_PRESS_TIME.lock().ok().and_then(|t| *t).is_some()
}

pub fn reset_shortcut_held() {
    IS_SHORTCUT_HELD.store(false, std::sync::atomic::Ordering::SeqCst);
    SESSION_STARTED_BY_HOTKEY.store(false, std::sync::atomic::Ordering::SeqCst);
    if let Ok(mut t) = SHORTCUT_PRESS_TIME.lock() {
        *t = None;
    }
}

pub struct AppState {
    pub audio: Arc<Mutex<AudioCaptureService>>,
    pub whisper: Arc<Mutex<WhisperEngine>>,
    pub history: Arc<HistoryDatabase>,
    pub settings: Arc<Mutex<AppSettings>>,
    pub active_target: Arc<Mutex<Option<TargetSnapshot>>>,
    pub recording_start: Arc<Mutex<Option<Instant>>>,
    pub active_session: Arc<Mutex<SessionSnapshot>>,
    pub destination_sync: Arc<destination_sync_service::DestinationSyncService>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let history_db = Arc::new(HistoryDatabase::new().expect("Failed to initialize History SQLite DB"));
    let settings = Arc::new(Mutex::new(load_settings()));
    let audio_service = Arc::new(Mutex::new(AudioCaptureService::new()));
    let whisper_engine = Arc::new(Mutex::new(WhisperEngine::new()));
    let active_target = Arc::new(Mutex::new(None));
    let recording_start = Arc::new(Mutex::new(None));
    let destination_sync = Arc::new(destination_sync_service::DestinationSyncService::new());
    let active_session = Arc::new(Mutex::new(SessionSnapshot {
        session_id: String::new(),
        sequence: 0,
        state: SessionState::Idle,
        message: Some("Ready to dictate. Press shortcut or click pill.".to_string()),
        elapsed_seconds: 0.0,
        last_transcript: None,
        target_app: None,
        target_window: None,
        recovery_id: None,
        timestamp_ms: 0,
        technical_suggestion: None,
        active_model_name: None,
    }));

    let app_state = AppState {
        audio: Arc::clone(&audio_service),
        whisper: Arc::clone(&whisper_engine),
        history: Arc::clone(&history_db),
        settings: Arc::clone(&settings),
        active_target: Arc::clone(&active_target),
        recording_start: Arc::clone(&recording_start),
        active_session: Arc::clone(&active_session),
        destination_sync: Arc::clone(&destination_sync),
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
                    let app_handle = app.clone();
                    let app_handle_inner = app.clone();
                    // Universal robust shortcut behavior:
                    // 1. Press and hold shortcut -> records while speaking, releasing stops and automatically inserts.
                    // 2. Ignore key auto-repeat while key is held down.
                    // 3. Tapping also supported in toggle mode.
                    if event.state == ShortcutState::Pressed {
                        SESSION_STARTED_BY_HOTKEY.store(true, std::sync::atomic::Ordering::SeqCst);
                        let was_held = IS_SHORTCUT_HELD.swap(true, std::sync::atomic::Ordering::SeqCst);
                        if was_held {
                            // macOS keyboard auto-repeat: key is already held down and recording is running.
                            // Strictly ignore repeated key-down events so recording is never interrupted!
                            return;
                        }

                        let now = std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_millis() as u64;
                        let last = LAST_SHORTCUT_EVENT.load(std::sync::atomic::Ordering::Relaxed);
                        if now.saturating_sub(last) < 150 {
                            return;
                        }
                        LAST_SHORTCUT_EVENT.store(now, std::sync::atomic::Ordering::Relaxed);

                        if let Ok(mut lock) = SHORTCUT_PRESS_TIME.lock() {
                            *lock = Some(Instant::now());
                        }

                        tauri::async_runtime::spawn_blocking(move || {
                            if let Some(state) = app_handle.try_state::<AppState>() {
                                let current_state = {
                                    let sess = state.active_session.lock().unwrap();
                                    sess.state
                                };

                                match current_state {
                                    SessionState::Recording => {
                                        // User tapped shortcut while in active recording -> stop and transcribe
                                        println!("[VoxQuest Hotkey] New press while recording -> stopping dictation");
                                        let _ = commands::stop_dictation(state, app_handle_inner);
                                    }
                                    s if s.is_active() => {
                                        // An operation (Starting, Transcribing, Formatting, Inserting) is actively processing.
                                        // Strictly reject new session creation to eliminate overlapping transcription races!
                                        println!("[VoxQuest Hotkey] Ignored press: session is currently busy ({:?})", s);
                                    }
                                    _ => {
                                        // Normal start: start microphone and capture destination
                                        println!("[VoxQuest Hotkey] Key pressed -> starting dictation");
                                        let _ = commands::start_dictation(state, app_handle_inner);
                                    }
                                }
                            }
                        });
                    } else if event.state == ShortcutState::Released {
                        IS_SHORTCUT_HELD.store(false, std::sync::atomic::Ordering::SeqCst);
                        let held_start = if let Ok(mut lock) = SHORTCUT_PRESS_TIME.lock() {
                            lock.take()
                        } else {
                            None
                        };

                        let mode = if let Some(state) = app_handle.try_state::<AppState>() {
                            let s = state.settings.lock().unwrap();
                            s.interaction_mode.clone()
                        } else {
                            "push_to_talk".to_string()
                        };

                        let press_duration = held_start.map(|t| t.elapsed()).unwrap_or_default();
                        let should_stop_on_release = mode == "push_to_talk";

                        if should_stop_on_release {
                            tauri::async_runtime::spawn_blocking(move || {
                                if let Some(state) = app_handle.try_state::<AppState>() {
                                    // Wait up to 500ms if audio initialization is still in 'Starting' state
                                    for _ in 0..10 {
                                        let sess_state = {
                                            let sess = state.active_session.lock().unwrap();
                                            sess.state
                                        };
                                        if sess_state == SessionState::Recording {
                                            println!("[VoxQuest Hotkey] Key released after {:?} -> stopping and transcribing", press_duration);
                                            let _ = commands::stop_dictation(state, app_handle_inner);
                                            break;
                                        } else if sess_state == SessionState::Starting {
                                            std::thread::sleep(std::time::Duration::from_millis(50));
                                        } else {
                                            break;
                                        }
                                    }
                                }
                            });
                        }
                    }
                })
                .build()
        )
        .manage(app_state)
        .setup(move |app| {
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

            // Intercept close button on main window: hide instead of exiting so background hotkey stays alive
            if let Some(main_win) = app.get_webview_window("main") {
                let win_clone = main_win.clone();
                main_win.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = win_clone.hide();
                    }
                });
            }

            // Create non-activating floating indicator window (hidden on launch until summoned by shortcut or button)
            if app.get_webview_window("floating-indicator").is_none() {
                let pill_builder = WebviewWindowBuilder::new(
                    app,
                    "floating-indicator",
                    WebviewUrl::App("index.html#pill".into())
                )
                .title("VoxQuest Status")
                .inner_size(440.0, 60.0)
                .decorations(false)
                .always_on_top(true)
                .transparent(true)
                .skip_taskbar(true)
                .focused(false)
                .visible(false);

                if let Ok(pill_win) = pill_builder.build() {
                    // Position at bottom-center of the primary display
                    if let Ok(Some(monitor)) = pill_win.primary_monitor() {
                        let size = monitor.size();
                        let scale = monitor.scale_factor();
                        let screen_w = size.width as f64 / scale;
                        let screen_h = size.height as f64 / scale;
                        let x = (screen_w - 440.0) / 2.0;
                        let y = screen_h - 110.0;
                        let _ = pill_win.set_position(tauri::Position::Logical(tauri::LogicalPosition::new(x, y)));
                    }

                    #[cfg(target_os = "macos")]
                    if let Ok(ns_win) = pill_win.ns_window() {
                        use cocoa::base::id;
                        let ns_win = ns_win as id;
                        unsafe {
                            // NSWindowCollectionBehaviorCanJoinAllSpaces (1) | NSWindowCollectionBehaviorFullScreenAuxiliary (256)
                            let behavior: u64 = (1 << 0) | (1 << 8);
                            let () = objc::msg_send![ns_win, setCollectionBehavior: behavior];
                            // PopUpMenuWindowLevel (101) floats above normal windows and full screen spaces
                            let () = objc::msg_send![ns_win, setLevel: 101i64];
                            let () = objc::msg_send![ns_win, setHidesOnDeactivate: 0u8];
                            let () = objc::msg_send![ns_win, setMovableByWindowBackground: 1u8];
                            let () = objc::msg_send![ns_win, setMovable: 1u8];
                        }
                    }
                }
            }

            // Background pre-warming for Whisper model to eliminate first-use inference latency
            if let Some(state) = app.try_state::<AppState>() {
                let whisper = Arc::clone(&state.whisper);
                let settings = Arc::clone(&state.settings);
                std::thread::spawn(move || {
                    let default_model_id = {
                        let s = settings.lock().unwrap();
                        s.default_model_id.clone()
                    };
                    let models_dir = model_manager::get_voxquest_models_dir();
                    let manifest = model_manifest::get_official_manifest();
                    let target_info = if default_model_id == "auto" {
                        manifest.iter()
                            .filter(|m| models_dir.join(&m.filename).exists())
                            .next()
                            .or_else(|| manifest.iter().find(|m| m.recommended))
                    } else {
                        manifest.iter().find(|m| m.id == default_model_id)
                    };
                    if let Some(info) = target_info {
                        let model_path = models_dir.join(&info.filename);
                        if model_path.exists() {
                            let mut engine = whisper.lock().unwrap();
                            let _ = engine.load_model(&model_path);
                        }
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_models,
            commands::download_model,
            commands::start_dictation,
            commands::stop_dictation,
            commands::cancel_dictation,
            commands::retry_insertion,
            commands::toggle_dictation,
            commands::get_session_snapshot,
            commands::get_dictation_status,
            commands::get_capabilities,
            commands::get_history,
            commands::clear_history,
            commands::delete_history_item,
            commands::get_settings,
            commands::save_settings_cmd,
            commands::get_audio_devices,
            commands::smoke_test_transcription,
            commands::get_audio_level,
            commands::show_pill_window,
            commands::center_pill_window,
            commands::hide_pill_window,
            commands::get_insights,
            commands::get_dictionary_entries,
            commands::add_dictionary_entry,
            commands::delete_dictionary_entry,
            commands::get_recovery_records,
            commands::update_recovery_text,
            commands::copy_recovery_text,
            commands::dismiss_recovery_record,
            commands::insert_into_selected_field,
            commands::get_personal_vocabulary,
            commands::add_personal_vocabulary_entry,
            commands::toggle_personal_vocabulary_entry,
            commands::export_dictionary_json,
            commands::propose_correction_rules,
            commands::update_personal_vocabulary_entry,
            commands::delete_personal_vocabulary_entry,
            commands::reset_personalization,
            commands::submit_transcript_correction,
            commands::polish_transcript_cmd,
            commands::detect_prompt_cmd,
            commands::enhance_prompt_cmd,
            commands::enhance_text_cmd,
            commands::accept_enhancement_session_cmd,
            commands::accept_enhancement_history_cmd,
            commands::restore_original_history_cmd,
            commands::request_accessibility_permission,
            commands::switch_speech_profile,
            commands::dismiss_technical_suggestion,
            commands::compose_thought_to_spec_cmd,
            commands::ingest_project_context_capsule_cmd
        ])
        .run(tauri::generate_context!())
        .expect("error while running VoxQuest application");
}
