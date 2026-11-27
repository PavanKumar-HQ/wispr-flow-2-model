import React, { useState, useEffect, useRef } from 'react';
import { Bell, Mic, MapPin, Footprints, AppWindow, X, Moon, Music, Smile, RotateCcw } from 'lucide-react';
import { VoxBotFullBody, VoxBotPose, VoxBotVisorStatus } from './VoxBotFullBody';
import { SessionSnapshot, NowPlayingInfo } from '../types';
import { safeInvoke, safeListen } from '../lib/ipc';
import { getCurrentWindow, LogicalPosition, currentMonitor } from '@tauri-apps/api/window';

interface DesktopCompanionProps {
  status: SessionSnapshot;
  onToggleDictation: () => void;
}

const MOUSE_REST_SLEEP_MS = 45000; // Stay active and roaming for 45s before taking a nap

/**
 * Autonomous, Battery-Friendly Desktop Companion Window (VoxBot).
 * - Anchored by default: stays right where you place it without window jitter.
 * - Active gaze tracking: eyes and head follow your cursor with zero latency.
 * - Right-click context menu: 1-click dock, mood/pose changer, and roam toggle.
 * - Single click on chest core: starts/stops dictation; drag (>5px): moves window smoothly.
 */
export const DesktopCompanion: React.FC<DesktopCompanionProps> = ({
  status,
  onToggleDictation,
}) => {
  const [autoPose, setAutoPose] = useState<'idle' | 'walk' | 'fly' | 'sit' | 'sleep' | 'dance'>('idle');
  const [facing, setFacing] = useState<'left' | 'right'>('right');
  const [gaze, setGaze] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const [showSuccessFlash, setShowSuccessFlash] = useState<boolean>(false);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [reminderAlert, setReminderAlert] = useState<{ title: string; message: string; label?: string; timeStr?: string } | null>(() => {
    try {
      const s = localStorage.getItem('voxquest_active_reminder_alert');
      if (s) return JSON.parse(s);
    } catch {}
    return null;
  });

  const handleSnooze = (mins: number) => {
    if (!reminderAlert) return;
    const taskLabel = reminderAlert.label || reminderAlert.message.replace('Task Due Today: ', '').replace('Task Due: ', '').trim();
    const triggerAtMs = Date.now() + mins * 60000;
    const now = new Date(triggerAtMs);
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
              triggerAtMs,
              lastNotifiedDate: undefined,
            };
          }
          return item;
        });
        localStorage.setItem('voxquest_marked_calendar_dates', JSON.stringify(updated));
      }
      localStorage.removeItem('voxquest_active_reminder_alert');
      localStorage.setItem(
        'voxquest_active_timer',
        JSON.stringify({ endAt: Date.now() + mins * 60000, label: taskLabel })
      );
      window.dispatchEvent(new Event('voxquest-timer-sync'));
    } catch {}

    setReminderAlert(null);
    window.dispatchEvent(new Event('voxquest-utility-updated'));
    setActionToast(`Snoozed +${mins}m (${newTimeStr})`);
    setTimeout(() => setActionToast(null), 3000);
  };

  const handleDismissAlert = () => {
    if (!reminderAlert) return;
    const taskLabel = reminderAlert.label || reminderAlert.message.replace('Task Due Today: ', '').replace('Task Due: ', '').trim();
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

    setReminderAlert(null);
    window.dispatchEvent(new Event('voxquest-utility-updated'));
    setActionToast('Reminder dismissed');
    setTimeout(() => setActionToast(null), 2000);
  };
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [transcribeSecs, setTranscribeSecs] = useState<number>(0);

  useEffect(() => {
    if (status.state !== 'transcribing' && status.state !== 'formatting') {
      setTranscribeSecs(0);
      return;
    }
    const start = Date.now();
    const t = setInterval(() => {
      setTranscribeSecs(Math.floor((Date.now() - start) / 1000));
    }, 500);
    return () => clearInterval(t);
  }, [status.state]);
  const [visorStatus, setVisorStatus] = useState<VoxBotVisorStatus>({ mode: 'normal' });
  const [showContextMenu, setShowContextMenu] = useState<boolean>(false);
  const [freeRoam, setFreeRoam] = useState<boolean>(() => {
    try {
      return localStorage.getItem('voxquest_bot_freeroam') !== 'false';
    } catch {
      return true;
    }
  });

  const lastSessionIdRef = useRef<string | null>(null);
  const lastCursorRef = useRef<{ x: number; y: number; movedAt: number }>({
    x: -1,
    y: -1,
    movedAt: Date.now(),
  });
  const walkVecRef = useRef<{ vx: number; vy: number }>({ vx: -2.0, vy: -0.9 });
  const poseIdxRef = useRef<number>(0);
  const isSleeping = autoPose === 'sleep';

  // Close context menu on outside click
  useEffect(() => {
    if (!showContextMenu) return;
    const handleOutsideClick = () => setShowContextMenu(false);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [showContextMenu]);

  // Toggle free roam preference
  const toggleFreeRoam = () => {
    const next = !freeRoam;
    setFreeRoam(next);
    try {
      localStorage.setItem('voxquest_bot_freeroam', String(next));
    } catch {}
  };

  // Reset companion position to bottom-right corner
  const handleDockBottomRight = async () => {
    setShowContextMenu(false);
    try {
      const win = getCurrentWindow();
      const mon = await currentMonitor();
      if (!mon) return;
      const scale = mon.scaleFactor || 1;
      const screenW = mon.size.width / scale;
      const screenH = mon.size.height / scale;
      const x = Math.max(20, screenW - 190);
      const y = Math.max(44, screenH - 255);
      await win.setPosition(new LogicalPosition(x, y));
    } catch {}
  };

  // Brief celebration & action confirmation bubble when a transcription/command completes
  useEffect(() => {
    if (
      (status.state === 'completed' || status.state === 'recovery_required') &&
      status.session_id &&
      status.session_id !== lastSessionIdRef.current
    ) {
      lastSessionIdRef.current = status.session_id;
      setShowSuccessFlash(true);
      const msg = status.message || '';
      if (
        msg.startsWith('Playing') ||
        msg.startsWith('Searching') ||
        msg.startsWith('Opened')
      ) {
        setActionToast(msg.length > 26 ? `${msg.slice(0, 24)}…` : msg);
      }
      const timer = setTimeout(() => {
        setShowSuccessFlash(false);
        setActionToast(null);
      }, 2400);
      return () => clearTimeout(timer);
    }
  }, [status.state, status.session_id, status.message]);

  // Natural blinking when awake
  useEffect(() => {
    if (status.state === 'transcribing' || (autoPose === 'sleep' && !isHovered)) return;
    const blinkInterval = setInterval(() => {
      if (document.hidden) return;
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, 4200);
    return () => clearInterval(blinkInterval);
  }, [status.state, autoPose, isHovered]);

  // Detect live audio playback (YouTube, Instagram, Spotify, Apple Music) via CoreAudio + IPC
  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    safeListen<NowPlayingInfo | null>('now-playing-changed', (e) => {
      if (!cancelled && e.payload) {
        setIsMusicPlaying(Boolean(e.payload.is_playing));
      }
    }).then((fn) => {
      unlisten = fn;
    });

    const checkAudio = async () => {
      if (cancelled || document.hidden || status.state !== 'idle') return;
      try {
        const playing = await safeInvoke<boolean>('is_system_audio_playing');
        if (!cancelled) {
          setIsMusicPlaying((prev) => (prev === Boolean(playing) ? prev : Boolean(playing)));
        }
      } catch {}
    };

    checkAudio();
    const timer = setInterval(checkAudio, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
      if (unlisten) unlisten();
    };
  }, [status.state]);

  // Show persistent reminder card above VoxBot with Snooze / Done actions
  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    
    safeListen<{ title: string; message: string; label?: string; timeStr?: string }>('voxquest-reminder-alert', (e) => {
      if (cancelled || !e.payload) return;
      const t = e.payload.title || '';
      const isDueOrComplete =
        t.includes('Task Reminder') ||
        t.includes('Reminder Still Due') ||
        t.includes('Timer Complete') ||
        e.payload.message?.includes('Task Due');
      if (!isDueOrComplete) return;
      setReminderAlert(e.payload);
      try {
        localStorage.setItem('voxquest_active_reminder_alert', JSON.stringify(e.payload));
      } catch {}
    }).then((fn) => {
      unlisten = fn;
    });

    const onUtilityUpdated = () => {
      try {
        const storedAlert = localStorage.getItem('voxquest_active_reminder_alert');
        if (!storedAlert) {
          setReminderAlert(null);
        } else {
          setReminderAlert(JSON.parse(storedAlert));
        }
      } catch {}
    };
    window.addEventListener('voxquest-utility-updated', onUtilityUpdated);
    window.addEventListener('storage', onUtilityUpdated);

    const checkReminders = () => {
      try {
        const stored = localStorage.getItem('voxquest_marked_calendar_dates');
        if (!stored) return;
        const items: Array<{
          dateStr: string;
          label: string;
          timeStr?: string;
          triggerAtMs?: number;
          reminderEnabled?: boolean;
          lastNotifiedDate?: string;
        }> = JSON.parse(stored);
        const now = new Date();
        const nowMs = now.getTime();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        let changed = false;
        const updated = items.map((item) => {
          if (item.dateStr === todayStr && item.reminderEnabled !== false && item.label?.trim()) {
            if (item.lastNotifiedDate === todayStr) return item;
            const targetTime = item.timeStr || '09:00';
            const isDue = item.triggerAtMs ? nowMs >= item.triggerAtMs : currentTime >= targetTime;
            if (isDue) {
              const alertData = {
                title: 'VoxQuest Task Reminder',
                message: `Task Due: ${item.label}`,
                label: item.label,
                timeStr: item.timeStr || targetTime,
              };
              setReminderAlert(alertData);
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
    const timer = setInterval(checkReminders, 3000);

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('voxquest-utility-updated', onUtilityUpdated);
      window.removeEventListener('storage', onUtilityUpdated);
      if (unlisten) unlisten();
    };
  }, []);

  // Low-power gaze & mouse-rest sleep/wake detector (~4Hz awake, ~2Hz sleeping)
  useEffect(() => {
    if (status.state === 'transcribing') {
      setGaze({ x: 0, y: 0 });
      return;
    }

    let cancelled = false;
    const pollMs = isSleeping && !isHovered ? 360 : 80;

    const pollGaze = async () => {
      if (cancelled || document.hidden) return;
      try {
        const res = await safeInvoke<[number, number, number, number]>('get_companion_gaze');
        if (cancelled || !Array.isArray(res) || res.length < 4) return;
        const [gx, gy, cx, cy] = res;
        const now = Date.now();
        const moved =
          Math.abs(cx - lastCursorRef.current.x) > 2 ||
          Math.abs(cy - lastCursorRef.current.y) > 2;

        if (moved) {
          lastCursorRef.current = { x: cx, y: cy, movedAt: now };
          if (isSleeping && status.state === 'idle') {
            setAutoPose('idle');
          }
        } else if (
          status.state === 'idle' &&
          !isHovered &&
          !isMusicPlaying &&
          !isSleeping &&
          now - lastCursorRef.current.movedAt >= MOUSE_REST_SLEEP_MS
        ) {
          setAutoPose('sleep');
        }

        if (!isSleeping || isHovered) {
          setGaze((prev) =>
            Math.abs(prev.x - gx) < 0.04 && Math.abs(prev.y - gy) < 0.04 ? prev : { x: gx, y: gy }
          );
        } else {
          setGaze((prev) => (prev.x === 0 && prev.y === 0 ? prev : { x: 0, y: 0 }));
        }
      } catch {}
    };

    const timer = setInterval(pollGaze, pollMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [status.state, isSleeping, isHovered, isMusicPlaying]);

  // Sync live timer / reminder countdown & system cleaning effects to VoxBot's face visor
  useEffect(() => {
    const updateVisor = () => {
      try {
        const cleanFlag = localStorage.getItem('voxquest_cleaning_active') === 'true';
        setIsCleaning(cleanFlag);
        if (cleanFlag) {
          setVisorStatus({ mode: 'cleaning' });
          return;
        }

        const rawTimer = localStorage.getItem('voxquest_active_timer');
        if (rawTimer) {
          const parsed = JSON.parse(rawTimer) as { endAt: number; label?: string };
          const remMs = parsed.endAt - Date.now();
          if (remMs > 0) {
            const totalSec = Math.ceil(remMs / 1000);
            const mins = Math.floor(totalSec / 60);
            const secs = totalSec % 60;
            setVisorStatus({
              mode: 'timer',
              timerText: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
              agendaLabel: parsed.label,
            });
            return;
          } else {
            localStorage.removeItem('voxquest_active_timer');
          }
        }
        setVisorStatus({ mode: 'normal' });
      } catch {
        setVisorStatus({ mode: 'normal' });
      }
    };

    updateVisor();
    const timer = setInterval(updateVisor, 1000);
    window.addEventListener('storage', updateVisor);
    window.addEventListener('voxquest-timer-sync', updateVisor);

    return () => {
      clearInterval(timer);
      window.removeEventListener('storage', updateVisor);
      window.removeEventListener('voxquest-timer-sync', updateVisor);
    };
  }, []);

  // Active autonomous behavior while awake: lively walk-centric loop
  useEffect(() => {
    if (status.state !== 'idle' || showSuccessFlash || isHovered || isSleeping || isCleaning) return;

    const sequence: Array<'idle' | 'sit' | 'dance' | 'walk' | 'fly'> = freeRoam
      ? ['walk', 'idle', 'fly', 'dance', 'walk', 'sit', 'fly', 'walk']
      : ['idle', 'sit', 'dance', 'idle'];

    const interval = setInterval(() => {
      if (document.hidden) return;
      poseIdxRef.current = (poseIdxRef.current + 1) % sequence.length;
      const next = sequence[poseIdxRef.current];
      if (freeRoam && next === 'walk') {
        const dir = Math.random() > 0.5 ? 1 : -1;
        walkVecRef.current = { vx: dir * 4.2, vy: 0 };
      } else if (freeRoam && next === 'fly') {
        const angle = Math.random() * Math.PI * 2;
        walkVecRef.current = {
          vx: Math.cos(angle) * 3.6,
          vy: Math.sin(angle) * 2.2,
        };
      }
      setAutoPose(next);
    }, 4500);

    return () => clearInterval(interval);
  }, [status.state, showSuccessFlash, isHovered, isSleeping, isCleaning, freeRoam]);

  const effectiveIdlePose = isHovered && autoPose === 'sleep' ? 'sit' : autoPose;

  const activePose: VoxBotPose =
    isCleaning
      ? 'cleaning'
      : status.state === 'recording'
      ? 'listening'
      : status.state === 'transcribing' || status.state === 'formatting'
      ? 'transcribing'
      : showSuccessFlash
      ? 'success'
      : isMusicPlaying
      ? 'music'
      : effectiveIdlePose;

  // GPU-friendly desktop roaming (ONLY active when freeRoam is explicitly enabled)
  useEffect(() => {
    if (!freeRoam || (activePose !== 'walk' && activePose !== 'fly') || isHovered) return;

    let cancelled = false;
    let cachedBounds: { screenW: number; screenH: number } | null = null;
    let currentPos: { x: number; y: number } | null = null;
    let lastFacing: 'left' | 'right' | null = null;
    let inFlight = false;
    let lastFrameAt = 0;
    let rafId = 0;

    const initAndRun = async () => {
      try {
        const win = getCurrentWindow();
        const mon = await currentMonitor();
        if (!mon || cancelled) return;
        const scale = mon.scaleFactor || 1;
        cachedBounds = {
          screenW: mon.size.width / scale,
          screenH: mon.size.height / scale,
        };
        const pos = await win.outerPosition();
        if (cancelled) return;
        currentPos = { x: pos.x / scale, y: pos.y / scale };

        const tick = (now: number) => {
          if (cancelled) return;
          rafId = requestAnimationFrame(tick);
          if (document.hidden || !cachedBounds || !currentPos) return;
          if (now - lastFrameAt < 48) return; // ~20fps relaxed step interval for silky smooth desktop compositing
          const dt = lastFrameAt ? Math.min((now - lastFrameAt) / 100, 1.2) : 0.35;
          lastFrameAt = now;

          const minX = 24;
          const maxX = Math.max(minX + 40, cachedBounds.screenW - 185);
          const minY = 48;
          const maxY = Math.max(minY + 40, cachedBounds.screenH - 255);

          let nextX = currentPos.x + walkVecRef.current.vx * 1.0 * dt;
          let nextY = currentPos.y + walkVecRef.current.vy * 1.0 * dt;

          if (nextX <= minX) {
            nextX = minX;
            walkVecRef.current.vx = Math.abs(walkVecRef.current.vx);
          } else if (nextX >= maxX) {
            nextX = maxX;
            walkVecRef.current.vx = -Math.abs(walkVecRef.current.vx);
          }

          if (nextY <= minY) {
            nextY = minY;
            walkVecRef.current.vy = Math.abs(walkVecRef.current.vy);
          } else if (nextY >= maxY) {
            nextY = maxY;
            walkVecRef.current.vy = -Math.abs(walkVecRef.current.vy);
          }

          currentPos = { x: nextX, y: nextY };
          const nextFacing = walkVecRef.current.vx >= 0 ? 'right' : 'left';
          if (lastFacing !== nextFacing) {
            lastFacing = nextFacing;
            setFacing(nextFacing);
          }
          if (!inFlight) {
            inFlight = true;
            win.setPosition(new LogicalPosition(nextX, nextY))
              .catch(() => {})
              .finally(() => {
                inFlight = false;
              });
          }
        };

        rafId = requestAnimationFrame(tick);
      } catch {}
    };

    initAndRun();
    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [activePose, isHovered, freeRoam]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // If user clicked the chest core button directly, let its onClick handle toggling without dragging
    if ((e.target as HTMLElement).closest('[data-voxbot-core="true"]')) {
      return;
    }
    // Instant native macOS window dragging on left-click
    try {
      getCurrentWindow().startDragging().catch(() => {});
    } catch {}
  };

  return (
    <div
      className="w-screen h-screen flex flex-col items-center justify-end pb-0.5 pt-1.5 select-none bg-transparent overflow-visible"
      style={{ background: 'transparent' }}
    >
      {/* Tiny Sleek Listening / Transcribing / Action Pill Above Robot (No clipped card) */}
      <div className="h-5 flex items-center justify-center mb-0.5 shrink-0 z-40">
        {status.state === 'recording' ? (
          <div className="px-2 py-[1px] rounded-full text-[8.5px] font-bold tracking-wider uppercase border border-terracotta bg-cream/95 text-terracotta shadow-xs animate-fadeIn flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-terracotta" />
            <span>Listening</span>
          </div>
        ) : status.state === 'transcribing' || status.state === 'formatting' ? (
          <div className="px-2 py-[1px] rounded-full text-[8.5px] font-bold tracking-wider uppercase border border-amber bg-cream/95 text-darkTeal shadow-xs animate-fadeIn flex items-center gap-1.5">
            <span className="w-2 h-2 border-[1.5px] border-darkTeal border-t-transparent rounded-full animate-spin" />
            <span>
              {status.state === 'formatting'
                ? 'Formatting...'
                : transcribeSecs > 0
                ? `Transcribing ${transcribeSecs}s`
                : 'Transcribing...'}
            </span>
          </div>
        ) : actionToast ? (
          <div className="px-2 py-[1px] rounded-full text-[8.5px] font-bold tracking-tight border border-darkTeal/40 bg-cream/95 text-darkTeal shadow-xs animate-fadeIn max-w-[152px] truncate">
            {actionToast}
          </div>
        ) : null}
      </div>

      {/* Interactive Mascot Hitbox with Native Desktop Dragging */}
      <div
        data-tauri-drag-region
        onMouseEnter={() => {
          setIsHovered(true);
          lastCursorRef.current.movedAt = Date.now();
          if (autoPose === 'sleep') setAutoPose('idle');
        }}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={handleMouseDown}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowContextMenu((prev) => !prev);
        }}
        className="relative cursor-grab active:cursor-grabbing hover:scale-[1.03] transition-transform shrink-0 will-change-transform"
        title="Click chest core to dictate • Drag anywhere to move • Right-click for options"
      >
        <VoxBotFullBody
          pose={activePose}
          size={122}
          facing={facing}
          gaze={gaze}
          isHovered={isHovered}
          isBlinking={isBlinking}
          visorStatus={
            visorStatus.mode !== 'normal'
              ? visorStatus
              : reminderAlert
              ? {
                  mode: 'timer',
                  timerText: 'DUE',
                  agendaLabel:
                    reminderAlert.label ||
                    reminderAlert.message
                      .replace('Task Due Today: ', '')
                      .replace('Task Due: ', ''),
                }
              : visorStatus
          }
          onCoreClick={onToggleDictation}
        />

        {/* Sleek Right-Click Floating Quick Menu */}
        {showContextMenu && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute -top-36 left-1/2 -translate-x-1/2 w-44 bg-[#141C1E]/95 backdrop-blur-md border border-[#34A89E]/40 rounded-xl p-1.5 shadow-2xl text-[11px] text-[#E6E2D3] z-50 flex flex-col gap-0.5 animate-fadeIn"
          >
            <div className="flex items-center justify-between px-2 py-1 border-b border-white/10 text-[10px] font-mono uppercase tracking-wider text-[#34A89E]">
              <span>VoxBot Menu</span>
              <button
                type="button"
                onClick={() => setShowContextMenu(false)}
                className="hover:text-white cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {reminderAlert && (
              <div className="px-2 py-1.5 bg-[#1E2B2D] rounded-lg space-y-1 mb-0.5 border border-[#DDA44D]/30">
                <div className="flex items-center gap-1 text-[10px] font-bold text-[#FFD07B] truncate">
                  <Bell className="w-3 h-3 text-[#DA6C4C] shrink-0" />
                  <span className="truncate">
                    {reminderAlert.label || reminderAlert.message.replace('Task Due Today: ', '').replace('Task Due: ', '')}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      handleSnooze(15);
                      setShowContextMenu(false);
                    }}
                    className="flex-1 py-0.5 px-1.5 rounded bg-[#08534E] text-white text-[9px] font-bold hover:bg-[#0D6E67] flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-2.5 h-2.5 text-[#DDA44D]" />
                    <span>+15m</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDismissAlert();
                      setShowContextMenu(false);
                    }}
                    className="py-0.5 px-2 rounded bg-[#DA6C4C]/25 text-[#FF9B7D] text-[9px] font-bold hover:bg-[#DA6C4C]/40 cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setShowContextMenu(false);
                onToggleDictation();
              }}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#1E2B2D] text-left cursor-pointer transition-colors"
            >
              <Mic className="w-3.5 h-3.5 text-[#DA6C4C]" />
              <span>{status.state === 'recording' ? 'Stop Listening' : 'Start Dictation'}</span>
            </button>

            <button
              type="button"
              onClick={handleDockBottomRight}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#1E2B2D] text-left cursor-pointer transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-[#DDA44D]" />
              <span>Dock to Corner</span>
            </button>

            <button
              type="button"
              onClick={() => {
                toggleFreeRoam();
                setShowContextMenu(false);
              }}
              className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[#1E2B2D] text-left cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-2">
                <Footprints className="w-3.5 h-3.5 text-[#34A89E]" />
                <span>Roam Desktop</span>
              </span>
              <span className="text-[9px] font-mono px-1 rounded bg-black/40 text-[#FFE08A]">
                {freeRoam ? 'ON' : 'ANCHORED'}
              </span>
            </button>

            <div className="flex items-center justify-between px-2 py-1 gap-1 border-t border-white/10 mt-0.5 pt-1">
              <button
                type="button"
                title="Relax / Sit"
                onClick={() => {
                  setAutoPose('sit');
                  setShowContextMenu(false);
                }}
                className="p-1 rounded hover:bg-[#1E2B2D] cursor-pointer"
              >
                <Smile className="w-3 h-3 text-[#FFE08A]" />
              </button>
              <button
                type="button"
                title="Dance"
                onClick={() => {
                  setAutoPose('dance');
                  setShowContextMenu(false);
                }}
                className="p-1 rounded hover:bg-[#1E2B2D] cursor-pointer"
              >
                <Music className="w-3 h-3 text-[#34A89E]" />
              </button>
              <button
                type="button"
                title="Sleep"
                onClick={() => {
                  setAutoPose('sleep');
                  setShowContextMenu(false);
                }}
                className="p-1 rounded hover:bg-[#1E2B2D] cursor-pointer"
              >
                <Moon className="w-3 h-3 text-[#7A9A96]" />
              </button>
              <button
                type="button"
                title="Open VoxQuest App"
                onClick={() => {
                  setShowContextMenu(false);
                  safeInvoke('show_main_window_cmd');
                }}
                className="p-1 rounded hover:bg-[#1E2B2D] cursor-pointer"
              >
                <AppWindow className="w-3 h-3 text-[#DFDFD4]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
