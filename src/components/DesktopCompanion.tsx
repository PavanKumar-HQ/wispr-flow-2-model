import React, { useState, useEffect, useRef } from 'react';
import { VoxBotFullBody, VoxBotPose } from './VoxBotFullBody';
import { SessionSnapshot } from '../types';
import { safeInvoke } from '../lib/ipc';
import { getCurrentWindow, LogicalPosition, currentMonitor } from '@tauri-apps/api/window';

interface DesktopCompanionProps {
  status: SessionSnapshot;
  onToggleDictation: () => void;
}

/**
 * Autonomous, Battery-Friendly Desktop Companion Window (VoxBot).
 * - Watches the mouse cursor smoothly (~4Hz quantized gaze, 0% when sleeping/hidden).
 * - Single click: immediately starts/stops dictation.
 * - Drag (>5px): smoothly repositions VoxBot anywhere on desktop.
 * - Hovering wakes VoxBot from nap and triggers a friendly reaction.
 * - Autonomously walks across the desktop, sits, naps, and blinks when idle.
 */
export const DesktopCompanion: React.FC<DesktopCompanionProps> = ({
  status,
  onToggleDictation,
}) => {
  const [autoPose, setAutoPose] = useState<'idle' | 'walk' | 'sit' | 'sleep'>('idle');
  const [facing, setFacing] = useState<'left' | 'right'>('right');
  const [gaze, setGaze] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const [showSuccessFlash, setShowSuccessFlash] = useState<boolean>(false);

  const lastSessionIdRef = useRef<string | null>(null);
  const pointerDownRef = useRef<{ x: number; y: number; dragged: boolean } | null>(null);
  const walkDirRef = useRef<1 | -1>(-1);

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

  // Natural blinking
  useEffect(() => {
    if (status.state === 'transcribing' || (autoPose === 'sleep' && !isHovered)) return;
    const blinkInterval = setInterval(() => {
      if (document.hidden) return;
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, 4200);
    return () => clearInterval(blinkInterval);
  }, [status.state, autoPose, isHovered]);

  // Low-power quantized mouse-watching gaze (~4Hz, skipped when sleeping or hidden)
  useEffect(() => {
    if (status.state === 'transcribing' || (autoPose === 'sleep' && !isHovered)) {
      setGaze({ x: 0, y: 0 });
      return;
    }

    let cancelled = false;
    const pollGaze = async () => {
      if (cancelled || document.hidden) return;
      try {
        const res = await safeInvoke<[number, number]>('get_companion_gaze');
        if (!cancelled && Array.isArray(res) && res.length === 2) {
          const [gx, gy] = res;
          setGaze((prev) => (prev.x === gx && prev.y === gy ? prev : { x: gx, y: gy }));
        }
      } catch {}
    };

    const timer = setInterval(pollGaze, 240);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [status.state, autoPose, isHovered]);

  // Autonomous behavior cycle: walk -> idle -> sit -> sleep -> idle
  useEffect(() => {
    if (status.state !== 'idle' || showSuccessFlash || isHovered) return;

    const sequence: Array<'idle' | 'walk' | 'idle' | 'sit' | 'sleep'> = [
      'walk',
      'idle',
      'sit',
      'sleep',
      'idle',
    ];
    let idx = 0;

    const interval = setInterval(() => {
      if (document.hidden) return;
      idx = (idx + 1) % sequence.length;
      setAutoPose(sequence[idx]);
    }, 6500);

    return () => clearInterval(interval);
  }, [status.state, showSuccessFlash, isHovered]);

  const effectiveIdlePose = isHovered && autoPose === 'sleep' ? 'sit' : autoPose;

  const activePose: VoxBotPose =
    status.state === 'recording'
      ? 'listening'
      : status.state === 'transcribing'
      ? 'transcribing'
      : showSuccessFlash
      ? 'success'
      : effectiveIdlePose;

  // Low-power desktop patrol (~12fps) when in 'walk' pose
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
        const currentX = pos.x / scale;
        const currentY = pos.y / scale;

        const minX = 30;
        const maxX = Math.max(minX + 40, screenW - 185);
        let nextX = currentX + walkDirRef.current * 3.0;

        if (nextX <= minX) {
          nextX = minX;
          walkDirRef.current = 1;
          setFacing('right');
        } else if (nextX >= maxX) {
          nextX = maxX;
          walkDirRef.current = -1;
          setFacing('left');
        } else {
          setFacing(walkDirRef.current === 1 ? 'right' : 'left');
        }

        await win.setPosition(new LogicalPosition(nextX, currentY));
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
                ? 'bg-darkTeal text-cream border-mint'
                : 'bg-cream text-darkTeal border-darkTeal'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                status.state === 'recording' ? 'bg-mint animate-ping' : 'bg-amber animate-pulse'
              }`}
            />
            <span>{status.state === 'recording' ? 'Listening' : 'Thinking'}</span>
          </div>
        )}
      </div>

      {/* Tight Interactive Hitbox Only Around VoxBot */}
      <div
        onMouseEnter={() => {
          setIsHovered(true);
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
