import { useState, useEffect } from 'react';
import { safeInvoke, safeListen, isNativeTauri } from './lib/ipc';
import { Mascot } from './components/Mascot';
import { FloatingPill } from './components/FloatingPill';
import { ModelManagerTab } from './components/ModelManagerTab';
import { HistoryTab } from './components/HistoryTab';
import { SettingsTab } from './components/SettingsTab';
import { ModelInfo, AppSettings, HistoryRecord, DictationStatus } from './types';
import { Layers, History, Settings as SettingsIcon } from 'lucide-react';

export default function App() {
  const isPillOnlyWindow = typeof window !== 'undefined' && window.location.hash === '#pill';
  const [activeTab, setActiveTab] = useState<'models' | 'history' | 'settings'>('models');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    default_model_id: 'whisper-small',
    language: 'auto',
    shortcut: 'CommandOrControl+Shift+Space',
    spoken_punctuation: true,
    conservative_filler_removal: false,
    auto_capitalization: true,
    retain_history: true,
    play_sound_effects: true,
  });
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [devices, setDevices] = useState<string[]>([]);
  const [dictationStatus, setDictationStatus] = useState<DictationStatus>({
    state: 'idle',
    message: 'Press shortcut or click pill to dictate',
  });
  const [downloadProgress, setDownloadProgress] = useState<{ [id: string]: { percent: number; downloaded: number; total: number } }>({});
  const [smokeTestLog, setSmokeTestLog] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();

    // Listen to native download events
    const progPromise = safeListen<{ model_id: string; downloaded: number; total: number; percent: number }>('model-download-progress', (e) => {
      setDownloadProgress((prev) => ({
        ...prev,
        [e.payload.model_id]: {
          percent: e.payload.percent,
          downloaded: e.payload.downloaded,
          total: e.payload.total,
        },
      }));
    });

    const compPromise = safeListen<{ model_id: string; path: string }>('model-download-complete', (e) => {
      setDownloadProgress((prev) => {
        const next = { ...prev };
        delete next[e.payload.model_id];
        return next;
      });
      loadModels();
    });

    const dictPromise = safeListen<DictationStatus>('dictation-state-changed', (e) => {
      setDictationStatus(e.payload);
      if (e.payload.state === 'success' || e.payload.state === 'warning') {
        loadHistory();
      }
    });

    return () => {
      progPromise.then((fn) => fn && fn());
      compPromise.then((fn) => fn && fn());
      dictPromise.then((fn) => fn && fn());
    };
  }, []);

  const loadAllData = async () => {
    await loadModels();
    await loadSettings();
    await loadHistory();
    await loadDevices();
  };

  const loadModels = async () => {
    try {
      const res = await safeInvoke<ModelInfo[]>('get_models');
      setModels(res);
      // Ensure activeModelId reflects actually available model if default is missing
      const downloaded = res.filter(m => m.is_downloaded);
      if (downloaded.length > 0 && !res.find(m => m.id === settings.default_model_id)?.is_downloaded) {
        const fallback = downloaded.find(m => m.id === 'whisper-small') || downloaded[0];
        if (fallback) {
          handleSelectActiveModel(fallback.id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await safeInvoke<AppSettings>('get_settings');
      setSettings(res);
    } catch (e) {
      console.error(e);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await safeInvoke<HistoryRecord[]>('get_history', { limit: 50 });
      setHistory(res);
    } catch (e) {
      console.error(e);
    }
  };

  const loadDevices = async () => {
    try {
      const res = await safeInvoke<string[]>('get_audio_devices');
      setDevices(res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = async (modelId: string) => {
    try {
      await safeInvoke('download_model', { modelId });
    } catch (e) {
      alert(`Download trigger error: ${e}`);
    }
  };

  const handleSelectActiveModel = async (modelId: string) => {
    const updated = { ...settings, default_model_id: modelId };
    setSettings(updated);
    try {
      await safeInvoke('save_settings_cmd', { newSettings: updated });
    } catch (e) {
      alert(`Save error: ${e}`);
    }
  };

  const handleSmokeTest = async (modelId: string) => {
    setSmokeTestLog('Executing local Whisper inference with audio tone...');
    try {
      const out = await safeInvoke<string>('smoke_test_transcription', { modelId });
      setSmokeTestLog(out);
    } catch (e) {
      setSmokeTestLog(`Smoke test error: ${e}`);
    }
  };

  const handleToggleDictation = async () => {
    try {
      await safeInvoke('toggle_dictation');
    } catch (e) {
      setDictationStatus({
        state: 'error',
        message: String(e),
      });
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleDeleteHistory = async (id: number) => {
    try {
      await safeInvoke('delete_history_item', { id });
      await loadHistory();
    } catch (e) {
      alert(`Delete error: ${e}`);
    }
  };

  const handleClearHistory = async () => {
    if (confirm('Clear all local transcription history?')) {
      try {
        await safeInvoke('clear_history');
        await loadHistory();
      } catch (e) {
        alert(`Clear error: ${e}`);
      }
    }
  };

  const isRecording = dictationStatus.state === 'recording';

  if (isPillOnlyWindow) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-transparent select-none p-1">
        <FloatingPill
          status={dictationStatus}
          isRecording={isRecording}
          onToggle={handleToggleDictation}
          onCopyLast={() => dictationStatus.last_transcript && handleCopy(dictationStatus.last_transcript)}
          compact
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-vq-cream text-vq-charcoal">
      {/* Header */}
      <header className="px-6 py-4 border-b-2 border-vq-border flex items-center justify-between bg-vq-surface">
        <div className="flex items-center gap-3">
          <Mascot size={36} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-pixel text-sm text-vq-tealDark tracking-wide">VOXQUEST</h1>
              <span className="text-[10px] font-mono font-bold bg-vq-sage/40 text-vq-tealDark px-1.5 py-0.5 rounded border border-vq-border">
                v0.1.0 Sovereign
              </span>
              {!isNativeTauri() && (
                <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded border border-amber-300">
                  Browser Preview
                </span>
              )}
            </div>
            <p className="text-xs text-vq-charcoal/70 font-sans">
              Autonomous system-wide native voice typing (Offline Whisper Engine)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('models')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded border transition-all ${
              activeTab === 'models'
                ? 'bg-vq-tealDark text-vq-cream border-vq-charcoal shadow-tactile-sm'
                : 'bg-vq-surface hover:bg-vq-surfaceLight border-vq-border text-vq-charcoal'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Models
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded border transition-all ${
              activeTab === 'history'
                ? 'bg-vq-tealDark text-vq-cream border-vq-charcoal shadow-tactile-sm'
                : 'bg-vq-surface hover:bg-vq-surfaceLight border-vq-border text-vq-charcoal'
            }`}
          >
            <History className="w-3.5 h-3.5" /> History
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded border transition-all ${
              activeTab === 'settings'
                ? 'bg-vq-tealDark text-vq-cream border-vq-charcoal shadow-tactile-sm'
                : 'bg-vq-surface hover:bg-vq-surfaceLight border-vq-border text-vq-charcoal'
            }`}
          >
            <SettingsIcon className="w-3.5 h-3.5" /> Settings
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 pb-28">
        {activeTab === 'models' && (
          <ModelManagerTab
            models={models}
            downloadProgress={downloadProgress}
            activeModelId={settings.default_model_id}
            onDownload={handleDownload}
            onSelectActive={handleSelectActiveModel}
            onSmokeTest={handleSmokeTest}
            smokeTestLog={smokeTestLog}
          />
        )}

        {activeTab === 'history' && (
          <HistoryTab
            history={history}
            onCopy={handleCopy}
            onDelete={handleDeleteHistory}
            onClearAll={handleClearHistory}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            settings={settings}
            devices={devices}
            onUpdate={async (newSettings) => {
              setSettings(newSettings);
              await safeInvoke('save_settings_cmd', { newSettings });
            }}
          />
        )}
      </main>

      {/* Floating native pill */}
      <FloatingPill
        status={dictationStatus}
        isRecording={isRecording}
        onToggle={handleToggleDictation}
        onCopyLast={() => dictationStatus.last_transcript && handleCopy(dictationStatus.last_transcript)}
      />
    </div>
  );
}
