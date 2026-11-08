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
  interaction_mode: string; // 'toggle' | 'push_to_talk'
  spoken_punctuation: boolean;
  conservative_filler_removal: boolean;
  auto_capitalization: boolean;
  retain_history: boolean;
  play_sound_effects: boolean;
  max_duration_secs: number;
  auto_hide_pill?: boolean;
  selected_microphone?: string;
  enable_personal_dictionary?: boolean;
  enable_correction_learning?: boolean;
  auto_approve_corrections?: boolean;
  enable_destination_sync?: boolean;
  destination_sync_duration_secs?: number;
  enable_auto_model_routing?: boolean;
  enable_speech_repair?: boolean;
}

export interface AppUsageStat {
  app_name: string;
  word_count: number;
  percentage: number;
}

export interface InsightsData {
  total_words: number;
  total_characters?: number;
  total_sessions: number;
  average_wpm: number;
  total_duration_seconds: number;
  time_saved_minutes: number;
  streak_days: number;
  app_usage: AppUsageStat[];
}

export interface HistoryRecord {
  id: number;
  timestamp_ms: number;
  original_text: string;
  formatted_text: string;
  duration_seconds: number;
  status: string;
  target_app?: string | null;
  failure_reason?: string | null;
  session_id?: string | null;
  user_edited_text?: string | null;
}

export type SessionStateType =
  | 'idle'
  | 'starting'
  | 'recording'
  | 'stopping'
  | 'transcribing'
  | 'formatting'
  | 'validating_target'
  | 'inserting'
  | 'completed'
  | 'recovery_required'
  | 'cancelled'
  | 'failed';

export interface SessionSnapshot {
  session_id: string;
  sequence?: number;
  state: SessionStateType;
  message?: string | null;
  elapsed_seconds: number;
  last_transcript?: string | null;
  target_app?: string | null;
  target_window?: string | null;
  recovery_id?: number | null;
  timestamp_ms?: number;
  technical_suggestion?: string | null;
  active_model_name?: string | null;
  action_type?: string | null;
  action_target?: string | null;
}

export interface SystemCapabilities {
  os: string;
  accessibility_permission: boolean;
  microphone_permission: boolean;
  hardware_devices: string[];
  supported_insertion_methods: string[];
  default_insertion_policy: string;
  supported_interaction_modes: string[];
}

export interface DictionaryEntry {
  id: number;
  original: string;
  replacement: string;
  original_phrase?: string;
  replacement_phrase?: string;
  category: string;
  created_at?: number;
}

export interface PersonalVocabularyEntry {
  id: number;
  original_text: string;
  preferred_text: string;
  entry_type: string; // 'name' | 'company' | 'product' | 'tech' | 'acronym' | 'slang' | 'general' | 'spelling'
  context_domain?: string | null;
  confidence: number;
  positive_count: number;
  negative_count: number;
  status: 'candidate' | 'active' | 'disabled' | 'rejected';
  recognition_count: number;
  correction_count: number;
  application_count: number;
  last_used_at?: number | null;
  source: 'manual' | 'learned' | string;
  created_at: number;
  updated_at: number;
}

export interface ExtractedCandidate {
  original_span: string;
  preferred_span: string;
  entry_type: string;
  confidence: number;
  is_unambiguous: boolean;
}

export type EnhancementMode =
  | 'light_correction'
  | 'professional'
  | 'concise'
  | 'natural'
  | 'improve_clarity'
  | 'keep_tone'
  | 'prompt'
  | 'prompt_composition'
  | 'technical_precision';

export interface EnhancementRequest {
  session_id?: string | null;
  text: string;
  mode: EnhancementMode;
  auto_replace?: boolean;
  target_app?: string;
}

export interface IntentAudit {
  preserved_negations: string[];
  protected_terms: string[];
  preserved_numbers: string[];
  missing_constraints: string[];
  status: string;
}

export interface EnhancementResponse {
  original_text: string;
  enhanced_text: string;
  mode: EnhancementMode;
  changes_made: boolean;
  explanations: string[];
  model_used: string;
  intent_audit?: IntentAudit;
}

export interface TechnicalSpec {
  raw_thinking: string;
  objective: string;
  assumptions: string[];
  decisions: string[];
  constraints: string[];
  acceptance_criteria: string[];
  open_questions: string[];
  markdown: string;
}

export interface IngestCapsuleResult {
  project_name: string;
  terms_ingested: number;
  terms: string[];
}

// Backward compatibility alias
export type DictationStatus = SessionSnapshot;
