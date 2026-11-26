import React, { useState, useEffect } from 'react';
import { Clock, Play, Pause, RotateCcw } from 'lucide-react';
import { safeInvoke } from '../../lib/ipc';

export const FocusTimerWidget: React.FC = () => {
  const [initialSeconds, setInitialSeconds] = useState<number>(25 * 60);
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [mode, setMode] = useState<'focus' | 'short_break' | 'long_break'>('focus');

  // Timer ticker only active when running to preserve battery / 0% CPU idle
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            safeInvoke('send_system_notification_cmd', {
              title: 'Focus Timer Complete',
              message: mode === 'focus' ? 'Deep Focus session complete! Time for a break.' : 'Break finished! Ready to resume.',
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, secondsLeft]);

  const setTimerMode = (newMode: 'focus' | 'short_break' | 'long_break') => {
    setMode(newMode);
    setIsRunning(false);
    const secs = newMode === 'focus' ? 25 * 60 : newMode === 'short_break' ? 5 * 60 : 15 * 60;
    setInitialSeconds(secs);
    setSecondsLeft(secs);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSecondsLeft(initialSeconds);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = Math.max(0, Math.min(100, ((initialSeconds - secondsLeft) / initialSeconds) * 100));

  return (
    <div
      data-tauri-no-drag
      className="bg-white dark:bg-darkTealSurface rounded-2xl p-3.5 border border-charcoal/15 dark:border-darkTealBorder shadow-sm space-y-2.5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#F6F6F2] dark:bg-darkTealCanvas border border-charcoal/15 dark:border-darkTealBorder flex items-center justify-center text-terracotta shadow-xs">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-extrabold text-charcoal dark:text-cream tracking-tight">
                {formatTimer(secondsLeft)}
              </span>
              <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-terracotta/15 text-terracotta border border-terracotta/20">
                {mode === 'focus' ? 'Deep Focus' : mode === 'short_break' ? 'Short Break' : 'Rest'}
              </span>
            </div>
            <div className="text-[10px] text-charcoal/60 dark:text-sage font-medium">
              Speech recognition active
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="w-8 h-8 rounded-xl bg-darkTeal dark:bg-darkTealAccent text-cream hover:bg-darkTeal/90 dark:hover:bg-darkTealAccent/90 flex items-center justify-center shadow-xs transition-all active:scale-95 cursor-pointer"
            title={isRunning ? 'Pause Focus' : 'Start Focus'}
            aria-label={isRunning ? 'Pause timer' : 'Start timer'}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>
          <button
            onClick={handleReset}
            className="w-8 h-8 rounded-xl bg-[#F6F6F2] dark:bg-darkTealElevated text-charcoal/70 dark:text-cream/80 hover:bg-white dark:hover:bg-darkTealSurface hover:text-charcoal dark:hover:text-cream border border-charcoal/15 dark:border-darkTealBorder flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            title="Reset timer"
            aria-label="Reset timer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress line */}
      <div className="w-full h-1.5 bg-[#F0F0EA] dark:bg-darkTealElevated rounded-full overflow-hidden border border-transparent dark:border-darkTealBorder/50">
        <div
          className="h-full bg-terracotta rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Mode selectors */}
      <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-charcoal/15 dark:border-darkTealBorder">
        <button
          onClick={() => setTimerMode('focus')}
          className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all text-center cursor-pointer border ${
            mode === 'focus'
              ? 'bg-darkTeal dark:bg-darkTealAccent text-white border-darkTeal dark:border-mint/50 font-extrabold shadow-2xs'
              : 'bg-[#F6F6F2] dark:bg-darkTealElevated text-charcoal dark:text-cream border-charcoal/15 dark:border-darkTealBorder hover:bg-[#EBEBE4] dark:hover:bg-darkTealCanvas'
          }`}
        >
          25m Focus
        </button>
        <button
          onClick={() => setTimerMode('short_break')}
          className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all text-center cursor-pointer border ${
            mode === 'short_break'
              ? 'bg-darkTeal dark:bg-darkTealAccent text-white border-darkTeal dark:border-mint/50 font-extrabold shadow-2xs'
              : 'bg-[#F6F6F2] dark:bg-darkTealElevated text-charcoal dark:text-cream border-charcoal/15 dark:border-darkTealBorder hover:bg-[#EBEBE4] dark:hover:bg-darkTealCanvas'
          }`}
        >
          5m Break
        </button>
        <button
          onClick={() => setTimerMode('long_break')}
          className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all text-center cursor-pointer border ${
            mode === 'long_break'
              ? 'bg-darkTeal dark:bg-darkTealAccent text-white border-darkTeal dark:border-mint/50 font-extrabold shadow-2xs'
              : 'bg-[#F6F6F2] dark:bg-darkTealElevated text-charcoal dark:text-cream border-charcoal/15 dark:border-darkTealBorder hover:bg-[#EBEBE4] dark:hover:bg-darkTealCanvas'
          }`}
        >
          15m Break
        </button>
      </div>
    </div>
  );
};
