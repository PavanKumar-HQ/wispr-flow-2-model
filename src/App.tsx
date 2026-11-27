import { useState, useEffect } from 'react';
import { safeInvoke, safeListen, isNativeTauri } from './lib/ipc';
import { Mascot } from './components/Mascot';
import { FloatingPill } from './components/FloatingPill';
import { DesktopCompanion } from './components/DesktopCompanion';
import { HomeTab } from './components/HomeTab';
import { InsightsTab } from './components/InsightsTab';
import { ModelManagerTab } from './components/ModelManagerTab';
import { HistoryTab } from './components/HistoryTab';
import { SettingsTab } from './components/SettingsTab';
import { DictionaryTab } from './components/DictionaryTab';
import { TrainModelTab } from './components/TrainModelTab';
import { UtilitiesTab } from './components/UtilitiesTab';
import { QuestsTab } from './components/QuestsTab';
import { MeetingAssistantTab } from './components/MeetingAssistantTab';
import { ModelInfo, AppSettings, HistoryRecord, SessionSnapshot, InsightsData } from './types';
import { Home, Layers, History, Settings as SettingsIcon, BookA, BarChart2, LocateFixed, GraduationCap, LayoutGrid, Trophy, Video, Bot, Bell, RotateCcw, AlertTriangle } from 'lucide-react';
import { applyTheme } from './lib/theme';
import {
  Commitment,
  findScheduleConflicts,
  getLocalDayKey,
  parseTimeToMinutes,
  formatMinutesToHHMM,
  getCommitmentWindow,
} from './lib/schedule';

export default function App() {
  const isPillOnlyWindow = typeof window !== 'undefined' && window.location.hash.includes('pill');
  const isCompanionWindow = typeof window !== 'undefined' && window.location.hash.includes('companion');
  const isOverlayWindow = isPillOnlyWindow || isCompanionWindow;

  useEffect(() => {
    if (isOverlayWindow) {
      document.documentElement.classList.add('pill-window');
      document.body.classList.add('pill-window');
      document.body.classList.remove('bg-vq-cream');
      document.body.style.backgroundColor = 'transparent';
      document.body.style.background = 'transparent';
      if (document.documentElement) {
        document.documentElement.style.backgroundColor = 'transparent';
        document.documentElement.style.background = 'transparent';
      }
      if (isPillOnlyWindow) {
        safeInvoke('show_pill_window');
        safeInvoke('clamp_pill_position_cmd');
      } else if (isCompanionWindow) {
        safeInvoke('show_companion_window');
      }
    }
  }, [isOverlayWindow, isPillOnlyWindow, isCompanionWindow]);

  const [activeTab, setActiveTab] = useState<'home' | 'meetings' | 'utilities' | 'train' | 'quests' | 'insights' | 'models' | 'dictionary' | 'history' | 'settings'>('home');
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    default_model_id: 'whisper-base-en-q5_1',
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
    theme: 'light',
  });

  // Enforce Sovereign Warm Linen light theme & apply saved desktop overlay mode
  useEffect(() => {
    applyTheme('light');
    if (!isOverlayWindow) {
      try {
        const mode = localStorage.getItem('voxquest_desktop_overlay_mode');
        if (mode === 'robot' || mode === 'pill' || mode === 'both') {
          safeInvoke('set_overlay_mode_cmd', { mode });
        }
      } catch {}
    }
  }, [isOverlayWindow]);
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
  const [updateAvailableVersion, setUpdateAvailableVersion] = useState<string | null>(null);
  const [reminderAlert, setReminderAlert] = useState<{ title: string; message: string } | null>(null);

  const [activeReminder, setActiveReminder] = useState<{ label: string; timeStr?: string; dateStr?: string } | null>(() => {
    try {
      const s = localStorage.getItem('voxquest_active_reminder_alert');
      if (s) return JSON.parse(s);
    } catch {}
    return null;
  });
  const [scheduleConflict, setScheduleConflict] = useState<{
    newItem: Commitment;
    conflictingWith: Commitment;
  } | null>(null);

  // Repeating Alarm Safety: if a due reminder has not been snoozed or marked Done,
  // re-ring the macOS alarm chime & notification every 45 seconds so it is never missed.
  useEffect(() => {
    if (isOverlayWindow || !activeReminder) return;
    const repeatTimer = setInterval(() => {
      safeInvoke('send_system_notification_cmd', {
        title: '⏰ Reminder Still Due',
        message: `${activeReminder.label} — Click Remind in 15m or Done`,
      });
    }, 45000);
    return () => clearInterval(repeatTimer);
  }, [isOverlayWindow, activeReminder]);

  const handleSnoozeReminder = (mins: number) => {
    if (!activeReminder) return;
    const taskLabel = activeReminder.label.trim();
    const now = new Date(Date.now() + mins * 60000);
    const newTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    try {
      const stored = localStorage.getItem('voxquest_marked_calendar_dates');
      if (stored) {
        const list = JSON.parse(stored);
        const updated = list.map((item: any) => {
          if (item.label?.trim() === taskLabel || item.label?.includes(taskLabel) || taskLabel.includes(item.label)) {
            return {
              ...item,
              timeStr: newTimeStr,
              lastNotifiedDate: undefined,
            };
          }
          return item;
        });
        localStorage.setItem('voxquest_marked_calendar_dates', JSON.stringify(updated));
      }
      localStorage.removeItem('voxquest_active_reminder_alert');
    } catch {}

    setActiveReminder(null);
    window.dispatchEvent(new Event('voxquest-utility-updated'));
  };

  const handleDismissReminder = () => {
    if (!activeReminder) return;
    const taskLabel = activeReminder.label.trim();
    try {
      const stored = localStorage.getItem('voxquest_marked_calendar_dates');
      if (stored) {
        const list = JSON.parse(stored);
        const updated = list.map((item: any) => {
          if (item.label?.trim() === taskLabel || item.label?.includes(taskLabel) || taskLabel.includes(item.label)) {
            return {
              ...item,
              reminderEnabled: false,
            };
          }
          return item;
        });
        localStorage.setItem('voxquest_marked_calendar_dates', JSON.stringify(updated));
      }
      localStorage.removeItem('voxquest_active_reminder_alert');
    } catch {}

    setActiveReminder(null);
    window.dispatchEvent(new Event('voxquest-utility-updated'));
  };

  // Global Background Reminder Checker & Voice Utility Sync (runs even when Utilities tab is closed)
  useEffect(() => {
    if (isOverlayWindow) return;

    const toLocalYmd = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const onUtilSync = () => {
      try {
        const s = localStorage.getItem('voxquest_active_reminder_alert');
        setActiveReminder(s ? JSON.parse(s) : null);
      } catch {}
    };
    window.addEventListener('voxquest-utility-updated', onUtilSync);

    const checkReminders = () => {
      try {
        const stored = localStorage.getItem('voxquest_marked_calendar_dates');
        if (!stored) return;
        const items: Array<{
          dateStr: string;
          label: string;
          timeStr?: string;
          reminderEnabled?: boolean;
          lastNotifiedDate?: string;
        }> = JSON.parse(stored);
        const now = new Date();
        const todayStr = toLocalYmd(now);
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        let changed = false;
        const updated = items.map((item) => {
          if (item.dateStr === todayStr && item.reminderEnabled !== false && item.label?.trim()) {
            if (item.lastNotifiedDate === todayStr) return item;
            const targetTime = item.timeStr || '09:00';
            if (currentTime >= targetTime) {
              const alertData = {
                title: 'VoxQuest Task Reminder',
                message: `Task Due: ${item.label}`,
                label: item.label,
                timeStr: item.timeStr || targetTime,
                dateStr: item.dateStr,
              };
              setActiveReminder(alertData);
              try {
                localStorage.setItem('voxquest_active_reminder_alert', JSON.stringify(alertData));
              } catch {}
              safeInvoke('send_system_notification_cmd', {
                title: 'VoxQuest Task Reminder',
                message: `Task Due: ${item.label}`,
              });
              changed = true;
              return { ...item, lastNotifiedDate: todayStr };
            }
          }
          return item;
        });
        if (changed) {
          localStorage.setItem('voxquest_marked_calendar_dates', JSON.stringify(updated));
          window.dispatchEvent(new Event('voxquest-utility-updated'));
        }
      } catch {}
    };

    checkReminders();
    const timer = setInterval(checkReminders, 5000);

    let unlistenUtility: (() => void) | undefined;
    safeListen<{
      kind: 'reminder' | 'schedule' | 'timer' | 'system_clean' | 'system_scan' | 'navigate' | 'language';
      label: string;
      time_str?: string | null;
      offset_minutes?: number | null;
      day_offset?: number | null;
      duration_min?: number | null;
      duration_sec?: number | null;
    }>('voxquest-voice-utility', async (e) => {
      const payload = e.payload;
      if (!payload) return;
      try {
        const now = new Date();
        if (payload.kind === 'reminder') {
          const offsetMs = payload.duration_sec
            ? payload.duration_sec * 1000
            : payload.offset_minutes
            ? payload.offset_minutes * 60000
            : 0;
          const targetDate = offsetMs > 0 ? new Date(now.getTime() + offsetMs) : new Date(now.getTime());
          if (payload.day_offset && payload.day_offset > 0) {
            targetDate.setDate(targetDate.getDate() + payload.day_offset);
          }
          const dateStr = toLocalYmd(targetDate);
          const timeStr =
            payload.time_str ||
            `${String(targetDate.getHours()).padStart(2, '0')}:${String(targetDate.getMinutes()).padStart(2, '0')}`;
          const stored = localStorage.getItem('voxquest_marked_calendar_dates');
          const list = stored ? JSON.parse(stored) : [];
          list.push({
            dateStr,
            label: payload.label,
            createdAt: Date.now(),
            timeStr,
            reminderEnabled: true,
          });
          localStorage.setItem('voxquest_marked_calendar_dates', JSON.stringify(list));
          if (offsetMs > 0) {
            localStorage.setItem(
              'voxquest_active_timer',
              JSON.stringify({
                endAt: Date.now() + offsetMs,
                label: payload.label,
              })
            );
            window.dispatchEvent(new Event('voxquest-timer-sync'));
            if (offsetMs <= 86400000) {
              setTimeout(() => {
                const alertData = {
                  title: 'VoxQuest Task Reminder',
                  message: `Task Due: ${payload.label}`,
                  label: payload.label,
                  timeStr,
                  dateStr,
                };
                setActiveReminder(alertData);
                try {
                  localStorage.setItem('voxquest_active_reminder_alert', JSON.stringify(alertData));
                } catch {}
                safeInvoke('send_system_notification_cmd', {
                  title: '⏰ VoxQuest Task Reminder',
                  message: `Task Due: ${payload.label}`,
                });
                window.dispatchEvent(new Event('voxquest-utility-updated'));
              }, offsetMs);
            }
          }
          window.dispatchEvent(new Event('voxquest-utility-updated'));
          safeInvoke('send_system_notification_cmd', {
            title: 'Reminder Set',
            message: `${payload.label} (${dateStr} at ${timeStr})`,
          });
        } else if (payload.kind === 'schedule') {
          const durationMins = payload.duration_min || 30;
          const rawTimeStr =
            payload.time_str ||
            `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          const stored = localStorage.getItem('voxquest_saved_commitments');
          const list: Commitment[] = stored ? JSON.parse(stored) : [];
          const isZoom = payload.label.toLowerCase().includes('zoom');
          const dayOffset = payload.day_offset === 1 ? 1 : 0;
          const dayPrefix = dayOffset === 1 ? 'Tomorrow' : 'Today';
          const dayKey = getLocalDayKey(dayOffset);
          const startMinutes =
            parseTimeToMinutes(rawTimeStr) ?? now.getHours() * 60 + now.getMinutes();

          const newCommitment: Commitment = {
            id: `voice-${Date.now()}`,
            title: payload.label,
            platform: isZoom ? 'Zoom' : 'Google Meet',
            url: isZoom ? 'https://zoom.us/new' : 'https://meet.google.com/new',
            durationMins,
            timeStr: `${dayPrefix} • ${rawTimeStr}`,
            dayKey,
            startMinutes,
          };

          const conflicts = findScheduleConflicts(newCommitment, list);
          list.unshift(newCommitment);
          localStorage.setItem('voxquest_saved_commitments', JSON.stringify(list));
          window.dispatchEvent(new Event('voxquest-utility-updated'));

          if (conflicts.length > 0) {
            setScheduleConflict({ newItem: newCommitment, conflictingWith: conflicts[0] });
            safeInvoke('send_system_notification_cmd', {
              title: '⚠️ Schedule Conflict Detected',
              message: `"${payload.label}" (${rawTimeStr}) overlaps with "${conflicts[0].title}" (${conflicts[0].timeStr})`,
            });
          } else {
            safeInvoke('send_system_notification_cmd', {
              title: 'Schedule Added',
              message: `${payload.label} (${dayPrefix} at ${rawTimeStr})`,
            });
          }
        } else if (payload.kind === 'timer') {
          const action = payload.label === 'pause' || payload.label === 'reset' ? payload.label : 'start';
          const totalSecs =
            payload.duration_sec ??
            (payload.duration_min ? payload.duration_min * 60 : undefined);
          if (action === 'start') {
            const effectiveSecs = totalSecs || 25 * 60;
            localStorage.setItem(
              'voxquest_active_timer',
              JSON.stringify({ endAt: Date.now() + effectiveSecs * 1000, label: 'Timer' })
            );
            window.dispatchEvent(new Event('voxquest-timer-sync'));
          } else {
            localStorage.removeItem('voxquest_active_timer');
            window.dispatchEvent(new Event('voxquest-timer-sync'));
          }
          window.dispatchEvent(
            new CustomEvent('voxquest-timer-command', {
              detail: {
                action,
                minutes: payload.duration_min || undefined,
                seconds: totalSecs,
              },
            })
          );
          safeInvoke('send_system_notification_cmd', {
            title: 'Focus Timer',
            message:
              action === 'start'
                ? totalSecs && totalSecs < 60
                  ? `Started (${totalSecs}s)`
                  : payload.duration_min
                  ? `Started (${payload.duration_min}m)`
                  : 'Started'
                : action === 'pause'
                ? 'Paused'
                : 'Reset',
          });
        } else if (payload.kind === 'system_clean') {
          localStorage.setItem('voxquest_cleaning_active', 'true');
          try {
            const res = await safeInvoke<{ ram_reclaimed_mb: number; disk_cache_cleared_mb: number }>('run_system_clean_and_boost_cmd');
            safeInvoke('send_system_notification_cmd', {
              title: 'System Boost Complete',
              message: `+${res.ram_reclaimed_mb} MB RAM · +${res.disk_cache_cleared_mb} MB Cache cleared`,
            });
          } finally {
            setTimeout(() => localStorage.removeItem('voxquest_cleaning_active'), 2600);
          }
        } else if (payload.kind === 'system_scan') {
          const findings = await safeInvoke<Array<{ size_mb: number }>>('scan_mac_storage_cmd');
          const totalMb = findings.reduce((sum, f) => sum + (f.size_mb || 0), 0);
          safeInvoke('send_system_notification_cmd', {
            title: 'Storage Scan Complete',
            message: `${totalMb} MB reclaimable cache detected`,
          });
        } else if (payload.kind === 'navigate') {
          const tab = payload.label as 'home' | 'meetings' | 'utilities' | 'train' | 'quests' | 'insights' | 'models' | 'dictionary' | 'history' | 'settings';
          setActiveTab(tab);
          await safeInvoke('show_main_window');
        } else if (payload.kind === 'language') {
          setSettings((prev) => {
            const updated = { ...prev, language: payload.label };
            safeInvoke('save_settings_cmd', { newSettings: updated });
            return updated;
          });
          safeInvoke('send_system_notification_cmd', {
            title: 'Language Updated',
            message: `Switched to ${payload.label}`,
          });
        }
      } catch {}
    }).then((fn) => {
      unlistenUtility = fn;
    });

    let unlistenAlert: (() => void) | undefined;
    safeListen<{ title: string; message: string }>('voxquest-reminder-alert', (e) => {
      if (!e.payload) return;
      setReminderAlert(e.payload);
      // Stays visible persistently until user snoozes or dismisses
    }).then((fn) => {
      unlistenAlert = fn;
    });

    return () => {
      clearInterval(timer);
      window.removeEventListener('voxquest-utility-updated', onUtilSync);
      if (unlistenUtility) unlistenUtility();
      if (unlistenAlert) unlistenAlert();
    };
  }, [isOverlayWindow]);

  useEffect(() => {
    if (isOverlayWindow) return;
    const timer = setTimeout(async () => {
      try {
        const { checkForAppUpdates } = await import('./lib/updater');
        const res = await checkForAppUpdates();
        if ((res.available || res.downloaded) && res.version) {
          setUpdateAvailableVersion(res.version);
        }
      } catch (err) {
        // silent check on startup
      }
    }, 4500);
    return () => clearTimeout(timer);
  }, [isOverlayWindow]);

  useEffect(() => {
    if (isOverlayWindow) {
      document.body.style.backgroundColor = 'transparent';
      document.documentElement.style.backgroundColor = 'transparent';
    }
  }, [isOverlayWindow]);

  // Elapsed timer ticker during recording
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (session.state === 'recording' && session.session_id && session.session_id.length > 0) {
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
  }, [session.state, session.session_id]);

  useEffect(() => {
    if (isOverlayWindow) {
      // In dedicated overlay windows (pill / desktop companion), only listen to push session updates
      const sessionPromise = safeListen<SessionSnapshot>('dictation-session-changed', (e) => {
        setSession(e.payload);
      });
      return () => {
        sessionPromise.then((fn) => fn && fn());
      };
    }

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
        }, 1200);
      }
    });

    // Listen for automatic external edits synced back from destination apps (e.g. TextEdit)
    const destSyncPromise = safeListen<{ history_id: number; app_name: string; updated_text: string }>('destination-edit-synced', (_e) => {
      loadHistory();
      loadInsights();
    });

    return () => {
      progPromise.then((fn) => fn && fn());
      compPromise.then((fn) => fn && fn());
      sessionPromise.then((fn) => fn && fn());
      destSyncPromise.then((fn) => fn && fn());
    };
  }, [isPillOnlyWindow]);

  useEffect(() => {
    if (activeTab === 'insights') {
      loadInsights();
    }
  }, [activeTab]);

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
        const fallback = downloaded.find(m => m.id === 'whisper-base-en-q5_1') || downloaded[0];
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
        applyTheme('light');
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
    applyTheme('light');
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
    if (session.state === 'idle' || session.state === 'completed') {
      setSession((prev) => ({
        ...prev,
        state: 'recording',
        message: 'Listening naturally across all windows... Press shortcut or click pill to finish.',
        elapsed_seconds: 0.0,
      }));
    }
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

  if (isCompanionWindow) {
    return (
      <DesktopCompanion
        status={session}
        onToggleDictation={handleToggleDictation}
      />
    );
  }

  if (isPillOnlyWindow) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-transparent select-none overflow-visible">
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
    <div className="flex h-screen bg-cream dark:bg-darkTealCanvas text-charcoal dark:text-cream overflow-hidden font-sans">
      {/* Left Sidebar (Responsive Width: compact on small screens, full on desktop) */}
      <aside className="w-16 sm:w-20 md:w-56 bg-[#EBEBE4] dark:bg-darkTealSurface border-r border-[#D1D1C5] dark:border-darkTealBorder flex flex-col justify-between p-2 sm:p-3 md:p-4 select-none shrink-0 h-full transition-all">
        <div className="space-y-4 md:space-y-6">
          {/* Logo / Brand Header */}
          <div className="flex items-center justify-center md:justify-start gap-2.5 px-1 md:px-2 pt-1">
            <Mascot size={32} />
            <div className="hidden md:block">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-darkTeal dark:text-white tracking-wide">VOXQUEST</span>
                <span className="w-2 h-2 rounded-full bg-amber animate-pulse" />
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {[
              { id: 'home', label: 'Home', icon: Home },
              { id: 'meetings', label: 'Meetings', icon: Video },
              { id: 'utilities', label: 'Utilities', icon: LayoutGrid },
              { id: 'train', label: 'Train the Model', icon: GraduationCap },
              { id: 'quests', label: 'Quests & Badges', icon: Trophy },
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
                  className={`w-full flex items-center justify-center md:justify-between px-2.5 md:px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative cursor-pointer ${isActive
                    ? 'bg-darkTeal dark:bg-[#0D6E67] text-white shadow-sm border border-transparent dark:border-[#34A89E]/40'
                    : 'text-charcoal hover:text-darkTeal hover:bg-black/5 dark:text-[#DFDFD4] dark:hover:text-white dark:hover:bg-white/10'
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber' : 'text-charcoal/80 dark:text-[#DFDFD4]/80'}`} />
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
        <div className="space-y-2 pt-3 border-t border-charcoal/15 dark:border-darkTealBorder">
          <button
            onClick={() => safeInvoke('center_pill_window')}
            className="w-full flex items-center justify-center gap-1.5 px-2 md:px-3 py-2 text-xs font-semibold rounded-xl border border-charcoal/20 dark:border-darkTealBorder bg-white dark:bg-darkTealElevated !text-darkTeal dark:!text-cream hover:bg-darkTeal dark:hover:bg-darkTealAccent hover:!text-white transition-all shadow-xs active:scale-95 cursor-pointer"
            title="Summon the floating pill to the front of your screen"
          >
            <LocateFixed className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">Summon Pill</span>
          </button>

          <button
            onClick={() => safeInvoke('show_companion_window')}
            className="w-full flex items-center justify-center gap-1.5 px-2 md:px-3 py-2 text-xs font-semibold rounded-xl border border-charcoal/20 dark:border-darkTealBorder bg-white dark:bg-darkTealElevated !text-darkTeal dark:!text-cream hover:bg-darkTeal dark:hover:bg-darkTealAccent hover:!text-white transition-all shadow-xs active:scale-95 cursor-pointer"
            title="Summon VoxBot desktop companion"
          >
            <Bot className="w-3.5 h-3.5 shrink-0 text-amber" />
            <span className="hidden md:inline">Summon VoxBot</span>
          </button>

          <div className="hidden md:flex px-1 items-center justify-between text-[10px] text-charcoal/70 dark:text-sage font-medium">
            <span className="flex items-center gap-1 font-semibold text-darkTeal dark:text-cream">
              <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" /> 100% Offline
            </span>
            <span className="font-mono">v0.1.0</span>
          </div>
        </div>
      </aside>

      {/* Main Tab Content (Fluid Responsive Padding) */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 bg-cream dark:bg-darkTealCanvas">
        <div className="max-w-5xl mx-auto w-full">
          {updateAvailableVersion && (
            <div className="mb-4 p-3 bg-darkTeal text-white rounded-xl shadow-xs flex items-center justify-between gap-3 text-xs font-semibold animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber animate-pulse" />
                <span>VoxQuest v{updateAvailableVersion} update is ready to install!</span>
              </div>
              <button
                type="button"
                onClick={() => import('./lib/updater').then((m) => m.relaunchToApplyUpdate())}
                className="px-3 py-1 bg-white text-darkTeal rounded-lg text-xs font-bold hover:bg-neutral-100 transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                Restart to Apply
              </button>
            </div>
          )}

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

          {activeTab === 'meetings' && <MeetingAssistantTab />}

          {activeTab === 'utilities' && (
            <UtilitiesTab
              session={session}
              onCopy={handleCopy}
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

          {activeTab === 'train' && (
            <TrainModelTab
              session={session}
              onToggleDictation={handleToggleDictation}
              onNavigateTab={(tab) => setActiveTab(tab as any)}
            />
          )}

          {activeTab === 'quests' && (
            <QuestsTab
              insights={insights}
              history={history}
              onNavigateTab={(tab) => setActiveTab(tab)}
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
                applyTheme('light');
                await safeInvoke('save_settings_cmd', { newSettings });
              }}
            />
          )}
        </div>
      </main>

      {/* Global In-App Reminder / Schedule Notification Card (Persistent until user acts) */}
      {!isOverlayWindow && (reminderAlert || activeReminder) && (
        <div className="fixed top-5 right-5 z-50 w-80 bg-[#FFFDF7] dark:bg-[#1A2628] border-2 border-amber dark:border-mint/50 rounded-2xl shadow-2xl p-4 flex flex-col gap-2.5 animate-fadeIn select-none">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-darkTeal dark:text-cream min-w-0">
              <div className="w-7 h-7 rounded-lg bg-amber/30 text-charcoal dark:text-amber flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 text-terracotta animate-bounce" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">
                  {(reminderAlert?.message || activeReminder?.label || 'Task Due').replace('Task Due Today: ', '').replace('Task Due: ', '')}
                </div>
                <div className="text-[10px] text-charcoal/60 dark:text-sage font-mono">
                  {reminderAlert?.title || (activeReminder?.timeStr ? `Due at ${activeReminder.timeStr}` : 'Action required')}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setReminderAlert(null);
                handleDismissReminder();
              }}
              className="text-charcoal/40 hover:text-charcoal dark:text-sage dark:hover:text-cream p-1 cursor-pointer"
              title="Dismiss"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-charcoal/10 dark:border-darkTealBorder">
            <button
              type="button"
              onClick={() => {
                setReminderAlert(null);
                handleSnoozeReminder(15);
              }}
              className="flex-1 py-1.5 px-2.5 rounded-xl bg-darkTeal hover:bg-darkTeal/90 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all"
              title="Snooze and remind again in 15 minutes"
            >
              <RotateCcw className="w-3 h-3 text-amber" />
              <span>Remind in 15m</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setReminderAlert(null);
                handleSnoozeReminder(5);
              }}
              className="py-1.5 px-2 rounded-xl bg-stone-100 dark:bg-darkTealElevated hover:bg-stone-200 text-charcoal dark:text-cream text-xs font-bold border border-charcoal/15 dark:border-darkTealBorder cursor-pointer transition-all"
              title="Snooze for 5 minutes"
            >
              +5m
            </button>
            <button
              type="button"
              onClick={() => {
                setReminderAlert(null);
                handleDismissReminder();
              }}
              className="py-1.5 px-3 rounded-xl bg-terracotta/15 hover:bg-terracotta/25 text-terracotta text-xs font-bold border border-terracotta/20 cursor-pointer transition-all"
              title="Mark Done"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Interactive Schedule Conflict Warning Card */}
      {!isOverlayWindow && scheduleConflict && (
        <div className="fixed bottom-5 right-5 z-50 w-84 bg-[#FFFDF7] dark:bg-[#1A2628] border-2 border-terracotta rounded-2xl shadow-2xl p-4 flex flex-col gap-2.5 animate-fadeIn select-none">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-charcoal dark:text-cream min-w-0">
              <div className="w-7 h-7 rounded-lg bg-terracotta/15 text-terracotta flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-terracotta">Schedule Conflict Detected</div>
                <div className="text-[11px] text-charcoal/80 dark:text-sage leading-snug mt-0.5">
                  <strong>{scheduleConflict.newItem.title}</strong> ({scheduleConflict.newItem.timeStr}) overlaps with{' '}
                  <strong>{scheduleConflict.conflictingWith.title}</strong> ({scheduleConflict.conflictingWith.timeStr}).
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setScheduleConflict(null)}
              className="text-charcoal/40 hover:text-charcoal dark:text-sage dark:hover:text-cream p-1 cursor-pointer"
              title="Close"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-charcoal/10 dark:border-darkTealBorder">
            <button
              type="button"
              onClick={() => {
                try {
                  const win = getCommitmentWindow(scheduleConflict.conflictingWith);
                  const nextStart = win ? win.end : (scheduleConflict.newItem.startMinutes ?? 720) + 30;
                  const nextHHMM = formatMinutesToHHMM(nextStart);
                  const dayLabel = scheduleConflict.newItem.timeStr.includes('Tomorrow') ? 'Tomorrow' : 'Today';
                  const stored = localStorage.getItem('voxquest_saved_commitments');
                  const list: Commitment[] = stored ? JSON.parse(stored) : [];
                  const updated = list.map((c) =>
                    c.id === scheduleConflict.newItem.id
                      ? { ...c, startMinutes: nextStart, timeStr: `${dayLabel} • ${nextHHMM}` }
                      : c
                  );
                  localStorage.setItem('voxquest_saved_commitments', JSON.stringify(updated));
                  window.dispatchEvent(new Event('voxquest-utility-updated'));
                } catch {}
                setScheduleConflict(null);
              }}
              className="flex-1 py-1.5 px-2.5 rounded-xl bg-darkTeal hover:bg-darkTeal/90 text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Shift After
            </button>
            <button
              type="button"
              onClick={() => setScheduleConflict(null)}
              className="py-1.5 px-2.5 rounded-xl bg-stone-100 dark:bg-darkTealElevated hover:bg-stone-200 text-charcoal dark:text-cream text-xs font-bold border border-charcoal/15 dark:border-darkTealBorder cursor-pointer"
            >
              Keep Both
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  const stored = localStorage.getItem('voxquest_saved_commitments');
                  const list: Commitment[] = stored ? JSON.parse(stored) : [];
                  const updated = list.filter((c) => c.id !== scheduleConflict.newItem.id);
                  localStorage.setItem('voxquest_saved_commitments', JSON.stringify(updated));
                  window.dispatchEvent(new Event('voxquest-utility-updated'));
                } catch {}
                setScheduleConflict(null);
              }}
              className="py-1.5 px-2.5 rounded-xl bg-terracotta/15 hover:bg-terracotta/25 text-terracotta text-xs font-bold border border-terracotta/20 cursor-pointer"
            >
              Remove
            </button>
          </div>
        </div>
      )}

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
