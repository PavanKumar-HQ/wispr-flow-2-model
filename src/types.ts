export interface ModelInfo {
  id: string;
  name: string;
  filename: string;
  size_bytes: number;
  sha256: string;
  download_url: string;
  description: string;
  ram_estimate_mb: number;
  recommended: boolean;
  is_downloaded: boolean;
}

export interface AppSettings {
  default_model_id: string;
  language: string;
  shortcut: string;
  spoken_punctuation: boolean;
  conservative_filler_removal: boolean;
  auto_capitalization: boolean;
  retain_history: boolean;
  play_sound_effects: boolean;
}

export interface HistoryRecord {
  id: number;
  timestamp_ms: number;
  original_text: string;
  formatted_text: string;
  duration_seconds: number;
  status: string;
  target_app?: string | null;
}

export interface DictationStatus {
  state: 'idle' | 'recording' | 'transcribing' | 'success' | 'warning' | 'error';
  message?: string;
  last_transcript?: string;
}
