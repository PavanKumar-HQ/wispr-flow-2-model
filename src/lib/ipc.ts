import { invoke as tauriInvoke, isTauri as checkIsTauri } from '@tauri-apps/api/core';
import { listen as tauriListen, EventCallback, UnlistenFn } from '@tauri-apps/api/event';
import { ModelInfo, AppSettings, HistoryRecord } from '../types';

// Safely determine whether the code is running within the Tauri native webview context
export const isNativeTauri = (): boolean => {
  try {
    return typeof window !== 'undefined' && (checkIsTauri() || '__TAURI_INTERNALS__' in window || '__TAURI__' in window);
  } catch {
    return false;
  }
};

// Fallback in-memory state for development browser preview or non-Tauri execution
const mockModels: ModelInfo[] = [
  {
    id: 'whisper-tiny',
    name: 'Whisper Tiny (Multilingual)',
    filename: 'ggml-tiny.bin',
    size_bytes: 77691713,
    sha256: 'be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21',
    download_url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
    description: 'Fastest inference, ultra-low RAM footprint (~390 MB). Ideal for quick checks and low-power hardware.',
    ram_estimate_mb: 390,
    recommended: false,
    is_downloaded: true,
  },
  {
    id: 'whisper-base',
    name: 'Whisper Base (Multilingual)',
    filename: 'ggml-base.bin',
    size_bytes: 147951465,
    sha256: '60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe',
    download_url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    description: 'Great balance of quick response and acceptable accuracy (~500 MB RAM).',
    ram_estimate_mb: 500,
    recommended: false,
    is_downloaded: false,
  },
  {
    id: 'whisper-small',
    name: 'Whisper Small (Multilingual — Recommended)',
    filename: 'ggml-small.bin',
    size_bytes: 487601967,
    sha256: '1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b',
    download_url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
    description: 'High accuracy across 99+ languages and dialects, code-switching, Hinglish (~1.0 GB RAM).',
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
  spoken_punctuation: true,
  conservative_filler_removal: false,
  auto_capitalization: true,
  retain_history: true,
  play_sound_effects: true,
  max_duration_secs: 180,
};

let mockHistory: HistoryRecord[] = [
  {
    id: 1,
    timestamp_ms: Date.now(),
    original_text: 'hello world this is voxquest voice typing',
    formatted_text: 'Hello world this is VoxQuest voice typing.',
    duration_seconds: 2.3,
    status: 'inserted',
    target_app: 'TextEdit',
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
    case 'toggle_dictation':
      return undefined as unknown as T;
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
