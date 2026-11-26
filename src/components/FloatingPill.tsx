import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Square,
  Check,
  Copy,
  X,
  CornerDownLeft,
  LayoutGrid,
  Pause,
  SkipBack,
  SkipForward,
  Bot,
  Radio,
} from 'lucide-react';
import { SessionSnapshot, NowPlayingInfo } from '../types';
import { Mascot, MascotAvatar, MascotAction } from './Mascot';
import { AudioWaveform } from './AudioWaveform';
import { CapsuleTray } from './capsule/CapsuleTray';
import { safeInvoke, safeListen, isNativeTauri } from '../lib/ipc';
import { getCurrentWindow, currentMonitor } from '@tauri-apps/api/window';
import { applyTheme } from '../lib/theme';

interface FloatingPillProps {
  status: SessionSnapshot;
  onToggle: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
  onCopyLast: (text?: string) => void;
  compact?: boolean;
}

export const FloatingPill: React.FC<FloatingPillProps> = ({
  status,
  onToggle,
  onCopyLast,
  compact = false,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [enhancedText, setEnhancedText] = useState<string | null>(null);
  const [enhanced, setEnhanced] = useState<boolean>(false);
  const [inserted, setInserted] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [noSpeechActive, setNoSpeechActive] = useState<boolean>(false);
  const [isTrayExpanded, setIsTrayExpanded] = useState<boolean>(false);
  const [nowPlaying, setNowPlaying] = useState<NowPlayingInfo | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<MascotAvatar>(() => {
    try {
      return (localStorage.getItem('voxquest_mascot_avatar') as MascotAvatar) || 'bot';
    } catch {
      return 'bot';
    }
  });

  const [isMascotMode, setIsMascotMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('voxquest_mascot_mode') === 'true';
    } catch {
      return false;
    }
  });

  const [mascotAction, setMascotAction] = useState<MascotAction>('float');
  const actionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Autonomous idle pet behavior: float -> sit (after 12s) -> sleep (after 35s)
  useEffect(() => {
    if (!isMascotMode || status.state === 'recording' || status.state === 'transcribing') {
      setMascotAction('float');
      return;
    }

    const resetToIdle = () => {
      setMascotAction('float');
      if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
      actionTimerRef.current = setTimeout(() => {
        setMascotAction('sit');
        actionTimerRef.current = setTimeout(() => {
          setMascotAction('sleep');
        }, 23000);
      }, 12000);
    };

    resetToIdle();

    const handleUserActivity = () => {
      if (mascotAction === 'sleep' || mascotAction === 'sit') {
        resetToIdle();
      }
    };

    window.addEventListener('mousemove', handleUserActivity);
    return () => {
      if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
      window.removeEventListener('mousemove', handleUserActivity);
    };
  }, [isMascotMode, status.state, mascotAction]);

  const handleMascotClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMascotAction('jump');
    setTimeout(() => {
      onToggle();
    }, 180);
  };

  const handleToggleMascotMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isMascotMode;
    setIsMascotMode(next);
    try {
      localStorage.setItem('voxquest_mascot_mode', String(next));
    } catch {}
  };

  const handleCycleAvatar = (e: React.MouseEvent) => {
    e.stopPropagation();
    const order: MascotAvatar[] = ['bot', 'owl', 'cat'];
    const nextIdx = (order.indexOf(selectedAvatar) + 1) % order.length;
    const next = order[nextIdx];
    setSelectedAvatar(next);
    try {
      localStorage.setItem('voxquest_mascot_avatar', next);
    } catch {}
  };
  const isDark = false;

  // Sync with Now Playing audio stream
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const storedAvatar = (localStorage.getItem('voxquest_mascot_avatar') as MascotAvatar) || 'bot';
        setSelectedAvatar(storedAvatar);
        const storedMode = localStorage.getItem('voxquest_mascot_mode') === 'true';
        setIsMascotMode(storedMode);
      } catch {}
    };

    window.addEventListener('storage', handleStorageChange);

    safeInvoke<NowPlayingInfo | null>('get_now_playing_cmd').then((info) => {
      if (info) setNowPlaying(info);
    });

    let unlisten: (() => void) | undefined;
    safeListen<NowPlayingInfo | null>('now-playing-changed', (e) => {
      setNowPlaying(e.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (unlisten) unlisten();
    };
  }, []);

  const handleMediaControl = async (action: 'playpause' | 'next' | 'previous') => {
    try {
      await safeInvoke('media_control_cmd', { action });
      if (action === 'playpause') {
        setNowPlaying((prev) => (prev ? { ...prev, is_playing: !prev.is_playing } : null));
      }
    } catch (e) {
      console.warn('Media control failed:', e);
    }
  };
  const [expandDirection, setExpandDirection] = useState<'down' | 'up'>('down');
  const lastSessionIdRef = useRef<string | null>(null);

  // Ensure "No speech heard" never freezes permanently
  useEffect(() => {
    if (status.message && status.message.toLowerCase().includes('no speech')) {
      setNoSpeechActive(true);
      const timer = setTimeout(() => {
        setNoSpeechActive(false);
      }, 2200);
      return () => clearTimeout(timer);
    } else {
      setNoSpeechActive(false);
    }
  }, [status.message, status.session_id]);

  const isRecording = status.state === 'recording' || status.state === 'starting';
  const isTranscribing =
    status.state === 'transcribing' ||
    status.state === 'formatting' ||
    status.state === 'validating_target' ||
    status.state === 'inserting' ||
    status.state === 'stopping';
  const hasTranscript = Boolean(status.last_transcript && status.last_transcript.trim().length > 0);
  const isDone = (status.state === 'completed' || status.state === 'recovery_required') && hasTranscript;

  const currentActiveText = enhancedText || status.last_transcript || '';

  // Reset enhancement state ONLY when a genuinely NEW session begins or records
  useEffect(() => {
    if (status.state === 'recording') {
      setIsDismissed(false);
      setEnhancedText(null);
      setEnhanced(false);
    } else if (status.session_id && status.session_id !== lastSessionIdRef.current) {
      lastSessionIdRef.current = status.session_id;
      setIsDismissed(false);
      setEnhancedText(null);
      setEnhanced(false);
    }
  }, [status.session_id, status.state]);

  // Ensure pill is immediately shown and safely positioned on mount
  useEffect(() => {
    applyTheme('light');

    if (isNativeTauri()) {
      safeInvoke('show_pill_window');
      safeInvoke('clamp_pill_position_cmd');

      let unlisten: (() => void) | undefined;
      const appWin = getCurrentWindow();
      appWin.onMoved(() => {
        safeInvoke('clamp_pill_position_cmd');
      }).then((fn) => {
        unlisten = fn;
      });

      return () => {
        if (unlisten) unlisten();
      };
    }
  }, []);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleMouseDown = async (e: React.MouseEvent) => {
    if (e.button === 0 && isNativeTauri()) {
      const target = e.target as HTMLElement;
      if (!target.closest('button')) {
        try {
          const appWin = getCurrentWindow();
          await appWin.startDragging();
          // After dragging finishes, enforce strict boundary clamping above macOS Dock and below notch
          await safeInvoke('clamp_pill_position_cmd');
        } catch (err) {
          console.warn('Native drag failed:', err);
        }
      }
    }
  };

  const handleToggleTray = async () => {
    const next = !isTrayExpanded;
    setIsTrayExpanded(next);
    try {
      const win = getCurrentWindow();
      const pos = await win.outerPosition();
      const mon = await currentMonitor();
      const scale = mon ? mon.scaleFactor : 1;
      const screenH = mon ? mon.size.height / scale : 900;
      const currentY = pos.y / scale;
      const dir = currentY > (screenH / 2) ? 'up' : 'down';
      setExpandDirection(dir);
      await safeInvoke('resize_pill_window', { expanded: next, direction: dir });
    } catch (err) {
      console.warn('Resize tray failed:', err);
    }
  };

  const handleCopy = () => {
    if (!currentActiveText.trim()) return;
    onCopyLast(currentActiveText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleInsert = async () => {
    const textToInsert = currentActiveText.trim();
    if (!textToInsert) return;

    try {
      if (status.recovery_id) {
        await safeInvoke('insert_into_selected_field', {
          id: status.recovery_id,
          text: textToInsert,
        });
      } else {
        await safeInvoke('insert_into_selected_field', {
          id: 0,
          text: textToInsert,
        });
      }
      setInserted(true);
      setTimeout(() => {
        setInserted(false);
      }, 1800);
    } catch (err) {
      console.warn('Insert failed:', err);
      handleCopy();
    }
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`${
        compact
          ? `w-full flex ${isTrayExpanded && expandDirection === 'up' ? 'flex-col-reverse' : 'flex-col'} items-center justify-center`
          : `fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex ${isTrayExpanded && expandDirection === 'up' ? 'flex-col-reverse' : 'flex-col'} items-center justify-center`
      } select-none bg-transparent`}
      style={{ background: 'transparent' }}
    >
      {/* Pill Capsule or Free-Floating Mascot Companion */}
      {isMascotMode && !isRecording && !isTranscribing && (!isDone || isDismissed) && (!nowPlaying || !nowPlaying.is_playing) ? (
        /* TRUE LIVING DESKTOP MASCOT COMPANION (WHEN IDLE ONLY) WITH DEDICATED HUB BUTTON */
        <div
          data-tauri-drag-region
          onMouseDown={handleMouseDown}
          className="group relative flex items-center justify-center cursor-pointer select-none pt-6 pb-2 px-4 gap-3 overflow-visible border-none"
          title={`${selectedAvatar.toUpperCase()} Companion • Click to speak`}
        >
          {/* Living Mascot */}
          <div
            onClick={handleMascotClick}
            className="flex flex-col items-center justify-center shrink-0 cursor-pointer"
          >
            <div className={`${
              mascotAction === 'walk' ? 'anim-mascot-walk' :
              mascotAction === 'jump' ? 'anim-mascot-jump' :
              mascotAction === 'sit' ? 'anim-mascot-sit' :
              mascotAction === 'sleep' ? 'anim-mascot-sleep' :
              'anim-mascot-float'
            } group-hover:scale-105 active:scale-95 transition-transform duration-200 overflow-visible`}>
              <Mascot
                size={54}
                state="idle"
                avatar={selectedAvatar}
                action={mascotAction}
                interactive
              />
            </div>
            {/* Floating ground shadow */}
            <div className="w-10 h-1.5 bg-black/35 rounded-full blur-[1px] mt-1 anim-shadow-pulse pointer-events-none" />
          </div>

          {/* Floating quick avatar, action & pill switch controls (shows on hover) */}
          <div className="absolute -bottom-7 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30 bg-[#07514C]/90 backdrop-blur-md px-2 py-0.5 rounded-full border border-[#DDA44D]/30 shadow-lg">
            <button
              data-tauri-no-drag
              onClick={handleCycleAvatar}
              className="text-[#DDA44D] hover:text-white text-[8px] font-pixel px-1.5 py-0.5 rounded cursor-pointer transition-colors"
              title="Cycle Avatar (Bot -> Owl -> Cat)"
            >
              {selectedAvatar.toUpperCase()}
            </button>
            <span className="text-white/30 text-[8px]">•</span>
            {(['float', 'walk', 'jump', 'sit', 'sleep'] as MascotAction[]).map((act) => (
              <button
                key={act}
                data-tauri-no-drag
                onClick={(e) => {
                  e.stopPropagation();
                  setMascotAction(act);
                }}
                className={`text-[8px] font-pixel px-1 py-0.5 rounded uppercase transition-colors ${
                  mascotAction === act ? 'bg-[#DDA44D] text-[#212121] font-bold' : 'text-white/70 hover:text-white'
                }`}
                title={`Make pet ${act}`}
              >
                {act}
              </button>
            ))}
            <span className="text-white/30 text-[8px]">•</span>
            <button
              data-tauri-no-drag
              onClick={handleToggleMascotMode}
              className="text-[#DA6C4C] hover:text-[#FF8A65] text-[8px] font-pixel px-1.5 py-0.5 rounded cursor-pointer transition-colors"
              title="Switch to Full Pill"
            >
              PILL
            </button>
          </div>
        </div>
      ) : (
        <div
          data-tauri-drag-region
          onMouseDown={handleMouseDown}
          className={`voxquest-pill-capsule flex items-center justify-between gap-2 px-3.5 py-1.5 rounded-full border-2 transition-all duration-300 ease-out cursor-grab active:cursor-grabbing ${
            isRecording
              ? 'w-[316px] bg-cream dark:bg-darkTealSurface border-terracotta dark:border-[#FF7A59] shadow-lg dark:shadow-[0_0_16px_rgba(255,122,89,0.4)]'
              : isTranscribing
              ? 'w-[316px] bg-cream dark:bg-darkTealSurface border-darkTeal dark:border-amber shadow-lg dark:shadow-[0_0_16px_rgba(221,164,77,0.4)]'
              : isDone && !isDismissed
              ? status.state === 'recovery_required'
                ? 'w-[316px] bg-cream dark:bg-darkTealSurface border-amber dark:border-amber shadow-lg'
                : 'w-[316px] bg-cream dark:bg-darkTealSurface border-darkTeal dark:border-[#34A89E] shadow-lg'
              : 'w-[316px] bg-cream dark:bg-darkTealSurface border-charcoal/40 hover:border-darkTeal dark:border-[#3A4350] dark:hover:border-[#34A89E] shadow-md'
          } h-[44px]`}
        >
          {isRecording ? (
            <>
              {/* Left: Clean Recording status */}
              <div className="shrink-0 flex items-center gap-1.5 font-sans pl-1">
                <span className="relative flex h-2.5 w-2.5 items-center justify-center shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-terracotta opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-terracotta shadow-xs" />
                </span>
                <span className="text-[11px] font-bold tracking-wider text-terracotta dark:text-[#FF8A65] uppercase">
                  Listening
                </span>
                <span className="text-[11px] font-mono font-bold text-terracotta dark:text-[#FF8A65] bg-terracotta/10 dark:bg-terracotta/20 px-1.5 py-0.5 rounded border border-terracotta/30">
                  {formatSeconds(status.elapsed_seconds)}
                </span>
              </div>
              {/* Center: Live Soundwave Visualizer */}
              <div
                data-tauri-drag-region
                className="shrink-0 flex items-center justify-center pointer-events-none px-1"
              >
                <AudioWaveform
                  isRecording={true}
                  isTranscribing={false}
                  barCount={10}
                  theme={isDark ? 'dark' : 'light'}
                />
              </div>
              {/* Right: Stop Recording Button */}
              <div className="shrink-0 flex items-center pr-0.5">
                <button
                  data-tauri-no-drag
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                  }}
                  className="p-1.5 rounded-full bg-terracotta text-white hover:bg-terracotta/90 shadow-xs transition-all active:scale-95 cursor-pointer"
                  title="Stop recording"
                  aria-label="Stop recording"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              </div>
            </>
          ) : isTranscribing ? (
            <>
              {/* Left: Clean Transcribing Spinner */}
              <div className="shrink-0 flex items-center gap-2 font-sans pl-1">
                <span className="w-3.5 h-3.5 border-2 border-darkTeal dark:border-amber border-t-transparent rounded-full animate-spin shrink-0" />
                <span className="text-[11px] font-bold tracking-wide text-darkTeal dark:text-[#DFDFD4] transcribing-shimmer shrink-0">
                  Transcribing...
                </span>
              </div>
              {/* Center: Transcribing Soundwave */}
              <div
                data-tauri-drag-region
                className="shrink-0 flex items-center justify-center pointer-events-none px-1"
              >
                <AudioWaveform
                  isRecording={false}
                  isTranscribing={true}
                  barCount={8}
                  theme={isDark ? 'dark' : 'light'}
                />
              </div>
              <div className="w-7 shrink-0" />
            </>
          ) : isDone && !isDismissed ? (
            <>
              {/* Left: Clean Pasted Status */}
              <div className="shrink-0 flex items-center gap-1.5 pl-1 font-sans">
                <Check className="w-3.5 h-3.5 text-darkTeal dark:text-[#34A89E] shrink-0 stroke-[2.5]" />
                <span className="text-[11px] font-bold text-darkTeal dark:text-[#DFDFD4] tracking-wide">
                  {status.message?.startsWith('Opened ')
                    ? 'Opened'
                    : status.message?.startsWith('Searching')
                    ? 'Searching'
                    : status.message?.startsWith('Playing')
                    ? 'Playing'
                    : status.message?.startsWith('Drafted')
                    ? 'Drafted'
                    : status.message?.toLowerCase().includes('service')
                    ? 'At Your Service!'
                    : enhanced
                    ? 'Enhanced'
                    : 'Pasted'}
                </span>
              </div>
            {/* Center: Ambient Soundwave */}
            <div
              data-tauri-drag-region
              className="shrink-0 flex items-center justify-center pointer-events-none px-1"
            >
              <AudioWaveform
                isRecording={false}
                isTranscribing={false}
                barCount={8}
                theme={isDark ? 'dark' : 'light'}
              />
            </div>
            {/* Right: Copy & Next Dictation Mic */}
            <div className="shrink-0 flex items-center gap-1.5 pr-0.5">
              <button
                data-tauri-no-drag
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy();
                }}
                className={`p-1.5 rounded-full transition-all border cursor-pointer ${
                  copied
                    ? 'bg-darkTeal text-cream border-darkTeal'
                    : 'bg-white text-charcoal border-charcoal/20 hover:bg-black/5 active:scale-95'
                }`}
                title="Copy transcript to clipboard"
                aria-label="Copy transcript"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-amber" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-charcoal" />
                )}
              </button>
              {status.state === 'recovery_required' && (
                <button
                  data-tauri-no-drag
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInsert();
                  }}
                  className={`p-1.5 rounded-full transition-all border cursor-pointer ${
                    inserted
                      ? 'bg-darkTeal text-cream border-darkTeal'
                      : 'bg-white text-darkTeal border-charcoal/20 hover:bg-black/5 active:scale-95'
                  }`}
                  title="Paste directly into your active app"
                  aria-label="Paste to App"
                >
                  {inserted ? (
                    <Check className="w-3.5 h-3.5 text-amber" />
                  ) : (
                    <CornerDownLeft className="w-3.5 h-3.5 text-darkTeal" />
                  )}
                </button>
              )}
              <button
                data-tauri-no-drag
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                className="group relative p-1.5 rounded-full bg-darkTeal text-white hover:bg-darkTeal/90 shadow-xs transition-all active:scale-95 cursor-pointer anim-mic-halo"
                title="Click to dictate"
                aria-label="Start dictation"
              >
                <Mic className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" />
              </button>
            </div>
          </>
        ) : nowPlaying && nowPlaying.is_playing ? (
          /* MUTUALLY EXCLUSIVE: When music is PLAYING -> Now Playing Island ONLY */
          <>
            {/* Left: Hub Trigger */}
            <button
              type="button"
              data-tauri-no-drag
              onClick={(e) => {
                e.stopPropagation();
                handleToggleTray();
              }}
              className="hover:scale-110 active:scale-95 transition-transform cursor-pointer shrink-0 pl-1 text-darkTeal dark:text-amber"
              title="Click to open Hub"
              aria-label="Open Hub"
            >
              <Radio className="w-3.5 h-3.5" />
            </button>

            {/* Middle: Source Pill + Track Name */}
            <div className="flex-1 min-w-0 flex items-center justify-between gap-1.5 px-1 font-sans">
              <div
                className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden"
                title={`${nowPlaying.title} • ${nowPlaying.source}`}
              >
                <span
                  className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full shrink-0 tracking-wider ${
                    nowPlaying.source.toLowerCase().includes('youtube')
                      ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                      : nowPlaying.source.toLowerCase().includes('spotify')
                      ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-700 border border-rose-500/20'
                  }`}
                >
                  {nowPlaying.source}
                </span>
                <span className="text-[11px] font-semibold text-charcoal/90 truncate tracking-tight">
                  {nowPlaying.title}
                </span>
              </div>

              {/* Floating Media Controls */}
              <div className="flex items-center gap-0.5 shrink-0 bg-black/5 rounded-full px-1 py-0.5 border border-charcoal/10">
                <button
                  data-tauri-no-drag
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMediaControl('previous');
                  }}
                  className="p-1 rounded-full text-darkTeal hover:bg-black/10 active:scale-90 transition-transform cursor-pointer"
                  title="Previous Track"
                  aria-label="Previous track"
                >
                  <SkipBack className="w-2.5 h-2.5 fill-current" />
                </button>
                <button
                  data-tauri-no-drag
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMediaControl('playpause');
                  }}
                  className="p-1 rounded-full text-darkTeal hover:bg-black/10 active:scale-90 transition-transform cursor-pointer"
                  title="Pause"
                  aria-label="Pause"
                >
                  <Pause className="w-2.5 h-2.5 fill-current" />
                </button>
                <button
                  data-tauri-no-drag
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMediaControl('next');
                  }}
                  className="p-1 rounded-full text-darkTeal hover:bg-black/10 active:scale-90 transition-transform cursor-pointer"
                  title="Next Track"
                  aria-label="Next track"
                >
                  <SkipForward className="w-2.5 h-2.5 fill-current" />
                </button>
              </div>
            </div>

            {/* Right: Hub Toggle & Mic Button */}
            <div className="shrink-0 flex items-center gap-1.5 pl-1 pr-0.5">
              <button
                data-tauri-no-drag
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleTray();
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 active:scale-95 shrink-0 border ${
                  isTrayExpanded
                    ? 'bg-darkTeal dark:bg-darkTealAccent text-white border-amber shadow-xs cursor-pointer'
                    : 'bg-black/5 dark:bg-darkTealElevated hover:bg-darkTeal hover:text-white dark:hover:bg-darkTealBorder text-charcoal/90 dark:text-[#DFDFD4] border-charcoal/25 hover:border-darkTeal cursor-pointer'
                }`}
                title={isTrayExpanded ? 'Close Productivity Hub' : 'Open Productivity Hub'}
                aria-label="Toggle Hub"
              >
                {isTrayExpanded ? (
                  <X className="w-3 h-3 text-amber shrink-0" />
                ) : (
                  <LayoutGrid className="w-3.5 h-3.5 text-darkTeal dark:text-amber shrink-0" />
                )}
                <span>{isTrayExpanded ? 'Close' : 'Hub'}</span>
              </button>

              <button
                data-tauri-no-drag
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                className="group relative p-1.5 rounded-full bg-darkTeal text-white hover:bg-darkTeal/90 shadow-xs transition-all active:scale-95 cursor-pointer anim-mic-halo shrink-0"
                title="Click to dictate (auto-pauses music)"
                aria-label="Start dictation"
              >
                <Mic className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" />
              </button>
            </div>
          </>
        ) : (
          /* MUTUALLY EXCLUSIVE: When music is NOT playing -> Clean Ready State ONLY */
          <>
            {/* Left: Clean Hub toggle & Ready status */}
            <div className="shrink-0 flex items-center gap-1.5 font-sans pl-1">
              <button
                type="button"
                data-tauri-no-drag
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleTray();
                }}
                className="hover:scale-110 active:scale-95 transition-transform cursor-pointer shrink-0 pr-0.5 text-darkTeal dark:text-amber"
                title="Click to open Hub"
                aria-label="Open Hub"
              >
                <Radio className="w-3.5 h-3.5" />
              </button>
              {noSpeechActive ? (
                <div className="flex items-center gap-1.5 animate-fadeIn">
                  <span className="w-2 h-2 rounded-full bg-amber shrink-0" />
                  <span className="text-[11px] font-bold text-charcoal/80">No speech</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2.5 w-2.5 items-center justify-center shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-darkTeal/40 opacity-30" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-darkTeal shadow-[0_0_6px_rgba(7,81,76,0.6)]" />
                  </span>
                  <span className="text-[11px] font-extrabold text-charcoal dark:text-[#DFDFD4] tracking-wide">
                    Ready
                  </span>
                </div>
              )}
            </div>

            {/* Center: Live Soundwave Visualizer */}
            <div
              data-tauri-drag-region
              className="shrink-0 flex items-center justify-center pointer-events-none px-1"
            >
              <AudioWaveform
                isRecording={false}
                isTranscribing={false}
                barCount={8}
                theme={isDark ? 'dark' : 'light'}
              />
            </div>

            {/* Right: Hub Toggle & Mic Button */}
            <div className="shrink-0 flex items-center gap-1.5 pl-1 pr-0.5">
              <button
                data-tauri-no-drag
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleTray();
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 active:scale-95 shrink-0 border ${
                  isTrayExpanded
                    ? 'bg-darkTeal dark:bg-darkTealAccent text-white border-amber shadow-xs cursor-pointer'
                    : 'bg-black/5 dark:bg-darkTealElevated hover:bg-darkTeal hover:text-white dark:hover:bg-darkTealBorder text-charcoal/90 dark:text-[#DFDFD4] border-charcoal/25 hover:border-darkTeal cursor-pointer'
                }`}
                title={isTrayExpanded ? 'Close Productivity Hub' : 'Open Productivity Hub'}
                aria-label="Toggle Hub"
              >
                {isTrayExpanded ? (
                  <X className="w-3 h-3 text-amber shrink-0" />
                ) : (
                  <LayoutGrid className="w-3 h-3 text-darkTeal dark:text-amber shrink-0" />
                )}
                <span>{isTrayExpanded ? 'Close' : 'Hub'}</span>
              </button>

              <button
                data-tauri-no-drag
                onMouseDown={(e) => e.stopPropagation()}
                onClick={handleToggleMascotMode}
                className="p-1.5 rounded-full bg-black/5 dark:bg-darkTealElevated hover:bg-amber hover:text-charcoal text-charcoal/80 dark:text-[#DFDFD4] transition-all cursor-pointer active:scale-95 shrink-0"
                title="Switch to VoxBot Companion Mode"
                aria-label="Switch to VoxBot Companion Mode"
              >
                <Bot className="w-3.5 h-3.5 text-darkTeal dark:text-amber shrink-0" />
              </button>

              <button
                data-tauri-no-drag
                disabled={isTranscribing}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  if (isTranscribing) return;
                  e.stopPropagation();
                  onToggle();
                }}
                className={`group relative p-1.5 rounded-full text-white shadow-xs transition-all active:scale-95 shrink-0 ${
                  isTranscribing
                    ? 'bg-darkTeal/30 dark:bg-darkTealAccent/40 text-white/50 cursor-wait'
                    : 'bg-darkTeal dark:bg-darkTealAccent hover:bg-darkTeal/90 dark:hover:bg-darkTealAccent/90 border border-transparent dark:border-mint/50 cursor-pointer anim-mic-halo'
                }`}
                title={isTranscribing ? 'Transcribing audio...' : 'Click to dictate'}
                aria-label="Start dictation"
              >
                <Mic className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
              </button>
            </div>
          </>
        )}
      </div>
      )}

      {/* Expandable Productivity Hub Tray */}
      {isTrayExpanded && (
        <div data-tauri-no-drag className={`w-full flex justify-center animate-fadeIn select-auto ${expandDirection === 'up' ? 'mb-2' : 'mt-2'}`}>
          <CapsuleTray
            lastTranscript={currentActiveText}
            onCopy={onCopyLast}
            onCollapse={handleToggleTray}
            expandDirection={expandDirection}
          />
        </div>
      )}
    </div>
  );
};
