import { useState, useEffect } from 'react';
import { safeInvoke, safeListen, isNativeTauri } from './lib/ipc';
import { Mascot } from './components/Mascot';
import { FloatingPill } from './components/FloatingPill';
import { HomeTab } from './components/HomeTab';
import { InsightsTab } from './components/InsightsTab';
import { ModelManagerTab } from './components/ModelManagerTab';
import { HistoryTab } from './components/HistoryTab';
import { SettingsTab } from './components/SettingsTab';
import { DictionaryTab } from './components/DictionaryTab';
import { ModelInfo, AppSettings, HistoryRecord, SessionSnapshot, InsightsData } from './types';
import { Home, Layers, History, Settings as SettingsIcon, BookA, BarChart2, LocateFixed } from 'lucide-react';

export default function App() {
  const isPillOnlyWindow = typeof window !== 'undefined' && window.location.hash.includes('pill');
  const [activeTab, setActiveTab] = useState<'home' | 'insights' | 'models' | 'dictionary' | 'history' | 'settings'>('home');
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    default_model_id: 'whisper-small',
    language: 'auto',
    shortcut: 'CommandOrControl+Shift+Space',
    insertion_policy: 'original_destination',
    interaction_mode: 'push_to_talk',
    spoken_punctuation: true,
    conservative_filler_removal: false,
    auto_capitalization: true,
    retain_history: true,
    play_sound_effects: true,
    max_duration_secs: 180,
  });
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [devices, setDevices] = useState<string[]>([]);
  const [session, setSession] = useState<SessionSnapshot>({
    session_id: '',
    state: 'idle',
    message: 'Ready to dictate. Press shortcut or click pill.',
    elapsed_seconds: 0.0,
    last_transcript: null,
    target_app: null,
    recovery_id: null,
  });
  const [downloadProgress, setDownloadProgress] = useState<{ [id: string]: { percent: number; downloaded: number; total: number } }>({});
  const [smokeTestLog, setSmokeTestLog] = useState<string | null>(null);

  useEffect(() => {
    if (isPillOnlyWindow) {
      document.body.style.backgroundColor = 'transparent';
      document.documentElement.style.backgroundColor = 'transparent';
    }
  }, [isPillOnlyWindow]);

  // Elapsed timer ticker during recording
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (session.state === 'recording') {
      interval = setInterval(() => {
        setSession((prev) => {
          if (prev.state === 'recording') {
            return { ...prev, elapsed_seconds: prev.elapsed_seconds + 1 };
          }
          return prev;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [session.state]);

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

    // Authoritative backend session state changes
    const sessionPromise = safeListen<SessionSnapshot>('dictation-session-changed', (e) => {
      setSession(e.payload);
      if (e.payload.state === 'completed' || e.payload.state === 'recovery_required') {
        loadHistory();
        loadInsights();
      }
      if (e.payload.state === 'completed') {
        setTimeout(() => {
          setSession((prev) => {
            if (prev.session_id === e.payload.session_id && prev.state === 'completed') {
              return {
                ...prev,
                state: 'idle',
                message: 'Ready to dictate. Press shortcut or click pill.',
                last_transcript: null,
              };
            }
            return prev;
          });
        }, 8000);
      }
    });

    // Listen for automatic external edits synced back from destination apps (e.g. TextEdit)
    const destSyncPromise = safeListen<{ history_id: number; app_name: string; updated_text: string }>('destination-edit-synced', (_e) => {
      loadHistory();
      loadInsights();
    });

    const dictSyncPromise = safeListen('dictionary-updated', () => {
      loadInsights();
    });

    // In floating pill window, aggressively poll session snapshot every 150ms to ensure 0-latency status sync
    let syncInterval: ReturnType<typeof setInterval> | null = null;
    if (isPillOnlyWindow) {
      syncInterval = setInterval(async () => {
        try {
          const snap = await safeInvoke<SessionSnapshot>('get_session_snapshot');
          if (snap) {
            setSession((prev) => {
              if (
                prev.state !== snap.state ||
                prev.sequence !== snap.sequence ||
                prev.last_transcript !== snap.last_transcript
              ) {
                return snap;
              }
              return prev;
            });
          }
        } catch {
          // ignore in browser mode
        }
      }, 150);
    }

    return () => {
      progPromise.then((fn) => fn && fn());
      compPromise.then((fn) => fn && fn());
      sessionPromise.then((fn) => fn && fn());
      destSyncPromise.then((fn) => fn && fn());
      dictSyncPromise.then((fn) => fn && fn());
      if (syncInterval) clearInterval(syncInterval);
    };
  }, []);

  const loadAllData = async () => {
    const loadedSettings = await loadSettings();
    await loadModels(loadedSettings);
    await loadHistory();
    await loadInsights();
    await loadDevices();
    try {
      const snap = await safeInvoke<SessionSnapshot>('get_session_snapshot');
      if (snap) setSession(snap);
    } catch {
      // Ignored in browser preview
    }
  };

  const loadInsights = async () => {
    try {
      const res = await safeInvoke<InsightsData>('get_insights');
      if (res) {
        setInsights(res);
      }
    } catch (e) {
      console.error('Failed to load insights:', e);
    }
  };

  const loadModels = async (currentSettings?: AppSettings) => {
    try {
      const res = await safeInvoke<ModelInfo[]>('get_models');
      setModels(res);
      const activeSettings = currentSettings || settings;
      const downloaded = res.filter(m => m.is_downloaded);
      if (downloaded.length > 0 && !res.find(m => m.id === activeSettings.default_model_id)?.is_downloaded) {
        const fallback = downloaded.find(m => m.id === 'whisper-small') || downloaded[0];
        if (fallback) {
          handleSelectActiveModel(fallback.id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadSettings = async (): Promise<AppSettings | undefined> => {
    try {
      const res = await safeInvoke<AppSettings>('get_settings');
      if (res) {
        setSettings(res);
        return res;
      }
    } catch (e) {
      console.error(e);
    }
    return undefined;
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
      await safeInvoke('switch_speech_profile', { profile: modelId });
    } catch (e) {
      alert(`Save error: ${e}`);
    }
  };

  const handleUpdateSettings = async (updated: AppSettings) => {
    setSettings(updated);
    try {
      await safeInvoke('save_settings_cmd', { newSettings: updated });
    } catch (e) {
      alert(`Save error: ${e}`);
    }
  };

  const handleSmokeTest = async (modelId: string) => {
    setSmokeTestLog('Executing local voice engine diagnostic with acoustic probe...');
    try {
      const out = await safeInvoke<string>('smoke_test_transcription', { modelId });
      setSmokeTestLog(out);
    } catch (e) {
      setSmokeTestLog(`Smoke test error: ${e}`);
    }
  };

  const handleToggleDictation = async () => {
    try {
      const snap = await safeInvoke<SessionSnapshot>('toggle_dictation');
      if (snap) setSession(snap);
    } catch (e) {
      setSession((prev) => ({
        ...prev,
        state: 'failed',
        message: String(e),
      }));
    }
  };

  const handleCancelDictation = async () => {
    try {
      const snap = await safeInvoke<SessionSnapshot>('cancel_dictation');
      if (snap) setSession(snap);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRetryInsertion = async () => {
    if (session.recovery_id) {
      try {
        await safeInvoke('retry_insertion', { historyId: session.recovery_id });
        await loadHistory();
      } catch (e) {
        alert(`Retry failed: ${e}`);
      }
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleDeleteHistory = async (id: number) => {
    try {
      await safeInvoke('delete_history_item', { id });
      await Promise.all([loadHistory(), loadInsights()]);
    } catch (e) {
      console.warn('Delete history item error:', e);
    }
  };

  const handleClearHistory = async () => {
    try {
      await safeInvoke('clear_history');
      setHistory([]);
      setSession((prev) => ({
        ...prev,
        last_transcript: null,
        recovery_id: null,
        message: 'Ready to dictate. Press shortcut or click pill.',
      }));
      await Promise.all([loadHistory(), loadInsights()]);
    } catch (e) {
      console.warn('Clear history error:', e);
    }
  };

  if (isPillOnlyWindow) {
    return (
      <div data-tauri-drag-region className="w-screen h-screen flex items-center justify-center bg-transparent select-none p-1 overflow-hidden">
        <FloatingPill
          status={session}
          onToggle={handleToggleDictation}
          onCancel={handleCancelDictation}
          onRetry={handleRetryInsertion}
          onCopyLast={(text) => handleCopy(text || session.last_transcript || '')}
          compact
        />
      </div>
    );
  }

  const pendingRecoveryCount = history.filter(
    (h) => h.status === 'recovery_required' || h.status === 'uncertain' || h.status === 'failed'
  ).length;

  return (
    <div className="flex h-screen bg-cream text-charcoal overflow-hidden font-sans">
      {/* Left Sidebar (Responsive Width: compact on small screens, full on desktop) */}
      <aside className="w-16 sm:w-20 md:w-56 bg-[#F6F6F2] border-r border-charcoal/15 flex flex-col justify-between p-2 sm:p-3 md:p-4 select-none shrink-0 h-full transition-all">
        <div className="space-y-4 md:space-y-6">
          {/* Logo / Brand Header */}
          <div className="flex items-center justify-center md:justify-start gap-2.5 px-1 md:px-2 pt-1">
            <Mascot size={32} />
            <div className="hidden md:block">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-darkTeal tracking-wide">VOXQUEST</span>
                <span className="w-2 h-2 rounded-full bg-amber animate-pulse" />
              </div>
              <p className="text-[10px] text-charcoal/60 font-sans font-medium">Sovereign Voice</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {[
              { id: 'home', label: 'Home', icon: Home },
              { id: 'insights', label: 'Insights', icon: BarChart2 },
              { id: 'history', label: 'History', icon: History, badge: pendingRecoveryCount > 0 ? `${pendingRecoveryCount}` : null },
              { id: 'dictionary', label: 'Dictionary', icon: BookA },
              { id: 'models', label: 'Dictation Modes', icon: Layers },
              { id: 'settings', label: 'Settings', icon: SettingsIcon },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  title={item.label}
                  className={`w-full flex items-center justify-center md:justify-between px-2.5 md:px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${
                    isActive
                      ? 'bg-darkTeal text-white shadow-sm'
                      : 'text-charcoal/70 hover:text-charcoal hover:bg-black/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber' : 'text-charcoal/60'}`} />
                    <span className="hidden md:inline">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="hidden md:inline-block px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-amber text-charcoal font-bold shadow-xs">
                      {item.badge}
                    </span>
                  )}
                  {item.badge && (
                    <span className="md:hidden absolute top-1 right-1 w-2 h-2 rounded-full bg-amber" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="space-y-2 pt-3 border-t border-charcoal/15">
          <button
            onClick={() => safeInvoke('center_pill_window')}
            className="w-full flex items-center justify-center gap-1.5 px-2 md:px-3 py-2 text-xs font-semibold rounded-xl border border-charcoal/20 bg-white text-darkTeal hover:bg-darkTeal hover:text-white transition-all shadow-sm active:scale-95"
            title="Summon the floating pill to the front of your screen"
          >
            <LocateFixed className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">Summon Pill</span>
          </button>

          <div className="hidden md:flex px-1 items-center justify-between text-[10px] text-charcoal/60">
            <span className="flex items-center gap-1 font-semibold text-darkTeal">
              <span className="w-1.5 h-1.5 rounded-full bg-darkTeal" /> 100% Offline
            </span>
            <span className="font-mono">v0.1.0</span>
          </div>
        </div>
      </aside>

      {/* Main Tab Content (Fluid Responsive Padding) */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 bg-cream">
        <div className="max-w-5xl mx-auto w-full">
          {activeTab === 'home' && (
            <HomeTab
              insights={insights}
              history={history}
              session={session}
              shortcut={settings.shortcut}
              interactionMode={settings.interaction_mode}
              onUpdateInteractionMode={(mode) => handleUpdateSettings({ ...settings, interaction_mode: mode })}
              onCopy={handleCopy}
              onDeleteHistory={handleDeleteHistory}
              onClearHistory={handleClearHistory}
              onToggleDictation={handleToggleDictation}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onSummonPill={() => safeInvoke('center_pill_window')}
            />
          )}

          {activeTab === 'insights' && (
            <InsightsTab
              insights={insights}
              history={history}
              shortcut={settings.shortcut}
              onCopy={handleCopy}
              onStartTest={handleToggleDictation}
            />
          )}

          {activeTab === 'models' && (
            <ModelManagerTab
              models={models}
              activeModelId={settings.default_model_id}
              downloadProgress={downloadProgress}
              onDownload={handleDownload}
              onSelectActive={handleSelectActiveModel}
              onSmokeTest={handleSmokeTest}
              onDismissSmokeTest={() => setSmokeTestLog(null)}
              smokeTestLog={smokeTestLog}
              autoRoutingEnabled={settings.enable_auto_model_routing ?? true}
              onToggleAutoRouting={(val) => handleUpdateSettings({ ...settings, enable_auto_model_routing: val })}
            />
          )}

          {activeTab === 'dictionary' && <DictionaryTab />}

          {activeTab === 'history' && (
            <HistoryTab
              history={history}
              onCopy={handleCopy}
              onDelete={handleDeleteHistory}
              onClearAll={handleClearHistory}
              onReload={loadHistory}
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
        </div>
      </main>

      {/* Floating preview pill only rendered in web browser preview mode (in native Tauri desktop mode, the dedicated floating-indicator window renders the pill) */}
      {!isNativeTauri() && (
        <FloatingPill
          status={session}
          onToggle={handleToggleDictation}
          onCancel={handleCancelDictation}
          onRetry={handleRetryInsertion}
          onCopyLast={(text) => handleCopy(text || session.last_transcript || '')}
        />
      )}
    </div>
  );
}
