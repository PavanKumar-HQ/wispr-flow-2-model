import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Check, Copy, Wand2, RotateCcw, X, CornerDownLeft, RefreshCw, Zap, ExternalLink } from 'lucide-react';
import { SessionSnapshot, EnhancementResponse, EnhancementRequest, EnhancementMode } from '../types';
import { AudioWaveform } from './AudioWaveform';
import { safeListen, safeInvoke, isNativeTauri } from '../lib/ipc';
import { getCurrentWindow } from '@tauri-apps/api/window';

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
  const [liveLevel, setLiveLevel] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [enhancedText, setEnhancedText] = useState<string | null>(null);
  const [enhanced, setEnhanced] = useState<boolean>(false);
  const [activeEnhanceMode, setActiveEnhanceMode] = useState<EnhancementMode>('light_correction');
  const [inserted, setInserted] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [modelShiftNotice, setModelShiftNotice] = useState<string | null>(null);
  const [optimisticRecording, setOptimisticRecording] = useState<boolean>(false);
  const [optimisticStopping, setOptimisticStopping] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const recordingStartTimeRef = useRef<number | null>(null);
  const lastSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    safeListen<string>('technical-model-shifted', (e) => {
      setModelShiftNotice(e.payload);
      setTimeout(() => setModelShiftNotice(null), 5000);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  useEffect(() => {
    if (status.state === 'recording') {
      setOptimisticRecording(false);
    }
    if (
      status.state === 'transcribing' ||
      status.state === 'completed' ||
      status.state === 'idle' ||
      status.state === 'failed'
    ) {
      setOptimisticStopping(false);
      setOptimisticRecording(false);
    }
  }, [status.state]);

  const isTranscribing =
    status.state === 'transcribing' ||
    status.state === 'formatting' ||
    status.state === 'validating_target' ||
    status.state === 'inserting' ||
    status.state === 'stopping' ||
    optimisticStopping;

  const isRecording =
    (status.state === 'recording' || status.state === 'starting' || optimisticRecording) &&
    !isTranscribing;
  const hasTranscript = Boolean(status.last_transcript && status.last_transcript.trim().length > 0);
  const isDone = (status.state === 'completed' || status.state === 'recovery_required') && hasTranscript;

  // Monotonic session timer: strictly starts from 00:00 on every recording start
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRecording) {
      const now = Date.now();
      recordingStartTimeRef.current = now;
      setElapsedSeconds(0);
      const tick = () => {
        if (recordingStartTimeRef.current) {
          const diff = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
          setElapsedSeconds(diff);
        }
      };
      tick();
      interval = setInterval(tick, 200);
    } else {
      recordingStartTimeRef.current = null;
      setElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, status.session_id]);

  const currentActiveText = enhancedText || status.last_transcript || '';

  // Reset enhancement state ONLY when a genuinely NEW session begins or records
  // Never reset on 150ms snapshot poll ticks of timestamp_ms or last_transcript!
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

  // Listen to live microphone volume stream
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    safeListen<number>('audio-level', (e) => {
      setLiveLevel(e.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // Escape key dismisses the floating pill window immediately
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDismissed(true);
        safeInvoke('hide_pill_window');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
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
        } catch (err) {
          console.warn('Native drag failed:', err);
        }
      }
    }
  };

  const handleCopy = () => {
    if (!currentActiveText.trim()) return;
    onCopyLast(currentActiveText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleEnhance = async (targetMode: EnhancementMode = 'light_correction') => {
    const raw = (status.last_transcript || currentActiveText).trim();
    if (!raw || isEnhancing) return;

    setIsEnhancing(true);
    setActiveEnhanceMode(targetMode);
    try {
      const isPromptLike = raw.toLowerCase().startsWith('prompt')
        || raw.toLowerCase().startsWith('verify')
        || raw.toLowerCase().startsWith('write')
        || raw.toLowerCase().startsWith('create')
        || raw.toLowerCase().startsWith('generate')
        || raw.toLowerCase().startsWith('explain')
        || raw.toLowerCase().startsWith('fix')
        || raw.toLowerCase().startsWith('debug');

      const effectiveMode: EnhancementMode = targetMode === 'light_correction' && isPromptLike ? 'prompt' : targetMode;

      const req: EnhancementRequest = {
        session_id: status.session_id || null,
        text: raw,
        mode: effectiveMode,
        auto_replace: true,
      };
      const res = await safeInvoke<EnhancementResponse>('enhance_text_cmd', { request: req });
      if (res && res.enhanced_text) {
        setEnhancedText(res.enhanced_text);
        setEnhanced(true);
        onCopyLast(res.enhanced_text);

        // Immediately paste/insert the enhanced text into the active cursor
        try {
          await safeInvoke('insert_into_selected_field', {
            id: status.recovery_id || 0,
            text: res.enhanced_text,
          });
          setInserted(true);
          setTimeout(() => setInserted(false), 2000);
        } catch (insertErr) {
          console.warn('Auto-insert enhanced text failed:', insertErr);
        }
      }
    } catch (err) {
      console.warn('Pill enhance failed:', err);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleCycleMode = () => {
    const sequence: EnhancementMode[] = ['light_correction', 'prompt', 'professional', 'concise', 'natural'];
    const currentIdx = sequence.indexOf(activeEnhanceMode);
    const nextMode = sequence[(currentIdx + 1) % sequence.length];
    setActiveEnhanceMode(nextMode);
    handleEnhance(nextMode);
  };

  const handleRestoreOriginal = async () => {
    const orig = (status.last_transcript || '').trim();
    setEnhancedText(null);
    setEnhanced(false);
    if (orig) {
      onCopyLast(orig);
      await safeInvoke('insert_into_selected_field', { id: 0, text: orig });
    }
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
      data-tauri-drag-region
      onMouseDown={handleMouseDown}
      className={`${
        compact ? 'w-full h-full' : 'fixed bottom-8 left-1/2 -translate-x-1/2 z-50'
      } flex items-center justify-center select-none p-1`}
    >
      {/* Pill Capsule styled with exact theme: Light red when listening, Emerald when transcribing, Linen cream when idle/done */}
      <div
        data-tauri-drag-region
        onMouseDown={handleMouseDown}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-charcoal shadow-md backdrop-blur-sm transition-all duration-200 cursor-grab active:cursor-grabbing ${
          isRecording
            ? 'border-red-500 ring-2 ring-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.25)] bg-red-50/95'
            : isTranscribing
            ? 'border-emerald-500 ring-2 ring-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.25)] bg-emerald-50/50'
            : isDone && !isDismissed
            ? status.state === 'recovery_required'
              ? 'border-amber ring-2 ring-amber/30 bg-cream'
              : 'border-deepTeal ring-2 ring-deepTeal/20 bg-cream'
            : 'border-charcoal/30 hover:border-darkTeal bg-cream'
        } h-[42px] max-w-[430px]`}
      >
        {/* Left: Dynamic State Badge */}
        <div className="shrink-0 flex items-center gap-2 pl-0.5 font-sans">
          {isRecording ? (
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600 shadow-xs" />
              </div>
              <span className="text-[11px] font-black tracking-widest text-red-600 uppercase font-mono">
                Listening
              </span>
              <span className="text-[11px] font-mono font-bold text-red-700 bg-red-100/90 px-2 py-0.5 rounded-full border border-red-300 shadow-xs">
                {formatSeconds(elapsedSeconds)}
              </span>
            </div>
          ) : isTranscribing ? (
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center w-4 h-4 shrink-0">
                <span className="absolute w-4 h-4 rounded-full border-2 border-emerald-200" />
                <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
              <span className="text-[11px] font-bold text-emerald-600 font-mono tracking-wide transcribing-shimmer shrink-0">
                Transcribing...
              </span>
            </div>
          ) : isDone && !isDismissed ? (
            status.action_type === 'app_launch' ? (
              <div className="flex items-center gap-1.5 animate-fadeIn">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-600 shadow-sm" />
                <span className="text-[11px] font-bold text-darkTeal flex items-center gap-1">
                  <ExternalLink className="w-3 h-3 text-terracotta" />
                  <span>{status.action_target || 'App'} Opened</span>
                </span>
              </div>
            ) : status.state === 'recovery_required' ? (
              <div className="flex items-center gap-1.5">
                <span className="flex h-2.5 w-2.5 rounded-full bg-vq-amber shadow-sm" />
                <span className="text-[11px] font-bold text-vq-charcoal">
                  {enhanced ? 'Enhanced & Saved' : 'Saved in Recovery'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className={`flex h-2.5 w-2.5 rounded-full shadow-sm ${enhanced ? 'bg-amber animate-pulse' : 'bg-vq-tealDark'}`} />
                <span className="text-[11px] font-bold text-vq-tealDark">
                  {enhanced ? 'Enhanced & Pasted' : 'Pasted'}
                </span>
              </div>
            )
          ) : status.message && status.message.toLowerCase().includes('no speech') ? (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-vq-amber" />
              <span className="text-[11px] font-bold text-vq-charcoal">No speech heard</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-vq-tealDark/50" />
              <span className="text-[11px] font-bold text-vq-charcoal/70">Ready</span>
            </div>
          )}
        </div>

        {/* Center: Live Soundwave Visualizer */}
        <div
          data-tauri-drag-region
          className="shrink-0 flex items-center justify-center pointer-events-none px-1"
        >
          <AudioWaveform
            isRecording={isRecording}
            isTranscribing={isTranscribing}
            liveLevel={liveLevel}
            barCount={isRecording ? 10 : 8}
            theme="light"
          />
        </div>

        {/* Right: Actions */}
        <div className="shrink-0 flex items-center gap-1.5 pl-1.5 border-l border-vq-borderDark/20">
          {isRecording ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOptimisticStopping(true);
                onToggle();
              }}
              className="p-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-[0_0_10px_rgba(220,38,38,0.45)] transition-all active:scale-90 animate-pulse outline-none focus:outline-none focus:ring-0"
              title="Stop recording"
              aria-label="Stop recording"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : isDone && !isDismissed ? (
            <>
              {/* Proactive Adaptive Model Switch Badge */}
              {(modelShiftNotice || status.technical_suggestion) && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const text = modelShiftNotice || status.technical_suggestion || '';
                    const targetProfile = text.includes('Developer') ? 'developer' : 'balanced';
                    await safeInvoke('switch_speech_profile', { profile: targetProfile });
                  }}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber text-charcoal hover:bg-amber/90 transition-all border border-amber/40 shadow-xs flex items-center gap-1 active:scale-95 shrink-0 cursor-pointer animate-pulse outline-none focus:outline-none focus:ring-0"
                  title={modelShiftNotice || status.technical_suggestion || ''}
                  aria-label="Model shifted notification"
                >
                  <Zap className="w-3 h-3 text-darkTeal" />
                  <span>{(modelShiftNotice || status.technical_suggestion)?.includes('Toggled') ? '⚡ Shifted to Dev' : '⚡ Dev Active'}</span>
                </button>
              )}

              {/* Enhance Icon Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (enhanced) {
                    handleCycleMode();
                  } else {
                    handleEnhance();
                  }
                }}
                disabled={isEnhancing}
                className={`p-1.5 rounded-full transition-all border shadow-xs outline-none focus:outline-none focus:ring-0 ${
                  enhanced
                    ? 'bg-vq-tealDark text-amber border-vq-borderDark'
                    : 'bg-white text-amber-700 border-vq-borderDark/40 hover:bg-amber/10 active:scale-95'
                }`}
                title={enhanced ? `Enhanced (${activeEnhanceMode.replace('_', ' ')}). Click to cycle mode` : "Enhance grammar, clarity, or convert to prompt"}
                aria-label="Enhance transcript"
              >
                {isEnhancing ? (
                  <RefreshCw className="w-3.5 h-3.5 text-vq-tealDark animate-spin" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Restore Original Icon Button (appears when enhanced) */}
              {enhanced && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRestoreOriginal();
                  }}
                  className="p-1.5 rounded-full text-vq-charcoal/70 hover:text-vq-charcoal hover:bg-vq-surface transition-all border border-vq-borderDark/30 active:scale-95 outline-none focus:outline-none focus:ring-0"
                  title="Restore original recognized speech"
                  aria-label="Restore original"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Copy Icon Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy();
                }}
                className={`p-1.5 rounded-full transition-all border outline-none focus:outline-none focus:ring-0 ${
                  copied
                    ? 'bg-vq-sage text-vq-tealDark border-vq-sage'
                    : 'bg-white text-vq-charcoal border-vq-borderDark/30 hover:bg-vq-surface active:scale-95'
                }`}
                title="Copy to clipboard"
                aria-label="Copy transcript"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-vq-tealDark" /> : <Copy className="w-3.5 h-3.5 text-vq-charcoal" />}
              </button>

              {/* Insert / Paste Icon Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleInsert();
                }}
                className={`p-1.5 rounded-full transition-all border outline-none focus:outline-none focus:ring-0 ${
                  inserted
                    ? 'bg-vq-tealDark text-vq-cream border-vq-borderDark'
                    : 'bg-white text-vq-charcoal border-vq-borderDark/30 hover:bg-vq-surface active:scale-95'
                }`}
                title="Paste directly into your active app at your cursor position"
                aria-label="Paste to App"
              >
                {inserted ? <Check className="w-3.5 h-3.5 text-amber" /> : <CornerDownLeft className="w-3.5 h-3.5 text-vq-tealDark" />}
              </button>

              {/* Dismiss Icon Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDismissed(true);
                  safeInvoke('hide_pill_window');
                }}
                className="p-1.5 rounded-full text-vq-charcoal/40 hover:text-vq-terracotta hover:bg-vq-terracotta/10 transition-all ml-0.5 active:scale-95 outline-none focus:outline-none focus:ring-0"
                title="Dismiss pill"
                aria-label="Dismiss pill"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOptimisticRecording(true);
                onToggle();
              }}
              className="p-1.5 rounded-full bg-vq-tealDark text-vq-cream hover:bg-vq-tealDeep shadow-xs transition-all active:scale-95 outline-none focus:outline-none focus:ring-0"
              title="Click to dictate"
              aria-label="Start dictation"
            >
              <Mic className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
