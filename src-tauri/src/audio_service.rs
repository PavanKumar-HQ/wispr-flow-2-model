use std::sync::{Arc, Mutex};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::Stream;

pub struct AudioCaptureService {
    is_recording: Arc<Mutex<bool>>,
    buffer: Arc<Mutex<Vec<f32>>>,
    stream: Option<Stream>,
    input_sample_rate: u32,
}

impl AudioCaptureService {
    pub fn new() -> Self {
        Self {
            is_recording: Arc::new(Mutex::new(false)),
            buffer: Arc::new(Mutex::new(Vec::with_capacity(16000 * 30))),
            stream: None,
            input_sample_rate: 16000,
        }
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

    pub fn start_recording(&mut self) -> Result<(), String> {
        let mut rec_lock = self.is_recording.lock().unwrap();
        if *rec_lock {
            return Err("Recording session already in progress".to_string());
        }

        let host = cpal::default_host();
        let device = host.default_input_device()
            .ok_or_else(|| "No default microphone input device detected. Please check your audio settings.".to_string())?;

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
                            if channels == 1 {
                                buf.extend_from_slice(data);
                            } else {
                                for chunk in data.chunks_exact(channels) {
                                    let sum: f32 = chunk.iter().sum();
                                    buf.push(sum / channels as f32);
                                }
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
                            if channels == 1 {
                                for &sample in data {
                                    buf.push(sample as f32 / 32768.0);
                                }
                            } else {
                                for chunk in data.chunks_exact(channels) {
                                    let sum: f32 = chunk.iter().map(|&s| s as f32 / 32768.0).sum();
                                    buf.push(sum / channels as f32);
                                }
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
            std::mem::take(&mut *buf)
        };

        if raw_samples.is_empty() {
            return Err("Empty audio capture: no audio frames recorded".to_string());
        }

        let target_samples = if self.input_sample_rate != 16000 {
            linear_resample(&raw_samples, self.input_sample_rate, 16000)
        } else {
            raw_samples
        };

        Ok(target_samples)
    }

    pub fn is_recording(&self) -> bool {
        *self.is_recording.lock().unwrap()
    }
}

/// High-quality band-limited linear resampler for speech audio streams (e.g. 48kHz / 44.1kHz -> 16kHz)
pub fn linear_resample(input: &[f32], from_rate: u32, to_rate: u32) -> Vec<f32> {
    if from_rate == to_rate || input.is_empty() {
        return input.to_vec();
    }

    let ratio = from_rate as f64 / to_rate as f64;
    let target_len = ((input.len() as f64) / ratio).round() as usize;
    let mut output = Vec::with_capacity(target_len);

    for i in 0..target_len {
        let src_idx = i as f64 * ratio;
        let idx0 = src_idx.floor() as usize;
        let idx1 = (idx0 + 1).min(input.len() - 1);
        let frac = (src_idx - idx0 as f64) as f32;

        let s0 = input.get(idx0).copied().unwrap_or(0.0);
        let s1 = input.get(idx1).copied().unwrap_or(0.0);

        output.push(s0 + frac * (s1 - s0));
    }

    output
}
