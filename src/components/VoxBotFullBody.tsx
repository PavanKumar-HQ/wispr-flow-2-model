 import React from 'react';

export type VoxBotPose =
  | 'idle'
  | 'walk'
  | 'fly'
  | 'sit'
  | 'sleep'
  | 'dance'
  | 'music'
  | 'listening'
  | 'transcribing'
  | 'cleaning'
  | 'success';

export interface VoxBotVisorStatus {
  mode: 'normal' | 'timer' | 'cleaning' | 'agenda';
  timerText?: string;
  agendaLabel?: string;
}

interface VoxBotFullBodyProps {
  pose?: VoxBotPose;
  size?: number;
  facing?: 'left' | 'right';
  gaze?: { x: number; y: number };
  isHovered?: boolean;
  isBlinking?: boolean;
  visorStatus?: VoxBotVisorStatus;
  onCoreClick?: () => void;
  className?: string;
}

/**
 * Full-Body 3D-Styled Articulated VoxBot Desktop Companion.
 * Matches the Sovereign Pill color theme:
 * - Ready/Idle/Walk/Fly: Teal/Green (#34A89E)
 * - Listening: Traditional Pill Terracotta-Orange (#DA6C4C)
 * - Transcribing: Warm Amber (#DDA44D)
 * - Cleaning: Radiant Mint-Cyan (#2CE6D3)
 */
export const VoxBotFullBody: React.FC<VoxBotFullBodyProps> = ({
  pose = 'idle',
  size = 134,
  facing = 'right',
  gaze = { x: 0, y: 0 },
  isHovered = false,
  isBlinking = false,
  visorStatus,
  onCoreClick,
  className = '',
}) => {
  const isListening = pose === 'listening';
  const isWalking = pose === 'walk';
  const isFlying = pose === 'fly';
  const isSitting = pose === 'sit' || pose === 'sleep';
  const isSleeping = pose === 'sleep';
  const isDancing = pose === 'dance';
  const isMusic = pose === 'music';
  const isTranscribing = pose === 'transcribing';
  const isCleaning = pose === 'cleaning' || visorStatus?.mode === 'cleaning';
  const isSuccess = pose === 'success';

  // Color theme matched to Sovereign Pill: Ready = Green/Teal, Listening = Terracotta Orange, Transcribing = Amber
  const coreColor = isListening
    ? '#DA6C4C'
    : isTranscribing
    ? '#DDA44D'
    : isCleaning
    ? '#2CE6D3'
    : isSleeping
    ? '#7A9A96'
    : '#34A89E';

  const eyeColor = isListening
    ? '#FFE6A8'
    : isTranscribing
    ? '#FFD27D'
    : isCleaning
    ? '#7DF9EC'
    : isSleeping
    ? '#9BC4BE'
    : '#FFD07B';

  // Directional 3D turn & forward lean when walking or flying so movement direction is unmistakable
  const dirSign = facing === 'left' ? -1 : 1;
  const bodyRotateY = isWalking ? dirSign * 20 : isFlying ? dirSign * 15 : gaze.x * 6;
  const bodyLeanZ = isWalking ? dirSign * 3.5 : isFlying ? dirSign * 5.5 : 0;
  const bodyRotateX = isFlying ? -6 : -gaze.y * 4;

  // Compensate X gaze when robot SVG is mirrored horizontally (facing === 'left')
  const rawGazeX = facing === 'left' ? -gaze.x : gaze.x;
  const eyeShiftX = isSleeping ? 0 : isWalking || isFlying ? 4.2 : rawGazeX * 4.5;
  const eyeShiftY = isSleeping ? 0 : isWalking ? -0.8 : gaze.y * 2.8;
  const height = Math.round(size * 1.2);

  return (
    <div
      className={`inline-flex items-center justify-center select-none overflow-visible ${className}`}
      style={{
        width: size,
        height,
        transform: `perspective(480px) rotateY(${bodyRotateY}deg) rotateX(${bodyRotateX}deg) rotateZ(${bodyLeanZ}deg) translateZ(0)`,
        transition: 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
        willChange: 'transform',
      }}
    >
      <div
        className="inline-flex items-center justify-center overflow-visible"
        style={{
          width: size,
          height,
          transform: facing === 'left' ? 'scaleX(-1)' : undefined,
        }}
      >
      <svg
        viewBox="-12 -20 224 274"
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
            <stop offset="0%" stopColor={coreColor} stopOpacity="0.95" />
            <stop offset="45%" stopColor={coreColor} stopOpacity="0.4" />
            <stop offset="100%" stopColor={coreColor} stopOpacity="0" />
          </radialGradient>

          <radialGradient id="vb3dAntennaGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isListening ? '#DA6C4C' : isTranscribing ? '#FFD07B' : '#34A89E'} stopOpacity="0.9" />
            <stop offset="55%" stopColor={coreColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={coreColor} stopOpacity="0" />
          </radialGradient>

          {/* High-Fidelity Visor Gloss & Eye Emission Glow Filters */}
          <filter id="vbEyeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="vbCoreBloom" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="vbSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#061211" floodOpacity="0.22" />
          </filter>
        </defs>

        {/* Ground Shadow (hidden when sitting or flying high) */}
        {!isSitting && !isFlying && (
          <ellipse
            cx="100"
            cy="242"
            rx={isWalking ? 40 : 36}
            ry="6.5"
            fill="#061211"
            opacity="0.32"
            filter="url(#vbSoftShadow)"
            className={isWalking ? 'vb-shadow-walk' : 'vb-shadow-idle'}
          />
        )}

        {/* 3D Beveled Sitting Bench (in 'sit' or 'sleep' pose) */}
        {isSitting && (
          <g>
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

        {/* TRANSCRIBING / THINKING THOUGHT BUBBLE */}
        {isTranscribing && (
          <g className="pointer-events-none">
            {/* Thought trail dots */}
            <circle cx="144" cy="40" r="3" fill="#E6E2D3" stroke="#08534E" strokeWidth="1.2" />
            <circle cx="151" cy="31" r="4.2" fill="#E6E2D3" stroke="#08534E" strokeWidth="1.2" />
            {/* Thought Bubble */}
            <rect
              x="148"
              y="4"
              width="42"
              height="22"
              rx="11"
              fill="#07514C"
              stroke="#DDA44D"
              strokeWidth="1.8"
            />
            <circle cx="160" cy="15" r="2.6" fill="#FFD27D" className="anim-bubble-dot-1" />
            <circle cx="169" cy="15" r="2.6" fill="#DFDFD4" className="anim-bubble-dot-2" />
            <circle cx="178" cy="15" r="2.6" fill="#34A89E" className="anim-bubble-dot-3" />
          </g>
        )}

        {/* SLEEPING FLOATING Zzz */}
        {isSleeping && (
          <g className="pointer-events-none">
            <text x="150" y="34" fill="#FFD07B" className="font-sans text-[12px] anim-zzz-1 font-bold">
              z
            </text>
            <text x="164" y="20" fill="#34A89E" className="font-sans text-[15px] anim-zzz-2 font-bold">
              Z
            </text>
          </g>
        )}

        {/* FLOATING MUSIC NOTES WHEN VIBING TO YOUTUBE / INSTA / SPOTIFY */}
        {isMusic && (
          <g className="pointer-events-none">
            <text x="26" y="42" fill="#DDA44D" className="text-[16px] font-bold vb-note-1">
              ♪
            </text>
            <text x="164" y="38" fill="#34A89E" className="text-[17px] font-bold vb-note-2">
              ♫
            </text>
          </g>
        )}

        {/* MAIN ROBOT BODY */}
        <g
          className={
            isFlying
              ? 'vb-body-fly'
              : isWalking
              ? 'vb-body-walk'
              : isDancing || isMusic
              ? 'vb-body-dance'
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
          {/* ======================== LEGS & BOOTS (2-JOINT ARTICULATED) ======================== */}
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
              {/* Left Leg: Hip/Thigh -> Knee/Shin/Boot */}
              <g
                className={isWalking ? 'vb-thigh-left-walk' : ''}
                transform={isFlying ? 'rotate(10 81 174)' : undefined}
              >
                <circle cx="81" cy="174" r="8" fill="url(#vb3dDark)" />
                <rect x="72" y="176" width="18" height="22" rx="7" fill="url(#vb3dCream)" stroke="#2A2D32" strokeWidth="1.4" />
                <g
                  className={isWalking ? 'vb-shin-left-walk' : ''}
                  transform={isFlying ? 'rotate(6 81 199)' : undefined}
                >
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
                  {/* Twin Boot Thruster Flame when Flying */}
                  {isFlying && (
                    <g className="vb-flame-left">
                      <path d="M 71 238 L 80 262 L 89 238 Z" fill="#34A89E" opacity="0.9" />
                      <path d="M 75 238 L 80 254 L 85 238 Z" fill="#FFD07B" />
                    </g>
                  )}
                </g>
              </g>

              {/* Right Leg: Hip/Thigh -> Knee/Shin/Boot */}
              <g
                className={isWalking ? 'vb-thigh-right-walk' : ''}
                transform={isFlying ? 'rotate(8 119 174)' : undefined}
              >
                <circle cx="119" cy="174" r="8" fill="url(#vb3dDark)" />
                <rect x="110" y="176" width="18" height="22" rx="7" fill="url(#vb3dCream)" stroke="#2A2D32" strokeWidth="1.4" />
                <g
                  className={isWalking ? 'vb-shin-right-walk' : ''}
                  transform={isFlying ? 'rotate(6 119 199)' : undefined}
                >
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
                  {isFlying && (
                    <g className="vb-flame-right">
                      <path d="M 111 238 L 120 262 L 129 238 Z" fill="#34A89E" opacity="0.9" />
                      <path d="M 115 238 L 120 254 L 125 238 Z" fill="#FFD07B" />
                    </g>
                  )}
                </g>
              </g>
            </g>
          )}

          {/* ======================== CHUNKY 2-JOINT ARTICULATED ARMS ======================== */}
          <g
            className={
              isFlying
                ? ''
                : isWalking || isDancing || isMusic
                ? 'vb-arm-left-walk'
                : isSitting
                ? 'vb-arm-left-sit'
                : isListening
                ? 'vb-arm-left-listen'
                : 'vb-arm-left-idle'
            }
            transform={isFlying ? 'rotate(28 60 126)' : undefined}
          >
            <circle cx="60" cy="126" r="9" fill="url(#vb3dDark)" />
            <rect x="46" y="126" width="15" height="22" rx="7.5" fill="url(#vb3dDark)" />
            <g className={isWalking ? 'vb-forearm-left-walk' : ''}>
              <circle cx="53" cy="148" r="7" fill="url(#vb3dDark)" />
              <rect x="44" y="149" width="17" height="22" rx="8.5" fill="url(#vb3dCreamArm)" stroke="#2A2D32" strokeWidth="1.4" />
              <line x1="48" y1="153" x2="48" y2="165" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
              <path
                d="M 44 169 C 40 176, 43 183, 50 183 C 53 183, 54 179, 54 177 C 55 179, 57 182, 60 181 C 64 179, 64 172, 59 169 Z"
                fill="url(#vb3dDark)"
              />
            </g>
          </g>

          {/* Right Arm (hidden from background layer when thinking so it renders cleanly in FRONT) */}
          {!isTranscribing && (
            <g
              className={
                isFlying
                  ? ''
                  : isWalking || isDancing || isMusic
                  ? 'vb-arm-right-walk'
                  : isSitting
                  ? 'vb-arm-right-sit'
                  : isListening
                  ? 'vb-arm-right-listen'
                  : 'vb-arm-right-idle'
              }
              transform={isFlying ? 'rotate(-28 140 126)' : undefined}
            >
              <circle cx="140" cy="126" r="9" fill="url(#vb3dDark)" />
              <rect x="139" y="126" width="15" height="22" rx="7.5" fill="url(#vb3dDark)" />
              <g className={isWalking ? 'vb-forearm-right-walk' : ''}>
                <circle cx="147" cy="148" r="7" fill="url(#vb3dDark)" />
                <rect x="139" y="149" width="17" height="22" rx="8.5" fill="url(#vb3dCreamArm)" stroke="#2A2D32" strokeWidth="1.4" />
                <line x1="143" y1="153" x2="143" y2="165" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
                <path
                  d="M 141 169 C 136 172, 136 179, 140 181 C 143 182, 145 179, 146 177 C 146 179, 147 183, 150 183 C 157 183, 160 176, 156 169 Z"
                  fill="url(#vb3dDark)"
                />
              </g>
            </g>
          )}

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
            />

            {/* Concentric Glowing Chest Core — ONLY clickable mic button on VoxBot */}
            <g
              data-voxbot-core="true"
              onClick={(e) => {
                e.stopPropagation();
                onCoreClick?.();
              }}
              className="cursor-pointer hover:opacity-95 active:scale-95 transition-transform"
              style={{ transformOrigin: '100px 139px' }}
            >
              <title>{isListening ? 'Click center button to stop listening' : 'Click center button to start listening'}</title>
              <circle cx="100" cy="139" r="20" fill="url(#vb3dCoreGlow)" opacity={isListening ? 0.9 : 0.6} />
              <circle cx="100" cy="139" r="16.5" fill="url(#vb3dDark)" stroke={coreColor} strokeWidth="2.4" />
              <circle cx="100" cy="139" r="12.5" fill="none" stroke="#8C949E" strokeWidth="1.3" opacity="0.85" />
              <circle cx="100" cy="139" r="8.5" fill="none" stroke={coreColor} strokeWidth="1.6" opacity="0.9" />
              <circle
                cx="100"
                cy="139"
                r="4.5"
                fill={coreColor}
              />
            </g>

            <rect x="89" y="102" width="22" height="13" rx="5" fill="url(#vb3dDark)" />
          </g>

          {/* ======================== HEAD & CRT FACE (TURNS WITH GAZE) ======================== */}
          <g
            className={isMusic ? 'vb-head-beat' : ''}
            style={
              isMusic
                ? undefined
                : {
                    transform: isTranscribing
                      ? 'rotate(-4deg)'
                      : isSleeping
                      ? 'translateY(3px) rotate(4deg)'
                      : `translateX(${rawGazeX * 2.5}px) rotate(${rawGazeX * 2.5}deg)`,
                    transformOrigin: '100px 104px',
                    transition: 'transform 220ms ease-out',
                  }
            }
          >
            <line x1="100" y1="36" x2="100" y2="18" stroke="#182222" strokeWidth="5.5" strokeLinecap="round" />
            <line x1="100" y1="36" x2="100" y2="18" stroke="#0E6B64" strokeWidth="3" strokeLinecap="round" />
            <ellipse cx="100" cy="36" rx="10" ry="4" fill="url(#vb3dTeal)" />
            <circle
              cx="100"
              cy="14"
              r="7.5"
              fill={isListening ? '#DA6C4C' : isTranscribing ? '#DDA44D' : '#34A89E'}
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

            {/* Sleek Cyber-Headphones Overlay when System Music/Audio is Playing */}
            {isMusic && (
              <g>
                {/* Headband Arch */}
                <path
                  d="M 41 64 C 41 24, 159 24, 159 64"
                  fill="none"
                  stroke="#2B2F35"
                  strokeWidth="6.5"
                  strokeLinecap="round"
                />
                <path
                  d="M 45 55 C 52 27, 148 27, 155 55"
                  fill="none"
                  stroke="#34A89E"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                {/* Left & Right Cushioned Earcups */}
                <rect x="31" y="54" width="16" height="34" rx="8" fill="url(#vb3dDark)" stroke="#DDA44D" strokeWidth="2" />
                <rect x="153" y="54" width="16" height="34" rx="8" fill="url(#vb3dDark)" stroke="#DDA44D" strokeWidth="2" />
              </g>
            )}

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

            {/* Deep Curved CRT Glass with Glossy Specular Arc */}
            <defs>
              <clipPath id="vbVisorClip">
                <rect x="57" y="47" width="86" height="48" rx="12" />
              </clipPath>
            </defs>
            <rect x="57" y="47" width="86" height="48" rx="12" fill="url(#vb3dScreen)" />
            <path d="M 60 51 Q 100 45 140 51 L 136 58 Q 100 54 64 58 Z" fill="#FFFFFF" opacity="0.09" />
            <path d="M 63 53 Q 100 48 137 53" stroke="#52D1C5" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.35" />

            {/* ================= CLEAN, SPACIOUS LED EXPRESSIONS (WITH EMISSIVE BLOOM) ================= */}
            {isCleaning ? (
              /* CLEANING / SYSTEM BOOST: Sweeping Mint Laser Beam + Sparkle Stars + LED Readout */
              <g clipPath="url(#vbVisorClip)">
                <rect
                  x="94"
                  y="47"
                  width="12"
                  height="48"
                  fill="#2CE6D3"
                  opacity="0.35"
                  className="vb-clean-beam"
                />
                <line
                  x1="100"
                  y1="47"
                  x2="100"
                  y2="95"
                  stroke="#9DFCF2"
                  strokeWidth="2.5"
                  className="vb-clean-beam"
                />
                <g transform={facing === 'left' ? 'translate(200, 0) scale(-1, 1)' : undefined}>
                  <text
                    x="100"
                    y="70"
                    textAnchor="middle"
                    fill="#9DFCF2"
                    fontSize="11.5"
                    fontWeight="800"
                    fontFamily="JetBrains Mono, monospace"
                    letterSpacing="0.8"
                    filter="url(#vbEyeGlow)"
                  >
                    CLEAN
                  </text>
                  <text
                    x="100"
                    y="83"
                    textAnchor="middle"
                    fill="#34A89E"
                    fontSize="7.5"
                    fontWeight="700"
                    fontFamily="Plus Jakarta Sans, sans-serif"
                  >
                    BOOSTING...
                  </text>
                </g>
              </g>
            ) : visorStatus?.mode === 'timer' && !isListening && !isTranscribing && !isSleeping ? (
              /* LIVE TIMER / COUNTDOWN ON FACE VISOR */
              <g transform={facing === 'left' ? 'translate(200, 0) scale(-1, 1)' : undefined}>
                {/* Subtle peeking happy eyes at top of visor */}
                <path d="M 76 55 Q 81 51 86 55" fill="none" stroke="#34A89E" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
                <path d="M 114 55 Q 119 51 124 55" fill="none" stroke="#34A89E" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
                {/* Big Crisp Digital LED Countdown */}
                <text
                  x="100"
                  y="75"
                  textAnchor="middle"
                  fill="#FFD07B"
                  fontSize="18"
                  fontWeight="800"
                  fontFamily="JetBrains Mono, monospace"
                  letterSpacing="0.5"
                  filter="url(#vbEyeGlow)"
                >
                  {visorStatus.timerText || '00:00'}
                </text>
                {/* Agenda / Reminder Label */}
                {visorStatus.agendaLabel && (
                  <text
                    x="100"
                    y="88"
                    textAnchor="middle"
                    fill="#52D1C5"
                    fontSize="7.5"
                    fontWeight="700"
                    fontFamily="Plus Jakarta Sans, sans-serif"
                  >
                    {visorStatus.agendaLabel.length > 14
                      ? `${visorStatus.agendaLabel.slice(0, 13)}…`
                      : visorStatus.agendaLabel}
                  </text>
                )}
              </g>
            ) : (
            <g
              fill={eyeColor}
              filter="url(#vbEyeGlow)"
              style={{
                transform: `translate(${eyeShiftX}px, ${eyeShiftY}px)`,
                transition: 'transform 180ms cubic-bezier(0.2, 0.8, 0.3, 1)',
              }}
            >
              {isSleeping ? (
                /* SLEEPING: Peaceful closed U U eyes + gentle dot */
                <g>
                  <path d="M 68 65 Q 76 72 84 65" fill="none" stroke={eyeColor} strokeWidth="3.4" strokeLinecap="round" />
                  <path d="M 116 65 Q 124 72 132 65" fill="none" stroke={eyeColor} strokeWidth="3.4" strokeLinecap="round" />
                  <circle cx="100" cy="80" r="2.4" fill={eyeColor} />
                </g>
              ) : isBlinking ? (
                /* BLINK: Crisp horizontal blink + soft smile */
                <g>
                  <rect x="68" y="66" width="16" height="3.2" rx="1.6" />
                  <rect x="116" y="66" width="16" height="3.2" rx="1.6" />
                  <path d="M 90 79 Q 100 85 110 79" fill="none" stroke={eyeColor} strokeWidth="2.8" strokeLinecap="round" />
                </g>
              ) : isHovered && !isListening && !isTranscribing ? (
                /* HOVERED: Bright affectionate eyes + rosy cheeks + happy smile */
                <g>
                  <rect x="69" y="57" width="13" height="15" rx="6.5" fill="#FFE08A" />
                  <circle cx="78" cy="61" r="2.8" fill="#FFFDF5" />
                  <rect x="118" y="57" width="13" height="15" rx="6.5" fill="#FFE08A" />
                  <circle cx="127" cy="61" r="2.8" fill="#FFFDF5" />
                  <rect x="62" y="75" width="7" height="3.5" rx="1.75" fill="#DA6C4C" opacity="0.85" />
                  <rect x="131" y="75" width="7" height="3.5" rx="1.75" fill="#DA6C4C" opacity="0.85" />
                  <path d="M 89 78 Q 100 86 111 78" fill="none" stroke={eyeColor} strokeWidth="3" strokeLinecap="round" />
                </g>
              ) : isListening ? (
                /* LISTENING: Warm, friendly rounded eyes + rosy cheeks + cheerful smile */
                <g>
                  <rect x="69" y="57" width="13" height="15" rx="6.5" fill="#FFE6A8" />
                  <circle cx="78" cy="61" r="2.8" fill="#FFFDF5" />
                  <rect x="118" y="57" width="13" height="15" rx="6.5" fill="#FFE6A8" />
                  <circle cx="127" cy="61" r="2.8" fill="#FFFDF5" />

                  <rect x="62" y="75" width="7" height="3.5" rx="1.75" fill="#DA6C4C" opacity="0.9" />
                  <rect x="131" y="75" width="7" height="3.5" rx="1.75" fill="#DA6C4C" opacity="0.9" />

                  <path
                    d="M 89 77 Q 100 86 111 77"
                    fill="none"
                    stroke="#DDA44D"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                </g>
              ) : isTranscribing ? (
                /* TRANSCRIBING / THINKING: Original cute eyes glancing up + thoughtful curved mouth */
                <g>
                  <rect x="70" y="54" width="12" height="14" rx="6" fill="#FFD27D" />
                  <circle cx="79" cy="57" r="2.8" fill="#FFFDF5" />
                  <rect x="118" y="54" width="12" height="14" rx="6" fill="#FFD27D" />
                  <circle cx="127" cy="57" r="2.8" fill="#FFFDF5" />
                  <path
                    d="M 94 79 Q 100 76 106 79"
                    fill="none"
                    stroke="#DDA44D"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                </g>
              ) : isFlying ? (
                /* FLYING: Excited happy ^ ^ eyes + confident grin */
                <g>
                  <rect x="69" y="58" width="12" height="13" rx="6" fill="#FFE08A" />
                  <circle cx="77" cy="61" r="2.8" fill="#FFFDF5" />
                  <rect x="119" y="58" width="12" height="13" rx="6" fill="#FFE08A" />
                  <circle cx="127" cy="61" r="2.8" fill="#FFFDF5" />
                  <path d="M 88 77 Q 100 86 112 77" fill="none" stroke="#34A89E" strokeWidth="3.2" strokeLinecap="round" />
                </g>
              ) : isSuccess || isDancing || isMusic ? (
                /* SUCCESS / DANCE / MUSIC: Clean joyful ^ ^ eyes & wide smile */
                <g>
                  <path d="M 68 68 Q 76 58 84 68" fill="none" stroke={eyeColor} strokeWidth="3.5" strokeLinecap="round" />
                  <path d="M 116 68 Q 124 58 132 68" fill="none" stroke={eyeColor} strokeWidth="3.5" strokeLinecap="round" />
                  <path d="M 88 78 Q 100 87 112 78" fill="none" stroke={eyeColor} strokeWidth="3.2" strokeLinecap="round" />
                </g>
              ) : isSitting ? (
                /* SITTING: Cozy relaxed eyes & warm smile */
                <g>
                  <path d="M 69 66 Q 76 60 83 66" fill="none" stroke={eyeColor} strokeWidth="3.4" strokeLinecap="round" />
                  <path d="M 117 66 Q 124 60 131 66" fill="none" stroke={eyeColor} strokeWidth="3.4" strokeLinecap="round" />
                  <path d="M 90 78 Q 100 84 110 78" fill="none" stroke={eyeColor} strokeWidth="2.8" strokeLinecap="round" />
                </g>
              ) : isWalking ? (
                /* WALKING: Cheerful wide eyes & happy smile */
                <g>
                  <rect x="70" y="58" width="12" height="13" rx="6" />
                  <circle cx="78" cy="61" r="2.6" fill="#FFF7DF" />
                  <rect x="118" y="58" width="12" height="13" rx="6" />
                  <circle cx="126" cy="61" r="2.6" fill="#FFF7DF" />
                  <path d="M 89 77 Q 100 85 111 77" fill="none" stroke={eyeColor} strokeWidth="3" strokeLinecap="round" />
                </g>
              ) : (
                /* IDLE: Signature friendly ^ ^ eyes & warm smile */
                <g>
                  <path d="M 69 67 Q 76 59 83 67" fill="none" stroke={eyeColor} strokeWidth="3.4" strokeLinecap="round" />
                  <path d="M 117 67 Q 124 59 131 67" fill="none" stroke={eyeColor} strokeWidth="3.4" strokeLinecap="round" />
                  <path d="M 90 78 Q 100 84 110 78" fill="none" stroke={eyeColor} strokeWidth="2.8" strokeLinecap="round" />
                </g>
              )}
            </g>
            )}

            {/* Cleaning / Boost Sparkle Stars around Head & Core */}
            {isCleaning && (
              <g fill="#7DF9EC" filter="url(#vbEyeGlow)">
                <path d="M 48 26 L 50 32 L 56 34 L 50 36 L 48 42 L 46 36 L 40 34 L 46 32 Z" className="vb-clean-sparkle-1" />
                <path d="M 154 32 L 156 38 L 162 40 L 156 42 L 154 48 L 152 42 L 146 40 L 152 38 Z" className="vb-clean-sparkle-2" />
                <path d="M 138 134 L 140 140 L 146 142 L 140 144 L 138 150 L 136 144 L 130 142 L 136 140 Z" className="vb-clean-sparkle-3" />
              </g>
            )}
          </g>

          {/* Foreground Right Arm when Thinking (renders cleanly in FRONT of body/head) */}
          {isTranscribing && (
            <g
              transform="rotate(-106 140 126)"
            >
              <circle cx="140" cy="126" r="9" fill="url(#vb3dDark)" />
              <rect x="139" y="126" width="15" height="22" rx="7.5" fill="url(#vb3dDark)" />
              <g
                transform="rotate(-42 147 148)"
              >
                <circle cx="147" cy="148" r="7" fill="url(#vb3dDark)" />
                <rect x="139" y="149" width="17" height="22" rx="8.5" fill="url(#vb3dCreamArm)" stroke="#2A2D32" strokeWidth="1.4" />
                <line x1="143" y1="153" x2="143" y2="165" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
                {/* Friendly Rounded Mitten Palm */}
                <rect x="138" y="168" width="18" height="14" rx="7" fill="url(#vb3dDark)" />
                <circle cx="139" cy="172" r="3.5" fill="url(#vb3dDark)" />
              </g>
            </g>
          )}
        </g>
      </svg>
      </div>
    </div>
  );
};
