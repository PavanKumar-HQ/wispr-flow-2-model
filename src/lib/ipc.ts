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
    id: 'whisper-tiny',
    name: 'VoxQuest Fast (Daily & Quick)',
    filename: 'ggml-tiny.bin',
    size_bytes: 77691713,
    sha256: 'be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21',
    download_url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
    description: 'Instant response, ultra-low memory (~390 MB). Ideal for quick notes, Slack messages, and everyday chats.',
    ram_estimate_mb: 390,
    recommended: false,
    is_downloaded: true,
  },
  {
    id: 'whisper-base',
    name: 'VoxQuest Balanced (Everyday)',
    filename: 'ggml-base.bin',
    size_bytes: 147951465,
    sha256: '60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe',
    download_url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    description: 'Balanced speed and precision (~500 MB). Ideal for emails, documents, and general writing.',
    ram_estimate_mb: 500,
    recommended: false,
    is_downloaded: false,
  },
  {
    id: 'whisper-small',
    name: 'VoxQuest Pro (High Precision)',
    filename: 'ggml-small.bin',
    size_bytes: 487601967,
    sha256: '1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b',
    download_url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
    description: 'Maximum accuracy across 99+ languages, technical terminology, programming, and mixed dialects (~1.0 GB).',
    ram_estimate_mb: 1024,
    recommended: true,
    is_downloaded: false,
  },
];

let mockSettings: AppSettings = {
  default_model_id: 'whisper-tiny',
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

let mockDictionary: any[] = [];

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
      return [] as unknown as T;
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
