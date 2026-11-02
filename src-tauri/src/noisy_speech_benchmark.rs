//! VoxQuest Comprehensive Noisy Speech Recognition Benchmark Suite
//!
//! Provides controlled, reproducible evaluation of speech recognition accuracy
//! under clean and realistic noise conditions:
//! 1. Clean speech
//! 2. Steady fan / HVAC noise (10 dB SNR)
//! 3. Keyboard typing / transient impacts (8 dB SNR)
//! 4. Background conversation / TV babble (12 dB SNR)
//! 5. Quiet speech
//! 6. Silence and noise without speech
//!
//! Computes standard Word Error Rate (WER), Character Error Rate (CER),
//! insertions, deletions, substitutions, and latency.

use std::path::Path;
use crate::whisper_service::WhisperEngine;

#[derive(Debug, Clone)]
pub struct TestCase {
    pub id: &'static str,
    pub description: &'static str,
    pub reference_text: &'static str,
    pub audio_samples: Vec<f32>,
    pub sample_rate: u32,
}

#[derive(Debug, Clone, Default)]
pub struct BenchmarkMetrics {
    pub condition: String,
    pub model_id: String,
    pub total_reference_words: usize,
    pub total_errors: usize,
    pub substitutions: usize,
    pub deletions: usize,
    pub insertions: usize,
    pub wer: f32,
    pub cer: f32,
    pub false_positives_in_silence_or_noise: usize,
    pub avg_latency_ms: u128,
}

/// Normalizes text for standard ASR evaluation (lowercase, alphanumeric + space only)
pub fn normalize_for_eval(text: &str) -> Vec<String> {
    text.to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { ' ' })
        .collect::<String>()
        .split_whitespace()
        .map(|s| s.to_string())
        .collect()
}

/// Computes Levenshtein distance on token slices (Words or Chars)
pub fn compute_levenshtein_alignment<T: PartialEq>(ref_tokens: &[T], hyp_tokens: &[T]) -> (usize, usize, usize) {
    let r_len = ref_tokens.len();
    let h_len = hyp_tokens.len();

    if r_len == 0 {
        return (0, 0, h_len); // All insertions
    }
    if h_len == 0 {
        return (0, r_len, 0); // All deletions
    }

    // dp[i][j] = (substitutions, deletions, insertions)
    // We compute cost matrix
    let mut d = vec![vec![0usize; h_len + 1]; r_len + 1];

    for i in 0..=r_len {
        d[i][0] = i;
    }
    for j in 0..=h_len {
        d[0][j] = j;
    }

    for i in 1..=r_len {
        for j in 1..=h_len {
            let cost = if ref_tokens[i - 1] == hyp_tokens[j - 1] { 0 } else { 1 };
            d[i][j] = (d[i - 1][j] + 1) // deletion
                .min(d[i][j - 1] + 1)   // insertion
                .min(d[i - 1][j - 1] + cost); // match or substitution
        }
    }

    // Backtrack to find exact S, D, I counts
    let mut i = r_len;
    let mut j = h_len;
    let mut subs = 0;
    let mut dels = 0;
    let mut inss = 0;

    while i > 0 || j > 0 {
        if i > 0 && j > 0 && ref_tokens[i - 1] == hyp_tokens[j - 1] {
            i -= 1;
            j -= 1;
        } else if i > 0 && j > 0 && d[i][j] == d[i - 1][j - 1] + 1 {
            subs += 1;
            i -= 1;
            j -= 1;
        } else if i > 0 && d[i][j] == d[i - 1][j] + 1 {
            dels += 1;
            i -= 1;
        } else {
            inss += 1;
            j -= 1;
        }
    }

    (subs, dels, inss)
}

/// Computes Word Error Rate (WER) = (S + D + I) / N
pub fn calculate_wer(reference: &str, hypothesis: &str) -> (f32, usize, usize, usize, usize) {
    let ref_words = normalize_for_eval(reference);
    let hyp_words = normalize_for_eval(hypothesis);

    if ref_words.is_empty() {
        if hyp_words.is_empty() {
            return (0.0, 0, 0, 0, 0);
        } else {
            return (1.0, 0, 0, hyp_words.len(), 0);
        }
    }

    let (s, d, i) = compute_levenshtein_alignment(&ref_words, &hyp_words);
    let errors = s + d + i;
    let wer = errors as f32 / ref_words.len() as f32;
    (wer, ref_words.len(), s, d, i)
}

/// Computes Character Error Rate (CER) = (S + D + I) / N_chars
pub fn calculate_cer(reference: &str, hypothesis: &str) -> f32 {
    let ref_chars: Vec<char> = reference.to_lowercase().chars().filter(|c| c.is_alphanumeric()).collect();
    let hyp_chars: Vec<char> = hypothesis.to_lowercase().chars().filter(|c| c.is_alphanumeric()).collect();

    if ref_chars.is_empty() {
        return if hyp_chars.is_empty() { 0.0 } else { 1.0 };
    }

    let (s, d, i) = compute_levenshtein_alignment(&ref_chars, &hyp_chars);
    (s + d + i) as f32 / ref_chars.len() as f32
}

// ============================================================================
// Synthetic Realistic Noise Generators
// ============================================================================

/// Generates steady HVAC/fan noise (filtered low-frequency pink/brown noise)
pub fn generate_fan_hvac_noise(num_samples: usize) -> Vec<f32> {
    let mut noise = Vec::with_capacity(num_samples);
    let mut b0 = 0.0f32;
    let mut b1 = 0.0f32;
    let mut b2 = 0.0f32;
    let mut state = 1234567u32;

    for _ in 0..num_samples {
        // Linear congruential generator for deterministic white noise
        state = state.wrapping_mul(1664525).wrapping_add(1013904223);
        let white = ((state as f32 / u32::MAX as f32) * 2.0) - 1.0;

        // Pink filter approximation
        b0 = 0.99765 * b0 + white * 0.0555179;
        b1 = 0.96300 * b1 + white * 0.0750759;
        b2 = 0.57000 * b2 + white * 0.1538520;
        let pink = b0 + b1 + b2 + white * 0.5362;
        noise.push(pink * 0.08);
    }
    noise
}

/// Generates keyboard click / transient impact noise
pub fn generate_keyboard_typing_noise(num_samples: usize, sample_rate: u32) -> Vec<f32> {
    let mut noise = vec![0.0f32; num_samples];
    let click_interval = (sample_rate as f32 * 0.28) as usize; // ~3.5 keypresses per sec

    let mut click_pos = click_interval / 2;
    let mut seed = 9876543u32;

    while click_pos < num_samples {
        let click_len = ((sample_rate as f32 * 0.035) as usize).min(num_samples - click_pos);
        for i in 0..click_len {
            seed = seed.wrapping_mul(1103515245).wrapping_add(12345);
            let rnd = ((seed as f32 / u32::MAX as f32) * 2.0) - 1.0;
            let decay = (-5.0 * (i as f32 / click_len as f32)).exp();
            let osc = (2.0 * std::f32::consts::PI * 2400.0 * (i as f32 / sample_rate as f32)).sin();
            noise[click_pos + i] += (rnd * 0.5 + osc * 0.5) * decay * 0.22;
        }
        click_pos += click_interval;
    }
    noise
}

/// Generates background speech babble / cafeteria noise
pub fn generate_babble_noise(num_samples: usize, sample_rate: u32) -> Vec<f32> {
    let mut noise = vec![0.0f32; num_samples];
    let formants = [300.0, 750.0, 1800.0, 2600.0];

    for (idx, &f) in formants.iter().enumerate() {
        let mod_freq = 2.0 + (idx as f32 * 1.5);
        for i in 0..num_samples {
            let t = i as f32 / sample_rate as f32;
            let envelope = ((2.0 * std::f32::consts::PI * mod_freq * t).sin() * 0.5 + 0.5).powi(2);
            let carrier = (2.0 * std::f32::consts::PI * f * t).sin();
            noise[i] += carrier * envelope * 0.035;
        }
    }
    noise
}

/// Mixes additive noise into a clean speech signal at a precise target Signal-to-Noise Ratio (SNR dB)
pub fn mix_noise(clean: &[f32], noise: &[f32], target_snr_db: f32) -> Vec<f32> {
    if clean.is_empty() {
        return Vec::new();
    }
    let p_clean: f32 = clean.iter().map(|&s| s * s).sum::<f32>() / clean.len() as f32;
    let p_noise: f32 = noise.iter().take(clean.len()).map(|&s| s * s).sum::<f32>() / clean.len().min(noise.len()) as f32;

    if p_noise <= 1e-12 || p_clean <= 1e-12 {
        return clean.to_vec();
    }

    // target_snr_db = 10 * log10(p_clean / (scale^2 * p_noise))
    // => scale = sqrt(p_clean / (p_noise * 10^(target_snr_db / 10)))
    let desired_noise_power = p_clean / (10.0f32.powf(target_snr_db / 10.0));
    let scale = (desired_noise_power / p_noise).sqrt();

    let mut mixed = Vec::with_capacity(clean.len());
    for i in 0..clean.len() {
        let n = noise.get(i % noise.len()).copied().unwrap_or(0.0) * scale;
        mixed.push((clean[i] + n).clamp(-1.0, 1.0));
    }
    mixed
}

/// Generates clean synthetic speech WAV file using macOS `say`
pub fn ensure_speech_fixture(path: &Path, text: &str) -> Result<Vec<f32>, String> {
    if !path.exists() {
        let status = std::process::Command::new("say")
            .arg("-o")
            .arg(path)
            .arg("--data-format=LEF32@16000")
            .arg(text)
            .status()
            .map_err(|e| format!("Failed to run macOS say: {}", e))?;

        if !status.success() {
            return Err("say command failed".to_string());
        }
    }

    let mut reader = hound::WavReader::open(path)
        .map_err(|e| format!("Failed to read WAV fixture at {:?}: {}", path, e))?;

    let samples: Vec<f32> = reader.samples::<f32>().map(|s| s.unwrap_or(0.0)).collect();
    Ok(samples)
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use std::path::PathBuf;
    use crate::model_manager;
    use crate::audio_service::isolate_voice_and_suppress_noise;

    fn get_test_fixtures() -> Vec<(&'static str, &'static str, &'static str)> {
        vec![
            ("short_conv", "Hello world this is VoxQuest voice typing", "eval_u1.wav"),
            ("tech_num", "The server returned HTTP 404 error on port 8080", "eval_u2.wav"),
            ("long_sentence", "Voice typing saves sixty to seventy percent of manual keyboard typing time", "eval_u3.wav"),
            ("names_vocab", "Doctor Satoshi Nakamoto met with Sarah Connor on November second", "eval_u4.wav"),
            ("quiet_speech", "The quick brown fox jumps over the lazy dog", "eval_u5.wav"),
        ]
    }

    fn prepare_speech_samples(tmp_dir: &Path) -> Vec<(&'static str, &'static str, Vec<f32>)> {
        let fixtures = get_test_fixtures();
        let mut result = Vec::new();

        for (id, text, filename) in fixtures {
            let wav_path = tmp_dir.join(filename);
            let samples = ensure_speech_fixture(&wav_path, text).expect("Fixture generation should succeed");
            result.push((id, text, samples));
        }

        result
    }

    #[test]
    fn test_wer_cer_calculation_logic() {
        let ref_text = "the quick brown fox";
        let hyp_exact = "the quick brown fox";
        let (wer, n, s, d, i) = calculate_wer(ref_text, hyp_exact);
        assert_eq!(wer, 0.0);
        assert_eq!(n, 4);
        assert_eq!(s, 0);
        assert_eq!(d, 0);
        assert_eq!(i, 0);
        assert_eq!(calculate_cer(ref_text, hyp_exact), 0.0);

        // 1 substitution
        let hyp_sub = "the quick red fox";
        let (wer, _, s, d, i) = calculate_wer(ref_text, hyp_sub);
        assert_eq!(wer, 0.25);
        assert_eq!(s, 1);
        assert_eq!(d, 0);
        assert_eq!(i, 0);

        // 1 deletion ("brown" omitted)
        let hyp_del = "the quick fox";
        let (wer, _, s, d, i) = calculate_wer(ref_text, hyp_del);
        assert_eq!(wer, 0.25);
        assert_eq!(s, 0);
        assert_eq!(d, 1);
        assert_eq!(i, 0);

        // 1 insertion
        let hyp_ins = "the super quick brown fox";
        let (wer, _, s, d, i) = calculate_wer(ref_text, hyp_ins);
        assert_eq!(wer, 0.25);
        assert_eq!(s, 0);
        assert_eq!(d, 0);
        assert_eq!(i, 1);
    }

    #[test]
    fn test_benchmark_baseline_pipeline_measurements() {
        let models_dir = model_manager::get_voxquest_models_dir();
        let tiny_path = models_dir.join("ggml-tiny.bin");
        if !tiny_path.exists() {
            eprintln!("Skipping benchmark: ggml-tiny.bin not found on disk");
            return;
        }

        let tmp_dir = PathBuf::from("/tmp/vox_eval");
        let _ = std::fs::create_dir_all(&tmp_dir);
        let test_speech = prepare_speech_samples(&tmp_dir);

        let mut engine = WhisperEngine::new();
        engine.load_model(&tiny_path).expect("Tiny model must load");

        println!("\n========================================================");
        println!("  VOXQUEST SPEECH RECOGNITION BASELINE AUDIT");
        println!("========================================================");

        // 1. Condition: Clean Speech (Raw samples -> isolate_voice_and_suppress_noise -> Whisper)
        let mut clean_words = 0;
        let mut clean_errs = 0;
        let mut clean_latency = 0;

        for (id, ref_text, samples) in &test_speech {
            let t0 = std::time::Instant::now();
            let processed = isolate_voice_and_suppress_noise(samples, 16000);
            let hyp = engine.transcribe(&processed, Some("en"), None).unwrap_or_default();
            let dur = t0.elapsed().as_millis();

            clean_latency += dur;
            let (wer, n, s, d, i) = calculate_wer(ref_text, &hyp);
            clean_words += n;
            clean_errs += (s + d + i);

            println!("  [Clean] {:14} | WER: {:5.1}% | Latency: {:3}ms | Hyp: '{}'", id, wer * 100.0, dur, hyp);
        }
        let clean_wer = clean_errs as f32 / clean_words as f32;
        println!(">> OVERALL CLEAN BASELINE WER: {:.2}%\n", clean_wer * 100.0);

        // 2. Condition: Steady Fan / HVAC Noise (10 dB SNR)
        let mut fan_words = 0;
        let mut fan_errs = 0;
        for (id, ref_text, samples) in &test_speech {
            let noise = generate_fan_hvac_noise(samples.len());
            let noisy_samples = mix_noise(samples, &noise, 10.0);

            let t0 = std::time::Instant::now();
            let processed = isolate_voice_and_suppress_noise(&noisy_samples, 16000);
            let hyp = engine.transcribe(&processed, Some("en"), None).unwrap_or_default();
            let dur = t0.elapsed().as_millis();

            let (wer, n, s, d, i) = calculate_wer(ref_text, &hyp);
            fan_words += n;
            fan_errs += (s + d + i);

            println!("  [Fan 10dB] {:14} | WER: {:5.1}% (S:{} D:{} I:{}) | Hyp: '{}'", id, wer * 100.0, s, d, i, hyp);
        }
        let fan_wer = fan_errs as f32 / fan_words as f32;
        println!(">> OVERALL FAN/HVAC BASELINE WER: {:.2}%\n", fan_wer * 100.0);

        // 3. Condition: Keyboard Typing Noise (8 dB SNR)
        let mut key_words = 0;
        let mut key_errs = 0;
        for (id, ref_text, samples) in &test_speech {
            let noise = generate_keyboard_typing_noise(samples.len(), 16000);
            let noisy_samples = mix_noise(samples, &noise, 8.0);

            let processed = isolate_voice_and_suppress_noise(&noisy_samples, 16000);
            let hyp = engine.transcribe(&processed, Some("en"), None).unwrap_or_default();

            let (wer, n, s, d, i) = calculate_wer(ref_text, &hyp);
            key_words += n;
            key_errs += (s + d + i);

            println!("  [Keyboard 8dB] {:14} | WER: {:5.1}% (S:{} D:{} I:{}) | Hyp: '{}'", id, wer * 100.0, s, d, i, hyp);
        }
        let key_wer = key_errs as f32 / key_words as f32;
        println!(">> OVERALL KEYBOARD BASELINE WER: {:.2}%\n", key_wer * 100.0);

        // 4. Condition: Background Babble / TV Noise (12 dB SNR)
        let mut babble_words = 0;
        let mut babble_errs = 0;
        for (id, ref_text, samples) in &test_speech {
            let noise = generate_babble_noise(samples.len(), 16000);
            let noisy_samples = mix_noise(samples, &noise, 12.0);

            let processed = isolate_voice_and_suppress_noise(&noisy_samples, 16000);
            let hyp = engine.transcribe(&processed, Some("en"), None).unwrap_or_default();

            let (wer, n, s, d, i) = calculate_wer(ref_text, &hyp);
            babble_words += n;
            babble_errs += (s + d + i);

            println!("  [Babble 12dB] {:14} | WER: {:5.1}% (S:{} D:{} I:{}) | Hyp: '{}'", id, wer * 100.0, s, d, i, hyp);
        }
        let babble_wer = babble_errs as f32 / babble_words as f32;
        println!(">> OVERALL BABBLE BASELINE WER: {:.2}%\n", babble_wer * 100.0);

        // 5. Condition: Pure Noise & Silence (Testing False Hallucinations)
        let pure_fan = generate_fan_hvac_noise(16000 * 3);
        let proc_fan = isolate_voice_and_suppress_noise(&pure_fan, 16000);
        let hyp_fan = if proc_fan.is_empty() { String::new() } else { engine.transcribe(&proc_fan, Some("en"), None).unwrap_or_default() };
        println!("  [Pure Noise Only] Fan output: '{}'", hyp_fan);

        let pure_silence = vec![0.0f32; 16000 * 3];
        let proc_silence = isolate_voice_and_suppress_noise(&pure_silence, 16000);
        let hyp_silence = if proc_silence.is_empty() { String::new() } else { engine.transcribe(&proc_silence, Some("en"), None).unwrap_or_default() };
        println!("  [Pure Silence] Output: '{}'", hyp_silence);

        println!("========================================================\n");
    }

    #[test]
    fn test_benchmark_models_comparison_tiny_base_small() {
        let models_dir = model_manager::get_voxquest_models_dir();
        let models = ["ggml-tiny.bin", "ggml-base.bin", "ggml-small.bin"];

        let tmp_dir = PathBuf::from("/tmp/vox_eval");
        let _ = std::fs::create_dir_all(&tmp_dir);
        let test_speech = prepare_speech_samples(&tmp_dir);

        println!("\n========================================================");
        println!("  VOXQUEST MULTI-MODEL NOISE ACCURACY COMPARISON");
        println!("========================================================");

        for model_filename in &models {
            let model_path = models_dir.join(model_filename);
            if !model_path.exists() {
                println!("Model {} not on disk, skipping", model_filename);
                continue;
            }

            let mut engine = WhisperEngine::new();
            if let Err(e) = engine.load_model(&model_path) {
                println!("Failed to load {}: {:?}", model_filename, e);
                continue;
            }

            let mut total_words = 0;
            let mut total_clean_errs = 0;
            let mut total_fan_errs = 0;
            let mut total_key_errs = 0;
            let mut total_babble_errs = 0;
            let mut total_latency_ms = 0;

            for (_, ref_text, samples) in &test_speech {
                // Clean
                let t0 = std::time::Instant::now();
                let hyp_clean = engine.transcribe(samples, Some("en"), None).unwrap_or_default();
                total_latency_ms += t0.elapsed().as_millis();
                let (_, n, s, d, i) = calculate_wer(ref_text, &hyp_clean);
                total_words += n;
                total_clean_errs += (s + d + i);

                // Fan (10dB)
                let fan_noise = generate_fan_hvac_noise(samples.len());
                let noisy_fan = mix_noise(samples, &fan_noise, 10.0);
                let hyp_fan = engine.transcribe(&noisy_fan, Some("en"), None).unwrap_or_default();
                let (_, _, s_f, d_f, i_f) = calculate_wer(ref_text, &hyp_fan);
                total_fan_errs += (s_f + d_f + i_f);

                // Keyboard (8dB)
                let key_noise = generate_keyboard_typing_noise(samples.len(), 16000);
                let noisy_key = mix_noise(samples, &key_noise, 8.0);
                let hyp_key = engine.transcribe(&noisy_key, Some("en"), None).unwrap_or_default();
                let (_, _, s_k, d_k, i_k) = calculate_wer(ref_text, &hyp_key);
                total_key_errs += (s_k + d_k + i_k);

                // Babble (12dB)
                let babble_noise = generate_babble_noise(samples.len(), 16000);
                let noisy_babble = mix_noise(samples, &babble_noise, 12.0);
                let hyp_babble = engine.transcribe(&noisy_babble, Some("en"), None).unwrap_or_default();
                let (_, _, s_b, d_b, i_b) = calculate_wer(ref_text, &hyp_babble);
                total_babble_errs += (s_b + d_b + i_b);
            }

            let avg_latency = total_latency_ms as f32 / test_speech.len() as f32;
            let clean_wer = (total_clean_errs as f32 / total_words as f32) * 100.0;
            let fan_wer = (total_fan_errs as f32 / total_words as f32) * 100.0;
            let key_wer = (total_key_errs as f32 / total_words as f32) * 100.0;
            let babble_wer = (total_babble_errs as f32 / total_words as f32) * 100.0;
            let composite_wer = (clean_wer + fan_wer + key_wer + babble_wer) / 4.0;

            println!("Model: {:15} | Latency: {:4.0}ms | Clean: {:5.1}% | Fan 10dB: {:5.1}% | Key 8dB: {:5.1}% | Babble 12dB: {:5.1}% | Composite WER: {:5.1}%",
                     model_filename, avg_latency, clean_wer, fan_wer, key_wer, babble_wer, composite_wer);
        }
        println!("========================================================\n");
    }
}

