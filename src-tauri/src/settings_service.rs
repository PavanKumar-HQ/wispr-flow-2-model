use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use dirs::data_local_dir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub default_model_id: String,
    pub language: String, // "auto", "en", "hi", etc.
    pub shortcut: String, // e.g., "CommandOrControl+Shift+Space"
    pub spoken_punctuation: bool,
    pub conservative_filler_removal: bool,
    pub auto_capitalization: bool,
    pub retain_history: bool,
    pub play_sound_effects: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            default_model_id: "whisper-small".to_string(),
            language: "auto".to_string(),
            shortcut: "CommandOrControl+Shift+Space".to_string(),
            spoken_punctuation: true,
            conservative_filler_removal: false,
            auto_capitalization: true,
            retain_history: true,
            play_sound_effects: true,
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

