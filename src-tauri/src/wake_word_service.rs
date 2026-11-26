use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::AppHandle;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use crate::AppState;
use crate::session_state::SessionState;

pub struct WakeWordService {
    is_running: Arc<AtomicBool>,
}

impl WakeWordService {
    pub fn new() -> Self {
        Self {
            is_running: Arc::new(AtomicBool::new(true)),
        }
    }

    pub fn start(&self, app: AppHandle, state: Arc<AppState>) {
        let is_running = Arc::clone(&self.is_running);

        std::thread::spawn(move || {
            let host = cpal::default_host();

            while is_running.load(Ordering::Relaxed) {
                // Check if wake word is enabled and session is currently in Idle ("Ready") state
                let (enabled, wake_name) = {
                    let s = state.settings.lock().unwrap();
                    (s.enable_wake_word, s.wake_word_name.clone())
                };

                let is_idle = {
                    let sess = state.active_session.lock().unwrap();
                    sess.state == SessionState::Idle
                };

                if !enabled || !is_idle || wake_name.trim().is_empty() {
                    std::thread::sleep(Duration::from_millis(400));
                    continue;
                }

                // Check default input microphone
                let device = match host.default_input_device() {
                    Some(d) => d,
                    None => {
                        std::thread::sleep(Duration::from_millis(1000));
                        continue;
                    }
                };

                let config = match device.default_input_config() {
                    Ok(c) => c,
                    Err(_) => {
                        std::thread::sleep(Duration::from_millis(1000));
                        continue;
                    }
                };

                let sample_rate = config.sample_rate();
                let channels = config.channels() as usize;
                let stream_config: cpal::StreamConfig = config.into();

                // Rolling 1.6 second ring-buffer
                let ring_buffer = Arc::new(std::sync::Mutex::new(Vec::<f32>::with_capacity(sample_rate as usize * 2)));
                let ring_clone = Arc::clone(&ring_buffer);

                let stream_res = device.build_input_stream(
                    stream_config,
                    move |data: &[f32], _: &_| {
                        let mut buf = ring_clone.lock().unwrap();
                        let inv_ch = 1.0 / channels as f32;
                        for chunk in data.chunks_exact(channels) {
                            let s = chunk.iter().sum::<f32>() * inv_ch;
                            buf.push(s);
                        }
                        let max_len = (sample_rate as usize * 16) / 10;
                        if buf.len() > max_len {
                            let excess = buf.len() - max_len;
                            buf.drain(0..excess);
                        }
                    },
                    |_| {},
                    None,
                );

                let stream = match stream_res {
                    Ok(s) => s,
                    Err(_) => {
                        std::thread::sleep(Duration::from_millis(1000));
                        continue;
                    }
                };

                if stream.play().is_err() {
                    std::thread::sleep(Duration::from_millis(1000));
                    continue;
                }

                let mut last_check = Instant::now();

                // Listening loop while in Idle state
                while is_running.load(Ordering::Relaxed) {
                    std::thread::sleep(Duration::from_millis(200));

                    // Check if state is still Idle
                    let still_idle = {
                        let sess = state.active_session.lock().unwrap();
                        sess.state == SessionState::Idle
                    };
                    let still_enabled = {
                        let s = state.settings.lock().unwrap();
                        s.enable_wake_word
                    };

                    if !still_idle || !still_enabled {
                        break;
                    }

                    // Check energy in buffer every 500ms
                    if last_check.elapsed() >= Duration::from_millis(500) {
                        last_check = Instant::now();

                        let samples = {
                            let buf = ring_buffer.lock().unwrap();
                            buf.clone()
                        };

                        if samples.len() < (sample_rate as usize / 2) {
                            continue;
                        }

                        // Compute recent RMS energy (last 1.0s)
                        let recent_len = (sample_rate as usize).min(samples.len());
                        let recent = &samples[samples.len() - recent_len..];
                        let sum_sq: f32 = recent.iter().map(|&s| s * s).sum();
                        let rms = (sum_sq / recent_len as f32).sqrt();

                        // Only evaluate speech with Whisper when vocal energy is detected
                        if rms >= 0.0030 {
                            let samples_16k = if sample_rate != 16000 {
                                crate::audio_service::linear_resample(&samples, sample_rate, 16000)
                            } else {
                                samples
                            };

                            let mut engine = match state.whisper.try_lock() {
                                Ok(e) => e,
                                Err(_) => continue,
                            };

                            if !engine.is_loaded() {
                                continue;
                            }

                            if let Ok(transcript) = engine.transcribe(&samples_16k, Some("en"), None) {
                                let lower = transcript.to_lowercase();
                                let target = wake_name.to_lowercase();
                                let target_trimmed = target.trim();

                                let alt_target = if target_trimmed.starts_with("hey ") {
                                    target_trimmed[4..].trim()
                                } else if target_trimmed.starts_with("hi ") {
                                    target_trimmed[3..].trim()
                                } else {
                                    ""
                                };

                                let matched = lower.contains(target_trimmed)
                                    || (!alt_target.is_empty() && lower.contains(alt_target));

                                if matched {
                                    println!("[VoxQuest] Wake word '{}' detected! Transitioning from Ready to Listening...", wake_name);
                                    drop(engine);
                                    drop(stream);
                                    let _ = crate::commands::start_dictation_internal(&state, &app);
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    pub fn stop(&self) {
        self.is_running.store(false, Ordering::Relaxed);
    }
}
