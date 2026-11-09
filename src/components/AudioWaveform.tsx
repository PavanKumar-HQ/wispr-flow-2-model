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
  barCount = 11,
  theme = 'light',
}) => {
  // Gaussian bell curve weights for iconic capsule waveform
  const weights = [0.28, 0.48, 0.72, 0.9, 1.0, 1.0, 0.9, 0.72, 0.48, 0.28];
  const count = Math.min(barCount, weights.length);

  const containerRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);
  const liveLevelRef = useRef<number>(liveLevel);
  const heightsRef = useRef<number[]>(weights.slice(0, count).map((w) => 4 + w * 6));
  const smoothedLevelRef = useRef<number>(0.1);

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
    // Zero idle power optimization: if idle, render resting state once and pause animation loop
    if (!isRecording && !isTranscribing) {
      for (let i = 0; i < count; i++) {
        const w = weights[i] || 0.5;
        const resting = 3.5 + w * 4;
        heightsRef.current[i] = resting;
        const barEl = barsRef.current[i];
        if (barEl) {
          barEl.style.height = `${resting.toFixed(1)}px`;
          barEl.style.backgroundColor = theme === 'dark' ? 'rgba(223, 223, 212, 0.65)' : '#0F5B57';
          barEl.style.opacity = '0.65';
          barEl.style.boxShadow = 'none';
        }
      }
      return;
    }

    let running = true;

    const render = () => {
      timeRef.current += 0.04;
      const t = timeRef.current;
      const rawLevel = liveLevelRef.current;
      // Exponential moving average (EMA) filter on incoming audio levels to eliminate frame jitter
      smoothedLevelRef.current += (rawLevel - smoothedLevelRef.current) * 0.16;
      const currentLevel = smoothedLevelRef.current;
      const heights = heightsRef.current;

      if (isRecording) {
        // Smooth logarithmic voice modulation with controlled amplitude
        const amp = Math.min(1.0, Math.max(0.08, currentLevel * 1.8));

        for (let i = 0; i < count; i++) {
          const w = weights[i] || 0.5;
          // Fluid acoustic harmonic ripple (gentle rolling undulation instead of erratic jitter)
          const harmonic = Math.sin(t * 2.2 + i * 0.45) * 0.3 + 0.7;
          const targetH = 4 + (w * 4) + (amp * 11 * w * harmonic);
          // Fluid viscous dampening (18% step per frame for soft, liquid motion)
          heights[i] += (Math.min(18, Math.max(3.5, targetH)) - heights[i]) * 0.18;

          const barEl = barsRef.current[i];
          if (barEl) {
            barEl.style.height = `${heights[i].toFixed(1)}px`;
            barEl.style.backgroundColor = theme === 'dark' ? '#DDA44D' : '#DA6C4C';
            barEl.style.opacity = `${(0.75 + amp * 0.25).toFixed(2)}`;
            if (amp > 0.35) {
              barEl.style.boxShadow = theme === 'dark'
                ? '0 0 5px rgba(221, 164, 77, 0.4)'
                : '0 0 5px rgba(218, 108, 76, 0.35)';
            } else {
              barEl.style.boxShadow = 'none';
            }
          }
        }
      } else if (isTranscribing) {
        // Calm fluid ripple wave across bars
        for (let i = 0; i < count; i++) {
          const w = weights[i] || 0.6;
          const wave = Math.sin(t * 2.6 - i * 0.5) * 0.5 + 0.5;
          const targetH = 3.5 + wave * 9 * w;
          heights[i] += (targetH - heights[i]) * 0.2;

          const barEl = barsRef.current[i];
          if (barEl) {
            barEl.style.height = `${heights[i].toFixed(1)}px`;
            barEl.style.backgroundColor = theme === 'dark' ? '#B8CBC3' : '#07514C';
            barEl.style.opacity = `${(0.6 + wave * 0.4).toFixed(2)}`;
            barEl.style.boxShadow = 'none';
          }
        }
      } else {
        // Ambient resting breathing pulse
        for (let i = 0; i < count; i++) {
          const w = weights[i] || 0.5;
          const breathing = Math.sin(t * 1.2 + i * 0.2) * 1.0;
          const resting = 3.5 + w * 4 + breathing;
          heights[i] += (resting - heights[i]) * 0.15;

          const barEl = barsRef.current[i];
          if (barEl) {
            barEl.style.height = `${heights[i].toFixed(1)}px`;
            barEl.style.backgroundColor = theme === 'dark' ? 'rgba(223, 223, 212, 0.65)' : '#0F5B57';
            barEl.style.opacity = '0.65';
            barEl.style.boxShadow = 'none';
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
      className="flex items-center justify-center gap-[3px] h-[28px] px-1 select-none pointer-events-none"
    >
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            barsRef.current[i] = el;
          }}
          className="w-[2.5px] rounded-full"
          style={{
            height: `${heightsRef.current[i] || 4}px`,
            backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.65)' : '#1E3A34',
            opacity: 0.65,
          }}
        />
      ))}
    </div>
  );
};
