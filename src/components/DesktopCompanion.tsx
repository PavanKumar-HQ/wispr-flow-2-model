import React, { useState, useEffect, useRef } from 'react';
import { VoxBotFullBody, VoxBotPose } from './VoxBotFullBody';
import { SessionSnapshot } from '../types';
import { safeInvoke } from '../lib/ipc';
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
  const [autoPose, setAutoPose] = useState<'idle' | 'walk' | 'sit' | 'sleep' | 'wave' | 'dance'>('idle');
  const [facing, setFacing] = useState<'left' | 'right'>('right');
  const [gaze, setGaze] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const [showSuccessFlash, setShowSuccessFlash] = useState<boolean>(false);

  const lastSessionIdRef = useRef<string | null>(null);
  const pointerDownRef = useRef<{ x: number; y: number; dragged: boolean } | null>(null);
  const lastCursorRef = useRef<{ x: number; y: number; movedAt: number }>({
    x: -1,
    y: -1,
    movedAt: Date.now(),
  });
  const walkVecRef = useRef<{ vx: number; vy: number }>({ vx: -2.4, vy: -1.1 });

  // Brief celebration on completed transcription
  useEffect(() => {
    if (
      (status.state === 'completed' || status.state === 'recovery_required') &&
      status.session_id &&
      status.session_id !== lastSessionIdRef.current
    ) {
      lastSessionIdRef.current = status.session_id;
      setShowSuccessFlash(true);
      const timer = setTimeout(() => setShowSuccessFlash(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [status.state, status.session_id]);

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

  // Low-power gaze & mouse-rest sleep/wake detector (~4Hz awake, ~2Hz sleeping)
  useEffect(() => {
    if (status.state === 'transcribing') {
      setGaze({ x: 0, y: 0 });
      return;
    }

    let cancelled = false;
    const pollMs = autoPose === 'sleep' && !isHovered ? 480 : 240;

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
          if (autoPose === 'sleep' && status.state === 'idle') {
            setAutoPose('idle');
          }
        } else if (
          status.state === 'idle' &&
          !isHovered &&
          autoPose !== 'sleep' &&
          now - lastCursorRef.current.movedAt >= MOUSE_REST_SLEEP_MS
        ) {
          setAutoPose('sleep');
        }

        if (autoPose !== 'sleep' || isHovered) {
          setGaze((prev) => (prev.x === gx && prev.y === gy ? prev : { x: gx, y: gy }));
        } else {
          setGaze({ x: 0, y: 0 });
        }
      } catch {}
    };

    const timer = setInterval(pollGaze, pollMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [status.state, autoPose, isHovered]);

  // Active autonomous behavior while mouse is moving/awake: walk -> wave -> idle -> sit -> dance -> walk
  useEffect(() => {
    if (status.state !== 'idle' || showSuccessFlash || isHovered || autoPose === 'sleep') return;

    const sequence: Array<'walk' | 'wave' | 'idle' | 'sit' | 'dance'> = [
      'walk',
      'wave',
      'idle',
      'sit',
      'dance',
    ];
    let idx = 0;

    const interval = setInterval(() => {
      if (document.hidden) return;
      // Pick a fresh 2D roam direction whenever starting a walk
      idx = (idx + 1) % sequence.length;
      const next = sequence[idx];
      if (next === 'walk') {
        const angle = Math.random() * Math.PI * 2;
        walkVecRef.current = {
          vx: Math.cos(angle) * 2.8,
          vy: Math.sin(angle) * 1.6,
        };
      }
      setAutoPose(next);
    }, 5200);

    return () => clearInterval(interval);
  }, [status.state, showSuccessFlash, isHovered, autoPose]);

  const effectiveIdlePose = isHovered && autoPose === 'sleep' ? 'sit' : autoPose;

  const activePose: VoxBotPose =
    status.state === 'recording'
      ? 'listening'
      : status.state === 'transcribing'
      ? 'transcribing'
      : showSuccessFlash
      ? 'success'
      : effectiveIdlePose;

  // 2D free-roaming walk across the desktop (up, down, left, right) at ~12fps
  useEffect(() => {
    if (activePose !== 'walk' || isHovered) return;

    let cancelled = false;
    const step = async () => {
      if (cancelled || document.hidden || pointerDownRef.current) return;
      try {
        const win = getCurrentWindow();
        const [pos, mon] = await Promise.all([win.outerPosition(), currentMonitor()]);
        if (!mon || cancelled) return;

        const scale = mon.scaleFactor;
        const screenW = mon.size.width / scale;
        const screenH = mon.size.height / scale;
        const currentX = pos.x / scale;
        const currentY = pos.y / scale;

        const minX = 24;
        const maxX = Math.max(minX + 40, screenW - 185);
        const minY = 48; // Stay safely below menu bar / notch
        const maxY = Math.max(minY + 40, screenH - 255); // Stay above Dock

        let nextX = currentX + walkVecRef.current.vx;
        let nextY = currentY + walkVecRef.current.vy;

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

        setFacing(walkVecRef.current.vx >= 0 ? 'right' : 'left');
        await win.setPosition(new LogicalPosition(nextX, nextY));
      } catch {}
    };

    const timer = setInterval(step, 80);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activePose, isHovered]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
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

  const handleMouseUp = (e: React.MouseEvent) => {
    const down = pointerDownRef.current;
    pointerDownRef.current = null;
    if (down && !down.dragged && e.button === 0) {
      onToggleDictation();
    }
  };

  return (
    <div
      className="w-screen h-screen flex flex-col items-center justify-end pb-1 pt-2 select-none bg-transparent overflow-visible"
      style={{ background: 'transparent' }}
    >
      {/* Compact Status Pill Above Robot */}
      <div className="h-6 flex items-center justify-center mb-0.5 shrink-0">
        {(status.state === 'recording' || status.state === 'transcribing') && (
          <div
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border shadow-sm animate-fadeIn flex items-center gap-1.5 ${
              status.state === 'recording'
                ? 'bg-cream text-terracotta border-terracotta'
                : 'bg-cream text-darkTeal border-amber'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                status.state === 'recording' ? 'bg-terracotta animate-ping' : 'bg-amber animate-pulse'
              }`}
            />
            <span>{status.state === 'recording' ? 'Listening' : 'Transcribing'}</span>
          </div>
        )}
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
        className="cursor-pointer active:cursor-grabbing hover:scale-[1.03] transition-transform shrink-0"
        title={status.state === 'recording' ? 'Click to stop listening' : 'Click to dictate (drag to move)'}
      >
        <VoxBotFullBody
          pose={activePose}
          size={134}
          facing={facing}
          gaze={gaze}
          isHovered={isHovered}
          isBlinking={isBlinking}
        />
      </div>
    </div>
  );
};
