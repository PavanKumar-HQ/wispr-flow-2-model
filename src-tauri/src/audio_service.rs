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
            // Intelligent selection for macOS & laptops:
            // Prefer the built-in microphone (e.g. "MacBook Air Microphone", "Built-in Microphone", "Internal Microphone")
            // over Bluetooth devices that may be silent, disconnected, in another room, or in standby
            let all_devices = host.input_devices().ok();
            let builtin = all_devices.and_then(|devs| {
                devs.into_iter().find(|d| {
                    let name = d.to_string().to_lowercase();
                    (name.contains("macbook") || name.contains("built-in") || name.contains("builtin") || name.contains("internal"))
                        && !name.contains("bluetooth")
                })
            });

            if let Some(b) = builtin {
                b
            } else {
                host.default_input_device()
                    .or_else(|| host.input_devices().ok().and_then(|mut iter| iter.next()))
                    .ok_or_else(|| "No default microphone input device detected. Please check your audio settings.".to_string())?
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
                                    let sum: f32 = chunk.iter().sum();
                                    let avg = sum / channels as f32;
                                    buf.push(avg);
                                    sum_sq += avg * avg;
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
                                    let sum: f32 = chunk.iter().map(|&s| s as f32 / 32768.0).sum();
                                    let avg = sum / channels as f32;
                                    buf.push(avg);
                                    sum_sq += avg * avg;
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
            let mut rec_lock = self.is_recording.lock().unwrap();
            if !*rec_lock {
                return Err("No active recording session to stop".to_string());
            }
            *rec_lock = false;
        }

        self.stream = None;

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

    // Estimate noise floor from lowest 25% energy frames
    let mut sorted_rms = frame_rms.clone();
    sorted_rms.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let noise_floor_idx = (sorted_rms.len() as f32 * 0.25).floor() as usize;
    let noise_floor = sorted_rms.get(noise_floor_idx).copied().unwrap_or(0.001);

    // Adaptive threshold: sensitive enough to capture quiet speech and weak consonants
    let speech_threshold = (noise_floor * 2.0).max(0.004);

    // Identify first and last frame containing genuine user speech
    let first_speech_frame = frame_rms.iter().position(|&r| r >= speech_threshold);
    let last_speech_frame = frame_rms.iter().rposition(|&r| r >= speech_threshold);

    let (start_frame, end_frame) = match (first_speech_frame, last_speech_frame) {
        (Some(start), Some(end)) if end >= start => (start, end),
        _ => {
            // If quiet speech is below energy threshold, do not discard: pass filtered audio to Whisper
            return hp_samples;
        }
    };

    // Pad speech boundary by ~140ms (7 frames) to protect initial and trailing consonants
    let pad_frames = 7;
    let safe_start_frame = start_frame.saturating_sub(pad_frames);
    let safe_end_frame = (end_frame + pad_frames + 1).min(num_frames);

    let start_sample = safe_start_frame * frame_size;
    let end_sample = (safe_end_frame * frame_size).min(hp_samples.len());

    // 3. Extract user speech segment and apply soft noise gating to inter-word pauses
    let mut speech_samples = Vec::with_capacity(end_sample - start_sample);
    for frame_idx in safe_start_frame..safe_end_frame {
        let is_speech_active = frame_rms.get(frame_idx).copied().unwrap_or(0.0) >= (speech_threshold * 0.65);
        let attenuation = if is_speech_active { 1.0f32 } else { 0.15f32 }; // -16dB suppression on non-speech pauses

        let f_start = frame_idx * frame_size;
        let f_end = (f_start + frame_size).min(hp_samples.len());
        for i in f_start..f_end {
            speech_samples.push(hp_samples[i] * attenuation);
        }
    }

    // 4. Speech-aware controlled normalization (gain capped at 3.0x to avoid amplifying noise)
    let peak = speech_samples.iter().copied().fold(0.0f32, |m, s| m.max(s.abs()));
    if peak > 1e-3 && peak < 0.25 {
        let gain = (0.40 / peak).clamp(1.0, 3.0);
        speech_samples.iter().map(|&s| (s * gain).clamp(-1.0, 1.0)).collect()
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
    peak < 0.003 || rms < 0.0008
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
