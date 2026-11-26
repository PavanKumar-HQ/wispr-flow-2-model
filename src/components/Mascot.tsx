import React from 'react';

export type MascotState = 'idle' | 'listening' | 'transcribing' | 'success';

interface MascotProps {
  size?: number;
  className?: string;
  state?: MascotState;
  onClick?: (e: React.MouseEvent) => void;
  interactive?: boolean;
}

/**
 * VoxBot: The Official VoxQuest Retro Cybernetic Companion.
 * 
 * Features:
 * - Authentic 16-bit retro arcade aesthetic in Sovereign brand colors:
 *   Dark Teal (#07514C), Warm Amber (#DDA44D), Terracotta (#DA6C4C), Linen Cream (#DFDFD4).
 * - Curved CRT screen face with dynamic states:
 *   - 'idle': blinking pixel eyes [●_●] and glowing antenna
 *   - 'listening': active soundwave equalizer mouth [ ılılı ]
 *   - 'transcribing': computing gear eyes [o_o]
 *   - 'success': happy victory smile [^.^]
 * - 100% SVG + CSS keyframes for 0% CPU, zero battery drain, and instant responsiveness.
 */
export const Mascot: React.FC<MascotProps> = ({
  size = 36,
  className = '',
  state = 'idle',
  onClick,
  interactive = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center justify-center select-none ${
        interactive ? 'cursor-pointer group hover:scale-110 active:scale-95 transition-transform' : ''
      } ${className}`}
      style={{ width: size, height: size }}
      title={interactive ? 'VoxBot • Click to dictate' : 'VoxBot Companion'}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="w-full h-full overflow-visible drop-shadow-xs"
      >
        {/* Antenna with Pulsing Glow Node */}
        <line x1="50" y1="20" x2="50" y2="8" stroke="#212121" strokeWidth="4" strokeLinecap="round" />
        <line x1="50" y1="20" x2="50" y2="8" stroke="#DDA44D" strokeWidth="2.5" strokeLinecap="round" />
        <circle
          cx="50"
          cy="7"
          r="5"
          fill="#DDA44D"
          stroke="#212121"
          strokeWidth="2.5"
          className={state === 'listening' ? 'animate-ping' : ''}
        />
        <circle cx="50" cy="7" r="3.5" fill={state === 'listening' ? '#DA6C4C' : '#DDA44D'} />

        {/* Outer Robot Chassis (Rounded Retro Voxel Shell) */}
        <rect
          x="18"
          y="20"
          width="64"
          height="54"
          rx="14"
          fill="#DFDFD4"
          stroke="#212121"
          strokeWidth="4"
        />

        {/* Ear Bolts / Side Communication Modules */}
        <rect x="12" y="36" width="6" height="20" rx="3" fill="#DA6C4C" stroke="#212121" strokeWidth="2.5" />
        <rect x="82" y="36" width="6" height="20" rx="3" fill="#DA6C4C" stroke="#212121" strokeWidth="2.5" />

        {/* Curved CRT Face Monitor */}
        <rect
          x="26"
          y="27"
          width="48"
          height="38"
          rx="9"
          fill="#07514C"
          stroke="#212121"
          strokeWidth="3.5"
        />

        {/* CRT Glass Reflection Highlight */}
        <path
          d="M 29 31 Q 38 29 48 30"
          stroke="#147C75"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* DYNAMIC CRT FACE EXPRESSIONS BASED ON STATE */}
        {state === 'listening' ? (
          /* LISTENING: Soundwave Equalizer Expression */
          <g className="animate-pulse">
            {/* Listening Eyes */}
            <rect x="34" y="35" width="6" height="6" rx="1.5" fill="#DDA44D" />
            <rect x="60" y="35" width="6" height="6" rx="1.5" fill="#DDA44D" />

            {/* Live Audio Equalizer Bars */}
            <rect x="36" y="49" width="3" height="9" rx="1" fill="#DDA44D" />
            <rect x="42" y="46" width="3" height="13" rx="1" fill="#DFDFD4" />
            <rect x="48" y="44" width="4" height="16" rx="1" fill="#DDA44D" />
            <rect x="55" y="46" width="3" height="13" rx="1" fill="#DFDFD4" />
            <rect x="61" y="49" width="3" height="9" rx="1" fill="#DDA44D" />
          </g>
        ) : state === 'transcribing' ? (
          /* TRANSCRIBING: Computing / Processing Eyes */
          <g>
            <circle cx="37" cy="42" r="5" fill="#DDA44D" stroke="#DFDFD4" strokeWidth="1.5" strokeDasharray="4 2" className="animate-spin" />
            <circle cx="63" cy="42" r="5" fill="#DDA44D" stroke="#DFDFD4" strokeWidth="1.5" strokeDasharray="4 2" className="animate-spin" />
            {/* Processing Dot Matrix */}
            <rect x="44" y="52" width="3" height="3" rx="0.5" fill="#DFDFD4" className="animate-bounce" />
            <rect x="49" y="52" width="3" height="3" rx="0.5" fill="#DDA44D" className="animate-bounce delay-75" />
            <rect x="54" y="52" width="3" height="3" rx="0.5" fill="#DFDFD4" className="animate-bounce delay-150" />
          </g>
        ) : state === 'success' ? (
          /* SUCCESS: Happy Wink / Victory Smile */
          <g>
            {/* Happy Arch Eyes */}
            <path d="M 33 43 Q 37 36 41 43" stroke="#DDA44D" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M 59 43 Q 63 36 67 43" stroke="#DDA44D" strokeWidth="3" strokeLinecap="round" fill="none" />
            {/* Smile Mouth */}
            <path d="M 44 51 Q 50 56 56 51" stroke="#DFDFD4" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </g>
        ) : (
          /* IDLE: Classic Retro Pixel Eyes */
          <g>
            {/* Pixel Eyes with subtle blink shine */}
            <rect x="34" y="37" width="8" height="8" rx="2" fill="#DDA44D" />
            <rect x="36" y="39" width="3" height="3" fill="#FFF2D6" />

            <rect x="58" y="37" width="8" height="8" rx="2" fill="#DDA44D" />
            <rect x="60" y="39" width="3" height="3" fill="#FFF2D6" />

            {/* Friendly Pixel Smile */}
            <path
              d="M 44 52 L 47 54 L 53 54 L 56 52"
              stroke="#DFDFD4"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        )}

        {/* Bottom Hover Thrusters with Amber Particles */}
        <rect x="32" y="74" width="12" height="6" rx="2" fill="#212121" />
        <rect x="56" y="74" width="12" height="6" rx="2" fill="#212121" />

        <ellipse cx="38" cy="84" rx="4" ry="4" fill="#DDA44D" opacity="0.85" />
        <ellipse cx="62" cy="84" rx="4" ry="4" fill="#DDA44D" opacity="0.85" />
        <ellipse cx="38" cy="87" rx="2" ry="2" fill="#DA6C4C" />
        <ellipse cx="62" cy="87" rx="2" ry="2" fill="#DA6C4C" />
      </svg>
    </div>
  );
};


