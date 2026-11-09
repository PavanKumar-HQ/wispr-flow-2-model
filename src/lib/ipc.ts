import { invoke as tauriInvoke, isTauri as checkIsTauri } from '@tauri-apps/api/core';
import { listen as tauriListen, EventCallback, UnlistenFn } from '@tauri-apps/api/event';
import { ModelInfo, AppSettings, HistoryRecord } from '../types';

// Safely determine whether the code is running within the Tauri native webview context
export const isNativeTauri = (): boolean => {
  try {
    if (typeof window === 'undefined') return false;
    const w = window as any;
    return Boolean(w.__TAURI_INTERNALS__ || w.__TAURI__ || w.isTauri || (typeof checkIsTauri === 'function' && checkIsTauri()));
  } catch {
    return false;
  }
};

// Fallback in-memory state for development browser preview or non-Tauri execution
const mockModels: ModelInfo[] = [
  {
    id: 'whisper-base-en-q5_1',
    name: 'Instant English (Lightweight)',
    filename: 'ggml-base.en-q5_1.bin',
    size_bytes: 59721011,
    sha256: '4baf70dd0d7c4247ba2b81fafd9c01005ac77c2f9ef064e00dcf195d0e2fdd2f',
    download_url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en-q5_1.bin',
    description: '57 MB ultra-lightweight English model. Instant response (~140ms latency), lowest battery consumption, and zero MacBook heat.',
    ram_estimate_mb: 130,
    recommended: true,
    is_downloaded: true,
  },
  {
    id: 'whisper-base-q5_1',
    name: 'Everyday Multilingual (Low RAM)',
    filename: 'ggml-base-q5_1.bin',
    size_bytes: 59707625,
    sha256: '422f1ae452ade6f30a004d7e5c6a43195e4433bc370bf23fac9cc591f01a8898',
    download_url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin',
    description: '59 MB compact Q5_1 multilingual model. High transcription precision with minimal memory overhead (~180 MB RAM).',
    ram_estimate_mb: 180,
    recommended: false,
    is_downloaded: false,
  },
  {
    id: 'whisper-tiny-q5_1',
    name: 'Ultra-Low Power (Battery Saver)',
    filename: 'ggml-tiny-q5_1.bin',
    size_bytes: 32152673,
    sha256: '818710568da3ca15689e31a743197b520007872ff9576237bda97bd1b469c3d7',
    download_url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny-q5_1.bin',
    description: '32 MB ultra-quantized Q5_1 model. Lowest battery and RAM footprint (~120 MB RAM), ideal for maximum battery life.',
    ram_estimate_mb: 120,
    recommended: false,
    is_downloaded: false,
  },
];

let mockSettings: AppSettings = {
  default_model_id: 'whisper-base-en-q5_1',
  language: 'auto',
  shortcut: 'CommandOrControl+Shift+Space',
  insertion_policy: 'original_destination',
  interaction_mode: 'toggle',
  spoken_punctuation: true,
  conservative_filler_removal: false,
  auto_capitalization: true,
  retain_history: true,
  play_sound_effects: true,
  max_duration_secs: 180,
  enable_personal_dictionary: true,
  enable_correction_learning: true,
  auto_approve_corrections: false,
};

let mockHistory: HistoryRecord[] = [];

let mockDictionary: any[] = [
  { id: 1, original: 'vox quest', replacement: 'VoxQuest', category: 'name', created_at: Date.now() },
  { id: 2, original: 'whisper flow', replacement: 'Wispr Flow', category: 'name', created_at: Date.now() },
  { id: 3, original: 'anti gravity', replacement: 'Antigravity', category: 'tech', created_at: Date.now() },
  { id: 4, original: 'wpm', replacement: 'WPM', category: 'acronym', created_at: Date.now() },
  { id: 5, original: 'dishtary', replacement: 'dictionary', category: 'spelling', created_at: Date.now() },
];

let mockPersonalVocab: any[] = [
  {
    id: 101,
    original_text: 'chatgot',
    preferred_text: 'ChatGPT',
    entry_type: 'tech',
    context_domain: null,
    confidence: 1.0,
    positive_count: 5,
    negative_count: 0,
    status: 'active',
    recognition_count: 12,
    correction_count: 0,
    application_count: 12,
    last_used_at: Date.now(),
    source: 'learned',
    created_at: Date.now(),
    updated_at: Date.now(),
  },
  {
    id: 102,
    original_text: 'dishtary',
    preferred_text: 'dictionary',
    entry_type: 'spelling',
    context_domain: null,
    confidence: 1.0,
    positive_count: 3,
    negative_count: 0,
    status: 'active',
    recognition_count: 8,
    correction_count: 0,
    application_count: 8,
    last_used_at: Date.now(),
    source: 'learned',
    created_at: Date.now(),
    updated_at: Date.now(),
  },
];

export async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isNativeTauri()) {
    try {
      return await tauriInvoke<T>(cmd, args);
    } catch (err) {
      console.warn(`[Tauri Native] IPC command '${cmd}' error:`, err);
      throw err;
    }
  }

  // Graceful browser fallback when opened directly in a web browser without Tauri IPC backend
  console.log(`[Browser Mock Mode] safeInvoke '${cmd}'`, args);
  switch (cmd) {
    case 'get_models':
      return mockModels as unknown as T;
    case 'get_settings':
      return mockSettings as unknown as T;
    case 'save_settings_cmd':
      if (args && args.newSettings) {
        mockSettings = { ...(args.newSettings as AppSettings) };
      }
      return undefined as unknown as T;
    case 'get_history':
      return mockHistory as unknown as T;
    case 'delete_history_item':
      if (args && typeof args.id === 'number') {
        mockHistory = mockHistory.filter(h => h.id !== args.id);
      }
      return undefined as unknown as T;
    case 'clear_history':
      mockHistory = [];
      return undefined as unknown as T;
    case 'get_audio_devices':
      return ['Built-in Microphone (48kHz)', 'Default System Audio'] as unknown as T;
    case 'download_model':
      console.log('Mock downloading model:', args);
      return undefined as unknown as T;
    case 'smoke_test_transcription':
      return 'Mock smoke test succeeded: transcription verified.' as unknown as T;
    case 'get_capabilities':
      return {
        os: 'macos',
        accessibility_permission: true,
        microphone_permission: true,
        hardware_devices: ['Built-in Microphone (48kHz)'],
        supported_insertion_methods: ['accessibility_ax', 'simulated_paste', 'direct_clipboard'],
        default_insertion_policy: mockSettings.insertion_policy,
        supported_interaction_modes: ['toggle', 'push_to_talk'],
      } as unknown as T;
    case 'get_dictation_status':
    case 'get_session_snapshot':
      return {
        session_id: 'mock-session',
        sequence: 1,
        state: 'idle',
        message: 'Ready to dictate.',
        elapsed_seconds: 0,
        last_transcript: null,
        target_app: null,
        target_window: null,
        recovery_id: null,
        timestamp_ms: Date.now(),
      } as unknown as T;
    case 'get_insights':
      return {
        total_words: 0,
        total_sessions: 0,
        average_wpm: 0,
        total_duration_seconds: 0,
        time_saved_minutes: 0,
        streak_days: 0,
        app_usage: [],
      } as unknown as T;
    case 'get_recovery_records':
      return mockHistory.filter(h => h.status === 'recovery_required' || h.status === 'failed' || h.status === 'uncertain') as unknown as T;
    case 'update_recovery_text':
      if (args && typeof args.id === 'number' && typeof args.newText === 'string') {
        const item = mockHistory.find(h => h.id === args.id);
        if (item) item.formatted_text = args.newText;
      }
      return undefined as unknown as T;
    case 'copy_recovery_text':
      if (args && typeof args.id === 'number') {
        const item = mockHistory.find(h => h.id === args.id);
        if (item && typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(item.formatted_text);
        }
        return (item?.formatted_text || '') as unknown as T;
      }
      return '' as unknown as T;
    case 'dismiss_recovery_record':
      if (args && typeof args.id === 'number') {
        mockHistory = mockHistory.filter(h => h.id !== args.id);
      }
      return undefined as unknown as T;
    case 'insert_into_selected_field':
      if (args && typeof args.id === 'number') {
        const item = mockHistory.find(h => h.id === args.id);
        if (item) {
          item.status = 'inserted';
          item.target_app = 'Active Window';
        }
        return 'Inserted into active window' as unknown as T;
      }
      return 'Inserted' as unknown as T;
    case 'get_dictionary_entries':
      return mockDictionary as unknown as T;
    case 'add_dictionary_entry': {
      const newId = Date.now();
      if (args) {
        mockDictionary.push({
          id: newId,
          original: (args.original as string) || '',
          replacement: (args.replacement as string) || '',
          category: (args.category as string) || 'general',
        });
      }
      return newId as unknown as T;
    }
    case 'delete_dictionary_entry': {
      if (args && typeof args.id === 'number') {
        mockDictionary = mockDictionary.filter((d) => d.id !== args.id);
      }
      return undefined as unknown as T;
    }
    case 'get_personal_vocabulary': {
      return mockPersonalVocab as unknown as T;
    }
    case 'add_personal_vocabulary_entry': {
      return {
        id: Date.now(),
        original_text: (args?.original as string) || '',
        preferred_text: (args?.preferred as string) || '',
        entry_type: (args?.entry_type as string) || 'general',
        confidence: 1.0,
        positive_count: 1,
        negative_count: 0,
        status: (args?.status as string) || 'active',
        created_at: Date.now(),
        updated_at: Date.now(),
      } as unknown as T;
    }
    case 'update_personal_vocabulary_entry':
    case 'delete_personal_vocabulary_entry':
    case 'reset_personalization': {
      return undefined as unknown as T;
    }
    case 'polish_transcript_cmd': {
      if (args && typeof args.text === 'string') {
        const text = args.text.trim();
        if (!text) return '' as unknown as T;
        return (text.charAt(0).toUpperCase() + text.slice(1)) as unknown as T;
      }
      return '' as unknown as T;
    }
    case 'detect_prompt_cmd': {
      if (args && typeof args.text === 'string') {
        const text = args.text.toLowerCase();
        const directives = ['write', 'explain', 'create', 'generate', 'how to', 'how do i', 'what is', 'can you', 'build', 'summarize'];
        return (directives.some((d) => text.startsWith(d)) || text.endsWith('?')) as unknown as T;
      }
      return false as unknown as T;
    }
    case 'enhance_prompt_cmd': {
      if (args && typeof args.text === 'string') {
        const text = args.text.trim();
        return text as unknown as T;
      }
      return '' as unknown as T;
    }
    case 'enhance_text_cmd': {
      if (args && typeof args.request === 'object' && args.request && typeof (args.request as any).text === 'string') {
        const req = args.request as any;
        const raw = req.text.trim();
        let enhanced = raw;
        if (raw.toLowerCase().includes('hey team i finished the backend but the api is giving error so i will fix it tomorrow')) {
          enhanced = "Hey team, I finished the backend, but the API is returning an error. I'll fix it tomorrow.";
        } else if (raw.toLowerCase().includes('can you please check this code and tell me if anything wrong')) {
          enhanced = "Could you please review this code and let me know if anything is wrong?";
        } else if (raw) {
          enhanced = raw.charAt(0).toUpperCase() + raw.slice(1);
          if (!/[.!?]$/.test(enhanced)) enhanced += '.';
        }
        return {
          original_text: raw,
          enhanced_text: enhanced,
          mode: req.mode || 'improve_clarity',
          changes_made: enhanced !== raw,
          explanations: ['Refined grammar and clause structure.', 'Preserved technical terms.'],
          model_used: 'VoxQuest Native Semantic Engine (Local M4 Optimized)',
        } as unknown as T;
      }
      return {
        original_text: '',
        enhanced_text: '',
        mode: 'improve_clarity',
        changes_made: false,
        explanations: [],
        model_used: 'VoxQuest Native Semantic Engine',
      } as unknown as T;
    }
    case 'accept_enhancement_session_cmd':
    case 'accept_enhancement_history_cmd': {
      return undefined as unknown as T;
    }
    case 'restore_original_history_cmd': {
      return '' as unknown as T;
    }
    case 'submit_transcript_correction': {
      return [] as unknown as T;
    }
    case 'switch_speech_profile': {
      const profile = (args?.profile as string) || 'developer';
      return `Switched to ${profile} profile` as unknown as T;
    }
    case 'dismiss_technical_suggestion': {
      return undefined as unknown as T;
    }
    default:
      return undefined as unknown as T;
  }
}

export async function safeListen<T>(event: string, handler: EventCallback<T>): Promise<UnlistenFn> {
  if (isNativeTauri()) {
    try {
      return await tauriListen<T>(event, handler);
    } catch (err) {
      console.warn(`[Tauri Native] listen('${event}') error:`, err);
      return () => {};
    }
  }

  // No-op unlisten in browser mode
  return () => {};
}
