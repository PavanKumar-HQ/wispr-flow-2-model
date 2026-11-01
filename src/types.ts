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
  insertion_policy: string; // 'original_destination' | 'active_at_stop'
  spoken_punctuation: boolean;
  conservative_filler_removal: boolean;
  auto_capitalization: boolean;
  retain_history: boolean;
  play_sound_effects: boolean;
  max_duration_secs: number;
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

export type SessionStateType =
  | 'idle'
  | 'starting'
  | 'recording'
  | 'stopping'
  | 'transcribing'
  | 'inserting'
  | 'completed'
  | 'recovery_required'
  | 'cancelled'
  | 'failed';

export interface SessionSnapshot {
  session_id: string;
  state: SessionStateType;
  message?: string | null;
  elapsed_seconds: number;
  last_transcript?: string | null;
  target_app?: string | null;
  recovery_id?: number | null;
}

// Backward compatibility alias
export type DictationStatus = SessionSnapshot;
