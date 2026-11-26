import React, { useEffect, useRef } from 'react';
import { safeListen } from '../lib/ipc';

interface AudioWaveformProps {
  isRecording: boolean;
  isTranscribing: boolean;
  liveLevel?: number; // 0.0 to 1.0 (optional fallback)
  barCount?: number;
  theme?: 'dark' | 'light';
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isRecording,
  isTranscribing,
  liveLevel = 0,
  barCount = 10,
  theme = 'light',
}) => {
  // Balanced bell curve weights across 10 compact bars (space-efficient, natural)
  const weights = [0.25, 0.45, 0.70, 0.90, 1.0, 1.0, 0.90, 0.70, 0.45, 0.25];
  const count = Math.min(barCount, weights.length);

  const containerRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);
  const liveLevelRef = useRef<number>(liveLevel);
  const heightsRef = useRef<number[]>(weights.slice(0, count).map((w) => 4 + w * 6));
  const smoothedLevelRef = useRef<number>(0.15);

  // Directly listen to audio-level IPC without causing parent React component re-renders
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    safeListen<number>('audio-level', (e) => {
      liveLevelRef.current = e.payload;
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // Sync liveLevel prop if passed from external source
  useEffect(() => {
    if (liveLevel !== undefined && liveLevel > 0) {
      liveLevelRef.current = liveLevel;
    }
  }, [liveLevel]);

  useEffect(() => {
    let running = true;
    let lastRenderTime = 0;

    const render = (currentTime: number) => {
      if (!running) return;

      // Zero-waste: pause rendering entirely when tab or window is hidden
      if (typeof document !== 'undefined' && document.hidden) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      // Energy-conscious throttling: 60fps when active (recording/transcribing),
      // 20fps when idle. Keeps the ambient breathing wave smooth while drawing virtually 0% CPU.
      const isIdle = !isRecording && !isTranscribing;
      if (isIdle && currentTime - lastRenderTime < 50) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }
      lastRenderTime = currentTime;

      timeRef.current += 0.04;
      const t = timeRef.current;
      const rawLevel = liveLevelRef.current;
      smoothedLevelRef.current += (rawLevel - smoothedLevelRef.current) * 0.18;
      const currentLevel = smoothedLevelRef.current;
      const heights = heightsRef.current;

      if (isRecording) {
        // Natural speech modulation without weird bouncing
        const amp = Math.min(1.0, Math.max(0.1, currentLevel * 2.0));

        for (let i = 0; i < count; i++) {
          const w = weights[i] || 0.5;
          const harmonic = Math.sin(t * 2.0 + i * 0.5) * 0.3 + 0.7;
          const targetH = 4 + (w * 4) + (amp * 9 * w * harmonic);
          heights[i] += (Math.min(16, Math.max(3.5, targetH)) - heights[i]) * 0.22;

          const barEl = barsRef.current[i];
          if (barEl) {
            barEl.style.height = `${heights[i].toFixed(1)}px`;
            barEl.style.backgroundColor = theme === 'dark' ? '#FF7A59' : '#DA6C4C';
            barEl.style.opacity = '1.0';
            barEl.style.boxShadow = theme === 'dark' ? '0 0 6px rgba(255, 122, 89, 0.6)' : 'none';
          }
        }
      } else if (isTranscribing) {
        // Fluid golden-amber neural ripple wave across bars (distinct from idle teal)
        for (let i = 0; i < count; i++) {
          const w = weights[i] || 0.6;
          const wave = Math.sin(t * 3.0 - i * 0.55) * 0.5 + 0.5;
          const targetH = 4 + wave * 10 * w;
          heights[i] += (targetH - heights[i]) * 0.24;

          const barEl = barsRef.current[i];
          if (barEl) {
            barEl.style.height = `${heights[i].toFixed(1)}px`;
            barEl.style.backgroundColor = '#DDA44D';
            barEl.style.opacity = `${(0.7 + wave * 0.3).toFixed(2)}`;
            barEl.style.boxShadow = '0 0 6px rgba(221, 164, 77, 0.55)';
          }
        }
      } else {
        // Serene ambient breathing ripple when idle (crisp Linen Cream in dark mode)
        for (let i = 0; i < count; i++) {
          const w = weights[i] || 0.5;
          const breathe = Math.sin(t * 1.5 + i * 0.6) * 0.5 + 0.5;
          const targetH = 3.5 + (w * 2.5) + (breathe * 3.5 * w);
          heights[i] += (targetH - heights[i]) * 0.12;

          const barEl = barsRef.current[i];
          if (barEl) {
            barEl.style.height = `${heights[i].toFixed(1)}px`;
            barEl.style.backgroundColor = theme === 'dark' ? '#DFDFD4' : '#07514C';
            barEl.style.opacity = theme === 'dark' ? `${(0.70 + breathe * 0.30).toFixed(2)}` : `${(0.45 + breathe * 0.35).toFixed(2)}`;
            barEl.style.boxShadow = theme === 'dark' ? '0 0 4px rgba(223, 223, 212, 0.3)' : 'none';
          }
        }
      }

      if (running) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isRecording, isTranscribing, theme, count]);

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center gap-[3px] h-[22px] px-1 select-none pointer-events-none"
    >
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            barsRef.current[i] = el;
          }}
          className="w-[3px] rounded-full"
          style={{
            height: `${heightsRef.current[i] || 4}px`,
            backgroundColor: '#07514C',
            opacity: 0.65,
          }}
        />
      ))}
    </div>
  );
};
