import React, { useState, useEffect, useRef } from 'react';
import { VoxBotFullBody, VoxBotPose } from './VoxBotFullBody';
import { SessionSnapshot } from '../types';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface DesktopCompanionProps {
  status: SessionSnapshot;
  onToggleDictation: () => void;
}

/**
 * Autonomous Desktop Companion Window (VoxBot).
 * - Click VoxBot to start/stop dictation directly.
 * - Drag anywhere on VoxBot to reposition on desktop.
 * - Autonomously walks, sits, blinks, and stands when idle.
 * - Reacts immediately to listening, transcribing, and completed states.
 */
export const DesktopCompanion: React.FC<DesktopCompanionProps> = ({
  status,
  onToggleDictation,
}) => {
  const [autoPose, setAutoPose] = useState<'idle' | 'walk' | 'sit'>('idle');
  const [walkOffsetX, setWalkOffsetX] = useState<number>(0);
  const [facing, setFacing] = useState<'left' | 'right'>('right');
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const [showSuccessFlash, setShowSuccessFlash] = useState<boolean>(false);
  const lastSessionIdRef = useRef<string | null>(null);
  const dragMovedRef = useRef<boolean>(false);

  // Celebrate briefly when a transcription completes
  useEffect(() => {
    if (
      (status.state === 'completed' || status.state === 'recovery_required') &&
      status.session_id &&
      status.session_id !== lastSessionIdRef.current
    ) {
      lastSessionIdRef.current = status.session_id;
      setShowSuccessFlash(true);
      const timer = setTimeout(() => setShowSuccessFlash(false), 2200);
      return () => clearTimeout(timer);
    }
  }, [status.state, status.session_id]);

  // Natural eye blink every few seconds when not transcribing
  useEffect(() => {
    if (status.state === 'transcribing') return;
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 160);
    }, 4200);
    return () => clearInterval(blinkInterval);
  }, [status.state]);

  // Autonomous idle lifecycle: stand -> walk patrol -> sit on bench
  useEffect(() => {
    if (status.state !== 'idle' || showSuccessFlash) return;

    const sequence: Array<'idle' | 'walk' | 'sit'> = ['walk', 'idle', 'sit', 'idle'];
    let idx = 0;

    const interval = setInterval(() => {
      idx = (idx + 1) % sequence.length;
      setAutoPose(sequence[idx]);
    }, 5500);

    return () => clearInterval(interval);
  }, [status.state, showSuccessFlash]);

  const activePose: VoxBotPose =
    status.state === 'recording'
      ? 'listening'
      : status.state === 'transcribing'
      ? 'transcribing'
      : showSuccessFlash
      ? 'success'
      : autoPose;

  // Smooth horizontal patrol when walking
  useEffect(() => {
    if (activePose !== 'walk') {
      setWalkOffsetX(0);
      return;
    }

    let dir = facing === 'right' ? 1 : -1;
    const stepTimer = setInterval(() => {
      setWalkOffsetX((prev) => {
        const next = prev + dir * 2.0;
        if (next >= 24) {
          dir = -1;
          setFacing('left');
          return 24;
        }
        if (next <= -24) {
          dir = 1;
          setFacing('right');
          return -24;
        }
        return next;
      });
    }, 55);

    return () => clearInterval(stepTimer);
  }, [activePose]);

  const handleMouseDown = (e: React.MouseEvent) => {
    dragMovedRef.current = false;
    if (e.button === 0) {
      try {
        getCurrentWindow().startDragging().catch(() => {});
      } catch {}
    }
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      className="w-screen h-screen flex flex-col items-center justify-end pb-3 pt-3 select-none bg-transparent overflow-visible cursor-grab active:cursor-grabbing"
      style={{ background: 'transparent' }}
    >
      {/* Unclipped Status Pill Above Robot */}
      <div className="h-7 flex items-center justify-center mb-1 shrink-0">
        {(status.state === 'recording' || status.state === 'transcribing') && (
          <div
            className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border shadow-md animate-fadeIn flex items-center gap-1.5 ${
              status.state === 'recording'
                ? 'bg-darkTeal text-amber border-amber'
                : 'bg-cream text-darkTeal border-darkTeal'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                status.state === 'recording' ? 'bg-terracotta animate-ping' : 'bg-mint animate-pulse'
              }`}
            />
            <span>{status.state === 'recording' ? 'Listening' : 'Transcribing'}</span>
          </div>
        )}
      </div>

      {/* Full-Body 3D-Styled Articulated VoxBot */}
      <div
        className="transition-transform duration-150 ease-linear shrink-0"
        style={{ transform: `translateX(${walkOffsetX}px)` }}
      >
        <VoxBotFullBody
          pose={activePose}
          size={146}
          facing={facing}
          isBlinking={isBlinking}
          onClick={(e) => {
            e.stopPropagation();
            if (!dragMovedRef.current) {
              onToggleDictation();
            }
          }}
          className="cursor-pointer hover:scale-[1.03] transition-transform"
        />
      </div>
    </div>
  );
};
