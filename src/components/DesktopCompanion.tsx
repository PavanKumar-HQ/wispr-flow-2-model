import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { VoxBotFullBody, VoxBotPose } from './VoxBotFullBody';
import { SessionSnapshot, NowPlayingInfo } from '../types';
import { safeInvoke, safeListen } from '../lib/ipc';
import { getCurrentWindow, LogicalPosition, currentMonitor } from '@tauri-apps/api/window';

interface DesktopCompanionProps {
  status: SessionSnapshot;
  onToggleDictation: () => void;
}

const MOUSE_REST_SLEEP_MS = 6000; // Fall asleep after 6s of no mouse movement

/**
 * Autonomous, Battery-Friendly Desktop Companion Window (VoxBot).
 * - Active whenever the mouse moves; falls asleep after 6s of mouse rest.
 * - Wakes immediately when the mouse moves again or when hovered/clicked.
 * - Roams freely in 2D (up, down, left, right) across the desktop when walking.
 * - Single click: immediately starts/stops dictation; drag (>5px): repositions.
 */
export const DesktopCompanion: React.FC<DesktopCompanionProps> = ({
  status,
  onToggleDictation,
}) => {
  const [autoPose, setAutoPose] = useState<'idle' | 'walk' | 'fly' | 'sit' | 'sleep' | 'wave' | 'dance'>('walk');
  const [facing, setFacing] = useState<'left' | 'right'>('right');
  const [gaze, setGaze] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const [showSuccessFlash, setShowSuccessFlash] = useState<boolean>(false);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [reminderAlert, setReminderAlert] = useState<{ title: string; message: string } | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);

  const lastSessionIdRef = useRef<string | null>(null);
  const pointerDownRef = useRef<{ x: number; y: number; dragged: boolean } | null>(null);
  const lastCursorRef = useRef<{ x: number; y: number; movedAt: number }>({
    x: -1,
    y: -1,
    movedAt: Date.now(),
  });
  const walkVecRef = useRef<{ vx: number; vy: number }>({ vx: -2.4, vy: -1.1 });
  const poseIdxRef = useRef<number>(0);
  const isSleeping = autoPose === 'sleep';

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

  // Show reminder popup above VoxBot AND run unthrottled reminder check every 3s
  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    safeListen<{ title: string; message: string }>('voxquest-reminder-alert', (e) => {
      if (cancelled || !e.payload) return;
      setReminderAlert(e.payload);
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setReminderAlert(null), 7000);
    }).then((fn) => {
      unlisten = fn;
    });

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
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        let changed = false;
        const updated = items.map((item) => {
          if (item.dateStr === todayStr && item.reminderEnabled !== false && item.label?.trim()) {
            if (item.lastNotifiedDate === todayStr) return item;
            const targetTime = item.timeStr || '09:00';
            if (currentTime >= targetTime) {
              safeInvoke('send_system_notification_cmd', {
                title: 'VoxQuest Task Reminder',
                message: `Task Due Today: ${item.label}`,
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
      if (hideTimer) clearTimeout(hideTimer);
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
    const pollMs = isSleeping && !isHovered ? 650 : 320;

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

  // Active autonomous behavior while mouse is moving/awake: walk -> fly -> wave -> idle -> sit -> dance
  useEffect(() => {
    if (status.state !== 'idle' || showSuccessFlash || isHovered || isSleeping) return;

    const sequence: Array<'walk' | 'fly' | 'wave' | 'idle' | 'sit' | 'dance'> = [
      'walk',
      'fly',
      'wave',
      'idle',
      'sit',
      'dance',
    ];

    const interval = setInterval(() => {
      if (document.hidden) return;
      poseIdxRef.current = (poseIdxRef.current + 1) % sequence.length;
      const next = sequence[poseIdxRef.current];
      if (next === 'walk') {
        // Walk smoothly horizontally at a natural pace matched to stride cycle
        const dir = Math.random() > 0.5 ? 1 : -1;
        walkVecRef.current = { vx: dir * 5.2, vy: 0 };
      } else if (next === 'fly') {
        // Fly freely in 2D across the desktop!
        const angle = Math.random() * Math.PI * 2;
        walkVecRef.current = {
          vx: Math.cos(angle) * 4.4,
          vy: Math.sin(angle) * 2.8,
        };
      }
      setAutoPose(next);
    }, 3200);

    return () => clearInterval(interval);
  }, [status.state, showSuccessFlash, isHovered, isSleeping]);

  const effectiveIdlePose = isHovered && autoPose === 'sleep' ? 'sit' : autoPose;

  const activePose: VoxBotPose =
    status.state === 'recording'
      ? 'listening'
      : status.state === 'transcribing'
      ? 'transcribing'
      : showSuccessFlash
      ? 'success'
      : isMusicPlaying
      ? 'music'
      : effectiveIdlePose;

  // Smooth 30fps GPU-friendly desktop movement for 'walk' (horizontal) and 'fly' (2D jetpack flight)
  useEffect(() => {
    if ((activePose !== 'walk' && activePose !== 'fly') || isHovered) return;

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
          if (document.hidden || pointerDownRef.current || !cachedBounds || !currentPos) return;
          if (now - lastFrameAt < 32) return; // ~30fps cap for low thermal/CPU load
          const dt = lastFrameAt ? Math.min((now - lastFrameAt) / 95, 1.5) : 0.35;
          lastFrameAt = now;

          const minX = 24;
          const maxX = Math.max(minX + 40, cachedBounds.screenW - 185);
          const minY = 48;
          const maxY = Math.max(minY + 40, cachedBounds.screenH - 255);

          let nextX = currentPos.x + walkVecRef.current.vx * 1.1 * dt;
          let nextY = currentPos.y + walkVecRef.current.vy * 1.1 * dt;

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
  }, [activePose, isHovered]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // If user clicked the chest core button directly, let its onClick handle toggling without dragging
    if ((e.target as HTMLElement).closest('[data-voxbot-core="true"]')) {
      return;
    }
    pointerDownRef.current = { x: e.clientX, y: e.clientY, dragged: false };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const down = pointerDownRef.current;
    if (!down || down.dragged) return;
    const dist = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    if (dist >= 5) {
      down.dragged = true;
      pointerDownRef.current = null;
      try {
        getCurrentWindow().startDragging().catch(() => {});
      } catch {}
    }
  };

  const handleMouseUp = () => {
    // Clicking outside the chest core does NOT toggle listening (only chest core button toggles)
    pointerDownRef.current = null;
  };

  return (
    <div
      className="w-screen h-screen flex flex-col items-center justify-end pb-1 pt-2 select-none bg-transparent overflow-visible"
      style={{ background: 'transparent' }}
    >
      {/* Tiny Sleek Listening / Action / Reminder Pill Above Robot */}
      <div className="h-5 flex items-center justify-center mb-0.5 shrink-0">
        {reminderAlert ? (
          <button
            type="button"
            onClick={() => setReminderAlert(null)}
            className="px-2.5 py-[2px] rounded-full text-[9px] font-mono font-bold tracking-tight border border-[#DDA44D] bg-[#FAF8F2] text-[#08534E] shadow-sm animate-fadeIn max-w-[172px] flex items-center gap-1 cursor-pointer"
            title={`${reminderAlert.title}: ${reminderAlert.message}`}
          >
            <Bell className="w-2.5 h-2.5 text-[#DA6C4C] shrink-0" />
            <span className="truncate">{reminderAlert.message.replace('Task Due Today: ', '')}</span>
          </button>
        ) : status.state === 'recording' ? (
          <div className="px-2 py-[1px] rounded-full text-[8.5px] font-mono font-bold tracking-wider uppercase border border-terracotta bg-cream/95 text-terracotta shadow-xs animate-fadeIn flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-terracotta animate-ping" />
            <span>Listening</span>
          </div>
        ) : actionToast ? (
          <div className="px-2 py-[1px] rounded-full text-[8.5px] font-mono font-bold tracking-tight border border-darkTeal/40 bg-cream/95 text-darkTeal shadow-xs animate-fadeIn max-w-[152px] truncate">
            {actionToast}
          </div>
        ) : null}
      </div>

      {/* Tight Interactive Hitbox Only Around VoxBot */}
      <div
        onMouseEnter={() => {
          setIsHovered(true);
          lastCursorRef.current.movedAt = Date.now();
          if (autoPose === 'sleep') setAutoPose('idle');
        }}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="cursor-grab active:cursor-grabbing hover:scale-[1.03] transition-transform shrink-0 will-change-transform"
        title="Click center chest core to dictate • Drag anywhere else to move"
      >
        <VoxBotFullBody
          pose={activePose}
          size={134}
          facing={facing}
          gaze={gaze}
          isHovered={isHovered}
          isBlinking={isBlinking}
          onCoreClick={onToggleDictation}
        />
      </div>
    </div>
  );
};
