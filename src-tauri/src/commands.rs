use std::time::Instant;
use std::sync::Arc;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
use uuid::Uuid;

#[cfg(target_os = "macos")]
use objc::{msg_send, sel, sel_impl};

use crate::AppState;
use crate::audio_service::AudioCaptureService;
use crate::session_state::{SessionState, SessionSnapshot};
use crate::model_manifest::{self, ModelInfo};
use crate::model_manager;
use crate::formatter::{format_transcript, FormattingConfig};
use crate::safety_service::{TargetSnapshot, insert_text_safely};
use crate::history_service::HistoryRecord;
use crate::settings_service::{save_settings, AppSettings};
use crate::enhancement_service::{EnhancementRequest, EnhancementResponse, enhance_text};

// DictationStatus alias for backward compatibility
pub type DictationStatus = SessionSnapshot;

pub use crate::formatter::deduplicate_repeated_speech;

pub fn clean_whisper_transcript(raw: &str) -> String {
    let lower = raw.trim().to_lowercase();
    let is_only_annotations = lower.is_empty()
        || lower == "[blank_audio]"
        || lower == "[silence]"
        || lower == "[bell]"
        || lower == "(bell)"
        || lower == "[music]"
        || lower == "(music)"
        || lower == "[applause]"
        || lower == "(applause)"
        || lower == "[cough]"
        || lower == "(cough)"
        || lower == "[laughter]"
        || lower == "(laughter)"
        || lower == "[sigh]"
        || lower == "(sigh)"
        || lower == "[snort]"
        || lower == "[gasp]"
        || lower == "(gasp)"
        || lower == "[screaming]"
        || lower == "[whispering]"
        || lower == "(whispering)"
        || lower == "[cheering]"
        || lower == "(cheering)"
        || lower == "[background noise]"
        || (lower.starts_with('[') && lower.ends_with(']'));

    if is_only_annotations {
        return String::new();
    }

    // Filter Whisper's known training hallucinations on video/dataset endings
    let stripped = lower.trim_matches(['.', '!', '?', ',', ';', ':', ' ', '"', '\'', '-', '_', '\n', '\r']);
    let is_dataset_hallucination = matches!(
        stripped,
        "thanks for watching"
            | "thanks for watching!"
            | "thanks for watching."
            | "thank you for watching"
            | "thank you for watching."
            | "thank you for watching!"
            | "please subscribe"
            | "subscribe to my channel"
            | "like and subscribe"
            | "thanks for listening"
            | "thank you for listening"
            | "see you next time"
            | "see you in the next video"
            | "watching"
    ) || stripped.starts_with("thanks for watching")
      || stripped.starts_with("thank you for watching")
      || stripped.starts_with("thanks for listening")
      || stripped.starts_with("thank you for listening");

    if is_dataset_hallucination {
        return String::new();
    }

    // Filter Whisper's YouTube/movie subtitle dataset hallucinations
    let is_subtitle_hallucination = lower.contains("subtitles by")
        || lower.contains("amara.org")
        || lower.contains("opensubtitles")
        || lower.contains("translated by")
        || lower.contains("captioned by");

    if is_subtitle_hallucination {
        return String::new();
    }

    // Direct matches for classic isolated Whisper silence hallucinations
    let stripped = lower.trim_matches(['.', '!', '?', ',', ';', ':', '"', '\'', '-', '_', '(', ')', '[', ']', ' ']);
    if matches!(
        stripped,
        "thank you" | "thanks" | "thanks for listening" | "thanks for watching" | "thank you for watching" | "thank you for listening" | "ooh" | "bye bye" | "bye" | "you"
    ) {
        return String::new();
    }

    // Outro word-set test: if all words in the transcript belong to Whisper's YouTube training outro words, it's a silence hallucination
    let words: Vec<&str> = lower
        .split_whitespace()
        .map(|w| w.trim_matches(['.', '!', '?', ',', ';', ':', '"', '\'', '-', '_', '(', ')', '[', ']']))
        .filter(|w| !w.is_empty())
        .collect();

    if words.is_empty() {
        return String::new();
    }

    let outro_words = [
        "thanks", "thank", "you", "for", "watching", "this", "video", "please",
        "like", "subscribe", "and", "share", "channel", "bye", "see", "next",
        "time", "to", "my", "listening", "very", "much", "so", "guys", "everyone",
        "goodbye"
    ];

    // Must contain YouTube-specific outro markers (watching, subscribe, channel, video)
    // to prevent discarding legitimate conversational phrases like "thank you" or "bye"
    let has_youtube_marker = words.iter().any(|w| matches!(*w, "watching" | "subscribe" | "channel" | "video"));
    let all_outro_words = has_youtube_marker && words.iter().all(|w| outro_words.contains(w));
    if all_outro_words {
        return String::new();
    }

    let cleaned = raw
        .replace("[BLANK_AUDIO]", "")
        .replace("[blank_audio]", "")
        .replace("[Silence]", "")
        .replace("[silence]", "")
        .replace("[Bell]", "")
        .replace("[bell]", "")
        .replace("(music)", "")
        .replace("[music]", "")
        .trim()
        .to_string();

    if !cleaned.chars().any(|c| c.is_alphanumeric()) {
        return String::new();
    }

    deduplicate_repeated_speech(&cleaned)
}

static LAST_TECHNICAL_JARGON_TIME: std::sync::Mutex<Option<Instant>> = std::sync::Mutex::new(None);

pub fn detect_technical_jargon(text: &str) -> Vec<String> {
    let lower = text.to_lowercase();
    let mut matches = Vec::new();

    // Check for developer code syntax and verbal operators
    if lower.contains("parenthesis") || lower.contains("parentheses") {
        matches.push("parentheses".to_string());
    }
    if lower.contains("curly brace") || lower.contains("curly braces") {
        matches.push("curly braces".to_string());
    }
    if lower.contains("square bracket") || (lower.contains("bracket") && (lower.contains("bracket 0") || lower.contains("bracket zero") || lower.contains("bracket i"))) {
        matches.push("brackets".to_string());
    }
    if lower.contains("snake case") || lower.contains("snake_case") {
        matches.push("snake_case".to_string());
    }
    if lower.contains("camel case") || lower.contains("camelcase") {
        matches.push("camelCase".to_string());
    }
    if lower.contains("kebab case") || lower.contains("kebab-case") {
        matches.push("kebab-case".to_string());
    }
    if lower.contains("pascal case") || lower.contains("pascalcase") {
        matches.push("PascalCase".to_string());
    }
    if lower.contains("console.log") || lower.contains("console dot log") {
        matches.push("console.log".to_string());
    }
    if lower.contains("print(") || lower.contains("print parenthesis") {
        matches.push("print()".to_string());
    }
    if lower.contains("fat arrow") || lower.contains("=>") {
        matches.push("=>".to_string());
    }
    if lower.contains("double equals") || lower.contains("==") {
        matches.push("==".to_string());
    }

    const TECH_TERMS: &[(&str, &str)] = &[
        // Databases
        ("postgresql", "PostgreSQL"),
        ("postgres", "Postgres"),
        ("mongodb", "MongoDB"),
        ("sqlite", "SQLite"),
        ("redis", "Redis"),
        ("supabase", "Supabase"),
        ("dynamodb", "DynamoDB"),
        ("cassandra", "Cassandra"),
        ("elasticsearch", "Elasticsearch"),
        ("mysql", "MySQL"),
        ("prisma", "Prisma"),
        ("drizzle", "Drizzle"),
        // Languages & Runtimes
        ("typescript", "TypeScript"),
        ("javascript", "JavaScript"),
        ("python", "Python"),
        ("rust", "Rust"),
        ("golang", "Golang"),
        ("c++", "C++"),
        ("swift", "Swift"),
        ("kotlin", "Kotlin"),
        ("solidity", "Solidity"),
        ("nodejs", "Node.js"),
        ("node.js", "Node.js"),
        ("bun", "Bun"),
        ("deno", "Deno"),
        ("bash", "Bash"),
        ("zsh", "Zsh"),
        // Frameworks & Libraries
        ("react", "React"),
        ("nextjs", "Next.js"),
        ("next.js", "Next.js"),
        ("vue", "Vue"),
        ("angular", "Angular"),
        ("svelte", "Svelte"),
        ("tailwind", "Tailwind"),
        ("express", "Express"),
        ("fastapi", "FastAPI"),
        ("django", "Django"),
        ("flask", "Flask"),
        ("tauri", "Tauri"),
        ("electron", "Electron"),
        ("graphql", "GraphQL"),
        ("grpc", "gRPC"),
        ("rest api", "REST API"),
        ("pytorch", "PyTorch"),
        ("tensorflow", "TensorFlow"),
        // Cloud & DevOps
        ("docker", "Docker"),
        ("kubernetes", "Kubernetes"),
        ("k8s", "K8s"),
        ("terraform", "Terraform"),
        ("ansible", "Ansible"),
        ("aws", "AWS"),
        ("gcp", "GCP"),
        ("azure", "Azure"),
        ("cloudflare", "Cloudflare"),
        ("ci/cd", "CI/CD"),
        ("github actions", "GitHub Actions"),
        ("pull request", "Pull Request"),
        ("git push", "Git Push"),
        ("git commit", "Git Commit"),
        ("rebase", "Git Rebase"),
        ("merge conflict", "Merge Conflict"),
        // Concepts & Keywords
        ("async await", "Async/Await"),
        ("async", "Async"),
        ("endpoint", "Endpoint"),
        ("jwt", "JWT"),
        ("oauth", "OAuth"),
        ("mutex", "Mutex"),
        ("semaphore", "Semaphore"),
        ("deadlock", "Deadlock"),
        ("stack trace", "Stack Trace"),
        ("segfault", "Segfault"),
        ("memory leak", "Memory Leak"),
        ("payload", "Payload"),
        ("json", "JSON"),
        ("yaml", "YAML"),
    ];

    for &(needle, display_name) in TECH_TERMS {
        let matched = if needle.contains(' ') || needle.contains('.') || needle.contains('/') || needle.contains('-') || needle.contains('+') {
            lower.contains(needle)
        } else {
            lower.split(|c: char| !c.is_alphanumeric() && c != '_').any(|w| w == needle)
        };

        if matched && !matches.iter().any(|m| m.eq_ignore_ascii_case(display_name)) {
            matches.push(display_name.to_string());
        }
    }

    matches
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SystemCapabilities {
    pub os: String,
    pub accessibility_permission: bool,
    pub microphone_permission: bool,
    pub hardware_devices: Vec<String>,
    pub supported_insertion_methods: Vec<String>,
    pub default_insertion_policy: String,
    pub supported_interaction_modes: Vec<String>,
}

#[tauri::command]
pub fn request_accessibility_permission() -> bool {
    crate::safety_service::request_accessibility_permission()
}

#[tauri::command]
pub fn get_capabilities(state: State<'_, AppState>) -> SystemCapabilities {
    let s = state.settings.lock().unwrap();
    let devices = AudioCaptureService::list_input_devices().unwrap_or_default();
    let has_acc = crate::safety_service::is_accessibility_granted();

    SystemCapabilities {
        os: std::env::consts::OS.to_string(),
        accessibility_permission: has_acc,
        microphone_permission: !devices.is_empty(),
        hardware_devices: devices,
        supported_insertion_methods: vec![
            "accessibility_ax".to_string(),
            "simulated_paste".to_string(),
            "direct_clipboard".to_string(),
        ],
        default_insertion_policy: s.insertion_policy.clone(),
        supported_interaction_modes: vec![
            "toggle".to_string(),
            "push_to_talk".to_string(),
        ],
    }
}

#[tauri::command]
pub fn get_dictation_status(state: State<'_, AppState>) -> SessionSnapshot {
    let session_lock = state.active_session.lock().unwrap();
    session_lock.clone()
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
    let snapshot = TargetSnapshot::capture_for_session(&session_id);
    let target_app_name = snapshot.platform_app_id.clone();
    let target_win_title = snapshot.window_title.clone();

    // Store target snapshot
    {
        let mut target_lock = state.active_target.lock().unwrap();
        *target_lock = Some(snapshot);
    }

    // Start physical audio recording using selected microphone device
    {
        let chosen_mic = {
            let s = state.settings.lock().unwrap();
            s.selected_microphone.clone()
        };
        let mut audio = state.audio.lock().unwrap();
        if let Err(e) = audio.start_recording(Some(&chosen_mic)) {
            session_lock.state = SessionState::Failed;
            session_lock.sequence += 1;
            session_lock.timestamp_ms = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64;
            session_lock.message = Some(format!("Microphone error: {}", e));
            let snap = session_lock.clone();
            let _ = app.emit("dictation-session-changed", &snap);
            return Err(e);
        }
    }

    // Stop observing any prior destination edits when a new dictation begins
    state.destination_sync.stop_observing();

    {
        let mut start_lock = state.recording_start.lock().unwrap();
        *start_lock = Some(Instant::now());
    }

    let clean_target_app = target_app_name.filter(|n| {
        let l = n.to_lowercase();
        !l.contains("voxquest") && !l.contains("tauri")
    });

    let initial_model_name = {
        let settings = state.settings.lock().unwrap();
        let manifest = model_manifest::get_official_manifest();
        manifest.iter()
            .find(|m| m.id == settings.default_model_id)
            .map(|m| m.name.clone())
            .unwrap_or_else(|| "Balanced Everyday Writing".to_string())
    };

    session_lock.session_id = session_id.clone();
    session_lock.sequence += 1;
    session_lock.state = SessionState::Recording;
    session_lock.message = Some("Listening naturally across all windows... Press shortcut or click pill to finish.".to_string());
    session_lock.elapsed_seconds = 0.0;
    session_lock.last_transcript = None;
    session_lock.target_app = clean_target_app;
    session_lock.target_window = target_win_title;
    session_lock.recovery_id = None;
    session_lock.active_model_name = Some(initial_model_name);
    session_lock.technical_suggestion = None;
    session_lock.timestamp_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64;

    let snap = session_lock.clone();
    let _ = app.emit("dictation-session-changed", &snap);
    drop(session_lock);

    // Make floating indicator visible immediately on main thread without stealing key focus from target app
    let app_show = app.clone();
    let snap_for_pill = snap.clone();
    crate::run_on_main_thread(move || {
        if let Some(w) = app_show.get_webview_window("floating-indicator") {
            #[cfg(target_os = "macos")]
            if let Ok(ns_win) = w.ns_window() {
                use cocoa::base::id;
                let ns_win = ns_win as id;
                unsafe {
                    let () = objc::msg_send![ns_win, orderFrontRegardless];
                }
            } else {
                let _ = w.show();
            }
            #[cfg(not(target_os = "macos"))]
            let _ = w.show();
            let _ = w.emit("dictation-session-changed", &snap_for_pill);
        }
    });

    // Realtime audio visualizer waveform stream for Wispr Flow audio effect
    {
        let app_level_emitter = app.clone();
        let state_audio = Arc::clone(&state.audio);
        let session_check = session_id.clone();
        let active_session_ref = Arc::clone(&state.active_session);

        tauri::async_runtime::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_millis(35));
            loop {
                interval.tick().await;
                let is_rec = {
                    let s = active_session_ref.lock().unwrap();
                    s.session_id == session_check && s.state == SessionState::Recording
                };
                if !is_rec {
                    break;
                }
                let level = {
                    let audio = state_audio.lock().unwrap();
                    audio.get_current_audio_level()
                };
                let _ = app_level_emitter.emit("audio-level", level);
            }
        });
    }

    // Watchdog for max_duration_secs safety cutoff
    let max_secs = {
        let s = state.settings.lock().unwrap();
        s.max_duration_secs
    };
    if max_secs > 0 {
        let app_auto_stop = app.clone();
        let session_id_check = session_id.clone();
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_secs(max_secs as u64)).await;
            if let Some(state) = app_auto_stop.try_state::<AppState>() {
                let should_stop = {
                    let sess = state.active_session.lock().unwrap();
                    sess.session_id == session_id_check && sess.state == SessionState::Recording
                };
                if should_stop {
                    println!("VoxQuest: Max recording duration reached ({}s). Auto-stopping session {}", max_secs, session_id_check);
                    let _ = stop_dictation(state, app_auto_stop.clone());
                }
            }
        });
    }

    // In push-to-talk mode, if user already released the shortcut key while audio initialization was in flight,
    // immediately transition to stop_dictation so recording does not get stuck in background!
    let mode = {
        let s = state.settings.lock().unwrap();
        s.interaction_mode.clone()
    };
    if mode == "push_to_talk" && !crate::is_shortcut_held() {
        println!("VoxQuest: Shortcut was released during initialization -> immediately stopping dictation");
        return stop_dictation(state, app);
    }

    Ok(snap)
}

#[tauri::command]
pub fn stop_dictation(state: State<'_, AppState>, app: AppHandle) -> Result<SessionSnapshot, String> {
    crate::reset_shortcut_held();
    let t_stop_requested = Instant::now();

    let session_id = {
        let mut session_lock = state.active_session.lock().unwrap();
        if !session_lock.state.can_transition_to(SessionState::Transcribing) {
            return Err(format!("Cannot stop: session in state {} cannot transition to transcribing", session_lock.state));
        }
        session_lock.state = SessionState::Transcribing;
        session_lock.sequence += 1;
        session_lock.timestamp_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64;
        session_lock.message = Some("Transcribing...".to_string());
        let snap = session_lock.clone();
        let _ = app.emit("dictation-session-changed", &snap);
        if let Some(w) = app.get_webview_window("floating-indicator") {
            let _ = w.emit("dictation-session-changed", &snap);
        }
        session_lock.session_id.clone()
    };

    let audio_samples = {
        let mut audio = state.audio.lock().unwrap();
        match audio.stop_recording() {
            Ok(samples) => samples,
            Err(e) => {
                let mut session_lock = state.active_session.lock().unwrap();
                session_lock.state = SessionState::Failed;
                session_lock.sequence += 1;
                session_lock.timestamp_ms = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64;
                session_lock.message = Some(format!("Audio capture error: {}", e));
                let snap = session_lock.clone();
                let _ = app.emit("dictation-session-changed", &snap);
                return Err(e);
            }
        }
    };
    let t_audio_done = Instant::now();

    // High-Efficiency Pre-Inference VAD Gate:
    // If the captured audio has zero speech frames, is under 200ms, or is pure background room silence,
    // immediately complete session and bypass model resolution, disk I/O, SQLite biasing queries, and neural compute.
    if audio_samples.is_empty() || crate::audio_service::is_audio_silent_or_too_short(&audio_samples) {
        let mut session_lock = state.active_session.lock().unwrap();
        session_lock.sequence += 1;
        session_lock.timestamp_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64;
        session_lock.state = SessionState::Completed;
        session_lock.message = Some("No speech detected. Ready to dictate.".to_string());
        session_lock.last_transcript = None;
        let snap = session_lock.clone();
        let _ = app.emit("dictation-session-changed", &snap);
        let app_hide = app.clone();
        let target_id = session_lock.session_id.clone();
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_millis(1200)).await;
            if let Some(state) = app_hide.try_state::<AppState>() {
                let sess = state.active_session.lock().unwrap();
                if sess.session_id != target_id || sess.state.is_active() {
                    return;
                }
            }
            crate::run_on_main_thread(move || {
                if let Some(w) = app_hide.get_webview_window("floating-indicator") {
                    let _ = w.hide();
                }
            });
        });
        return Ok(snap);
    }

    // Feature 017: Speech Reliability Monitor
    let audio_reliability = crate::audio_service::analyze_speech_reliability(&audio_samples, 16000);

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

    // Context-Aware Dynamic Model Routing:
    // When enable_auto_model_routing is true or default_model_id is "auto", VoxQuest dynamically inspects the active application
    // and speech duration/cadence to route between Instant/Everyday and Pro/Ultra models automatically.
    let frontmost = crate::safety_service::get_frontmost_app_name().unwrap_or_default().to_lowercase();
    let is_dev_app = frontmost.contains("code")
        || frontmost.contains("cursor")
        || frontmost.contains("terminal")
        || frontmost.contains("iterm")
        || frontmost.contains("warp")
        || frontmost.contains("xcode")
        || frontmost.contains("studio")
        || frontmost.contains("intellij")
        || frontmost.contains("pycharm")
        || frontmost.contains("webstorm")
        || frontmost.contains("postman")
        || frontmost.contains("github")
        || frontmost.contains("sublime")
        || frontmost.contains("zed");

    let had_recent_tech = LAST_TECHNICAL_JARGON_TIME.lock().ok().and_then(|t| *t).map(|t| t.elapsed().as_secs() < 600).unwrap_or(false);

    let current_info = if settings.enable_auto_model_routing || settings.default_model_id == "auto" {
        let prefers_high_precision = if settings.power_save_mode {
            false
        } else {
            (is_dev_app && had_recent_tech) || duration_sec >= 30.0
        };

        if prefers_high_precision {
            // Find highest-tier downloaded model: Large-v3-Turbo -> Small -> Base -> Tiny
            let candidate_ids = ["whisper-large-v3-turbo", "whisper-small", "whisper-base-q5_1", "whisper-base", "whisper-tiny-q5_1", "whisper-tiny"];
            candidate_ids
                .iter()
                .filter_map(|id| manifest.iter().find(|m| &m.id == id))
                .find(|m| models_dir.join(&m.filename).exists())
                .cloned()
                .or_else(|| manifest.iter().find(|m| m.recommended).cloned())
                .ok_or_else(|| "No model manifest found".to_string())?
        } else {
            // Instant/Everyday: Base -> Tiny -> Small -> Large-v3-Turbo
            let candidate_ids = ["whisper-base-q5_1", "whisper-base", "whisper-tiny-q5_1", "whisper-tiny", "whisper-small", "whisper-large-v3-turbo"];
            candidate_ids
                .iter()
                .filter_map(|id| manifest.iter().find(|m| &m.id == id))
                .find(|m| models_dir.join(&m.filename).exists())
                .cloned()
                .or_else(|| manifest.iter().find(|m| m.recommended).cloned())
                .ok_or_else(|| "No model manifest found".to_string())?
        }
    } else {
        manifest.iter()
            .find(|m| m.id == settings.default_model_id)
            .or_else(|| manifest.iter().find(|m| m.recommended))
            .cloned()
            .ok_or_else(|| "No model manifest found".to_string())?
    };

    // Robust fallback: If selected model file is not downloaded, safely fallback to highest-tier downloaded model
    let current_info = if !models_dir.join(&current_info.filename).exists() {
        let fallback_candidates = ["whisper-small", "whisper-base-q5_1", "whisper-base", "whisper-tiny-q5_1", "whisper-tiny", "whisper-large-v3-turbo"];
        fallback_candidates
            .iter()
            .filter_map(|id| manifest.iter().find(|m| &m.id == id))
            .find(|m| models_dir.join(&m.filename).exists())
            .cloned()
            .unwrap_or(current_info)
    } else {
        current_info
    };

    // Preserve natural vocal formants and full speech onset (already cleanly isolated on audio stop)
    let trimmed_samples = audio_samples;

    let use_cloud = (settings.speech_engine == "cloud" || settings.speech_engine == "hybrid")
        && !settings.cloud_api_key.trim().is_empty();

    let mut cloud_attempt_failed = false;
    let mut raw_transcript = String::new();

    if use_cloud {
        let cloud_cfg = crate::cloud_speech_service::CloudSpeechConfig {
            provider: settings.cloud_provider.clone(),
            api_key: settings.cloud_api_key.clone(),
            custom_endpoint: if settings.cloud_api_endpoint.trim().is_empty() {
                None
            } else {
                Some(settings.cloud_api_endpoint.clone())
            },
        };
        let lang = if settings.language == "auto" { None } else { Some(settings.language.as_str()) };
        let dict_prompt = state.history.get_active_biasing_prompt().ok();

        match crate::cloud_speech_service::transcribe_cloud(&trimmed_samples, &cloud_cfg, lang, dict_prompt.as_deref()) {
            Ok(text) => {
                raw_transcript = text;
            }
            Err(e) => {
                eprintln!("[VoxQuest] Cloud transcription fallback ({})", e);
                cloud_attempt_failed = true;
            }
        }
    }

    if !use_cloud || cloud_attempt_failed {
        let model_path = models_dir.join(&current_info.filename);
        if !model_path.exists() {
            let mut session_lock = state.active_session.lock().unwrap();
            session_lock.state = SessionState::Failed;
            session_lock.sequence += 1;
            session_lock.active_model_name = Some(current_info.name.clone());
            session_lock.technical_suggestion = None;
            session_lock.timestamp_ms = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64;
            session_lock.message = Some(format!("Model {} is not downloaded. Please install it in Model Settings.", current_info.name));
            let snap = session_lock.clone();
            let _ = app.emit("dictation-session-changed", &snap);
            return Err(format!("Model {} is not installed", current_info.name));
        }

        {
            let mut engine = state.whisper.lock().unwrap();
            let path_str = model_path.to_string_lossy().to_string();
            if !engine.is_loaded() || engine.current_model_path() != Some(&path_str) {
                engine.load_model(&model_path)?;
            }
            engine.set_max_threads(settings.max_cpu_threads.clamp(2, 4));
        }

        let dict_prompt = state.history.get_active_biasing_prompt().ok();
        let lang = if settings.language == "auto" { None } else { Some(settings.language.as_str()) };
        let mut engine = state.whisper.lock().unwrap();
        raw_transcript = engine.transcribe(&trimmed_samples, lang, dict_prompt.as_deref())?;
    }
    let t_whisper_done = Instant::now();

    let cleaned_transcript = clean_whisper_transcript(&raw_transcript);

    // If audio was silence, ambient noise, or whisper non-speech token ([BLANK_AUDIO])
    if cleaned_transcript.is_empty() {
        let mut session_lock = state.active_session.lock().unwrap();
        session_lock.sequence += 1;
        session_lock.active_model_name = Some(current_info.name.clone());
        session_lock.technical_suggestion = None;
        session_lock.timestamp_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64;
        session_lock.state = SessionState::Completed;
        session_lock.message = Some(if audio_reliability.status != "optimal" {
            audio_reliability.advisory.clone()
        } else {
            "No speech detected. Ready to dictate.".to_string()
        });
        session_lock.last_transcript = None;
        let snap = session_lock.clone();
        let _ = app.emit("dictation-session-changed", &snap);
        let app_hide = app.clone();
        let target_id = session_lock.session_id.clone();
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_millis(1200)).await;
            if let Some(state) = app_hide.try_state::<AppState>() {
                let sess = state.active_session.lock().unwrap();
                if sess.session_id != target_id || sess.state.is_active() {
                    return;
                }
            }
            crate::run_on_main_thread(move || {
                if let Some(w) = app_hide.get_webview_window("floating-indicator") {
                    let _ = w.hide();
                }
            });
        });
        return Ok(snap);
    }

    // Transition to Formatting state
    {
        let mut session_lock = state.active_session.lock().unwrap();
        if session_lock.session_id == session_id && session_lock.state != SessionState::Cancelled {
            session_lock.state = SessionState::Formatting;
            session_lock.sequence += 1;
            session_lock.timestamp_ms = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64;
            session_lock.message = Some("Formatting...".to_string());
            let snap = session_lock.clone();
            let _ = app.emit("dictation-session-changed", &snap);
        }
    }

    let fmt_cfg = FormattingConfig {
        spoken_punctuation: settings.spoken_punctuation,
        conservative_filler_removal: settings.conservative_filler_removal,
        auto_capitalization: settings.auto_capitalization,
        speech_repair: settings.enable_speech_repair,
    };
    let deduped_raw = crate::formatter::deduplicate_repeated_speech(&cleaned_transcript);
    let formatted_transcript = format_transcript(&deduped_raw, &fmt_cfg);
    let (mut formatted_transcript, _applied_vocab) = state.history.apply_personalization_pipeline(&formatted_transcript);
    if formatted_transcript.trim().is_empty() && !cleaned_transcript.trim().is_empty() {
        formatted_transcript = cleaned_transcript.trim().to_string();
    }
    let t_format_done = Instant::now();

    // Transition to ValidatingTarget state
    {
        let mut session_lock = state.active_session.lock().unwrap();
        if session_lock.session_id == session_id && session_lock.state != SessionState::Cancelled {
            session_lock.state = SessionState::ValidatingTarget;
            session_lock.sequence += 1;
            session_lock.timestamp_ms = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64;
            session_lock.message = Some("Validating destination...".to_string());
            let snap = session_lock.clone();
            let _ = app.emit("dictation-session-changed", &snap);
        }
    }

    let target_snapshot = {
        let mut t = state.active_target.lock().unwrap();
        t.take()
    };

    // Revalidate destination safely before any insertion attempt
    let current_snap = TargetSnapshot::capture_current();
    let t_dest_reval_done = Instant::now();

    let orig_app_name = target_snapshot.as_ref().and_then(|s| s.platform_app_id.clone());
    let curr_app_name = current_snap.platform_app_id.clone();

    // Check if target was external app at start
    let orig_is_external = orig_app_name.as_deref().map(|n| {
        let l = n.to_lowercase();
        !l.contains("voxquest") && !l.contains("tauri")
    }).unwrap_or(false);

    let curr_is_external = curr_app_name.as_deref().map(|n| {
        let l = n.to_lowercase();
        !l.contains("voxquest") && !l.contains("tauri")
    }).unwrap_or(false);

    // Destination Anchor Selection:
    // Respect user's configured insertion_policy ("original_destination" vs "active_at_stop")
    let target_anchor: Option<TargetSnapshot> = if settings.insertion_policy == "active_at_stop" && curr_is_external && !current_snap.is_secure_input {
        // Mode 2: Insert into active cursor at stop
        Some(current_snap.clone())
    } else if orig_is_external {
        // Mode 1 (Default): Original Destination strictly preserved even if user clicked or switched windows while speaking
        Some(target_snapshot.unwrap())
    } else if curr_is_external && !current_snap.is_secure_input {
        // Dictation started from VoxQuest UI, use current external app
        Some(current_snap.clone())
    } else if let Some(last_ext) = crate::safety_service::get_last_external_app() {
        // Fallback: Most recent external app
        Some(last_ext)
    } else {
        None
    };

    let mut record_id: Option<i64> = None;
    let mut insertion_method = "none".to_string();
    let mut insertion_status_str = "not_attempted".to_string();

    let mut session_lock = state.active_session.lock().unwrap();
    if session_lock.session_id != session_id || session_lock.state == SessionState::Cancelled {
        return Err("Session was cancelled or superceded".to_string());
    }

    session_lock.sequence += 1;
    session_lock.timestamp_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64;

    let t_insert_start = Instant::now();

    if let Some(anchor) = target_anchor {
        session_lock.state = SessionState::Inserting;
        let snap = session_lock.clone();
        let _ = app.emit("dictation-session-changed", &snap);

        let app_name = anchor.platform_app_id.clone().unwrap_or_else(|| "active app".to_string());
        
        // Append a trailing space to dictated text (Handy & Wispr Flow standard)
        // so consecutive dictation utterances never fuse adjacent words together (e.g. "modelsI", "it.So,")
        let text_to_paste = if !formatted_transcript.ends_with(' ') && !formatted_transcript.ends_with('\n') && !formatted_transcript.ends_with('\t') {
            format!("{} ", formatted_transcript)
        } else {
            formatted_transcript.clone()
        };
        let insert_res = insert_text_safely(&text_to_paste, &anchor);
        insertion_method = insert_res.method_used.clone();

        match insert_res.status {
            crate::safety_service::InsertionStatus::InsertedConfirmed => {
                insertion_status_str = "inserted_confirmed".to_string();
                if settings.retain_history {
                    record_id = state.history.insert_record(
                        &raw_transcript,
                        &formatted_transcript,
                        duration_sec,
                        "inserted",
                        Some(&app_name),
                        None,
                        Some(&session_id),
                    ).ok();
                }
                let _ = state.history.record_vocabulary_recognitions(&formatted_transcript);
                session_lock.sequence += 1;
                session_lock.timestamp_ms = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64;
                session_lock.state = SessionState::Completed;
                session_lock.message = Some(format!("Inserted into {} via native accessibility.", app_name));
                session_lock.last_transcript = Some(formatted_transcript.clone());
                session_lock.recovery_id = record_id;
            }
            crate::safety_service::InsertionStatus::InsertedUnconfirmed => {
                insertion_status_str = "inserted_unconfirmed".to_string();
                if settings.retain_history {
                    record_id = state.history.insert_record(
                        &raw_transcript,
                        &formatted_transcript,
                        duration_sec,
                        "inserted",
                        Some(&app_name),
                        None,
                        Some(&session_id),
                    ).ok();
                }
                let _ = state.history.record_vocabulary_recognitions(&formatted_transcript);
                session_lock.sequence += 1;
                session_lock.timestamp_ms = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64;
                session_lock.state = SessionState::Completed;
                session_lock.message = Some(format!("Pasted into {}.", app_name));
                session_lock.last_transcript = Some(formatted_transcript.clone());
                session_lock.recovery_id = record_id;
            }
            crate::safety_service::InsertionStatus::BlockedSecureInput => {
                insertion_status_str = "blocked_secure_input".to_string();
                let reason = insert_res.message.unwrap_or_else(|| "Destination is an AXSecureTextField password field".to_string());
                if settings.retain_history {
                    record_id = state.history.insert_record(
                        &raw_transcript,
                        &formatted_transcript,
                        duration_sec,
                        "recovery_required",
                        Some(&app_name),
                        Some(&reason),
                        Some(&session_id),
                    ).ok();
                }
                session_lock.sequence += 1;
                session_lock.timestamp_ms = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64;
                session_lock.state = SessionState::RecoveryRequired;
                session_lock.message = Some("Target is a secure password field. Preserved in Recovery.".to_string());
                session_lock.last_transcript = Some(formatted_transcript.clone());
                session_lock.recovery_id = record_id;
            }
            crate::safety_service::InsertionStatus::RecoveryRequired => {
                insertion_status_str = "recovery_required".to_string();
                let reason = insert_res.message.unwrap_or_else(|| "Target application changed or unavailable".to_string());
                
                // Copy to clipboard as immediate convenience
                if let Ok(mut cb) = arboard::Clipboard::new() {
                    let _ = cb.set_text(&formatted_transcript);
                }
                #[cfg(target_os = "macos")]
                crate::safety_service::set_nspasteboard_text(&formatted_transcript);

                if settings.retain_history {
                    record_id = state.history.insert_record(
                        &raw_transcript,
                        &formatted_transcript,
                        duration_sec,
                        "recovery_required",
                        Some(&app_name),
                        Some(&reason),
                        Some(&session_id),
                    ).ok();
                }
                session_lock.sequence += 1;
                session_lock.timestamp_ms = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64;
                session_lock.state = SessionState::RecoveryRequired;
                session_lock.message = Some(format!("{}. Preserved in Recovery.", reason));
                session_lock.last_transcript = Some(formatted_transcript.clone());
                session_lock.recovery_id = record_id;
            }
            crate::safety_service::InsertionStatus::Failed | crate::safety_service::InsertionStatus::NotAttempted => {
                insertion_status_str = "failed".to_string();
                let reason = insert_res.message.unwrap_or_else(|| "Insertion failed".to_string());
                
                if let Ok(mut cb) = arboard::Clipboard::new() {
                    let _ = cb.set_text(&formatted_transcript);
                }
                #[cfg(target_os = "macos")]
                crate::safety_service::set_nspasteboard_text(&formatted_transcript);

                if settings.retain_history {
                    record_id = state.history.insert_record(
                        &raw_transcript,
                        &formatted_transcript,
                        duration_sec,
                        "failed",
                        Some(&app_name),
                        Some(&reason),
                        Some(&session_id),
                    ).ok();
                }
                session_lock.sequence += 1;
                session_lock.timestamp_ms = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64;
                session_lock.state = SessionState::RecoveryRequired;
                session_lock.message = Some(format!("Could not insert: {}. Preserved in Recovery.", reason));
                session_lock.last_transcript = Some(formatted_transcript.clone());
                session_lock.recovery_id = record_id;
            }
        }

        // Bounded destination edit synchronization
        if let Some(hist_id) = record_id {
            if insert_res.status == crate::safety_service::InsertionStatus::InsertedConfirmed
                || insert_res.status == crate::safety_service::InsertionStatus::InsertedUnconfirmed
            {
                let enable_sync = settings.enable_destination_sync;
                let sync_duration = settings.destination_sync_duration_secs;
                if enable_sync && !anchor.is_secure_input && anchor.app_pid.is_some() {
                    let target_pid = anchor.app_pid.unwrap();
                    let app_clone = app.clone();
                    let hist_clone = Arc::clone(&state.history);
                    let sync_service = Arc::clone(&state.destination_sync);
                    let sess_id = session_id.clone();
                    let app_nm = app_name.clone();
                    let win_title = anchor.window_title.clone();
                    let orig_text = raw_transcript.clone();
                    let inserted_text = formatted_transcript.clone();

                    tauri::async_runtime::spawn(async move {
                        tokio::time::sleep(tokio::time::Duration::from_millis(180)).await;
                        let baseline = crate::safety_service::read_focused_element_text_for_pid(target_pid).ok().flatten();
                        let (prefix, suffix) = if let Some(ref base) = baseline {
                            if let Some(idx) = base.find(&inserted_text) {
                                (base[..idx].to_string(), base[idx + inserted_text.len()..].to_string())
                            } else {
                                (String::new(), String::new())
                            }
                        } else {
                            (String::new(), String::new())
                        };

                        let observed = crate::destination_sync_service::ObservedSession {
                            history_id: hist_id,
                            session_id: sess_id,
                            target_app_pid: target_pid,
                            target_app_name: app_nm,
                            target_window_title: win_title,
                            original_text: orig_text,
                            initial_inserted_text: inserted_text.clone(),
                            last_synced_text: inserted_text,
                            prefix_anchor: prefix,
                            suffix_anchor: suffix,
                            start_time: std::time::Instant::now(),
                            max_duration: std::time::Duration::from_secs(sync_duration as u64),
                            last_edit_seen: None,
                            sync_count: 0,
                        };

                        sync_service.start_observing(app_clone, hist_clone, observed);
                    });
                }
            }
        }
    } else {
        // No external target: copy to clipboard and preserve in Clipboard Vault
        if let Ok(mut cb) = arboard::Clipboard::new() {
            let _ = cb.set_text(&formatted_transcript);
        }
        #[cfg(target_os = "macos")]
        crate::safety_service::set_nspasteboard_text(&formatted_transcript);

        let reason = "Copied to clipboard (Clipboard Vault)";
        if settings.retain_history {
            record_id = state.history.insert_record(
                &raw_transcript,
                &formatted_transcript,
                duration_sec,
                "inserted",
                Some("Clipboard Vault"),
                Some(reason),
                Some(&session_id),
            ).ok();
        }
        let _ = state.history.record_vocabulary_recognitions(&formatted_transcript);
        session_lock.state = SessionState::Completed;
        session_lock.message = Some("Copied to clipboard & saved in Clipboard Vault.".to_string());
        session_lock.last_transcript = Some(formatted_transcript.clone());
        session_lock.recovery_id = record_id;
        insertion_method = "clipboard_vault".to_string();
        insertion_status_str = "vault_copied".to_string();
    }

    let t_insert_done = Instant::now();

    let detected_tech_terms = detect_technical_jargon(&formatted_transcript);
    let is_code_syntax = formatted_transcript.contains("print(")
        || formatted_transcript.contains("console.log(")
        || formatted_transcript.contains("def ")
        || formatted_transcript.contains("fn ")
        || formatted_transcript.contains("=>")
        || formatted_transcript.contains("==")
        || formatted_transcript.contains("!=");

    let has_technical = is_code_syntax || !detected_tech_terms.is_empty();

    let technical_suggestion: Option<String> = if has_technical {
        if let Ok(mut t) = LAST_TECHNICAL_JARGON_TIME.lock() {
            *t = Some(Instant::now());
        }

        let sample = if !detected_tech_terms.is_empty() {
            detected_tech_terms.iter().take(3).cloned().collect::<Vec<_>>().join(", ")
        } else {
            "Code syntax".to_string()
        };

        let dev_candidate = ["whisper-large-v3-turbo", "whisper-small", "whisper-base", "whisper-tiny"]
            .iter()
            .filter_map(|id| manifest.iter().find(|m| &m.id == id))
            .find(|m| models_dir.join(&m.filename).exists())
            .cloned();

        if let Some(target_dev_model) = dev_candidate {
            if current_info.id != target_dev_model.id {
                // Auto-shift settings to highest downloaded precision model
                {
                    let mut settings_lock = state.settings.lock().unwrap();
                    settings_lock.default_model_id = target_dev_model.id.clone();
                    let _ = crate::settings_service::save_settings(&settings_lock);
                    let _ = app.emit("settings-updated", &*settings_lock);
                }

                let msg = format!("⚡ Technical statement detected ({}). Toggled to {} profile.", sample, target_dev_model.name);
                let _ = app.emit("technical-model-shifted", &msg);
                Some(msg)
            } else {
                let msg = format!("⚡ {} active for technical statement.", target_dev_model.name);
                let _ = app.emit("technical-model-shifted", &msg);
                Some(msg)
            }
        } else {
            None
        }
    } else if current_info.id == "whisper-large-v3-turbo" && !is_dev_app && duration_sec < 4.0 {
        Some(
            "General conversational speech detected. Switch to Balanced Everyday profile for faster response?".to_string()
        )
    } else {
        None
    };

    session_lock.active_model_name = Some(current_info.name.clone());
    session_lock.technical_suggestion = technical_suggestion;

    // Print independent latency breakdown and structured diagnostics
    let ms_audio = (t_audio_done - t_stop_requested).as_secs_f64() * 1000.0;
    let ms_whisper = (t_whisper_done - t_audio_done).as_secs_f64() * 1000.0;
    let ms_format = (t_format_done - t_whisper_done).as_secs_f64() * 1000.0;
    let ms_dest = (t_dest_reval_done - t_format_done).as_secs_f64() * 1000.0;
    let ms_insert = (t_insert_done - t_insert_start).as_secs_f64() * 1000.0;
    let ms_total = (t_insert_done - t_stop_requested).as_secs_f64() * 1000.0;

    println!("\n=== VOXQUEST STRUCTURED SESSION DIAGNOSTICS ===");
    println!("  Session ID:          {}", session_id);
    println!("  Target App:          {}", orig_app_name.as_deref().unwrap_or("none"));
    println!("  Insertion Method:    {}", insertion_method);
    println!("  Insertion Status:    {}", insertion_status_str);
    println!("  Audio Finalization:  {:>6.2} ms", ms_audio);
    println!("  Whisper.cpp Native:  {:>6.2} ms", ms_whisper);
    println!("  Transcript Format:   {:>6.2} ms", ms_format);
    println!("  Target Validation:   {:>6.2} ms", ms_dest);
    println!("  Text Delivery:       {:>6.2} ms", ms_insert);
    println!("  ---------------------------------------------");
    println!("  TOTAL TURNAROUND:    {:>6.2} ms", ms_total);
    println!("================================================\n");

    let final_snap = session_lock.clone();
    let _ = app.emit("dictation-session-changed", &final_snap);
    if final_snap.state == SessionState::Completed {
        let _ = app.emit("dictionary-updated", ());
    }

    // Auto-dismiss floating pill after transcription and text delivery completes
    if final_snap.state == SessionState::Completed {
        let app_pill = app.clone();
        let target_id = final_snap.session_id.clone();
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_millis(1200)).await;
            let app_pill_hide = app_pill.clone();
            crate::run_on_main_thread(move || {
                if let Some(w) = app_pill_hide.get_webview_window("floating-indicator") {
                    let _ = w.hide();
                }
            });
            if let Some(state) = app_pill.try_state::<AppState>() {
                let mut sess = state.active_session.lock().unwrap();
                if sess.session_id == target_id && !sess.state.is_active() {
                    sess.state = SessionState::Idle;
                    sess.message = Some("Ready to dictate. Press shortcut or click pill.".to_string());
                    sess.last_transcript = None;
                    sess.sequence += 1;
                    let snap = sess.clone();
                    let _ = app_pill.emit("dictation-session-changed", &snap);
                }
            }
        });
    }

    Ok(final_snap)
}

#[tauri::command]
pub fn cancel_dictation(state: State<'_, AppState>, app: AppHandle) -> Result<SessionSnapshot, String> {
    crate::reset_shortcut_held();
    let mut session_lock = state.active_session.lock().unwrap();
    if session_lock.state == SessionState::Recording || session_lock.state == SessionState::Starting || session_lock.state == SessionState::Transcribing || session_lock.state == SessionState::Formatting {
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
        session_lock.sequence += 1;
        session_lock.timestamp_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64;
        session_lock.message = Some("Dictation session cancelled by user.".to_string());
        session_lock.last_transcript = None;

        let snap = session_lock.clone();
        let _ = app.emit("dictation-session-changed", &snap);
        let app_hide = app.clone();
        let target_id = session_lock.session_id.clone();
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_millis(1200)).await;
            if let Some(state) = app_hide.try_state::<AppState>() {
                let sess = state.active_session.lock().unwrap();
                if sess.session_id != target_id || sess.state.is_active() {
                    return;
                }
            }
            crate::run_on_main_thread(move || {
                if let Some(w) = app_hide.get_webview_window("floating-indicator") {
                    let _ = w.hide();
                }
            });
        });
        return Ok(snap);
    }

    Ok(session_lock.clone())
}

#[tauri::command]
pub fn retry_insertion(state: State<'_, AppState>, app: AppHandle, history_id: i64) -> Result<bool, String> {
    let record = state.history.get_record(history_id)?
        .ok_or_else(|| format!("History record {} not found", history_id))?;

    let mut current_target = TargetSnapshot::capture_current();
    let is_curr_internal = current_target.platform_app_id.as_deref().map(|n| {
        let l = n.to_lowercase();
        l.contains("voxquest") || l.contains("tauri")
    }).unwrap_or(false);

    if is_curr_internal {
        if let Some(last) = crate::safety_service::get_last_external_app() {
            current_target = last;
        }
    }
    if current_target.is_secure_input {
        return Err("Cannot insert into a secure password field.".to_string());
    }

    let res = insert_text_safely(&record.formatted_text, &current_target);
    match res.status {
        crate::safety_service::InsertionStatus::InsertedConfirmed | crate::safety_service::InsertionStatus::InsertedUnconfirmed => {
            let _ = state.history.update_status(history_id, "inserted");
            let mut session_lock = state.active_session.lock().unwrap();
            session_lock.state = SessionState::Completed;
            session_lock.sequence += 1;
            session_lock.timestamp_ms = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64;
            session_lock.message = Some("Text inserted via retry.".to_string());
            let snap = session_lock.clone();
            let _ = app.emit("dictation-session-changed", &snap);
            Ok(true)
        }
        _ => Err(format!("Retry insertion failed: {}", res.message.unwrap_or_else(|| "Target unavailable".to_string()))),
    }
}

#[tauri::command]
pub fn get_recovery_records(state: State<'_, AppState>) -> Result<Vec<crate::history_service::HistoryRecord>, String> {
    state.history.list_recovery_records(50)
}

#[tauri::command]
pub fn update_recovery_text(app: AppHandle, state: State<'_, AppState>, id: i64, new_text: String) -> Result<(), String> {
    if let Ok(Some(record)) = state.history.get_record(id) {
        let base_text = record.user_edited_text.as_deref()
            .unwrap_or(&record.formatted_text);
        let _ = state.history.record_correction_event(record.session_id.as_deref(), base_text, &new_text);
        if base_text != record.original_text {
            let _ = state.history.record_correction_event(record.session_id.as_deref(), &record.original_text, &new_text);
        }
        let _ = app.emit("dictionary-updated", ());
    }
    state.history.update_record_text(id, &new_text)
}

#[tauri::command]
pub fn copy_recovery_text(state: State<'_, AppState>, id: i64) -> Result<String, String> {
    let record = state.history.get_record(id)?
        .ok_or_else(|| format!("Record {} not found", id))?;
    let mut cb = arboard::Clipboard::new().map_err(|e| format!("Clipboard error: {}", e))?;
    cb.set_text(&record.formatted_text).map_err(|e| format!("Failed to copy to clipboard: {}", e))?;
    Ok("Copied to clipboard".to_string())
}

#[tauri::command]
pub fn dismiss_recovery_record(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    state.history.delete_record(id)
}

#[tauri::command]
pub fn insert_into_selected_field(state: State<'_, AppState>, app: AppHandle, id: i64, text: Option<String>) -> Result<String, String> {
    let record_opt = if id > 0 {
        state.history.get_record(id)?
    } else {
        state.history.list_records(1)?.into_iter().next()
    };

    let text_to_insert = match text {
        Some(t) if !t.trim().is_empty() => t,
        _ => match &record_opt {
            Some(r) => r.formatted_text.clone(),
            None => return Err("Cannot insert empty text".to_string()),
        },
    };
    if text_to_insert.trim().is_empty() {
        return Err("Cannot insert empty text".to_string());
    }

    // Capture the destination where the user focused/clicked
    let mut target = TargetSnapshot::capture_current();
    let is_internal = target.platform_app_id.as_deref().map(|n| {
        let l = n.to_lowercase();
        l.contains("voxquest") || l.contains("tauri")
    }).unwrap_or(false);

    if is_internal {
        if let Some(last) = crate::safety_service::get_last_external_app() {
            target = last;
        } else {
            return Err("No external text field currently selected. Please click inside your destination application and try again.".to_string());
        }
    }

    if target.is_secure_input {
        return Err("Target is a password or secure field. Insertion blocked for security.".to_string());
    }

    let app_name = target.platform_app_id.clone().unwrap_or_else(|| "active application".to_string());

    let res = insert_text_safely(&text_to_insert, &target);
    match res.status {
        crate::safety_service::InsertionStatus::InsertedConfirmed | crate::safety_service::InsertionStatus::InsertedUnconfirmed => {
            if let Some(ref r) = record_opt {
                let _ = state.history.update_record_text(r.id, &text_to_insert);
                let _ = state.history.update_status_and_target(r.id, "inserted", Some(&app_name), None);
            }

            let mut session_lock = state.active_session.lock().unwrap();
            session_lock.state = SessionState::Completed;
            session_lock.sequence += 1;
            session_lock.timestamp_ms = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64;
            session_lock.message = Some(format!("Pasted into {}.", app_name));
            session_lock.last_transcript = Some(text_to_insert.clone());
            session_lock.recovery_id = None;
            let snap = session_lock.clone();
            let _ = app.emit("dictation-session-changed", &snap);

            // Start observation for subsequent edits in the destination app
            let enable_sync = {
                let settings = state.settings.lock().unwrap();
                settings.enable_destination_sync
            };
            if enable_sync {
                if let Some(target_pid) = target.app_pid {
                    let history_id = record_opt.as_ref().map(|r| r.id).unwrap_or(id);
                    let session_id_str = record_opt.as_ref().and_then(|r| r.session_id.clone())
                        .unwrap_or_else(|| format!("manual-insert-{}", history_id));
                    let original_str = record_opt.as_ref().map(|r| r.original_text.clone())
                        .unwrap_or_else(|| text_to_insert.clone());

                    let observed_session = crate::destination_sync_service::ObservedSession {
                        history_id,
                        session_id: session_id_str,
                        target_app_pid: target_pid,
                        target_app_name: app_name.clone(),
                        target_window_title: target.window_title.clone(),
                        original_text: original_str,
                        initial_inserted_text: text_to_insert.clone(),
                        last_synced_text: text_to_insert.clone(),
                        prefix_anchor: String::new(),
                        suffix_anchor: String::new(),
                        start_time: std::time::Instant::now(),
                        max_duration: std::time::Duration::from_secs(90),
                        last_edit_seen: None,
                        sync_count: 0,
                    };
                    state.destination_sync.start_observing(app.clone(), Arc::clone(&state.history), observed_session);
                }
            }

            Ok(format!("Pasted into {}", app_name))
        }
        _ => {
            let e = res.message.unwrap_or_else(|| "Target unavailable".to_string());
            if let Some(ref r) = record_opt {
                let _ = state.history.update_status_and_target(r.id, "failed", Some(&app_name), Some(&e));
            }
            Err(format!("Insertion failed: {}", e))
        }
    }
}

#[tauri::command]
pub fn toggle_dictation(state: State<'_, AppState>, app: AppHandle) -> Result<SessionSnapshot, String> {
    let current_state = {
        let session_lock = state.active_session.lock().unwrap();
        session_lock.state
    };

    match current_state {
        SessionState::Recording => {
            // Guard against accidental double-press / key-repeat stopping immediately (< 200ms)
            let elapsed_ms = {
                let start_lock = state.recording_start.lock().unwrap();
                start_lock.map(|s| s.elapsed().as_millis()).unwrap_or(1000)
            };
            if elapsed_ms < 200 {
                // Ignore stop request if recording started less than 200ms ago
                let session_lock = state.active_session.lock().unwrap();
                return Ok(session_lock.clone());
            }
            stop_dictation(state, app)
        }
        SessionState::Idle | SessionState::Completed | SessionState::RecoveryRequired | SessionState::Cancelled | SessionState::Failed => {
            start_dictation(state, app)
        }
        SessionState::Starting | SessionState::Stopping | SessionState::Transcribing | SessionState::Formatting | SessionState::ValidatingTarget | SessionState::Inserting => {
            let session_lock = state.active_session.lock().unwrap();
            Ok(session_lock.clone())
        }
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
pub fn save_settings_cmd(state: State<'_, AppState>, app: AppHandle, new_settings: AppSettings) -> Result<(), String> {
    save_settings(&new_settings)?;
    let old_shortcut = {
        let mut s = state.settings.lock().unwrap();
        let old = s.shortcut.clone();
        *s = new_settings.clone();
        old
    };

    // Update active model name in session state to reflect setting immediately
    let manifest = crate::model_manifest::get_official_manifest();
    if let Some(target_info) = manifest.iter().find(|m| m.id == new_settings.default_model_id) {
        let mut session_lock = state.active_session.lock().unwrap();
        session_lock.active_model_name = Some(target_info.name.clone());
        session_lock.sequence += 1;
        session_lock.timestamp_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        let snap = session_lock.clone();
        let _ = app.emit("dictation-session-changed", &snap);
    }

    // Re-register hotkey if shortcut key binding changed
    if old_shortcut != new_settings.shortcut {
        if let Ok(old_sc) = old_shortcut.parse::<Shortcut>() {
            let _ = app.global_shortcut().unregister(old_sc);
        }
        if let Ok(new_sc) = new_settings.shortcut.parse::<Shortcut>() {
            if let Err(e) = app.global_shortcut().register(new_sc) {
                eprintln!("Failed to register new hotkey '{}': {}", new_settings.shortcut, e);
            }
        }
    }

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
        .ok_or_else(|| format!("Unknown voice profile: {}", model_id))?;

    let model_path = models_dir.join(&info.filename);
    if !model_path.exists() {
        return Err(format!("Voice profile '{}' is not installed on disk. Please enable it first.", info.name));
    }

    let start = Instant::now();
    let mut engine = state.whisper.lock().unwrap();
    engine.load_model(&model_path)?;

    let sample_rate = 16000;
    let mut audio = Vec::with_capacity(sample_rate);
    for i in 0..sample_rate {
        let t = i as f32 / sample_rate as f32;
        let sample = (2.0 * std::f32::consts::PI * 440.0 * t).sin() * 0.05;
        audio.push(sample);
    }

    let _ = engine.transcribe(&audio, Some("en"), None)?;
    let latency_ms = start.elapsed().as_millis().max(18);

    Ok(format!(
        "Voice profile '{}' calibrated & ready in {}ms. 100% On-Device • Apple Silicon GPU • Zero Cloud.",
        info.name, latency_ms
    ))
}

#[tauri::command]
pub fn get_dictionary_entries(state: State<'_, AppState>) -> Result<Vec<crate::history_service::DictionaryEntry>, String> {
    state.history.list_dictionary_entries()
}

#[tauri::command]
pub fn add_dictionary_entry(state: State<'_, AppState>, app: AppHandle, original: String, replacement: String, category: String) -> Result<i64, String> {
    let id = state.history.add_dictionary_entry(&original, &replacement, &category)?;
    let _ = app.emit("dictionary-updated", ());
    Ok(id)
}

#[tauri::command]
pub fn delete_dictionary_entry(state: State<'_, AppState>, app: AppHandle, id: i64) -> Result<(), String> {
    state.history.delete_dictionary_entry(id)?;
    let _ = app.emit("dictionary-updated", ());
    Ok(())
}

#[tauri::command]
pub fn get_audio_level(state: State<'_, AppState>) -> f32 {
    let audio = state.audio.lock().unwrap();
    audio.get_current_audio_level()
}

#[tauri::command]
pub fn show_pill_window(app: AppHandle) -> Result<(), String> {
    let app_handle = app.clone();
    crate::run_on_main_thread(move || {
        if let Some(w) = app_handle.get_webview_window("floating-indicator") {
            #[cfg(target_os = "macos")]
            if let Ok(ns_win) = w.ns_window() {
                use cocoa::base::id;
                let ns_win = ns_win as id;
                unsafe {
                    let () = objc::msg_send![ns_win, orderFrontRegardless];
                }
            } else {
                let _ = w.show();
            }
            #[cfg(not(target_os = "macos"))]
            let _ = w.show();
        }
    });
    Ok(())
}

#[tauri::command]
pub fn center_pill_window(app: AppHandle) -> Result<(), String> {
    let app_handle = app.clone();
    crate::run_on_main_thread(move || {
        if let Some(w) = app_handle.get_webview_window("floating-indicator") {
            #[cfg(target_os = "macos")]
            if let Ok(ns_win) = w.ns_window() {
                use cocoa::base::id;
                let ns_win = ns_win as id;
                unsafe {
                    let () = objc::msg_send![ns_win, orderFrontRegardless];
                }
            } else {
                let _ = w.show();
            }
            #[cfg(not(target_os = "macos"))]
            let _ = w.show();

            let _ = w.set_always_on_top(true);
            if let Ok(Some(monitor)) = w.primary_monitor() {
                let size = monitor.size();
                let scale = monitor.scale_factor();
                let screen_w = size.width as f64 / scale;
                let screen_h = size.height as f64 / scale;
                let x = (screen_w - 460.0) / 2.0;
                let y = screen_h - 120.0;
                let _ = w.set_position(tauri::Position::Logical(tauri::LogicalPosition::new(x, y)));
            }
        }
    });
    Ok(())
}

#[tauri::command]
pub fn polish_transcript_cmd(
    state: State<'_, AppState>,
    app: AppHandle,
    text: String,
    reinsert: Option<bool>,
) -> Result<String, String> {
    let polished = crate::formatter::polish_text(&text);
    let (personalized, _) = state.history.apply_personalization_pipeline(&polished);

    // Keep polished text on system clipboard
    if let Ok(mut cb) = arboard::Clipboard::new() {
        let _ = cb.set_text(&personalized);
    }
    #[cfg(target_os = "macos")]
    crate::safety_service::set_nspasteboard_text(&personalized);

    {
        let mut sess = state.active_session.lock().unwrap();
        sess.last_transcript = Some(personalized.clone());
        sess.message = Some("Polished text pasted into active app.".to_string());
        let snap = sess.clone();
        let _ = app.emit("dictation-session-changed", &snap);
    }

    if reinsert.unwrap_or(true) {
        #[cfg(target_os = "macos")]
        {
            if let Some(target) = crate::safety_service::get_last_external_app() {
                crate::safety_service::activate_application(
                    target.platform_app_id.as_deref(),
                    target.bundle_id.as_deref(),
                    target.app_pid,
                );
                std::thread::sleep(std::time::Duration::from_millis(120));
            }
            let _ = crate::safety_service::simulate_cmd_v();
        }
    }

    Ok(personalized)
}

#[tauri::command]
pub fn detect_prompt_cmd(text: String, target_app: Option<String>) -> bool {
    crate::prompt_service::is_ai_prompt(&text, target_app.as_deref())
}

#[tauri::command]
pub fn enhance_prompt_cmd(
    state: State<'_, AppState>,
    app: AppHandle,
    text: String,
) -> Result<String, String> {
    let enhanced = crate::prompt_service::enhance_ai_prompt(&text);

    // Keep enhanced text on system clipboard
    if let Ok(mut cb) = arboard::Clipboard::new() {
        let _ = cb.set_text(&enhanced);
    }
    #[cfg(target_os = "macos")]
    crate::safety_service::set_nspasteboard_text(&enhanced);

    {
        let mut sess = state.active_session.lock().unwrap();
        sess.last_transcript = Some(enhanced.clone());
        sess.message = Some("Prompt enhanced & pasted into active app!".to_string());
        let snap = sess.clone();
        let _ = app.emit("dictation-session-changed", &snap);
    }

    // Automatic insertion into active window
    #[cfg(target_os = "macos")]
    {
        if let Some(target) = crate::safety_service::get_last_external_app() {
            crate::safety_service::activate_application(
                target.platform_app_id.as_deref(),
                target.bundle_id.as_deref(),
                target.app_pid,
            );
            std::thread::sleep(std::time::Duration::from_millis(120));
        }
        let _ = crate::safety_service::simulate_cmd_v();
    }

    Ok(enhanced)
}

#[tauri::command]
pub fn enhance_text_cmd(
    state: State<'_, AppState>,
    app: AppHandle,
    request: EnhancementRequest,
) -> Result<EnhancementResponse, String> {
    let trimmed = request.text.trim();
    if trimmed.is_empty() {
        return Err("Cannot enhance empty text.".to_string());
    }

    // 1. Fetch active personal vocabulary pairs to protect/apply
    let dict_entries = state.history.list_personal_vocabulary(Some("active")).unwrap_or_default();
    let dict_pairs: Vec<(String, String)> = dict_entries
        .into_iter()
        .map(|e| (e.original_text, e.preferred_text))
        .collect();

    // 2. Perform semantic enhancement
    let response = crate::enhancement_service::enhance_text(&request, &dict_pairs)?;

    // 3. If auto_replace requested (from Floating Pill or 1-click Enhance), replace in active app immediately
    if request.auto_replace.unwrap_or(false) {
        if let Ok(mut cb) = arboard::Clipboard::new() {
            let _ = cb.set_text(&response.enhanced_text);
        }
        #[cfg(target_os = "macos")]
        crate::safety_service::set_nspasteboard_text(&response.enhanced_text);

        let _ = crate::safety_service::replace_last_paste(&response.enhanced_text);

        {
            let mut sess = state.active_session.lock().unwrap();
            sess.last_transcript = Some(response.enhanced_text.clone());
            sess.message = Some(format!("Enhanced & Pasted ({})", response.mode));
            let snap = sess.clone();
            let _ = app.emit("dictation-session-changed", &snap);
        }

        if let Ok(recent) = state.history.list_records(1) {
            if let Some(first) = recent.into_iter().next() {
                let _ = state.history.update_record_text(first.id, &response.enhanced_text);
            }
        }
    } else {
        // Update session snapshot message without modifying last_transcript until accepted
        let mut sess = state.active_session.lock().unwrap();
        sess.message = Some(format!("Enhancement ready ({})", response.mode));
        let snap = sess.clone();
        let _ = app.emit("dictation-session-changed", &snap);
    }

    Ok(response)
}

#[tauri::command]
pub fn accept_enhancement_session_cmd(
    state: State<'_, AppState>,
    app: AppHandle,
    enhanced_text: String,
) -> Result<(), String> {
    if let Ok(mut cb) = arboard::Clipboard::new() {
        let _ = cb.set_text(&enhanced_text);
    }
    #[cfg(target_os = "macos")]
    crate::safety_service::set_nspasteboard_text(&enhanced_text);

    let _ = crate::safety_service::replace_last_paste(&enhanced_text);

    let mut sess = state.active_session.lock().unwrap();
    sess.last_transcript = Some(enhanced_text.clone());
    sess.message = Some("Enhanced text accepted and placed".to_string());
    let snap = sess.clone();
    let _ = app.emit("dictation-session-changed", &snap);

    if let Ok(recent) = state.history.list_records(1) {
        if let Some(first) = recent.into_iter().next() {
            let _ = state.history.update_record_text(first.id, &enhanced_text);
        }
    }

    Ok(())
}

#[tauri::command]
pub fn accept_enhancement_history_cmd(
    state: State<'_, AppState>,
    id: i64,
    enhanced_text: String,
) -> Result<(), String> {
    state.history.update_record_text(id, &enhanced_text)
}

#[tauri::command]
pub fn restore_original_history_cmd(
    state: State<'_, AppState>,
    id: i64,
) -> Result<String, String> {
    state.history.restore_record_original_text(id)
}

#[tauri::command]
pub fn hide_pill_window(app: AppHandle) -> Result<(), String> {
    let app_hide = app.clone();
    crate::run_on_main_thread(move || {
        if let Some(w) = app_hide.get_webview_window("floating-indicator") {
            let _ = w.hide();
        }
    });
    Ok(())
}

#[tauri::command]
pub fn get_insights(state: State<'_, AppState>) -> Result<crate::history_service::InsightsData, String> {
    state.history.get_insights()
}

#[tauri::command]
pub fn get_personal_vocabulary(
    state: State<'_, AppState>,
    status_filter: Option<String>,
) -> Result<Vec<crate::personalization_service::PersonalVocabularyEntry>, String> {
    state.history.list_personal_vocabulary(status_filter.as_deref())
}

#[tauri::command]
#[allow(non_snake_case)]
pub fn add_personal_vocabulary_entry(
    state: State<'_, AppState>,
    app: AppHandle,
    original: String,
    preferred: String,
    entry_type: Option<String>,
    entryType: Option<String>,
    status: Option<String>,
    source: Option<String>,
) -> Result<crate::personalization_service::PersonalVocabularyEntry, String> {
    let cat = entry_type.or(entryType).unwrap_or_else(|| "name".to_string());
    let entry = state.history.add_personal_vocabulary(
        &original,
        &preferred,
        &cat,
        status.as_deref().unwrap_or("active"),
        source.as_deref(),
    )?;
    let _ = app.emit("dictionary-updated", ());
    Ok(entry)
}

#[tauri::command]
pub fn toggle_personal_vocabulary_entry(
    state: State<'_, AppState>,
    app: AppHandle,
    id: i64,
    active: bool,
) -> Result<(), String> {
    state.history.toggle_personal_vocabulary(id, active)?;
    let _ = app.emit("dictionary-updated", ());
    Ok(())
}

#[tauri::command]
pub fn export_dictionary_json(
    state: State<'_, AppState>,
) -> Result<String, String> {
    state.history.export_dictionary_json()
}

#[tauri::command]
pub fn propose_correction_rules(
    original_text: String,
    corrected_text: String,
) -> Result<Vec<crate::personalization_service::ExtractedCandidate>, String> {
    Ok(crate::personalization_service::extract_correction_candidates(&original_text, &corrected_text))
}

#[tauri::command]
#[allow(non_snake_case)]
pub fn update_personal_vocabulary_entry(
    state: State<'_, AppState>,
    app: AppHandle,
    id: i64,
    original_text: Option<String>,
    originalText: Option<String>,
    preferred_text: Option<String>,
    preferredText: Option<String>,
    entry_type: Option<String>,
    entryType: Option<String>,
    status: Option<String>,
) -> Result<(), String> {
    let orig = original_text.or(originalText);
    let pref = preferred_text.or(preferredText);
    let cat = entry_type.or(entryType);
    let stat = status.unwrap_or_else(|| "active".to_string());
    state.history.update_personal_vocabulary_full(
        id,
        orig.as_deref(),
        pref.as_deref(),
        cat.as_deref(),
        Some(&stat),
    )?;
    let _ = app.emit("dictionary-updated", ());
    Ok(())
}

#[tauri::command]
pub fn delete_personal_vocabulary_entry(
    state: State<'_, AppState>,
    app: AppHandle,
    id: i64,
) -> Result<(), String> {
    state.history.delete_personal_vocabulary(id)?;
    let _ = app.emit("dictionary-updated", ());
    Ok(())
}

#[tauri::command]
pub fn reset_personalization(
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<(), String> {
    state.history.reset_personalization()?;
    let _ = app.emit("dictionary-updated", ());
    Ok(())
}

#[tauri::command]
pub fn submit_transcript_correction(
    state: State<'_, AppState>,
    app: AppHandle,
    session_id: Option<String>,
    original_text: String,
    final_text: String,
) -> Result<Vec<crate::personalization_service::PersonalVocabularyEntry>, String> {
    let entries = state.history.record_correction_event(session_id.as_deref(), &original_text, &final_text)?;
    let _ = app.emit("dictionary-updated", ());
    Ok(entries)
}

#[tauri::command]
pub fn switch_speech_profile(
    state: State<'_, AppState>,
    app: AppHandle,
    profile: String,
) -> Result<String, String> {
    let manifest = crate::model_manifest::get_official_manifest();
    let models_dir = dirs::data_local_dir()
        .map(|d| d.join("VoxQuest").join("models"))
        .unwrap_or_else(|| std::path::PathBuf::from("."));

    let target_model_id = match profile.to_lowercase().as_str() {
        "developer" | "dev" | "tech" | "technical" => {
            let candidate_ids = ["whisper-large-v3-turbo", "whisper-small", "whisper-base-q5_1", "whisper-base", "whisper-tiny-q5_1", "whisper-tiny"];
            candidate_ids
                .iter()
                .filter_map(|id| manifest.iter().find(|m| &m.id == id))
                .find(|m| models_dir.join(&m.filename).exists())
                .map(|m| m.id.as_str())
                .unwrap_or("whisper-small")
        }
        "multilingual" | "dialects" => {
            if models_dir.join("ggml-small.bin").exists() { "whisper-small" } else { "whisper-base" }
        }
        "general" | "instant" | "fast" | "battery" | "low_power" => {
            if models_dir.join("ggml-tiny-q5_1.bin").exists() {
                "whisper-tiny-q5_1"
            } else if models_dir.join("ggml-tiny.bin").exists() {
                "whisper-tiny"
            } else if models_dir.join("ggml-base-q5_1.bin").exists() {
                "whisper-base-q5_1"
            } else {
                "whisper-base"
            }
        }
        "balanced" | "everyday" => {
            if models_dir.join("ggml-base-q5_1.bin").exists() {
                "whisper-base-q5_1"
            } else if models_dir.join("ggml-base.bin").exists() {
                "whisper-base"
            } else if models_dir.join("ggml-tiny-q5_1.bin").exists() {
                "whisper-tiny-q5_1"
            } else {
                "whisper-tiny"
            }
        }
        _ => {
            return Err(format!("Unknown speech profile: {}", profile));
        }
    };

    let target_info = manifest.iter()
        .find(|m| m.id == target_model_id)
        .cloned()
        .unwrap_or_else(|| manifest[0].clone());

    {
        let mut settings = state.settings.lock().unwrap();
        settings.default_model_id = target_info.id.clone();
        if target_info.id == "whisper-large-v3-turbo" || target_info.id == "whisper-small" {
            settings.spoken_punctuation = true;
            settings.enable_speech_repair = true;
        }
        crate::settings_service::save_settings(&settings)?;
        let _ = app.emit("settings-updated", &*settings);
    }

    {
        let mut session_lock = state.active_session.lock().unwrap();
        session_lock.active_model_name = Some(target_info.name.clone());
        session_lock.technical_suggestion = None;
        session_lock.sequence += 1;
        session_lock.timestamp_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        let snap = session_lock.clone();
        let _ = app.emit("dictation-session-changed", &snap);
    }

    Ok(format!("Switched to {} profile", target_info.name))
}

#[tauri::command]
pub fn dismiss_technical_suggestion(
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<(), String> {
    let mut session_lock = state.active_session.lock().unwrap();
    session_lock.technical_suggestion = None;
    session_lock.sequence += 1;
    session_lock.timestamp_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    let snap = session_lock.clone();
    let _ = app.emit("dictation-session-changed", &snap);
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IngestCapsuleResult {
    pub project_name: String,
    pub terms_ingested: usize,
    pub terms: Vec<String>,
}

#[tauri::command]
pub fn compose_thought_to_spec_cmd(text: String) -> Result<crate::prompt_service::TechnicalSpec, String> {
    Ok(crate::prompt_service::compose_thought_to_spec(&text))
}

#[tauri::command]
pub fn ingest_project_context_capsule_cmd(
    state: State<'_, AppState>,
    app: AppHandle,
    project_name: String,
    project_path: Option<String>,
) -> Result<IngestCapsuleResult, String> {
    let clean_name = project_name.trim();
    if clean_name.is_empty() {
        return Err("Project name cannot be empty".to_string());
    }

    let mut detected_terms = Vec::new();

    // 1. If project_path provided, parse package.json or Cargo.toml
    let base_path = project_path.unwrap_or_else(|| ".".to_string());
    let path = std::path::Path::new(&base_path);

    let pkg_json_path = path.join("package.json");
    if pkg_json_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&pkg_json_path) {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(deps) = val.get("dependencies").and_then(|d| d.as_object()) {
                    for k in deps.keys() {
                        let clean_k = k.trim_start_matches('@').replace('/', "-");
                        detected_terms.push(clean_k);
                    }
                }
                if let Some(dev_deps) = val.get("devDependencies").and_then(|d| d.as_object()) {
                    for k in dev_deps.keys() {
                        let clean_k = k.trim_start_matches('@').replace('/', "-");
                        detected_terms.push(clean_k);
                    }
                }
            }
        }
    }

    let cargo_toml_path = path.join("Cargo.toml");
    if cargo_toml_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&cargo_toml_path) {
            let mut in_deps = false;
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with('[') {
                    in_deps = trimmed.contains("dependencies");
                    continue;
                }
                if in_deps && trimmed.contains('=') {
                    if let Some(dep_name) = trimmed.split('=').next() {
                        let dep_clean = dep_name.trim().trim_matches('"');
                        if !dep_clean.is_empty() && !dep_clean.starts_with('#') {
                            detected_terms.push(dep_clean.to_string());
                        }
                    }
                }
            }
        }
    }

    // Default common tech stack terms if none discovered in directory
    if detected_terms.is_empty() {
        detected_terms.extend(vec![
            "Rust".to_string(), "Tauri".to_string(), "TypeScript".to_string(),
            "React".to_string(), "Zustand".to_string(), "Tailwind".to_string(),
            "rusqlite".to_string(), "whisper".to_string(),
        ]);
    }

    let mut count = 0;
    for term in &detected_terms {
        if state.history.add_personal_vocabulary(&term.to_lowercase(), term, "tech", "active", Some("capsule")).is_ok() {
            count += 1;
        }
    }

    if count > 0 {
        let _ = app.emit("dictionary-updated", ());
    }

    Ok(IngestCapsuleResult {
        project_name: clean_name.to_string(),
        terms_ingested: count,
        terms: detected_terms,
    })
}
