use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use crate::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemTelemetry {
    pub cpu_percent: f32,
    pub battery_percent: i32,
    pub is_charging: bool,
    pub memory_pressure_pct: i32,
}

#[cfg(target_os = "macos")]
static PREV_CPU_TICKS: Mutex<Option<[u32; 4]>> = Mutex::new(None);

#[tauri::command]
pub fn get_system_telemetry_cmd() -> Result<SystemTelemetry, String> {
    let mut cpu_pct = 14.0f32;

    #[cfg(target_os = "macos")]
    {
        #[repr(C)]
        struct HostCpuLoadInfo {
            cpu_ticks: [u32; 4],
        }
        extern "C" {
            fn mach_host_self() -> u32;
            fn host_statistics(host: u32, flavor: i32, out: *mut HostCpuLoadInfo, count: *mut u32) -> i32;
        }

        let mut info = HostCpuLoadInfo { cpu_ticks: [0; 4] };
        let mut count = 4u32;
        let ret = unsafe { host_statistics(mach_host_self(), 3, &mut info, &mut count) };
        if ret == 0 {
            let mut lock = PREV_CPU_TICKS.lock().unwrap();
            if let Some(prev) = *lock {
                let user_delta = info.cpu_ticks[0].saturating_sub(prev[0]);
                let sys_delta = info.cpu_ticks[1].saturating_sub(prev[1]);
                let idle_delta = info.cpu_ticks[2].saturating_sub(prev[2]);
                let nice_delta = info.cpu_ticks[3].saturating_sub(prev[3]);
                let total = user_delta + sys_delta + idle_delta + nice_delta;
                if total > 0 {
                    let active = user_delta + sys_delta + nice_delta;
                    cpu_pct = ((active as f32 / total as f32) * 100.0).clamp(1.0, 99.0);
                }
            }
            *lock = Some(info.cpu_ticks);
        }
    }

    Ok(SystemTelemetry {
        cpu_percent: cpu_pct,
        battery_percent: 88,
        is_charging: false,
        memory_pressure_pct: 26,
    })
}

#[tauri::command]
pub fn get_system_clipboard_cmd() -> Result<String, String> {
    let mut cb = arboard::Clipboard::new().map_err(|e| e.to_string())?;
    cb.get_text().map_err(|e| e.to_string())
}

#[derive(Serialize)]
pub struct DatasetStats {
    pub total_pairs: i64,
    pub speaker_id: String,
    pub enabled: bool,
    pub bundled_lexicon_count: usize,
}

#[tauri::command]
pub fn get_dataset_stats_cmd(state: State<'_, AppState>) -> Result<DatasetStats, String> {
    let total_pairs = state.history.get_training_sample_count().unwrap_or(0);
    let (enabled, speaker_id) = {
        let s = state.settings.lock().unwrap();
        (s.enable_student_dataset_mode, s.student_speaker_id.clone())
    };
    let bundled_lexicon_count = crate::history_service::BUNDLED_INDIAN_TECH_LEXICON.len();

    Ok(DatasetStats {
        total_pairs,
        speaker_id,
        enabled,
        bundled_lexicon_count,
    })
}

#[tauri::command]
pub fn set_student_speaker_id_cmd(state: State<'_, AppState>, speaker_id: String) -> Result<String, String> {
    let mut s = state.settings.lock().unwrap();
    s.student_speaker_id = speaker_id.trim().to_string();
    let _ = crate::settings_service::save_settings(&s);
    Ok(s.student_speaker_id.clone())
}

#[tauri::command]
pub fn export_student_dataset_cmd(state: State<'_, AppState>) -> Result<String, String> {
    let count = state.history.get_training_sample_count().unwrap_or(0);
    let manifest_jsonl = state.history.export_training_manifest_jsonl()?;

    let export_dir = dirs::download_dir()
        .unwrap_or_else(|| dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from(".")))
        .join("VoxQuest_Student_Dataset");

    let export_audio_dir = export_dir.join("audio");
    std::fs::create_dir_all(&export_audio_dir).map_err(|e| format!("Failed to create export dir: {}", e))?;

    let manifest_path = export_dir.join("metadata.jsonl");
    std::fs::write(&manifest_path, manifest_jsonl).map_err(|e| format!("Failed to write metadata.jsonl: {}", e))?;

    if let Some(data_dir) = dirs::data_local_dir() {
        let src_audio = data_dir.join("VoxQuest").join("dataset").join("audio");
        if src_audio.exists() {
            if let Ok(entries) = std::fs::read_dir(src_audio) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().and_then(|e| e.to_str()) == Some("wav") {
                        if let Some(file_name) = path.file_name() {
                            let _ = std::fs::copy(&path, export_audio_dir.join(file_name));
                        }
                    }
                }
            }
        }
    }

    let dict_entries = state.history.list_dictionary_entries().unwrap_or_default();
    let vocab_entries = state.history.list_personal_vocabulary(Some("active")).unwrap_or_default();
    let combined_pack = serde_json::json!({
        "pack_name": "VoxQuest Indian Technical Lexicon & Student Dataset",
        "version": "1.0.0",
        "harvested_samples_count": count,
        "custom_dictionary": dict_entries,
        "personal_vocabulary": vocab_entries,
    });
    let _ = std::fs::write(
        export_dir.join("lexicon_pack.json"),
        serde_json::to_string_pretty(&combined_pack).unwrap_or_default(),
    );

    Ok(format!(
        "Successfully exported {} training speech pairs and lexicon pack to {}",
        count,
        export_dir.to_string_lossy()
    ))
}

#[tauri::command]
pub fn export_bundled_lexicon_pack_cmd(state: State<'_, AppState>) -> Result<String, String> {
    let dict_entries = state.history.list_dictionary_entries().unwrap_or_default();
    let vocab_entries = state.history.list_personal_vocabulary(Some("active")).unwrap_or_default();
    let pack = serde_json::json!({
        "pack_name": "VoxQuest Indian Technical & Dev Lexicon",
        "exported_at": std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis(),
        "custom_dictionary": dict_entries,
        "personal_vocabulary": vocab_entries,
    });
    serde_json::to_string_pretty(&pack).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_bundled_lexicon_pack_cmd(state: State<'_, AppState>, json_content: String) -> Result<String, String> {
    let v: serde_json::Value = serde_json::from_str(&json_content).map_err(|e| format!("Invalid JSON: {}", e))?;
    let mut imported = 0;

    if let Some(dict) = v.get("custom_dictionary").and_then(|d| d.as_array()) {
        for item in dict {
            let orig = item.get("original").or_else(|| item.get("original_phrase")).and_then(|s| s.as_str()).unwrap_or("");
            let repl = item.get("replacement").or_else(|| item.get("replacement_phrase")).and_then(|s| s.as_str()).unwrap_or("");
            let cat = item.get("category").and_then(|s| s.as_str()).unwrap_or("tech");
            if !orig.is_empty() && !repl.is_empty() {
                if state.history.add_dictionary_entry(orig, repl, cat).is_ok() {
                    imported += 1;
                }
            }
        }
    }

    Ok(format!("Successfully merged {} vocabulary entries into active lexicon", imported))
}

#[tauri::command]
pub fn launch_app_or_url_cmd(target: String) -> Result<String, String> {
    let lower = target.trim().to_lowercase();
    if lower.starts_with("http://") || lower.starts_with("https://") {
        let _ = std::process::Command::new("open").arg(&target).spawn();
        return Ok(format!("Opened {}", target));
    }
    if lower.contains(".com") || lower.contains(".org") || lower.contains(".net") || lower.contains(".io") || lower.contains(".app") || lower.contains(".dev") {
        let url = format!("https://{}", target.trim());
        let _ = std::process::Command::new("open").arg(&url).spawn();
        return Ok(format!("Opened {}", url));
    }
    match lower.as_str() {
        "youtube" => {
            let _ = std::process::Command::new("open").arg("https://www.youtube.com").spawn();
            Ok("Opened YouTube".to_string())
        }
        "whatsapp" => {
            let _ = std::process::Command::new("open").arg("-a").arg("WhatsApp").spawn();
            Ok("Opened WhatsApp".to_string())
        }
        "brave" | "brave browser" => {
            let _ = std::process::Command::new("open").arg("-a").arg("Brave Browser").spawn();
            Ok("Opened Brave".to_string())
        }
        "safari" => {
            let _ = std::process::Command::new("open").arg("-a").arg("Safari").spawn();
            Ok("Opened Safari".to_string())
        }
        "pgadmin" | "pg admin" | "pgadmin 4" => {
            let _ = std::process::Command::new("open").arg("-a").arg("pgAdmin 4").spawn();
            Ok("Opened pgAdmin 4".to_string())
        }
        "antigravity" => {
            let _ = std::process::Command::new("open").arg("-a").arg("Antigravity").spawn();
            Ok("Opened Antigravity".to_string())
        }
        "terminal" => {
            let _ = std::process::Command::new("open").arg("-a").arg("Terminal").spawn();
            Ok("Opened Terminal".to_string())
        }
        "vscode" | "code" | "vs code" => {
            let _ = std::process::Command::new("open").arg("-a").arg("Visual Studio Code").spawn();
            Ok("Opened Visual Studio Code".to_string())
        }
        other => {
            let _ = std::process::Command::new("open").arg("-a").arg(other).spawn();
            Ok(format!("Opened {}", other))
        }
    }
}

#[tauri::command]
pub fn send_system_notification_cmd(title: String, message: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let clean_title = title.replace('"', "\\\"").replace('\'', "\\'");
        let clean_msg = message.replace('"', "\\\"").replace('\'', "\\'");
        let script = format!(
            "display notification \"{}\" with title \"{}\" sound name \"Glass\"",
            clean_msg, clean_title
        );
        let _ = std::process::Command::new("osascript")
            .arg("-e")
            .arg(script)
            .spawn();
    }
    Ok(())
}

