import React, { useState, useEffect } from 'react';
import { Clock, Play, Pause, RotateCcw } from 'lucide-react';
import { safeInvoke } from '../../lib/ipc';

export const FocusTimerWidget: React.FC = () => {
  const [unit, setUnit] = useState<'min' | 'sec'>('min');
  const [customVal, setCustomVal] = useState<number>(25);
  const [initialSeconds, setInitialSeconds] = useState<number>(25 * 60);
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');

  // Voice command integration for timer ("set timer for 20 seconds", "start timer for 17 minutes", "pause timer", "reset timer")
  useEffect(() => {
    const onTimerCmd = (e: Event) => {
      const detail = (e as CustomEvent<{ action: 'start' | 'pause' | 'reset'; minutes?: number; seconds?: number }>).detail;
      if (!detail) return;
      if (detail.action === 'pause') {
        setIsRunning(false);
      } else if (detail.action === 'reset') {
        setIsRunning(false);
        setSecondsLeft(initialSeconds);
      } else if (detail.action === 'start') {
        if (detail.seconds && detail.seconds > 0) {
          const clampedSecs = Math.max(1, Math.min(10800, detail.seconds));
          if (clampedSecs < 60 || clampedSecs % 60 !== 0) {
            setUnit('sec');
            setCustomVal(clampedSecs);
          } else {
            setUnit('min');
            setCustomVal(Math.round(clampedSecs / 60));
          }
          setInitialSeconds(clampedSecs);
          setSecondsLeft(clampedSecs);
        } else if (detail.minutes && detail.minutes > 0) {
          const clamped = Math.max(1, Math.min(180, detail.minutes));
          const secs = clamped * 60;
          setUnit('min');
          setCustomVal(clamped);
          setInitialSeconds(secs);
          setSecondsLeft(secs);
        }
        setIsRunning(true);
      }
    };
    window.addEventListener('voxquest-timer-command', onTimerCmd);
    return () => window.removeEventListener('voxquest-timer-command', onTimerCmd);
  }, [initialSeconds]);

  // Sync active timer to VoxBot visor display
  useEffect(() => {
    try {
      if (isRunning && secondsLeft > 0) {
        const endAt = Date.now() + secondsLeft * 1000;
        localStorage.setItem(
          'voxquest_active_timer',
          JSON.stringify({ endAt, label: mode === 'break' ? 'Break' : 'Focus Timer' })
        );
      } else {
        localStorage.removeItem('voxquest_active_timer');
      }
      window.dispatchEvent(new Event('voxquest-timer-sync'));
    } catch {}
  }, [isRunning, mode]);

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
  }, [isRunning, secondsLeft, mode]);

  const applyDuration = (val: number, nextUnit: 'min' | 'sec' = unit, nextMode: 'focus' | 'break' = mode) => {
    const clamped = Math.max(1, Math.min(nextUnit === 'sec' ? 3600 : 180, val || 1));
    const secs = nextUnit === 'sec' ? clamped : clamped * 60;
    setMode(nextMode);
    setUnit(nextUnit);
    setCustomVal(clamped);
    setIsRunning(false);
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

  const progressPercent = initialSeconds > 0 ? Math.max(0, Math.min(100, ((initialSeconds - secondsLeft) / initialSeconds) * 100)) : 0;

  return (
    <div
      data-tauri-no-drag
      className="bg-white dark:bg-darkTealSurface rounded-2xl p-4 border border-charcoal/15 dark:border-darkTealBorder shadow-sm space-y-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-stone-50 dark:bg-darkTealCanvas border border-charcoal/10 dark:border-darkTealBorder flex items-center justify-center text-terracotta">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="font-mono text-2xl font-extrabold text-charcoal dark:text-cream tracking-tight tabular-nums leading-none">
              {formatTimer(secondsLeft)}
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-[10px]">
              <button
                type="button"
                onClick={() => applyDuration(mode === 'focus' ? customVal : 25, unit, 'focus')}
                className={`font-bold cursor-pointer ${
                  mode === 'focus' ? 'text-darkTeal dark:text-mint underline underline-offset-4' : 'text-charcoal/50 dark:text-sage'
                }`}
              >
                Focus
              </button>
              <span className="text-charcoal/25">·</span>
              <button
                type="button"
                onClick={() => applyDuration(5, 'min', 'break')}
                className={`font-bold cursor-pointer ${
                  mode === 'break' ? 'text-terracotta underline underline-offset-4' : 'text-charcoal/50 dark:text-sage'
                }`}
              >
                Break
              </button>
              <span className="text-charcoal/25">·</span>
              <input
                type="number"
                min={1}
                max={unit === 'sec' ? 3600 : 180}
                value={customVal}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v)) applyDuration(v, unit, mode);
                }}
                aria-label="Timer value"
                className="w-10 text-center font-mono font-bold text-[11px] bg-transparent border-b border-charcoal/25 dark:border-darkTealBorder focus:border-darkTeal focus:outline-none text-charcoal dark:text-cream"
              />
              <button
                type="button"
                onClick={() => applyDuration(customVal, unit === 'min' ? 'sec' : 'min', mode)}
                className="text-darkTeal dark:text-mint font-bold hover:underline cursor-pointer"
                title="Switch between seconds and minutes"
              >
                {unit}
              </button>
            </div>
          </div>
        </div>

        {/* Clean Play / Reset Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsRunning(!isRunning)}
            className="w-9 h-9 rounded-full bg-darkTeal dark:bg-darkTealAccent text-cream hover:bg-darkTeal/90 flex items-center justify-center shadow-xs transition-all active:scale-95 cursor-pointer"
            title={isRunning ? 'Pause' : 'Start'}
            aria-label={isRunning ? 'Pause timer' : 'Start timer'}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="w-8 h-8 rounded-full text-charcoal/60 dark:text-cream/70 hover:bg-stone-100 dark:hover:bg-darkTealElevated flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            title="Reset"
            aria-label="Reset timer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Minimal Progress Bar */}
      <div className="w-full h-1 bg-stone-100 dark:bg-darkTealElevated rounded-full overflow-hidden">
        <div
          className="h-full bg-terracotta rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Subtle Quick-Time Shortcuts (Seconds & Minutes) */}
      <div className="flex items-center gap-3 text-[10px] text-charcoal/55 dark:text-sage">
        {[
          { val: 10, u: 'sec' as const, label: '10s' },
          { val: 20, u: 'sec' as const, label: '20s' },
          { val: 5, u: 'min' as const, label: '5m' },
          { val: 15, u: 'min' as const, label: '15m' },
          { val: 25, u: 'min' as const, label: '25m' },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => applyDuration(item.val, item.u, item.u === 'min' && item.val <= 5 && mode === 'break' ? 'break' : 'focus')}
            className={`font-mono cursor-pointer transition-colors ${
              customVal === item.val && unit === item.u
                ? 'font-bold text-darkTeal dark:text-mint underline underline-offset-4'
                : 'hover:text-charcoal dark:hover:text-cream'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};
