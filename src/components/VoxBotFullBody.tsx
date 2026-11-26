import React from 'react';

export type VoxBotPose = 'idle' | 'walk' | 'sit' | 'listening' | 'transcribing' | 'success';

interface VoxBotFullBodyProps {
  pose?: VoxBotPose;
  size?: number;
  facing?: 'left' | 'right';
  isBlinking?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * Full-Body 3D-Styled Articulated VoxBot Desktop Companion.
 * Matches the VoxBot concept sheet with soft vinyl/ceramic gradients,
 * specular highlights, chunky articulated limbs, high-density LED CRT face,
 * and glowing acoustic radar/ear aura.
 */
export const VoxBotFullBody: React.FC<VoxBotFullBodyProps> = ({
  pose = 'idle',
  size = 156,
  facing = 'right',
  isBlinking = false,
  className = '',
  onClick,
}) => {
  const isListening = pose === 'listening';
  const isWalking = pose === 'walk';
  const isSitting = pose === 'sit';
  const isTranscribing = pose === 'transcribing';
  const isSuccess = pose === 'success';

  const coreColor = isListening
    ? '#FF6B4A'
    : isTranscribing
    ? '#34A89E'
    : '#DDA44D';

  const eyeColor = isListening
    ? '#FF7E47'
    : isTranscribing
    ? '#42D4C8'
    : '#FFB84D';

  const height = Math.round(size * 1.26);

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center justify-center select-none overflow-visible ${className}`}
      style={{
        width: size,
        height,
        transform: facing === 'left' ? 'scaleX(-1)' : undefined,
      }}
    >
      {/* Generous viewBox (-20 -18 240 280) prevents any clipping of radar rings or boots */}
      <svg
        viewBox="-20 -18 240 280"
        width={size}
        height={height}
        className="overflow-visible"
      >
        <defs>
          {/* 3D Vinyl/Ceramic Shading Gradients */}
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
            <stop offset="0%" stopColor="#1F2829" />
            <stop offset="65%" stopColor="#121718" />
            <stop offset="100%" stopColor="#080B0B" />
          </radialGradient>

          <radialGradient id="vb3dCoreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={coreColor} stopOpacity="0.95" />
            <stop offset="55%" stopColor={coreColor} stopOpacity="0.38" />
            <stop offset="100%" stopColor={coreColor} stopOpacity="0" />
          </radialGradient>

          <radialGradient id="vb3dAntennaGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isListening ? '#FF6B4A' : '#FFD07B'} stopOpacity="0.9" />
            <stop offset="55%" stopColor={coreColor} stopOpacity="0.35" />
            <stop offset="100%" stopColor={coreColor} stopOpacity="0" />
          </radialGradient>

          <filter id="vbSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#0A1414" floodOpacity="0.32" />
          </filter>

          <filter id="vbLedGlow" x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
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
            rx={isWalking ? 42 : 38}
            ry="7"
            fill="#0A1010"
            opacity="0.28"
            className={isWalking ? 'vb-shadow-walk' : 'vb-shadow-idle'}
          />
        )}

        {/* 3D Beveled Sitting Bench (only in 'sit' pose) */}
        {isSitting && (
          <g filter="url(#vbSoftShadow)">
            <ellipse cx="100" cy="226" rx="50" ry="6" fill="#0A1010" opacity="0.22" />
            {/* Backrest */}
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
            {/* Seat */}
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

        {/* LISTENING ACOUSTIC AURA & RADAR WAVES (smooth glowing rings, no harsh lines) */}
        {isListening && (
          <g className="pointer-events-none" filter="url(#vbLedGlow)">
            {/* Antenna Halo */}
            <circle cx="100" cy="14" r="20" fill="url(#vb3dAntennaGlow)" />
            <circle
              cx="100"
              cy="14"
              r="18"
              fill="none"
              stroke="#FF7E47"
              strokeWidth="2.2"
              opacity="0.75"
              className="vb-radar-1"
            />
            <circle
              cx="100"
              cy="14"
              r="30"
              fill="none"
              stroke="#FFB84D"
              strokeWidth="1.6"
              opacity="0.45"
              className="vb-radar-2"
            />

            {/* Soft glowing ear acoustic waves */}
            <path d="M 32 58 Q 22 74 32 90" fill="none" stroke="#FF7E47" strokeWidth="3" strokeLinecap="round" className="vb-wave-1" />
            <path d="M 22 50 Q 9 74 22 98" fill="none" stroke="#FFB84D" strokeWidth="2.2" strokeLinecap="round" className="vb-wave-2" />
            <path d="M 168 58 Q 178 74 168 90" fill="none" stroke="#FF7E47" strokeWidth="3" strokeLinecap="round" className="vb-wave-1" />
            <path d="M 178 50 Q 191 74 178 98" fill="none" stroke="#FFB84D" strokeWidth="2.2" strokeLinecap="round" className="vb-wave-2" />
          </g>
        )}

        {/* TRANSCRIBING HALO */}
        {isTranscribing && (
          <g className="pointer-events-none" filter="url(#vbLedGlow)">
            <circle cx="100" cy="14" r="16" fill="url(#vb3dAntennaGlow)" />
            <circle
              cx="100"
              cy="14"
              r="16"
              fill="none"
              stroke="#42D4C8"
              strokeWidth="2"
              strokeDasharray="6 4"
              className="animate-spin"
              style={{ transformOrigin: '100px 14px' }}
            />
          </g>
        )}

        {/* MAIN ROBOT BODY */}
        <g
          filter="url(#vbSoftShadow)"
          className={
            isWalking
              ? 'vb-body-walk'
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
              {/* Left Sitting Leg */}
              <g>
                <rect x="70" y="170" width="20" height="20" rx="8" fill="url(#vb3dCream)" stroke="#2A2D32" strokeWidth="1.4" />
                <circle cx="79" cy="188" r="7.5" fill="url(#vb3dDark)" />
                <rect x="69" y="190" width="19" height="19" rx="7" fill="url(#vb3dCream)" stroke="#2A2D32" strokeWidth="1.4" />
                {/* Chunky Boot */}
                <rect x="64" y="205" width="28" height="15" rx="7.5" fill="url(#vb3dTeal)" stroke="#182222" strokeWidth="1.4" />
                <rect x="65" y="213" width="26" height="6" rx="3" fill="url(#vb3dCream)" />
                <circle cx="67" cy="210" r="2.6" fill="#DDA44D" />
              </g>
              {/* Right Sitting Leg */}
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
              {/* Left Standing/Walking Leg */}
              <g className={isWalking ? 'vb-leg-left-walk' : ''}>
                <circle cx="81" cy="174" r="8" fill="url(#vb3dDark)" />
                <rect x="72" y="176" width="18" height="22" rx="7" fill="url(#vb3dCream)" stroke="#2A2D32" strokeWidth="1.4" />
                <circle cx="81" cy="199" r="7" fill="url(#vb3dDark)" />
                <rect x="72" y="201" width="18" height="19" rx="7" fill="url(#vb3dCream)" stroke="#2A2D32" strokeWidth="1.4" />
                {/* 3D Boot */}
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

              {/* Right Standing/Walking Leg */}
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
          {/* Left Arm */}
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
            {/* Shoulder Sphere */}
            <circle cx="60" cy="126" r="9" fill="url(#vb3dDark)" />
            {/* Upper Arm */}
            <rect x="46" y="126" width="15" height="22" rx="7.5" fill="url(#vb3dDark)" />
            {/* Elbow Sphere */}
            <circle cx="53" cy="148" r="7" fill="url(#vb3dDark)" />
            {/* Chunky Cream Forearm */}
            <rect x="44" y="149" width="17" height="22" rx="8.5" fill="url(#vb3dCreamArm)" stroke="#2A2D32" strokeWidth="1.4" />
            {/* Specular highlight */}
            <line x1="48" y1="153" x2="48" y2="165" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
            {/* Rounded Mitten Hand */}
            <path
              d="M 44 169 C 40 176, 43 183, 50 183 C 53 183, 54 179, 54 177 C 55 179, 57 182, 60 181 C 64 179, 64 172, 59 169 Z"
              fill="url(#vb3dDark)"
            />
          </g>

          {/* Right Arm */}
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
            {/* Pelvis */}
            <path
              d="M 80 165 L 120 165 L 113 177 L 87 177 Z"
              fill="url(#vb3dTeal)"
              stroke="#182222"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />

            {/* Lower Cream Abdomen */}
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

            {/* Upper Dark Teal Chest */}
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
            {/* Top Chest Rim Highlight */}
            <path
              d="M 74 115 L 126 115"
              stroke="#2B9C93"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity="0.55"
            />

            {/* Status LED */}
            <circle
              cx="126"
              cy="121"
              r="3.2"
              fill={isListening ? '#FF6B4A' : isTranscribing ? '#42D4C8' : '#DDA44D'}
              filter="url(#vbLedGlow)"
            />

            {/* Concentric Glowing Chest Speaker Core */}
            <circle cx="100" cy="139" r="24" fill="url(#vb3dCoreGlow)" />
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

            {/* Mechanical Neck */}
            <rect x="89" y="102" width="22" height="13" rx="5" fill="url(#vb3dDark)" />
          </g>

          {/* ======================== HEAD & CRT FACE ======================== */}
          <g className={isListening ? 'vb-head-listen' : ''}>
            {/* Antenna */}
            <line x1="100" y1="36" x2="100" y2="18" stroke="#182222" strokeWidth="5.5" strokeLinecap="round" />
            <line x1="100" y1="36" x2="100" y2="18" stroke="#0E6B64" strokeWidth="3" strokeLinecap="round" />
            <ellipse cx="100" cy="36" rx="10" ry="4" fill="url(#vb3dTeal)" />
            <circle
              cx="100"
              cy="14"
              r="7.5"
              fill={isListening ? '#FF6B4A' : isTranscribing ? '#42D4C8' : '#FFB84D'}
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
                fill={isListening ? '#DA5A3C' : '#08534E'}
                stroke={coreColor}
                strokeWidth="2"
              />
              <rect x="149" y="55" width="14" height="32" rx="7" fill="url(#vb3dDark)" />
              <circle
                cx="158"
                cy="71"
                r="6.2"
                fill={isListening ? '#DA5A3C' : '#08534E'}
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
            {/* Top Shell Specular Rim */}
            <path
              d="M 62 39 L 138 39"
              stroke="#FFFFFF"
              strokeWidth="2.2"
              strokeLinecap="round"
              opacity="0.7"
            />

            {/* Teal Inner Bezel */}
            <rect
              x="52"
              y="42"
              width="96"
              height="58"
              rx="16"
              fill="url(#vb3dTeal)"
              stroke="#042E2B"
              strokeWidth="1.2"
            />

            {/* Deep Curved CRT Glass */}
            <rect
              x="57"
              y="47"
              width="86"
              height="48"
              rx="12"
              fill="url(#vb3dScreen)"
            />

            {/* CRT Glass Gloss Reflection */}
            <path
              d="M 64 52 Q 86 49 112 51"
              stroke="#46A8A0"
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
              opacity="0.32"
            />

            {/* ================= HIGH-DENSITY LED MATRIX EXPRESSIONS ================= */}
            <g fill={eyeColor} filter="url(#vbLedGlow)">
              {isBlinking ? (
                /* BLINK: Crisp horizontal LED blink lines */
                <g>
                  <rect x="70" y="68" width="14" height="3.2" rx="1.6" />
                  <rect x="116" y="68" width="14" height="3.2" rx="1.6" />
                  <rect x="89" y="80" width="22" height="3" rx="1.5" />
                </g>
              ) : isListening ? (
                /* LISTENING: Bright expressive rounded pixel eyes + lively equalizer smile */
                <g>
                  {/* Left Eye (3x3 pixel block with highlight) */}
                  <rect x="71" y="59" width="3.5" height="3.5" rx="0.8" />
                  <rect x="75.5" y="59" width="3.5" height="3.5" rx="0.8" />
                  <rect x="80" y="59" width="3.5" height="3.5" rx="0.8" />
                  <rect x="71" y="63.5" width="3.5" height="3.5" rx="0.8" />
                  <rect x="75.5" y="63.5" width="3.5" height="3.5" rx="0.8" />
                  <rect x="80" y="63.5" width="3.5" height="3.5" rx="0.8" />
                  <rect x="71" y="68" width="3.5" height="3.5" rx="0.8" />
                  <rect x="75.5" y="68" width="3.5" height="3.5" rx="0.8" />
                  <rect x="80" y="68" width="3.5" height="3.5" rx="0.8" />
                  <rect x="79" y="60" width="3" height="3" rx="0.6" fill="#FFF3D6" />

                  {/* Right Eye */}
                  <rect x="116.5" y="59" width="3.5" height="3.5" rx="0.8" />
                  <rect x="121" y="59" width="3.5" height="3.5" rx="0.8" />
                  <rect x="125.5" y="59" width="3.5" height="3.5" rx="0.8" />
                  <rect x="116.5" y="63.5" width="3.5" height="3.5" rx="0.8" />
                  <rect x="121" y="63.5" width="3.5" height="3.5" rx="0.8" />
                  <rect x="125.5" y="63.5" width="3.5" height="3.5" rx="0.8" />
                  <rect x="116.5" y="68" width="3.5" height="3.5" rx="0.8" />
                  <rect x="121" y="68" width="3.5" height="3.5" rx="0.8" />
                  <rect x="125.5" y="68" width="3.5" height="3.5" rx="0.8" />
                  <rect x="124.5" y="60" width="3" height="3" rx="0.6" fill="#FFF3D6" />

                  {/* Animated Pixel Equalizer Mouth */}
                  <rect x="88" y="80" width="3.2" height="3.2" rx="0.7" />
                  <rect x="93" y="78" width="3.2" height="6" rx="0.7" className="animate-pulse" />
                  <rect x="98.4" y="76" width="3.2" height="9" rx="0.7" className="animate-pulse delay-75" />
                  <rect x="103.8" y="78" width="3.2" height="6" rx="0.7" className="animate-pulse delay-150" />
                  <rect x="109" y="80" width="3.2" height="3.2" rx="0.7" />
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
                /* SUCCESS: Big happy ^ ^ pixel eyes & wide smile */
                <g>
                  <rect x="70" y="67" width="3.8" height="3.8" rx="0.8" />
                  <rect x="74" y="63" width="3.8" height="3.8" rx="0.8" />
                  <rect x="78" y="59.5" width="3.8" height="3.8" rx="0.8" />
                  <rect x="82" y="63" width="3.8" height="3.8" rx="0.8" />
                  <rect x="86" y="67" width="3.8" height="3.8" rx="0.8" />

                  <rect x="110" y="67" width="3.8" height="3.8" rx="0.8" />
                  <rect x="114" y="63" width="3.8" height="3.8" rx="0.8" />
                  <rect x="118" y="59.5" width="3.8" height="3.8" rx="0.8" />
                  <rect x="122" y="63" width="3.8" height="3.8" rx="0.8" />
                  <rect x="126" y="67" width="3.8" height="3.8" rx="0.8" />

                  <rect x="86" y="77" width="3.5" height="3.5" rx="0.8" />
                  <rect x="90.5" y="80.5" width="3.5" height="3.5" rx="0.8" />
                  <rect x="95" y="81.5" width="3.5" height="3.5" rx="0.8" />
                  <rect x="99.5" y="81.5" width="3.5" height="3.5" rx="0.8" />
                  <rect x="104" y="80.5" width="3.5" height="3.5" rx="0.8" />
                  <rect x="108.5" y="77" width="3.5" height="3.5" rx="0.8" />
                </g>
              ) : isSitting ? (
                /* SITTING: Cozy relaxed pixel eyes & warm smile */
                <g>
                  <rect x="71" y="66" width="3.5" height="3.2" rx="0.8" />
                  <rect x="75.5" y="64" width="3.5" height="3.2" rx="0.8" />
                  <rect x="80" y="64" width="3.5" height="3.2" rx="0.8" />
                  <rect x="84.5" y="66" width="3.5" height="3.2" rx="0.8" />

                  <rect x="112" y="66" width="3.5" height="3.2" rx="0.8" />
                  <rect x="116.5" y="64" width="3.5" height="3.2" rx="0.8" />
                  <rect x="121" y="64" width="3.5" height="3.2" rx="0.8" />
                  <rect x="125.5" y="66" width="3.5" height="3.2" rx="0.8" />

                  <rect x="90" y="78" width="3.2" height="3" rx="0.7" />
                  <rect x="94" y="80.5" width="3.2" height="3" rx="0.7" />
                  <rect x="98.5" y="80.5" width="3.2" height="3" rx="0.7" />
                  <rect x="103" y="80.5" width="3.2" height="3" rx="0.7" />
                  <rect x="107" y="78" width="3.2" height="3" rx="0.7" />
                </g>
              ) : isWalking ? (
                /* WALKING: Big cheerful pixel eyes & happy smile */
                <g>
                  <rect x="72" y="60" width="3.5" height="3.5" rx="0.8" />
                  <rect x="76.5" y="60" width="3.5" height="3.5" rx="0.8" />
                  <rect x="81" y="60" width="3.5" height="3.5" rx="0.8" />
                  <rect x="72" y="64.5" width="3.5" height="3.5" rx="0.8" />
                  <rect x="76.5" y="64.5" width="3.5" height="3.5" rx="0.8" />
                  <rect x="81" y="64.5" width="3.5" height="3.5" rx="0.8" />
                  <rect x="80" y="61" width="2.8" height="2.8" fill="#FFF3D6" />

                  <rect x="115.5" y="60" width="3.5" height="3.5" rx="0.8" />
                  <rect x="120" y="60" width="3.5" height="3.5" rx="0.8" />
                  <rect x="124.5" y="60" width="3.5" height="3.5" rx="0.8" />
                  <rect x="115.5" y="64.5" width="3.5" height="3.5" rx="0.8" />
                  <rect x="120" y="64.5" width="3.5" height="3.5" rx="0.8" />
                  <rect x="124.5" y="64.5" width="3.5" height="3.5" rx="0.8" />
                  <rect x="123.5" y="61" width="2.8" height="2.8" fill="#FFF3D6" />

                  <rect x="89" y="77" width="3.2" height="3" rx="0.7" />
                  <rect x="93" y="80" width="3.2" height="3" rx="0.7" />
                  <rect x="98.4" y="80.5" width="3.2" height="3" rx="0.7" />
                  <rect x="103.8" y="80" width="3.2" height="3" rx="0.7" />
                  <rect x="107.8" y="77" width="3.2" height="3" rx="0.7" />
                </g>
              ) : (
                /* IDLE: Signature happy ^ ^ pixel eyes & warm smile */
                <g>
                  <rect x="71" y="67" width="3.5" height="3.5" rx="0.8" />
                  <rect x="75" y="63" width="3.5" height="3.5" rx="0.8" />
                  <rect x="79" y="60" width="3.5" height="3.5" rx="0.8" />
                  <rect x="83" y="63" width="3.5" height="3.5" rx="0.8" />
                  <rect x="87" y="67" width="3.5" height="3.5" rx="0.8" />

                  <rect x="109.5" y="67" width="3.5" height="3.5" rx="0.8" />
                  <rect x="113.5" y="63" width="3.5" height="3.5" rx="0.8" />
                  <rect x="117.5" y="60" width="3.5" height="3.5" rx="0.8" />
                  <rect x="121.5" y="63" width="3.5" height="3.5" rx="0.8" />
                  <rect x="125.5" y="67" width="3.5" height="3.5" rx="0.8" />

                  <rect x="89" y="78" width="3.2" height="3" rx="0.7" />
                  <rect x="93" y="80.5" width="3.2" height="3" rx="0.7" />
                  <rect x="98.4" y="81" width="3.2" height="3" rx="0.7" />
                  <rect x="103.8" y="80.5" width="3.2" height="3" rx="0.7" />
                  <rect x="107.8" y="78" width="3.2" height="3" rx="0.7" />
                </g>
              )}
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
};
