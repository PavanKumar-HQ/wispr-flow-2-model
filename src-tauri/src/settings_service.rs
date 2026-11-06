use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use dirs::data_local_dir;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct AppSettings {
    pub default_model_id: String,
    pub language: String, // "auto", "en", "hi", etc.
    pub shortcut: String, // e.g., "CommandOrControl+Shift+Space"
    pub insertion_policy: String, // "original_destination" or "active_at_stop"
    pub interaction_mode: String, // "toggle" or "push_to_talk"
    pub spoken_punctuation: bool,
    pub conservative_filler_removal: bool,
    pub auto_capitalization: bool,
    pub retain_history: bool,
    pub play_sound_effects: bool,
    pub max_duration_secs: u32,
    pub selected_microphone: String,
    pub enable_personal_dictionary: bool,
    pub enable_correction_learning: bool,
    pub auto_approve_corrections: bool,
    pub enhancement_default_mode: String,
    pub enable_destination_sync: bool,
    pub destination_sync_duration_secs: u32,
    pub enable_auto_model_routing: bool,
    pub enable_speech_repair: bool,
    pub speech_engine: String, // "local", "cloud", "hybrid"
    pub cloud_provider: String, // "groq", "openai", "custom"
    pub cloud_api_key: String,
    pub cloud_api_endpoint: String,
    pub max_cpu_threads: u32,
    pub power_save_mode: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        let installed = dirs::data_local_dir()
            .map(|d| d.join("VoxQuest").join("models"))
            .unwrap_or_else(|| PathBuf::from("."));

        let initial_model = if installed.join("ggml-base.bin").exists() {
            "whisper-base".to_string()
        } else if installed.join("ggml-tiny.bin").exists() {
            "whisper-tiny".to_string()
        } else if installed.join("ggml-small.bin").exists() {
            "whisper-small".to_string()
        } else {
            "whisper-base".to_string()
        };

        Self {
            default_model_id: initial_model,
            language: "en".to_string(),
            shortcut: "CommandOrControl+Shift+Space".to_string(),
            insertion_policy: "original_destination".to_string(),
            interaction_mode: "push_to_talk".to_string(),
            spoken_punctuation: true,
            conservative_filler_removal: true,
            auto_capitalization: true,
            retain_history: true,
            play_sound_effects: true,
            max_duration_secs: 180, // 3 minutes limit with safety cutoff
            selected_microphone: "default".to_string(),
            enable_personal_dictionary: true,
            enable_correction_learning: true,
            auto_approve_corrections: false,
            enhancement_default_mode: "improve_clarity".to_string(),
            enable_destination_sync: true,
            destination_sync_duration_secs: 15,
            enable_auto_model_routing: true,
            enable_speech_repair: true,
            speech_engine: "local".to_string(),
            cloud_provider: "groq".to_string(),
            cloud_api_key: String::new(),
            cloud_api_endpoint: String::new(),
            max_cpu_threads: 4,
            power_save_mode: true,
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
        if let Ok(mut settings) = serde_json::from_str::<AppSettings>(&content) {
            // Ensure destination sync is enabled with a healthy observation window
            settings.enable_destination_sync = true;
            if settings.destination_sync_duration_secs < 30 {
                settings.destination_sync_duration_secs = 45;
            }
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
