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

    pub fn transcribe(&mut self, audio_data: &[f32], language: Option<&str>) -> Result<String, String> {
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
        for i in 0..num_segments {
            if let Some(segment) = state.get_segment(i) {
                if let Ok(text) = segment.to_str() {
                    transcript.push_str(text);
                }
            }
        }

        Ok(transcript.trim().to_string())
    }
}
