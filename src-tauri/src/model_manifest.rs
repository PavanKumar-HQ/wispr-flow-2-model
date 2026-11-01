use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub filename: String,
    pub size_bytes: u64,
    pub sha256: String,
    pub download_url: String,
    pub description: String,
    pub ram_estimate_mb: u32,
    pub recommended: bool,
    pub is_downloaded: bool,
}

pub fn get_official_manifest() -> Vec<ModelInfo> {
    vec![
        ModelInfo {
            id: "whisper-tiny".to_string(),
            name: "Whisper Tiny (Multilingual)".to_string(),
            filename: "ggml-tiny.bin".to_string(),
            size_bytes: 77691713,
            sha256: "be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21".to_string(),
            download_url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin".to_string(),
            description: "Fastest inference, ultra-low RAM footprint (~390 MB). Ideal for quick checks and low-power hardware.".to_string(),
            ram_estimate_mb: 390,
            recommended: false,
            is_downloaded: false,
        },
        ModelInfo {
            id: "whisper-base".to_string(),
            name: "Whisper Base (Multilingual)".to_string(),
            filename: "ggml-base.bin".to_string(),
            size_bytes: 147951465,
            sha256: "60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe".to_string(),
            download_url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin".to_string(),
            description: "Great balance of quick response and acceptable accuracy (~500 MB RAM).".to_string(),
            ram_estimate_mb: 500,
            recommended: false,
            is_downloaded: false,
        },
        ModelInfo {
            id: "whisper-small".to_string(),
            name: "Whisper Small (Multilingual — Recommended)".to_string(),
            filename: "ggml-small.bin".to_string(),
            size_bytes: 487601967,
            sha256: "1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b".to_string(),
            download_url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin".to_string(),
            description: "High accuracy across 99+ languages and dialects, code-switching, technical terminology, Hinglish (~1.0 GB RAM).".to_string(),
            ram_estimate_mb: 1024,
            recommended: true,
            is_downloaded: false,
        },
    ]
}

