use std::time::Duration;

#[derive(Debug, Clone)]
pub struct CloudSpeechConfig {
    pub provider: String, // "groq", "openai", "custom"
    pub api_key: String,
    pub custom_endpoint: Option<String>,
}

/// Convert normalized 16kHz f32 PCM samples into standard 16-bit PCM WAV in memory
pub fn pcm_to_wav_bytes(samples: &[f32], sample_rate: u32) -> Result<Vec<u8>, String> {
    let mut cursor = std::io::Cursor::new(Vec::with_capacity(samples.len() * 2 + 44));
    let spec = hound::WavSpec {
        channels: 1,
        sample_rate,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };
    let mut writer = hound::WavWriter::new(&mut cursor, spec)
        .map_err(|e| format!("WAV header init failed: {}", e))?;

    for &s in samples {
        let clamped = s.clamp(-1.0, 1.0);
        let sample_i16 = (clamped * 32767.0) as i16;
        writer.write_sample(sample_i16)
            .map_err(|e| format!("WAV write sample failed: {}", e))?;
    }

    writer.finalize().map_err(|e| format!("WAV finalize failed: {}", e))?;
    Ok(cursor.into_inner())
}

/// Transcribe audio via high-speed cloud speech API with 0 local CPU/GPU footprint
pub fn transcribe_cloud(
    samples: &[f32],
    config: &CloudSpeechConfig,
    language: Option<&str>,
    initial_prompt: Option<&str>,
) -> Result<String, String> {
    let api_key = config.api_key.trim();
    if api_key.is_empty() {
        return Err("Cloud API key is not configured".to_string());
    }

    let wav_bytes = pcm_to_wav_bytes(samples, 16000)?;

    let (endpoint, model_name) = match config.provider.to_lowercase().as_str() {
        "groq" => (
            "https://api.groq.com/openai/v1/audio/transcriptions",
            "whisper-large-v3-turbo",
        ),
        "openai" => (
            "https://api.openai.com/v1/audio/transcriptions",
            "whisper-1",
        ),
        _ => {
            let ep = config.custom_endpoint.as_deref()
                .filter(|e| !e.trim().is_empty())
                .unwrap_or("https://api.groq.com/openai/v1/audio/transcriptions");
            (ep, "whisper-large-v3-turbo")
        }
    };

    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(12))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let part = reqwest::blocking::multipart::Part::bytes(wav_bytes)
        .file_name("audio.wav")
        .mime_str("audio/wav")
        .map_err(|e| format!("Failed to prepare audio multipart: {}", e))?;

    let mut form = reqwest::blocking::multipart::Form::new()
        .part("file", part)
        .text("model", model_name.to_string())
        .text("response_format", "json");

    if let Some(lang) = language {
        let clean_lang = lang.trim();
        if !clean_lang.is_empty() && clean_lang != "auto" {
            form = form.text("language", clean_lang.to_string());
        }
    }

    if let Some(prompt) = initial_prompt {
        let clean_prompt = prompt.trim();
        if !clean_prompt.is_empty() {
            form = form.text("prompt", clean_prompt.to_string());
        }
    }

    let resp = client.post(endpoint)
        .bearer_auth(api_key)
        .multipart(form)
        .send()
        .map_err(|e| format!("Cloud transcription network request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let err_text = resp.text().unwrap_or_else(|_| "Unknown API error".to_string());
        return Err(format!("Cloud transcription HTTP {}: {}", status, err_text));
    }

    let val = resp.json::<serde_json::Value>()
        .map_err(|e| format!("Failed to parse cloud response JSON: {}", e))?;

    if let Some(text) = val.get("text").and_then(|t| t.as_str()) {
        Ok(text.to_string())
    } else {
        Err("Response JSON did not contain 'text' field".to_string())
    }
}
