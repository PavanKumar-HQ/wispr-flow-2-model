use std::sync::{Arc, Mutex};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::Stream;

pub struct AudioCaptureService {
    is_recording: Arc<Mutex<bool>>,
    buffer: Arc<Mutex<Vec<f32>>>,
    stream: Option<Stream>,
    input_sample_rate: u32,
    latest_level: Arc<std::sync::atomic::AtomicU32>,
}

impl AudioCaptureService {
    pub fn new() -> Self {
        Self {
            is_recording: Arc::new(Mutex::new(false)),
            buffer: Arc::new(Mutex::new(Vec::with_capacity(16000 * 30))),
            stream: None,
            input_sample_rate: 16000,
            latest_level: Arc::new(std::sync::atomic::AtomicU32::new(0)),
        }
    }

    pub fn get_current_audio_level(&self) -> f32 {
        f32::from_bits(self.latest_level.load(std::sync::atomic::Ordering::Relaxed))
    }

    pub fn list_input_devices() -> Result<Vec<String>, String> {
        let host = cpal::default_host();
        let devices = host.input_devices().map_err(|e| format!("Failed to enumerate devices: {}", e))?;
        let mut names = Vec::new();
        for d in devices {
            names.push(d.to_string());
        }
        Ok(names)
    }

    pub fn start_recording(&mut self, target_device: Option<&str>) -> Result<(), String> {
        let mut rec_lock = self.is_recording.lock().unwrap();
        if *rec_lock {
            return Err("Recording session already in progress".to_string());
        }

        let host = cpal::default_host();
        let device = if let Some(target_name) = target_device.filter(|n| *n != "default" && !n.is_empty()) {
            host.input_devices()
                .map_err(|e| format!("Device enumeration failed: {}", e))?
                .find(|d| d.to_string() == target_name)
                .or_else(|| host.default_input_device())
                .ok_or_else(|| "Selected microphone not found and no default device available".to_string())?
        } else {
            // Respect the user's active macOS default input device (AirPods, USB mic, headset, or internal mic)
            if let Some(def) = host.default_input_device() {
                def
            } else {
                let all_devices = host.input_devices().ok();
                let builtin = all_devices.and_then(|devs| {
                    devs.into_iter().find(|d| {
                        let name = d.to_string().to_lowercase();
                        name.contains("macbook") || name.contains("built-in") || name.contains("builtin") || name.contains("internal")
                    })
                });

                if let Some(b) = builtin {
                    b
                } else {
                    host.input_devices().ok().and_then(|mut iter| iter.next())
                        .ok_or_else(|| "No microphone input device detected. Please check your audio settings.".to_string())?
                }
            }
        };

        let supported_config = device.default_input_config()
            .map_err(|e| format!("Microphone access error (verify OS microphone permissions): {}", e))?;

        let sample_rate = supported_config.sample_rate();
        let channels = supported_config.channels() as usize;
        self.input_sample_rate = sample_rate;

        // Clear previous buffer
        {
            let mut buf = self.buffer.lock().unwrap();
            buf.clear();
        }

        let buffer_clone = Arc::clone(&self.buffer);
        let rec_flag = Arc::clone(&self.is_recording);
        let level_clone_f32 = Arc::clone(&self.latest_level);
        let level_clone_i16 = Arc::clone(&self.latest_level);

        let err_fn = move |err| {
            eprintln!("VoxQuest Audio stream error: {}", err);
        };

        let stream_config: cpal::StreamConfig = supported_config.clone().into();

        let stream = match supported_config.sample_format() {
            cpal::SampleFormat::F32 => {
                let cfg = stream_config.clone();
                device.build_input_stream(
                    cfg,
                    move |data: &[f32], _: &_| {
                        if *rec_flag.lock().unwrap() {
                            let mut buf = buffer_clone.lock().unwrap();
                            let mut sum_sq = 0.0f32;
                            if channels == 1 {
                                buf.extend_from_slice(data);
                                for &s in data {
                                    sum_sq += s * s;
                                }
                            } else {
                                for chunk in data.chunks_exact(channels) {
                                    // Use channel 0 (primary vocal channel on macOS mic arrays) to prevent destructive phase cancellation
                                    let s = chunk[0];
                                    buf.push(s);
                                    sum_sq += s * s;
                                }
                            }
                            let count = if channels == 1 { data.len() } else { data.len() / channels };
                            if count > 0 {
                                let rms = (sum_sq / count as f32).sqrt();
                                let db = 20.0 * (rms + 1e-6).log10();
                                let normalized = ((db + 50.0) / 36.0).clamp(0.0, 1.0);
                                level_clone_f32.store(normalized.to_bits(), std::sync::atomic::Ordering::Relaxed);
                            }
                        }
                    },
                    err_fn,
                    None,
                ).map_err(|e| format!("Failed to build audio stream: {}", e))?
            }
            cpal::SampleFormat::I16 => {
                let cfg = stream_config.clone();
                device.build_input_stream(
                    cfg,
                    move |data: &[i16], _: &_| {
                        if *rec_flag.lock().unwrap() {
                            let mut buf = buffer_clone.lock().unwrap();
                            let mut sum_sq = 0.0f32;
                            if channels == 1 {
                                for &sample in data {
                                    let s = sample as f32 / 32768.0;
                                    buf.push(s);
                                    sum_sq += s * s;
                                }
                            } else {
                                for chunk in data.chunks_exact(channels) {
                                    // Use channel 0 (primary vocal channel on macOS mic arrays) to prevent destructive phase cancellation
                                    let s = chunk[0] as f32 / 32768.0;
                                    buf.push(s);
                                    sum_sq += s * s;
                                }
                            }
                            let count = if channels == 1 { data.len() } else { data.len() / channels };
                            if count > 0 {
                                let rms = (sum_sq / count as f32).sqrt();
                                let db = 20.0 * (rms + 1e-6).log10();
                                let normalized = ((db + 50.0) / 36.0).clamp(0.0, 1.0);
                                level_clone_i16.store(normalized.to_bits(), std::sync::atomic::Ordering::Relaxed);
                            }
                        }
                    },
                    err_fn,
                    None,
                ).map_err(|e| format!("Failed to build audio stream: {}", e))?
            }
            sample_format => return Err(format!("Unsupported audio sample format: {:?}", sample_format)),
        };

        stream.play().map_err(|e| format!("Failed to start audio stream: {}", e))?;
        self.stream = Some(stream);
        *rec_lock = true;
        Ok(())
    }

    pub fn stop_recording(&mut self) -> Result<Vec<f32>, String> {
        {
            let rec_lock = self.is_recording.lock().unwrap();
            if !*rec_lock {
                return Err("No active recording session to stop".to_string());
            }
        }

        // Allow final hardware audio buffer (80ms) to drain so trailing word syllables are not truncated
        std::thread::sleep(std::time::Duration::from_millis(80));

        {
            let mut rec_lock = self.is_recording.lock().unwrap();
            *rec_lock = false;
        }

        if let Some(stream) = self.stream.take() {
            let _ = stream.pause();
            drop(stream);
        }
        self.latest_level.store(0, std::sync::atomic::Ordering::Relaxed);

        let raw_samples = {
            let mut buf = self.buffer.lock().unwrap();
            let samples = std::mem::take(&mut *buf);
            buf.shrink_to(16000 * 30);
            samples
        };

        if raw_samples.is_empty() {
            return Err("Empty audio capture: no audio frames recorded".to_string());
        }

        let target_samples = if self.input_sample_rate != 16000 {
            linear_resample(&raw_samples, self.input_sample_rate, 16000)
        } else {
            raw_samples
        };

        // Intelligent Noise Suppression & Voice Activity Isolation:
        // 1. High-pass filters low-frequency rumble (AC, desk bumps, fan noise < 85 Hz)
        // 2. Profiles ambient noise floor and soft-gates background noise during pauses
        // 3. Trims non-speech silence boundaries so Whisper only transcribes user speech
        let isolated_samples = isolate_voice_and_suppress_noise(&target_samples, 16000);

        Ok(isolated_samples)
    }

    pub fn is_recording(&self) -> bool {
        *self.is_recording.lock().unwrap()
    }
}

/// 2nd order Butterworth high-pass filter for removing sub-vocal rumble (< 85 Hz)
pub struct BiquadHpf {
    b0: f32,
    b1: f32,
    b2: f32,
    a1: f32,
    a2: f32,
    x1: f32,
    x2: f32,
    y1: f32,
    y2: f32,
}

impl BiquadHpf {
    pub fn new(sample_rate: f32, cutoff_hz: f32) -> Self {
        use std::f32::consts::PI;
        let ff = (PI * cutoff_hz / sample_rate).tan();
        let sqrt2 = std::f32::consts::SQRT_2;
        let denom = 1.0 + sqrt2 * ff + ff * ff;

        let b0 = 1.0 / denom;
        let b1 = -2.0 * b0;
        let b2 = b0;
        let a1 = (2.0 * (ff * ff - 1.0)) / denom;
        let a2 = (1.0 - sqrt2 * ff + ff * ff) / denom;

        Self {
            b0, b1, b2, a1, a2,
            x1: 0.0, x2: 0.0,
            y1: 0.0, y2: 0.0,
        }
    }

    pub fn process(&mut self, x: f32) -> f32 {
        let y = self.b0 * x + self.b1 * self.x1 + self.b2 * self.x2 - self.a1 * self.y1 - self.a2 * self.y2;
        self.x2 = self.x1;
        self.x1 = x;
        self.y2 = self.y1;
        self.y1 = y;
        y
    }
}

/// High-performance voice isolation and noise suppression pipeline:
/// - Strips background room hum (< 85 Hz)
/// - Detects user speech boundaries and discards empty pre/post noise
/// - Soft-gates background ambient noise during pauses
pub fn isolate_voice_and_suppress_noise(samples: &[f32], sample_rate: u32) -> Vec<f32> {
    if samples.is_empty() {
        return Vec::new();
    }

    // 1. High-pass filter (55 Hz) to kill sub-audible desk bumps and mechanical rumble while fully preserving voice fundamentals
    let mut hpf = BiquadHpf::new(sample_rate as f32, 55.0);
    let hp_samples: Vec<f32> = samples.iter().map(|&s| hpf.process(s)).collect();

    // 2. Sliding frame energy profiling (20ms frames: 320 samples at 16kHz)
    let frame_size = (sample_rate as usize / 50).max(160);
    let num_frames = hp_samples.len() / frame_size;
    if num_frames == 0 {
        return hp_samples;
    }

    let mut frame_rms: Vec<f32> = Vec::with_capacity(num_frames);
    for chunk in hp_samples.chunks_exact(frame_size) {
        let sum_sq: f32 = chunk.iter().map(|&s| s * s).sum();
        let rms = (sum_sq / chunk.len() as f32).sqrt();
        frame_rms.push(rms);
    }

    // Estimate ambient noise floor from lowest 25% energy frames, capped to avoid treating continuous speech as noise
    let mut sorted_rms = frame_rms.clone();
    sorted_rms.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let noise_floor_idx = (sorted_rms.len() as f32 * 0.25).floor() as usize;
    let noise_floor = sorted_rms.get(noise_floor_idx).copied().unwrap_or(0.001).min(0.003);

    // Sensitive adaptive threshold for soft, quiet, or whispered speech (down to 0.0004 RMS)
    let speech_threshold = (noise_floor * 1.15).clamp(0.0004, 0.0022);

    // Identify first and last frame containing genuine user speech
    let first_speech_frame = frame_rms.iter().position(|&r| r >= speech_threshold);
    let last_speech_frame = frame_rms.iter().rposition(|&r| r >= speech_threshold);

    let (start_frame, end_frame) = match (first_speech_frame, last_speech_frame) {
        (Some(start), Some(end)) if end >= start => (start, end),
        _ => {
            // Ambient rumble with no audible user speech frames is rejected as silence
            return Vec::new();
        }
    };

    // Generous pad of ~400ms (20 frames) to fully preserve natural consonant formants (e.g. "W", "Th")
    let pad_frames = 20;
    let safe_start_frame = start_frame.saturating_sub(pad_frames);
    let safe_end_frame = (end_frame + pad_frames + 1).min(num_frames);

    let start_sample = safe_start_frame * frame_size;
    let end_sample = (safe_end_frame * frame_size).min(hp_samples.len());
    let speech_samples = hp_samples[start_sample..end_sample].to_vec();

    // 3. Dynamic Speech AGC: automatically normalizes quiet/whispered speech into Whisper's optimal range (-16 to -22 dBFS)
    let peak = speech_samples.iter().copied().fold(0.0f32, |m, s| m.max(s.abs()));
    if peak > 1e-4 && peak < 0.40 {
        let speech_rms = (speech_samples.iter().map(|&s| s * s).sum::<f32>() / speech_samples.len() as f32).sqrt();
        let target_gain = if speech_rms > 1e-4 {
            (0.09 / speech_rms).min(0.65 / peak)
        } else {
            0.50 / peak
        };
        let gain = target_gain.clamp(1.0, 9.0);
        if gain > 1.05 {
            speech_samples.iter().map(|&s| (s * gain).clamp(-0.95, 0.95)).collect()
        } else {
            speech_samples
        }
    } else {
        speech_samples
    }
}

/// 2nd order Butterworth low-pass filter for anti-aliasing during downsampling
struct BiquadLpf {
    b0: f32,
    b1: f32,
    b2: f32,
    a1: f32,
    a2: f32,
    x1: f32,
    x2: f32,
    y1: f32,
    y2: f32,
}

impl BiquadLpf {
    fn new(sample_rate: f32, cutoff_hz: f32) -> Self {
        use std::f32::consts::PI;
        let ff = (PI * cutoff_hz / sample_rate).tan();
        let sqrt2 = std::f32::consts::SQRT_2;
        let denom = 1.0 + sqrt2 * ff + ff * ff;

        let b0 = (ff * ff) / denom;
        let b1 = 2.0 * b0;
        let b2 = b0;
        let a1 = (2.0 * (ff * ff - 1.0)) / denom;
        let a2 = (1.0 - sqrt2 * ff + ff * ff) / denom;

        Self {
            b0, b1, b2, a1, a2,
            x1: 0.0, x2: 0.0,
            y1: 0.0, y2: 0.0,
        }
    }

    fn process(&mut self, x: f32) -> f32 {
        let y = self.b0 * x + self.b1 * self.x1 + self.b2 * self.x2 - self.a1 * self.y1 - self.a2 * self.y2;
        self.x2 = self.x1;
        self.x1 = x;
        self.y2 = self.y1;
        self.y1 = y;
        y
    }
}

/// Pre-inference acoustic energy and duration check to eliminate silence hallucinations & useless inference
pub fn is_audio_silent_or_too_short(audio_samples: &[f32]) -> bool {
    if audio_samples.len() < 3200 {
        return true;
    }
    let peak = audio_samples.iter().fold(0.0f32, |m, &s| m.max(s.abs()));
    let sum_sq: f32 = audio_samples.iter().map(|&s| s * s).sum();
    let rms = (sum_sq / audio_samples.len() as f32).sqrt();
    peak < 0.0025 || rms < 0.0006
}

/// Trims dead silence at the beginning and end of a 16kHz speech buffer to speed up Whisper processing and eliminate silence latency.
pub fn trim_audio_silence(samples: &[f32], sample_rate: u32) -> Vec<f32> {
    if samples.len() < (sample_rate as usize / 2) {
        return samples.to_vec();
    }

    let frame_size = (sample_rate as usize * 20) / 1000; // 20ms frames
    let pad_frames = (sample_rate as usize * 320) / 1000; // 320ms generous safety pad (preserves soft initial consonants like W/Th)

    let mut start_idx = 0;
    let mut end_idx = samples.len();

    // Find speech onset with sensitive threshold for soft consonants
    for (i, chunk) in samples.chunks(frame_size).enumerate() {
        let rms = (chunk.iter().map(|&s| s * s).sum::<f32>() / chunk.len() as f32).sqrt();
        if rms > 0.0008 {
            start_idx = (i * frame_size).saturating_sub(pad_frames);
            break;
        }
    }

    // Find speech offset
    for (i, chunk) in samples.rchunks(frame_size).enumerate() {
        let rms = (chunk.iter().map(|&s| s * s).sum::<f32>() / chunk.len() as f32).sqrt();
        if rms > 0.0012 {
            let offset_from_end = i * frame_size;
            end_idx = (samples.len().saturating_sub(offset_from_end) + pad_frames).min(samples.len());
            break;
        }
    }

    if start_idx < end_idx && (end_idx - start_idx) >= 3200 {
        samples[start_idx..end_idx].to_vec()
    } else {
        samples.to_vec()
    }
}

/// High-quality band-limited anti-aliased resampler for speech audio streams (e.g. 48kHz / 44.1kHz -> 16kHz)
pub fn linear_resample(input: &[f32], from_rate: u32, to_rate: u32) -> Vec<f32> {
    if from_rate == to_rate || input.is_empty() {
        return input.to_vec();
    }

    // Apply anti-aliasing low-pass filter if downsampling
    let filtered_input: Vec<f32> = if from_rate > to_rate {
        let cutoff = (to_rate as f32 * 0.45).min(7500.0);
        let mut filter = BiquadLpf::new(from_rate as f32, cutoff);
        input.iter().map(|&s| filter.process(s)).collect()
    } else {
        input.to_vec()
    };

    let ratio = from_rate as f64 / to_rate as f64;
    let target_len = ((filtered_input.len() as f64) / ratio).round() as usize;
    let mut output = Vec::with_capacity(target_len);

    for i in 0..target_len {
        let src_idx = i as f64 * ratio;
        let idx0 = src_idx.floor() as usize;
        let idx1 = (idx0 + 1).min(filtered_input.len() - 1);
        let frac = (src_idx - idx0 as f64) as f32;

        let s0 = filtered_input.get(idx0).copied().unwrap_or(0.0);
        let s1 = filtered_input.get(idx1).copied().unwrap_or(0.0);

        output.push(s0 + frac * (s1 - s0));
    }

    output
}

/// Feature 017: Speech Reliability Monitor
/// Analyzes audio signals for capture fidelity, acoustic energy, microphone clipping,
/// excessive background silence, and duration anomalies.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct SpeechReliabilityReport {
    pub duration_seconds: f32,
    pub peak_amplitude: f32,
    pub rms_db: f32,
    pub clipping_ratio: f32,
    pub silence_ratio: f32,
    pub status: String, // "optimal" | "low_volume" | "clipped" | "high_silence" | "too_short" | "empty"
    pub advisory: String,
}

pub fn analyze_speech_reliability(samples: &[f32], sample_rate: u32) -> SpeechReliabilityReport {
    if samples.is_empty() {
        return SpeechReliabilityReport {
            duration_seconds: 0.0,
            peak_amplitude: 0.0,
            rms_db: -99.0,
            clipping_ratio: 0.0,
            silence_ratio: 1.0,
            status: "empty".to_string(),
            advisory: "No audio captured.".to_string(),
        };
    }

    let duration_seconds = samples.len() as f32 / sample_rate as f32;
    let mut peak: f32 = 0.0;
    let mut sum_sq: f32 = 0.0;
    let mut clip_count = 0;

    for &s in samples {
        let abs = s.abs();
        if abs > peak {
            peak = abs;
        }
        if abs >= 0.98 {
            clip_count += 1;
        }
        sum_sq += s * s;
    }

    let rms = (sum_sq / samples.len() as f32).sqrt();
    let rms_db = 20.0 * (rms + 1e-6).log10();
    let clipping_ratio = clip_count as f32 / samples.len() as f32;

    // Frame-level silence ratio (20ms frames)
    let frame_size = (sample_rate as f32 * 0.02).max(1.0) as usize;
    let mut silent_frames = 0;
    let mut total_frames = 0;
    for chunk in samples.chunks(frame_size) {
        let chunk_sq: f32 = chunk.iter().map(|&x| x * x).sum();
        let chunk_rms = (chunk_sq / chunk.len() as f32).sqrt();
        if chunk_rms < 0.015 {
            silent_frames += 1;
        }
        total_frames += 1;
    }
    let silence_ratio = if total_frames > 0 {
        silent_frames as f32 / total_frames as f32
    } else {
        0.0
    };

    let (status, advisory) = if duration_seconds < 0.35 {
        ("too_short".to_string(), "Recording was very brief (< 0.35s).".to_string())
    } else if clipping_ratio > 0.01 {
        ("clipped".to_string(), "Microphone clipping detected. Consider lowering mic input volume.".to_string())
    } else if rms_db < -42.0 {
        ("low_volume".to_string(), "Audio level very low. Speak closer to the microphone.".to_string())
    } else if silence_ratio > 0.88 {
        ("high_silence".to_string(), "Excessive background silence or distant speech detected.".to_string())
    } else {
        ("optimal".to_string(), "Speech audio captured with optimal acoustic fidelity.".to_string())
    };

    SpeechReliabilityReport {
        duration_seconds,
        peak_amplitude: peak,
        rms_db,
        clipping_ratio,
        silence_ratio,
        status,
        advisory,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_speech_reliability_optimal() {
        // Generate 1 second of normal synthetic speech wave (approx 0.3 amplitude at 400Hz)
        let sample_rate = 16000;
        let mut samples = Vec::with_capacity(sample_rate);
        for i in 0..sample_rate {
            let t = i as f32 / sample_rate as f32;
            samples.push(0.3 * (2.0 * std::f32::consts::PI * 400.0 * t).sin());
        }
        let report = analyze_speech_reliability(&samples, sample_rate as u32);
        assert_eq!(report.status, "optimal");
        assert!(report.advisory.contains("optimal"));
        assert_eq!(report.clipping_ratio, 0.0);
    }

    #[test]
    fn test_speech_reliability_clipping_detection() {
        let sample_rate = 16000;
        let mut samples = vec![0.2; sample_rate];
        // Inject clipped samples exceeding 0.98
        for i in 0..500 {
            samples[i] = 1.0;
        }
        let report = analyze_speech_reliability(&samples, sample_rate as u32);
        assert_eq!(report.status, "clipped");
        assert!(report.advisory.contains("clipping detected"));
    }

    #[test]
    fn test_speech_reliability_low_volume() {
        let sample_rate = 16000;
        // Barely audible signal (amplitude 0.001)
        let samples = vec![0.001; sample_rate];
        let report = analyze_speech_reliability(&samples, sample_rate as u32);
        assert_eq!(report.status, "low_volume");
        assert!(report.advisory.contains("level very low"));
    }

    #[test]
    fn test_speech_reliability_too_short() {
        let sample_rate = 16000;
        // 0.1 second of audio
        let samples = vec![0.2; 1600];
        let report = analyze_speech_reliability(&samples, sample_rate as u32);
        assert_eq!(report.status, "too_short");
        assert!(report.advisory.contains("very brief"));
    }

    #[test]
    fn test_is_audio_silent_or_too_short() {
        // 1. Empty buffer
        assert!(is_audio_silent_or_too_short(&[]));

        // 2. Too short (< 3200 samples = 200ms)
        let short_audio = vec![0.3f32; 1600];
        assert!(is_audio_silent_or_too_short(&short_audio));

        // 3. Ambient room silence (1 second of zeroes / near-zero noise)
        let silence = vec![0.0001f32; 16000];
        assert!(is_audio_silent_or_too_short(&silence));

        // 4. Genuine speech signal (1 second of 400Hz speech at 0.25 amplitude)
        let mut speech = Vec::with_capacity(16000);
        for i in 0..16000 {
            let t = i as f32 / 16000.0;
            speech.push(0.25 * (2.0 * std::f32::consts::PI * 400.0 * t).sin());
        }
        assert!(!is_audio_silent_or_too_short(&speech));
    }

    #[test]
    fn test_trim_audio_silence() {
        let sample_rate = 16000;
        let mut audio = Vec::new();

        // 1 second of silence
        audio.extend(vec![0.0f32; sample_rate]);

        // 1 second of speech (0.3 amplitude)
        for i in 0..sample_rate {
            let t = i as f32 / sample_rate as f32;
            audio.push(0.3 * (2.0 * std::f32::consts::PI * 300.0 * t).sin());
        }

        // 1 second of silence
        audio.extend(vec![0.0f32; sample_rate]);

        assert_eq!(audio.len(), sample_rate * 3);

        let trimmed = trim_audio_silence(&audio, sample_rate as u32);
        // Trimmed audio should be significantly shorter than 3 seconds but contain speech
        assert!(trimmed.len() < audio.len());
        assert!(trimmed.len() >= sample_rate);
    }
}
