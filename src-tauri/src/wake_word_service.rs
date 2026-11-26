use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::AppHandle;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use crate::AppState;
use crate::session_state::SessionState;

pub struct WakeWordService {
    is_running: Arc<AtomicBool>,
    is_paused: Arc<AtomicBool>,
}

impl WakeWordService {
    pub fn new() -> Self {
        Self {
            is_running: Arc::new(AtomicBool::new(true)),
            is_paused: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn pause(&self) {
        self.is_paused.store(true, Ordering::SeqCst);
    }

    pub fn resume(&self) {
        self.is_paused.store(false, Ordering::SeqCst);
    }

    pub fn is_paused(&self) -> bool {
        self.is_paused.load(Ordering::SeqCst)
    }

    pub fn start(&self, app: AppHandle, state: Arc<AppState>) {
        let is_running = Arc::clone(&self.is_running);
        let is_paused = Arc::clone(&self.is_paused);

        std::thread::spawn(move || {
            let host = cpal::default_host();

            while is_running.load(Ordering::Relaxed) {
                // If paused or shutting down, sleep and continue
                if is_paused.load(Ordering::Relaxed) {
                    std::thread::sleep(Duration::from_millis(150));
                    continue;
                }

                // Check if wake word is enabled and session is currently in Idle ("Ready") state
                let (enabled, wake_name) = {
                    let s = match state.settings.lock() {
                        Ok(guard) => (guard.enable_wake_word, guard.wake_word_name.clone()),
                        Err(_) => (false, String::new()),
                    };
                    s
                };

                let is_idle = {
                    let sess = match state.active_session.lock() {
                        Ok(guard) => guard.state == SessionState::Idle,
                        Err(_) => false,
                    };
                    sess
                };

                if !enabled || !is_idle || wake_name.trim().is_empty() {
                    std::thread::sleep(Duration::from_millis(300));
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
                let paused_in_stream = Arc::clone(&is_paused);

                let stream_res = device.build_input_stream(
                    stream_config,
                    move |data: &[f32], _: &_| {
                        if paused_in_stream.load(Ordering::Relaxed) {
                            return;
                        }
                        if let Ok(mut buf) = ring_clone.lock() {
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

                let mut stream_opt = Some(stream);
                let mut last_check = Instant::now();

                // Listening loop while in Idle state
                while is_running.load(Ordering::Relaxed) {
                    std::thread::sleep(Duration::from_millis(40));

                    // If paused, drop the stream immediately to free CoreAudio hardware
                    if is_paused.load(Ordering::Relaxed) {
                        break;
                    }

                    // Check if state is still Idle
                    let still_idle = match state.active_session.lock() {
                        Ok(sess) => sess.state == SessionState::Idle,
                        Err(_) => false,
                    };
                    let still_enabled = match state.settings.lock() {
                        Ok(s) => s.enable_wake_word,
                        Err(_) => false,
                    };

                    if !still_idle || !still_enabled {
                        break;
                    }

                    // Check buffer energy at regular intervals (every 500ms) with a 1.4s cooldown after inference
                    if last_check.elapsed() >= Duration::from_millis(500) {
                        last_check = Instant::now();

                        let samples = match ring_buffer.lock() {
                            Ok(buf) => buf.clone(),
                            Err(_) => continue,
                        };

                        if samples.len() < (sample_rate as usize / 2) {
                            continue;
                        }

                        // Compute recent RMS and peak energy (last 0.8s)
                        let recent_len = ((sample_rate as usize * 8) / 10).min(samples.len());
                        let recent = &samples[samples.len() - recent_len..];
                        let sum_sq: f32 = recent.iter().map(|&s| s * s).sum();
                        let rms = (sum_sq / recent_len as f32).sqrt();
                        let peak = recent.iter().copied().fold(0.0f32, |m, s| m.max(s.abs()));

                        // Only evaluate speech with Whisper when clear intentional vocal energy is detected
                        // (prevents ambient room noise, fans, or distant speech from firing Metal GPU inference)
                        if rms >= 0.012 && peak >= 0.045 {
                            // Apply 1.4s cooldown before next Whisper wake evaluation to keep CPU/GPU cool
                            last_check = Instant::now() + Duration::from_millis(900);
                            let samples_16k = if sample_rate != 16000 {
                                crate::audio_service::linear_resample(&samples, sample_rate, 16000)
                            } else {
                                samples
                            };

                            // Non-blocking try_lock: if main dictation is using Whisper, do NOT block
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

                                let matched = (!target_trimmed.is_empty() && lower.contains(target_trimmed))
                                    || (!alt_target.is_empty() && lower.contains(alt_target));

                                if matched {
                                    println!("[VoxQuest] Wake word '{}' detected! Handing over to dictation...", wake_name);
                                    drop(engine);
                                    // Drop the stream and signal pause
                                    is_paused.store(true, Ordering::SeqCst);
                                    let _ = stream_opt.take();
                                    // Settle hardware for 60ms to prevent CoreAudio HAL contention
                                    std::thread::sleep(Duration::from_millis(60));
                                    let _ = crate::commands::start_dictation_internal(&state, &app);
                                    break;
                                }
                            }
                        }
                    }
                }

                // Explicitly drop stream on loop exit
                let _ = stream_opt.take();
            }
        });
    }

    pub fn stop(&self) {
        self.is_running.store(false, Ordering::Relaxed);
        self.is_paused.store(true, Ordering::Relaxed);
    }
}
