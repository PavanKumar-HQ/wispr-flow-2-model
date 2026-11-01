use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use dirs::data_local_dir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub default_model_id: String,
    pub language: String, // "auto", "en", "hi", etc.
    pub shortcut: String, // e.g., "CommandOrControl+Shift+Space"
    pub insertion_policy: String, // "original_destination" or "active_at_stop"
    pub spoken_punctuation: bool,
    pub conservative_filler_removal: bool,
    pub auto_capitalization: bool,
    pub retain_history: bool,
    pub play_sound_effects: bool,
    pub max_duration_secs: u32,
}

impl Default for AppSettings {
    fn default() -> Self {
        let installed = dirs::data_local_dir()
            .map(|d| d.join("VoxQuest").join("models"))
            .unwrap_or_else(|| PathBuf::from("."));

        let initial_model = if installed.join("ggml-small.bin").exists() {
            "whisper-small".to_string()
        } else if installed.join("ggml-base.bin").exists() {
            "whisper-base".to_string()
        } else if installed.join("ggml-tiny.bin").exists() {
            "whisper-tiny".to_string()
        } else {
            "whisper-small".to_string()
        };

        Self {
            default_model_id: initial_model,
            language: "auto".to_string(),
            shortcut: "CommandOrControl+Shift+Space".to_string(),
            insertion_policy: "original_destination".to_string(),
            spoken_punctuation: true,
            conservative_filler_removal: false,
            auto_capitalization: true,
            retain_history: true,
            play_sound_effects: true,
            max_duration_secs: 180, // 3 minutes limit with safety cutoff
        }
    }
}

pub fn get_settings_path() -> PathBuf {
    let base = data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    let dir = base.join("VoxQuest");
    let _ = fs::create_dir_all(&dir);
    dir.join("settings.json")
}

pub fn load_settings() -> AppSettings {
    let path = get_settings_path();
    if let Ok(content) = fs::read_to_string(path) {
        if let Ok(settings) = serde_json::from_str(&content) {
            return settings;
        }
    }
    AppSettings::default()
}

pub fn save_settings(settings: &AppSettings) -> Result<(), String> {
    let path = get_settings_path();
    let content = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    fs::write(path, content).map_err(|e| format!("Failed to write settings file: {}", e))?;
    Ok(())
}
