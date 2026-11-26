import React, { useState, useEffect, useRef } from 'react';
import { Mic, Footprints, Armchair, User, Sparkles, X } from 'lucide-react';
import { VoxBotFullBody, VoxBotPose } from './VoxBotFullBody';
import { SessionSnapshot } from '../types';
import { safeInvoke } from '../lib/ipc';
import { getCurrentWindow } from '@tauri-apps/api/window';

type CompanionBehaviorMode = 'auto' | 'idle' | 'walk' | 'sit';

interface DesktopCompanionProps {
  status: SessionSnapshot;
  onToggleDictation: () => void;
}

export const DesktopCompanion: React.FC<DesktopCompanionProps> = ({
  status,
  onToggleDictation,
}) => {
  const [behaviorMode, setBehaviorMode] = useState<CompanionBehaviorMode>(() => {
    try {
      return (localStorage.getItem('voxquest_companion_mode') as CompanionBehaviorMode) || 'auto';
    } catch {
      return 'auto';
    }
  });
  const [autoPose, setAutoPose] = useState<'idle' | 'walk' | 'sit'>('idle');
  const [walkOffsetX, setWalkOffsetX] = useState<number>(0);
  const [facing, setFacing] = useState<'left' | 'right'>('right');
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [showSuccessFlash, setShowSuccessFlash] = useState<boolean>(false);
  const lastSessionIdRef = useRef<string | null>(null);

  // Trigger brief celebration when a transcription completes
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

  // Autonomous idle lifecycle: stand -> walk patrol -> sit on bench -> stand
  useEffect(() => {
    if (behaviorMode !== 'auto' || status.state !== 'idle' || showSuccessFlash) {
      return;
    }

    const cycle = () => {
      const roll = Math.random();
      if (roll < 0.38) {
        setAutoPose('walk');
      } else if (roll < 0.72) {
        setAutoPose('sit');
      } else {
        setAutoPose('idle');
      }
    };

    const interval = setInterval(cycle, 6500);
    return () => clearInterval(interval);
  }, [behaviorMode, status.state, showSuccessFlash]);

  const activePose: VoxBotPose =
    status.state === 'recording'
      ? 'listening'
      : status.state === 'transcribing'
      ? 'transcribing'
      : showSuccessFlash
      ? 'success'
      : behaviorMode === 'auto'
      ? autoPose
      : behaviorMode;

  // Smooth horizontal patrol inside the companion stage when walking
  useEffect(() => {
    if (activePose !== 'walk') {
      setWalkOffsetX(0);
      return;
    }

    let dir = facing === 'right' ? 1 : -1;
    const stepTimer = setInterval(() => {
      setWalkOffsetX((prev) => {
        const next = prev + dir * 2.2;
        if (next >= 22) {
          dir = -1;
          setFacing('left');
          return 22;
        }
        if (next <= -22) {
          dir = 1;
          setFacing('right');
          return -22;
        }
        return next;
      });
    }, 60);

    return () => clearInterval(stepTimer);
  }, [activePose]);

  const handleSetMode = (mode: CompanionBehaviorMode) => {
    setBehaviorMode(mode);
    try {
      localStorage.setItem('voxquest_companion_mode', mode);
    } catch {}
    if (mode !== 'auto') {
      setAutoPose(mode);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.button === 0) {
      try {
        getCurrentWindow().startDragging().catch(() => {});
      } catch {}
    }
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-screen h-screen flex flex-col items-center justify-end pb-2 select-none bg-transparent overflow-visible cursor-grab active:cursor-grabbing"
      style={{ background: 'transparent' }}
    >
      {/* Status Bubble on Active Dictation */}
      {(status.state === 'recording' || status.state === 'transcribing') && (
        <div
          className={`mb-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border shadow-sm animate-fadeIn ${
            status.state === 'recording'
              ? 'bg-darkTeal text-amber border-amber'
              : 'bg-cream text-darkTeal border-darkTeal'
          }`}
        >
          {status.state === 'recording' ? 'Listening...' : 'Thinking...'}
        </div>
      )}

      {/* Full-Body Articulated Robot */}
      <div
        className="transition-transform duration-150 ease-linear"
        style={{ transform: `translateX(${walkOffsetX}px)` }}
      >
        <VoxBotFullBody
          pose={activePose}
          size={128}
          facing={facing}
          onClick={(e) => {
            e.stopPropagation();
            onToggleDictation();
          }}
          className="cursor-pointer hover:scale-[1.03] transition-transform"
        />
      </div>

      {/* Subtle Hover Action Dock */}
      <div
        data-tauri-no-drag
        className={`mt-1 flex items-center gap-1 px-2 py-1 rounded-full bg-cream/95 border border-charcoal/20 shadow-md transition-all duration-200 ${
          isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'
        }`}
      >
        <button
          type="button"
          onClick={() => handleSetMode('auto')}
          title="Auto (Walk, Sit & Stand)"
          className={`p-1 rounded-full transition-colors cursor-pointer ${
            behaviorMode === 'auto'
              ? 'bg-darkTeal text-amber'
              : 'text-charcoal/70 hover:bg-black/5'
          }`}
        >
          <Sparkles className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => handleSetMode('walk')}
          title="Walk"
          className={`p-1 rounded-full transition-colors cursor-pointer ${
            behaviorMode === 'walk'
              ? 'bg-darkTeal text-amber'
              : 'text-charcoal/70 hover:bg-black/5'
          }`}
        >
          <Footprints className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => handleSetMode('sit')}
          title="Sit"
          className={`p-1 rounded-full transition-colors cursor-pointer ${
            behaviorMode === 'sit'
              ? 'bg-darkTeal text-amber'
              : 'text-charcoal/70 hover:bg-black/5'
          }`}
        >
          <Armchair className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => handleSetMode('idle')}
          title="Stand"
          className={`p-1 rounded-full transition-colors cursor-pointer ${
            behaviorMode === 'idle'
              ? 'bg-darkTeal text-amber'
              : 'text-charcoal/70 hover:bg-black/5'
          }`}
        >
          <User className="w-3 h-3" />
        </button>
        <div className="w-px h-3 bg-charcoal/15 mx-0.5" />
        <button
          type="button"
          onClick={onToggleDictation}
          title="Click to Dictate"
          className="p-1 rounded-full bg-darkTeal text-white hover:bg-darkTealAccent transition-colors cursor-pointer"
        >
          <Mic className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => safeInvoke('hide_companion_window')}
          title="Hide Companion"
          className="p-1 rounded-full text-charcoal/60 hover:text-terracotta hover:bg-terracotta/10 transition-colors cursor-pointer"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
