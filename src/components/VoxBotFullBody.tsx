import React from 'react';

export type VoxBotPose = 'idle' | 'walk' | 'sit' | 'sleep' | 'listening' | 'transcribing' | 'success';
export type VoxBotLookDir = 'center' | 'left' | 'right';

interface VoxBotFullBodyProps {
  pose?: VoxBotPose;
  size?: number;
  facing?: 'left' | 'right';
  lookDir?: VoxBotLookDir;
  isBlinking?: boolean;
  className?: string;
}

/**
 * Full-Body 3D-Styled Articulated VoxBot Desktop Companion.
 * Poses: idle, walk, sit, sleep, listening (warm/friendly), transcribing, success.
 */
export const VoxBotFullBody: React.FC<VoxBotFullBodyProps> = ({
  pose = 'idle',
  size = 134,
  facing = 'right',
  lookDir = 'center',
  isBlinking = false,
  className = '',
}) => {
  const isListening = pose === 'listening';
  const isWalking = pose === 'walk';
  const isSitting = pose === 'sit' || pose === 'sleep';
  const isSleeping = pose === 'sleep';
  const isTranscribing = pose === 'transcribing';
  const isSuccess = pose === 'success';

  // Friendly, warm palette — never harsh/scary red
  const coreColor = isListening
    ? '#34A89E'
    : isTranscribing
    ? '#42D4C8'
    : isSleeping
    ? '#B58942'
    : '#DDA44D';

  const eyeColor = isListening
    ? '#FFE08A'
    : isTranscribing
    ? '#52E5D8'
    : isSleeping
    ? '#C99B50'
    : '#FFB84D';

  const eyeShiftX = lookDir === 'left' ? -4 : lookDir === 'right' ? 4 : 0;
  const height = Math.round(size * 1.2);

  return (
    <div
      className={`inline-flex items-center justify-center select-none overflow-visible ${className}`}
      style={{
        width: size,
        height,
        transform: facing === 'left' ? 'scaleX(-1)' : undefined,
      }}
    >
      <svg
        viewBox="-12 -14 224 268"
        width={size}
        height={height}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="vb3dCream" x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor="#F7F5EE" />
            <stop offset="55%" stopColor="#E6E2D3" />
            <stop offset="100%" stopColor="#C4BFB0" />
          </linearGradient>

          <linearGradient id="vb3dCreamArm" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F5F3EC" />
            <stop offset="100%" stopColor="#CBC6B8" />
          </linearGradient>

          <linearGradient id="vb3dTeal" x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor="#137C74" />
            <stop offset="55%" stopColor="#08534E" />
            <stop offset="100%" stopColor="#043330" />
          </linearGradient>

          <linearGradient id="vb3dDark" x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor="#4A5058" />
            <stop offset="50%" stopColor="#2B2F35" />
            <stop offset="100%" stopColor="#181A1E" />
          </linearGradient>

          <radialGradient id="vb3dScreen" cx="50%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#1D2728" />
            <stop offset="65%" stopColor="#101718" />
            <stop offset="100%" stopColor="#080C0C" />
          </radialGradient>

          <radialGradient id="vb3dCoreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={coreColor} stopOpacity="0.85" />
            <stop offset="55%" stopColor={coreColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={coreColor} stopOpacity="0" />
          </radialGradient>

          <radialGradient id="vb3dAntennaGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isListening ? '#52E5D8' : '#FFD07B'} stopOpacity="0.85" />
            <stop offset="55%" stopColor={coreColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={coreColor} stopOpacity="0" />
          </radialGradient>

          <filter id="vbSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#0A1414" floodOpacity="0.3" />
          </filter>

          <filter id="vbLedGlow" x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur stdDeviation="1.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ground Shadow */}
        {!isSitting && (
          <ellipse
            cx="100"
            cy="242"
            rx={isWalking ? 40 : 36}
            ry="6.5"
            fill="#0A1010"
            opacity="0.25"
            className={isWalking ? 'vb-shadow-walk' : 'vb-shadow-idle'}
          />
        )}

        {/* 3D Beveled Sitting Bench (in 'sit' or 'sleep' pose) */}
        {isSitting && (
          <g filter="url(#vbSoftShadow)">
            <ellipse cx="100" cy="226" rx="48" ry="5.5" fill="#0A1010" opacity="0.2" />
            <rect
              x="44"
              y="148"
              width="112"
              height="30"
              rx="8"
              fill="url(#vb3dDark)"
              stroke="#16181B"
              strokeWidth="1.5"
            />
            <line x1="50" y1="151" x2="150" y2="151" stroke="#626973" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            <rect
              x="38"
              y="174"
              width="124"
              height="14"
              rx="6"
              fill="url(#vb3dDark)"
              stroke="#16181B"
              strokeWidth="1.5"
            />
            <line x1="44" y1="177" x2="156" y2="177" stroke="#6A727D" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
          </g>
        )}

        {/* GENTLE FRIENDLY LISTENING HALO (soft mint-teal & golden ripples, never creepy) */}
        {isListening && (
          <g className="pointer-events-none" filter="url(#vbLedGlow)">
            <circle cx="100" cy="14" r="18" fill="url(#vb3dAntennaGlow)" />
            <circle
              cx="100"
              cy="14"
              r="16"
              fill="none"
              stroke="#34A89E"
              strokeWidth="2"
              opacity="0.7"
              className="vb-radar-1"
            />
            <circle
              cx="100"
              cy="14"
              r="25"
              fill="none"
              stroke="#FFD07B"
              strokeWidth="1.4"
              opacity="0.45"
              className="vb-radar-2"
            />
          </g>
        )}

        {/* TRANSCRIBING HALO */}
        {isTranscribing && (
          <g className="pointer-events-none" filter="url(#vbLedGlow)">
            <circle cx="100" cy="14" r="15" fill="url(#vb3dAntennaGlow)" />
            <circle
              cx="100"
              cy="14"
              r="15"
              fill="none"
              stroke="#42D4C8"
              strokeWidth="2"
              strokeDasharray="6 4"
              className="animate-spin"
              style={{ transformOrigin: '100px 14px' }}
            />
          </g>
        )}

        {/* SLEEPING FLOATING Zzz */}
        {isSleeping && (
          <g className="pointer-events-none" filter="url(#vbLedGlow)">
            <text x="150" y="34" fill="#FFD07B" className="font-pixel text-[12px] anim-zzz-1 font-bold">
              z
            </text>
            <text x="164" y="20" fill="#34A89E" className="font-pixel text-[15px] anim-zzz-2 font-bold">
              Z
            </text>
          </g>
        )}

        {/* MAIN ROBOT BODY */}
        <g
          filter="url(#vbSoftShadow)"
          className={
            isWalking
              ? 'vb-body-walk'
              : isSleeping
              ? 'anim-mascot-sleep'
              : isSitting
              ? 'vb-body-sit'
              : isListening
              ? 'vb-body-listen'
              : isSuccess
              ? 'anim-mascot-jump'
              : 'vb-body-idle'
          }
        >
          {/* ======================== LEGS & BOOTS ======================== */}
          {isSitting ? (
            <g>
              <g>
                <rect x="70" y="170" width="20" height="20" rx="8" fill="url(#vb3dCream)" stroke="#2A2D32" strokeWidth="1.4" />
                <circle cx="79" cy="188" r="7.5" fill="url(#vb3dDark)" />
                <rect x="69" y="190" width="19" height="19" rx="7" fill="url(#vb3dCream)" stroke="#2A2D32" strokeWidth="1.4" />
                <rect x="64" y="205" width="28" height="15" rx="7.5" fill="url(#vb3dTeal)" stroke="#182222" strokeWidth="1.4" />
                <rect x="65" y="213" width="26" height="6" rx="3" fill="url(#vb3dCream)" />
                <circle cx="67" cy="210" r="2.6" fill="#DDA44D" />
              </g>
              <g>
                <rect x="110" y="170" width="20" height="20" rx="8" fill="url(#vb3dCream)" stroke="#2A2D32" strokeWidth="1.4" />
                <circle cx="121" cy="188" r="7.5" fill="url(#vb3dDark)" />
                <rect x="112" y="190" width="19" height="19" rx="7" fill="url(#vb3dCream)" stroke="#2A2D32" strokeWidth="1.4" />
                <rect x="108" y="205" width="28" height="15" rx="7.5" fill="url(#vb3dTeal)" stroke="#182222" strokeWidth="1.4" />
                <rect x="109" y="213" width="26" height="6" rx="3" fill="url(#vb3dCream)" />
                <circle cx="133" cy="210" r="2.6" fill="#DDA44D" />
              </g>
            </g>
          ) : (
            <g>
              <g className={isWalking ? 'vb-leg-left-walk' : ''}>
                <circle cx="81" cy="174" r="8" fill="url(#vb3dDark)" />
                <rect x="72" y="176" width="18" height="22" rx="7" fill="url(#vb3dCream)" stroke="#2A2D32" strokeWidth="1.4" />
                <circle cx="81" cy="199" r="7" fill="url(#vb3dDark)" />
                <rect x="72" y="201" width="18" height="19" rx="7" fill="url(#vb3dCream)" stroke="#2A2D32" strokeWidth="1.4" />
                <path
                  d="M 65 221 Q 65 214 81 214 Q 96 214 96 221 L 97 232 Q 97 237 91 237 L 68 237 Q 62 237 63 231 Z"
                  fill="url(#vb3dTeal)"
                  stroke="#182222"
                  strokeWidth="1.4"
                />
                <rect x="64" y="229" width="32" height="7" rx="3.5" fill="url(#vb3dCream)" />
                <rect x="67" y="235" width="26" height="3" rx="1.5" fill="#DA6C4C" />
                <circle cx="68" cy="223" r="2.8" fill="#DDA44D" />
              </g>

              <g className={isWalking ? 'vb-leg-right-walk' : ''}>
                <circle cx="119" cy="174" r="8" fill="url(#vb3dDark)" />
                <rect x="110" y="176" width="18" height="22" rx="7" fill="url(#vb3dCream)" stroke="#2A2D32" strokeWidth="1.4" />
                <circle cx="119" cy="199" r="7" fill="url(#vb3dDark)" />
                <rect x="110" y="201" width="18" height="19" rx="7" fill="url(#vb3dCream)" stroke="#2A2D32" strokeWidth="1.4" />
                <path
                  d="M 104 221 Q 104 214 119 214 Q 135 214 135 221 L 137 231 Q 138 237 132 237 L 109 237 Q 103 237 103 232 Z"
                  fill="url(#vb3dTeal)"
                  stroke="#182222"
                  strokeWidth="1.4"
                />
                <rect x="104" y="229" width="32" height="7" rx="3.5" fill="url(#vb3dCream)" />
                <rect x="107" y="235" width="26" height="3" rx="1.5" fill="#DA6C4C" />
                <circle cx="132" cy="223" r="2.8" fill="#DDA44D" />
              </g>
            </g>
          )}

          {/* ======================== CHUNKY ARTICULATED ARMS ======================== */}
          <g
            className={
              isWalking
                ? 'vb-arm-left-walk'
                : isSitting
                ? 'vb-arm-left-sit'
                : isListening
                ? 'vb-arm-left-listen'
                : 'vb-arm-left-idle'
            }
          >
            <circle cx="60" cy="126" r="9" fill="url(#vb3dDark)" />
            <rect x="46" y="126" width="15" height="22" rx="7.5" fill="url(#vb3dDark)" />
            <circle cx="53" cy="148" r="7" fill="url(#vb3dDark)" />
            <rect x="44" y="149" width="17" height="22" rx="8.5" fill="url(#vb3dCreamArm)" stroke="#2A2D32" strokeWidth="1.4" />
            <line x1="48" y1="153" x2="48" y2="165" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
            <path
              d="M 44 169 C 40 176, 43 183, 50 183 C 53 183, 54 179, 54 177 C 55 179, 57 182, 60 181 C 64 179, 64 172, 59 169 Z"
              fill="url(#vb3dDark)"
            />
          </g>

          <g
            className={
              isWalking
                ? 'vb-arm-right-walk'
                : isSitting
                ? 'vb-arm-right-sit'
                : isListening
                ? 'vb-arm-right-listen'
                : 'vb-arm-right-idle'
            }
          >
            <circle cx="140" cy="126" r="9" fill="url(#vb3dDark)" />
            <rect x="139" y="126" width="15" height="22" rx="7.5" fill="url(#vb3dDark)" />
            <circle cx="147" cy="148" r="7" fill="url(#vb3dDark)" />
            <rect x="139" y="149" width="17" height="22" rx="8.5" fill="url(#vb3dCreamArm)" stroke="#2A2D32" strokeWidth="1.4" />
            <line x1="143" y1="153" x2="143" y2="165" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
            <path
              d="M 141 169 C 136 172, 136 179, 140 181 C 143 182, 145 179, 146 177 C 146 179, 147 183, 150 183 C 157 183, 160 176, 156 169 Z"
              fill="url(#vb3dDark)"
            />
          </g>

          {/* ======================== TORSO & PELVIS ======================== */}
          <g>
            <path
              d="M 80 165 L 120 165 L 113 177 L 87 177 Z"
              fill="url(#vb3dTeal)"
              stroke="#182222"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <rect
              x="65"
              y="138"
              width="70"
              height="30"
              rx="13"
              fill="url(#vb3dCream)"
              stroke="#2A2D32"
              strokeWidth="1.5"
            />
            <rect
              x="62"
              y="112"
              width="76"
              height="34"
              rx="14"
              fill="url(#vb3dTeal)"
              stroke="#182222"
              strokeWidth="1.5"
            />
            <path d="M 74 115 L 126 115" stroke="#2B9C93" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />

            <circle
              cx="126"
              cy="121"
              r="3.2"
              fill={isListening ? '#34A89E' : isTranscribing ? '#42D4C8' : '#DDA44D'}
              filter="url(#vbLedGlow)"
            />

            {/* Concentric Glowing Chest Core */}
            <circle cx="100" cy="139" r="22" fill="url(#vb3dCoreGlow)" />
            <circle cx="100" cy="139" r="16.5" fill="url(#vb3dDark)" stroke={coreColor} strokeWidth="2.2" />
            <circle cx="100" cy="139" r="12.5" fill="none" stroke="#8C949E" strokeWidth="1.3" opacity="0.85" />
            <circle cx="100" cy="139" r="8.5" fill="none" stroke={coreColor} strokeWidth="1.6" opacity="0.9" />
            <circle
              cx="100"
              cy="139"
              r="4.5"
              fill={coreColor}
              filter="url(#vbLedGlow)"
              className={isListening || isTranscribing ? 'animate-pulse' : ''}
            />

            <rect x="89" y="102" width="22" height="13" rx="5" fill="url(#vb3dDark)" />
          </g>

          {/* ======================== HEAD & CRT FACE ======================== */}
          <g>
            <line x1="100" y1="36" x2="100" y2="18" stroke="#182222" strokeWidth="5.5" strokeLinecap="round" />
            <line x1="100" y1="36" x2="100" y2="18" stroke="#0E6B64" strokeWidth="3" strokeLinecap="round" />
            <ellipse cx="100" cy="36" rx="10" ry="4" fill="url(#vb3dTeal)" />
            <circle
              cx="100"
              cy="14"
              r="7.5"
              fill={isListening ? '#34A89E' : isTranscribing ? '#42D4C8' : '#FFB84D'}
              filter="url(#vbLedGlow)"
            />
            <circle cx="97.5" cy="11.5" r="2.5" fill="#FFF7DF" opacity="0.9" />

            {/* Side Ear Pods */}
            <g>
              <rect x="37" y="55" width="14" height="32" rx="7" fill="url(#vb3dDark)" />
              <circle
                cx="42"
                cy="71"
                r="6.2"
                fill={isListening ? '#1C857D' : '#08534E'}
                stroke={coreColor}
                strokeWidth="2"
              />
              <rect x="149" y="55" width="14" height="32" rx="7" fill="url(#vb3dDark)" />
              <circle
                cx="158"
                cy="71"
                r="6.2"
                fill={isListening ? '#1C857D' : '#08534E'}
                stroke={coreColor}
                strokeWidth="2"
              />
            </g>

            {/* Outer Cream Head Chassis */}
            <rect
              x="44"
              y="35"
              width="112"
              height="72"
              rx="22"
              fill="url(#vb3dCream)"
              stroke="#2A2D32"
              strokeWidth="1.6"
            />
            <path d="M 62 39 L 138 39" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />

            {/* Teal Inner Bezel */}
            <rect x="52" y="42" width="96" height="58" rx="16" fill="url(#vb3dTeal)" stroke="#042E2B" strokeWidth="1.2" />

            {/* Deep Curved CRT Glass */}
            <rect x="57" y="47" width="86" height="48" rx="12" fill="url(#vb3dScreen)" />
            <path d="M 64 52 Q 86 49 112 51" stroke="#46A8A0" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.32" />

            {/* ================= FRIENDLY LED EXPRESSIONS ================= */}
            <g fill={eyeColor} filter="url(#vbLedGlow)" transform={`translate(${eyeShiftX}, 0)`}>
              {isSleeping ? (
                /* SLEEPING: Cute peaceful closed U U eyes + tiny peaceful mouth */
                <g>
                  <path d="M 71 66 Q 78 73 85 66" fill="none" stroke={eyeColor} strokeWidth="3.4" strokeLinecap="round" />
                  <path d="M 115 66 Q 122 73 129 66" fill="none" stroke={eyeColor} strokeWidth="3.4" strokeLinecap="round" />
                  <circle cx="100" cy="81" r="2.6" fill={eyeColor} />
                </g>
              ) : isBlinking ? (
                /* BLINK: Soft curved blink */
                <g>
                  <rect x="70" y="67" width="15" height="3.2" rx="1.6" />
                  <rect x="115" y="67" width="15" height="3.2" rx="1.6" />
                  <path d="M 90 79 Q 100 85 110 79" fill="none" stroke={eyeColor} strokeWidth="2.8" strokeLinecap="round" />
                </g>
              ) : isListening ? (
                /* LISTENING: Cute, warm, friendly attentive eyes + rosy cheeks + happy smile */
                <g>
                  {/* Warm friendly rounded pill eyes with bright sparkle */}
                  <rect x="71" y="57" width="13" height="16" rx="6.5" fill="#FFE08A" />
                  <circle cx="80" cy="61" r="3" fill="#FFFDF5" />
                  <rect x="116" y="57" width="13" height="16" rx="6.5" fill="#FFE08A" />
                  <circle cx="125" cy="61" r="3" fill="#FFFDF5" />

                  {/* Cute rosy blush cheeks */}
                  <rect x="64" y="75" width="7" height="3.5" rx="1.75" fill="#DA6C4C" opacity="0.85" />
                  <rect x="129" y="75" width="7" height="3.5" rx="1.75" fill="#DA6C4C" opacity="0.85" />

                  {/* Warm cheerful smile */}
                  <path
                    d="M 90 77 Q 100 86 110 77"
                    fill="none"
                    stroke="#52E5D8"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                </g>
              ) : isTranscribing ? (
                /* TRANSCRIBING: Smooth glowing cyan-teal thinking arcs & bouncing dots */
                <g>
                  <circle
                    cx="78"
                    cy="66"
                    r="6.5"
                    fill="none"
                    stroke={eyeColor}
                    strokeWidth="2.8"
                    strokeDasharray="10 6"
                    className="animate-spin"
                    style={{ transformOrigin: '78px 66px' }}
                  />
                  <circle
                    cx="122"
                    cy="66"
                    r="6.5"
                    fill="none"
                    stroke={eyeColor}
                    strokeWidth="2.8"
                    strokeDasharray="10 6"
                    className="animate-spin"
                    style={{ transformOrigin: '122px 66px' }}
                  />
                  <rect x="88" y="80" width="4" height="4" rx="1" className="animate-bounce" />
                  <rect x="98" y="80" width="4" height="4" rx="1" className="animate-bounce delay-75" />
                  <rect x="108" y="80" width="4" height="4" rx="1" className="animate-bounce delay-150" />
                </g>
              ) : isSuccess ? (
                /* SUCCESS: Happy ^ ^ eyes & big smile */
                <g>
                  <path d="M 70 69 Q 78 58 86 69" fill="none" stroke={eyeColor} strokeWidth="3.6" strokeLinecap="round" />
                  <path d="M 114 69 Q 122 58 130 69" fill="none" stroke={eyeColor} strokeWidth="3.6" strokeLinecap="round" />
                  <path d="M 88 78 Q 100 88 112 78" fill="none" stroke={eyeColor} strokeWidth="3.2" strokeLinecap="round" />
                </g>
              ) : isSitting ? (
                /* SITTING: Cozy relaxed eyes & warm smile */
                <g>
                  <path d="M 71 67 Q 78 61 85 67" fill="none" stroke={eyeColor} strokeWidth="3.4" strokeLinecap="round" />
                  <path d="M 115 67 Q 122 61 129 67" fill="none" stroke={eyeColor} strokeWidth="3.4" strokeLinecap="round" />
                  <path d="M 90 78 Q 100 84 110 78" fill="none" stroke={eyeColor} strokeWidth="2.8" strokeLinecap="round" />
                </g>
              ) : isWalking ? (
                /* WALKING: Cheerful wide eyes & happy smile */
                <g>
                  <rect x="72" y="59" width="12" height="13" rx="6" />
                  <circle cx="80" cy="62" r="2.6" fill="#FFF7DF" />
                  <rect x="116" y="59" width="12" height="13" rx="6" />
                  <circle cx="124" cy="62" r="2.6" fill="#FFF7DF" />
                  <path d="M 89 77 Q 100 85 111 77" fill="none" stroke={eyeColor} strokeWidth="3" strokeLinecap="round" />
                </g>
              ) : (
                /* IDLE: Friendly ^ ^ eyes & warm smile */
                <g>
                  <path d="M 71 68 Q 78 59 85 68" fill="none" stroke={eyeColor} strokeWidth="3.5" strokeLinecap="round" />
                  <path d="M 115 68 Q 122 59 129 68" fill="none" stroke={eyeColor} strokeWidth="3.5" strokeLinecap="round" />
                  <path d="M 90 78 Q 100 85 110 78" fill="none" stroke={eyeColor} strokeWidth="2.8" strokeLinecap="round" />
                </g>
              )}
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
};
