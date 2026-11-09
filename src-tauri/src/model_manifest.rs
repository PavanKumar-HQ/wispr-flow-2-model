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
            id: "whisper-base-en-q5_1".to_string(),
            name: "Instant English (Lightweight)".to_string(),
            filename: "ggml-base.en-q5_1.bin".to_string(),
            size_bytes: 59721011,
            sha256: "4baf70dd0d7c4247ba2b81fafd9c01005ac77c2f9ef064e00dcf195d0e2fdd2f".to_string(),
            download_url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en-q5_1.bin".to_string(),
            description: "57 MB ultra-lightweight English model. Instant response (~140ms latency), lowest battery consumption, and zero MacBook heat.".to_string(),
            ram_estimate_mb: 130,
            recommended: true,
            is_downloaded: false,
        },
        ModelInfo {
            id: "whisper-base-q5_1".to_string(),
            name: "Everyday Multilingual (Low RAM)".to_string(),
            filename: "ggml-base-q5_1.bin".to_string(),
            size_bytes: 59707625,
            sha256: "422f1ae452ade6f30a004d7e5c6a43195e4433bc370bf23fac9cc591f01a8898".to_string(),
            download_url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin".to_string(),
            description: "59 MB compact Q5_1 multilingual model. High transcription precision with minimal memory overhead (~180 MB RAM).".to_string(),
            ram_estimate_mb: 180,
            recommended: false,
            is_downloaded: false,
        },
        ModelInfo {
            id: "whisper-tiny-q5_1".to_string(),
            name: "Ultra-Low Power (Battery Saver)".to_string(),
            filename: "ggml-tiny-q5_1.bin".to_string(),
            size_bytes: 32152673,
            sha256: "818710568da3ca15689e31a743197b520007872ff9576237bda97bd1b469c3d7".to_string(),
            download_url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny-q5_1.bin".to_string(),
            description: "32 MB ultra-quantized Q5_1 model. Lowest battery and RAM footprint (~120 MB RAM), ideal for maximum battery life.".to_string(),
            ram_estimate_mb: 120,
            recommended: false,
            is_downloaded: false,
        },
    ]
}

