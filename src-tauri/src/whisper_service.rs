use std::path::Path;
use whisper_rs::{WhisperContext, WhisperContextParameters, WhisperState, FullParams, SamplingStrategy};

pub struct WhisperEngine {
    context: Option<WhisperContext>,
    state: Option<WhisperState>,
    current_model_path: Option<String>,
    max_threads: Option<u32>,
}

impl WhisperEngine {
    pub fn new() -> Self {
        Self {
            context: None,
            state: None,
            current_model_path: None,
            max_threads: Some(2),
        }
    }

    pub fn set_max_threads(&mut self, threads: u32) {
        self.max_threads = Some(threads.clamp(1, 2));
    }

    pub fn load_model<P: AsRef<Path>>(&mut self, model_path: P) -> Result<(), String> {
        let p_str = model_path.as_ref().to_string_lossy().to_string();
        if let Some(ref current) = self.current_model_path {
            if current == &p_str && self.context.is_some() && self.state.is_some() {
                return Ok(());
            }
        }

        // Explicitly release previous state and context first to prevent Metal GPU and RAM leak
        self.state = None;
        self.context = None;

        let params = WhisperContextParameters::default();
        let ctx = WhisperContext::new_with_params(&p_str, params)
            .map_err(|e| format!("Whisper.cpp native model initialization failed: {:?}", e))?;

        let state = ctx.create_state()
            .map_err(|e| format!("Whisper.cpp persistent state initialization failed: {:?}", e))?;

        self.context = Some(ctx);
        self.state = Some(state);
        self.current_model_path = Some(p_str);
        Ok(())
    }

    pub fn is_loaded(&self) -> bool {
        self.context.is_some() && self.state.is_some()
    }

    pub fn current_model_path(&self) -> Option<&str> {
        self.current_model_path.as_deref()
    }

    pub fn transcribe(&mut self, audio_data: &[f32], language: Option<&str>, initial_prompt: Option<&str>) -> Result<String, String> {
        if self.context.is_none() || self.state.is_none() {
            return Err("Speech engine not initialized. Please install/load a model first.".to_string());
        }

        let state = self.state.as_mut().unwrap();

        // Ultra-snappy low-latency greedy decoding with 0.0 temperature for instant word capture
        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
        params.set_print_progress(false);
        params.set_print_special(false);
        params.set_print_realtime(false);
        params.set_print_timestamps(false);
        params.set_translate(false);
        params.set_no_context(true);
        params.set_single_segment(false);
        params.set_suppress_blank(true);
        params.set_suppress_nst(true);
        params.set_no_speech_thold(0.85);
        params.set_temperature(0.0);
        params.set_temperature_inc(0.0);
        // Hard Power Governor: clamp to 2 threads max to prevent thermal boost spikes and keep CPU cold across Mac, Windows, Linux, Android
        let n_threads = self.max_threads.unwrap_or(2).clamp(1, 2);
        params.set_n_threads(n_threads as i32);

        if let Some(prompt) = initial_prompt {
            if !prompt.trim().is_empty() {
                params.set_initial_prompt(prompt);
            }
        }

        if let Some(lang) = language {
            if !lang.is_empty() && lang != "auto" {
                params.set_language(Some(lang));
            }
        }

        // Run local native whisper.cpp inference using persistent reusable state
        state.full(params, audio_data)
            .map_err(|e| format!("Whisper inference execution failed: {:?}", e))?;

        let num_segments = state.full_n_segments();

        let mut transcript = String::new();
        let mut last_segment_clean = String::new();
        for i in 0..num_segments {
            if let Some(segment) = state.get_segment(i) {
                let t0 = segment.start_timestamp();
                let t1 = segment.end_timestamp();
                if t1 <= t0 && t0 > 0 {
                    continue; // Skip degenerate zero-duration segment
                }
                if let Ok(text) = segment.to_str() {
                    let clean = text.trim();
                    if clean.is_empty() {
                        continue;
                    }
                    // Whisper decoding loop detection:
                    // If the current segment's text is identical to the previous segment,
                    // or if the transcript already ends with this segment, it is a loop artifact. Skip it!
                    if clean.eq_ignore_ascii_case(&last_segment_clean) || transcript.ends_with(clean) {
                        continue;
                    }
                    last_segment_clean = clean.to_string();
                    if !transcript.is_empty() && !transcript.ends_with(' ') {
                        transcript.push(' ');
                    }
                    transcript.push_str(clean);
                }
            }
        }

        Ok(transcript.trim().to_string())
    }
}
