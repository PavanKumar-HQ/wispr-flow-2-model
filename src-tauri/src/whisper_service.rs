use std::path::Path;
use whisper_rs::{WhisperContext, WhisperContextParameters, FullParams, SamplingStrategy};

pub struct WhisperEngine {
    context: Option<WhisperContext>,
    current_model_path: Option<String>,
}

impl WhisperEngine {
    pub fn new() -> Self {
        Self {
            context: None,
            current_model_path: None,
        }
    }

    pub fn load_model<P: AsRef<Path>>(&mut self, model_path: P) -> Result<(), String> {
        let p_str = model_path.as_ref().to_string_lossy().to_string();
        if let Some(ref current) = self.current_model_path {
            if current == &p_str && self.context.is_some() {
                return Ok(());
            }
        }

        let params = WhisperContextParameters::default();
        let ctx = WhisperContext::new_with_params(&p_str, params)
            .map_err(|e| format!("Whisper.cpp native model initialization failed: {:?}", e))?;

        self.context = Some(ctx);
        self.current_model_path = Some(p_str);
        Ok(())
    }

    pub fn is_loaded(&self) -> bool {
        self.context.is_some()
    }

    pub fn current_model_path(&self) -> Option<&str> {
        self.current_model_path.as_deref()
    }

    pub fn transcribe(&mut self, audio_data: &[f32], language: Option<&str>, initial_prompt: Option<&str>) -> Result<String, String> {
        let ctx = self.context.as_mut().ok_or_else(|| "Speech engine not initialized. Please install/load a model first.".to_string())?;

        let mut state = ctx.create_state().map_err(|e| format!("Failed to create Whisper native state: {:?}", e))?;

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
        params.set_no_speech_thold(0.75);
        params.set_temperature(0.0);
        let n_threads = std::thread::available_parallelism().map(|n| n.get()).unwrap_or(8).clamp(2, 8);
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

        // Run local native whisper.cpp inference
        state.full(params, audio_data)
            .map_err(|e| format!("Whisper inference execution failed: {:?}", e))?;

        let num_segments = state.full_n_segments();

        let mut transcript = String::new();
        let mut last_segment_clean = String::new();
        for i in 0..num_segments {
            if let Some(segment) = state.get_segment(i) {
                if let Ok(text) = segment.to_str() {
                    let clean = text.trim();
                    if clean.is_empty() {
                        continue;
                    }
                    if clean.eq_ignore_ascii_case(&last_segment_clean) {
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
