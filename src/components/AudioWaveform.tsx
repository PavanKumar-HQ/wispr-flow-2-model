import React, { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  isRecording: boolean;
  isTranscribing: boolean;
  liveLevel: number; // 0.0 to 1.0
  barCount?: number;
  theme?: 'dark' | 'light';
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isRecording,
  isTranscribing,
  liveLevel,
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

  // Sync liveLevel ref without recreating the animation frame loop
  useEffect(() => {
    liveLevelRef.current = liveLevel;
  }, [liveLevel]);

  useEffect(() => {
    let running = true;

    const render = () => {
      timeRef.current += 0.09;
      const t = timeRef.current;
      const currentLevel = liveLevelRef.current;
      const heights = heightsRef.current;

      if (isRecording) {
        // High-sensitivity logarithmic voice fluctuation
        const amp = Math.min(1.0, Math.max(0.12, currentLevel * 2.2));

        for (let i = 0; i < count; i++) {
          const w = weights[i] || 0.5;
          // Organic voice harmonics ripple
          const harmonic = Math.sin(t * 4.6 + i * 0.85) * 0.5 + 0.5;
          const targetH = 4 + (w * 5) + (amp * 16 * w) + (harmonic * amp * 7);
          // Springy physics interpolation (40% step per frame)
          heights[i] += (Math.min(26, Math.max(4, targetH)) - heights[i]) * 0.42;

          const barEl = barsRef.current[i];
          if (barEl) {
            barEl.style.height = `${heights[i].toFixed(1)}px`;
            barEl.style.backgroundColor = theme === 'dark' ? '#DDA44D' : '#DA6C4C';
            barEl.style.opacity = `${(0.75 + amp * 0.25).toFixed(2)}`;
            if (amp > 0.3) {
              barEl.style.boxShadow = theme === 'dark'
                ? '0 0 5px rgba(221, 164, 77, 0.5)'
                : '0 0 6px rgba(218, 108, 76, 0.45)';
            } else {
              barEl.style.boxShadow = 'none';
            }
          }
        }
      } else if (isTranscribing) {
        // Smooth flowing ripple across bars
        for (let i = 0; i < count; i++) {
          const w = weights[i] || 0.6;
          const wave = Math.sin(t * 3.8 - i * 0.65) * 0.5 + 0.5;
          const targetH = 4 + wave * 14 * w;
          heights[i] += (targetH - heights[i]) * 0.35;

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
          const breathing = Math.sin(t * 1.4 + i * 0.25) * 1.5;
          const resting = 3.5 + w * 5 + breathing;
          heights[i] += (resting - heights[i]) * 0.2;

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
