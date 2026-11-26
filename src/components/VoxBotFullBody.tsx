import React from 'react';

export type VoxBotPose = 'idle' | 'walk' | 'sit' | 'listening' | 'transcribing' | 'success';

interface VoxBotFullBodyProps {
  pose?: VoxBotPose;
  size?: number;
  facing?: 'left' | 'right';
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * Full-Body Articulated VoxBot Desktop Companion.
 * Faithfully implements the 4-pose concept sheet:
 * - idle: standing upright with warm pixel CRT smile & glowing amber core
 * - walk: mid-stride arm & leg swing with subtle body bounce
 * - sit: seated on a sleek dark charcoal perch/bench with relaxed eyes
 * - listening: alert stance with terracotta-amber radar waves & pulsing core
 * - transcribing / success: live feedback expressions for dictation pipeline
 */
export const VoxBotFullBody: React.FC<VoxBotFullBodyProps> = ({
  pose = 'idle',
  size = 136,
  facing = 'right',
  className = '',
  onClick,
}) => {
  const isListening = pose === 'listening';
  const isWalking = pose === 'walk';
  const isSitting = pose === 'sit';
  const isTranscribing = pose === 'transcribing';
  const isSuccess = pose === 'success';

  const coreColor = isListening
    ? '#DA6C4C'
    : isTranscribing
    ? '#34A89E'
    : '#DDA44D';

  const eyeColor = isListening
    ? '#FF7A45'
    : isTranscribing
    ? '#34A89E'
    : '#DDA44D';

  const height = Math.round(size * 1.28);

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
      <svg
        viewBox="0 0 180 230"
        width={size}
        height={height}
        className="overflow-visible drop-shadow-[0_8px_14px_rgba(0,0,0,0.22)]"
      >
        <defs>
          {/* Head & Torso Shading Gradients */}
          <linearGradient id="vbCream" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F2F0E6" />
            <stop offset="100%" stopColor="#D7D4C5" />
          </linearGradient>
          <linearGradient id="vbTeal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0E6B64" />
            <stop offset="100%" stopColor="#053E3A" />
          </linearGradient>
          <linearGradient id="vbDark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B4046" />
            <stop offset="100%" stopColor="#212428" />
          </linearGradient>
          <radialGradient id="vbScreen" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#1D2626" />
            <stop offset="100%" stopColor="#0D1212" />
          </radialGradient>
          <radialGradient id="vbCoreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={coreColor} stopOpacity="0.95" />
            <stop offset="70%" stopColor={coreColor} stopOpacity="0.35" />
            <stop offset="100%" stopColor={coreColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ground Shadow (adapts to pose) */}
        {!isSitting && (
          <ellipse
            cx="90"
            cy="214"
            rx={isWalking ? 38 : 34}
            ry="6"
            fill="#141818"
            opacity="0.22"
            className={isWalking ? 'vb-shadow-walk' : 'vb-shadow-idle'}
          />
        )}

        {/* Sitting Bench / Perch (only in 'sit' pose) */}
        {isSitting && (
          <g>
            {/* Bench Shadow */}
            <ellipse cx="90" cy="196" rx="44" ry="5" fill="#141818" opacity="0.2" />
            {/* Bench Backrest */}
            <rect
              x="44"
              y="132"
              width="92"
              height="26"
              rx="6"
              fill="url(#vbDark)"
              stroke="#191B1E"
              strokeWidth="2.5"
            />
            {/* Bench Seat */}
            <rect
              x="40"
              y="154"
              width="100"
              height="12"
              rx="5"
              fill="#2B2F34"
              stroke="#191B1E"
              strokeWidth="2.5"
            />
            <line x1="46" y1="157" x2="134" y2="157" stroke="#525860" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        )}

        {/* LISTENING RADAR WAVES (behind robot head) */}
        {isListening && (
          <g className="pointer-events-none">
            {/* Antenna concentric aura */}
            <circle cx="90" cy="18" r="14" fill="none" stroke="#DA6C4C" strokeWidth="2" opacity="0.7" className="vb-radar-1" />
            <circle cx="90" cy="18" r="24" fill="none" stroke="#DDA44D" strokeWidth="1.6" opacity="0.45" className="vb-radar-2" />
            {/* Left & Right acoustic arcs */}
            <path d="M 32 54 Q 24 68 32 82" fill="none" stroke="#DA6C4C" strokeWidth="2.5" strokeLinecap="round" className="vb-wave-1" />
            <path d="M 24 47 Q 13 68 24 89" fill="none" stroke="#DDA44D" strokeWidth="2" strokeLinecap="round" className="vb-wave-2" />
            <path d="M 148 54 Q 156 68 148 82" fill="none" stroke="#DA6C4C" strokeWidth="2.5" strokeLinecap="round" className="vb-wave-1" />
            <path d="M 156 47 Q 167 68 156 89" fill="none" stroke="#DDA44D" strokeWidth="2" strokeLinecap="round" className="vb-wave-2" />
          </g>
        )}

        {/* MAIN ROBOT BODY GROUP */}
        <g
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
          {/* ======================== LEGS ======================== */}
          {isSitting ? (
            /* SITTING LEGS: Bent forward, boots dangling */
            <g>
              {/* Left Leg */}
              <g>
                {/* Thigh */}
                <rect x="65" y="152" width="16" height="16" rx="6" fill="url(#vbCream)" stroke="#212121" strokeWidth="2.5" />
                {/* Knee Joint */}
                <circle cx="72" cy="166" r="6" fill="url(#vbDark)" stroke="#212121" strokeWidth="2" />
                {/* Shin */}
                <rect x="64" y="168" width="15" height="16" rx="5" fill="url(#vbCream)" stroke="#212121" strokeWidth="2.5" />
                {/* Boot */}
                <rect x="60" y="181" width="22" height="12" rx="6" fill="url(#vbTeal)" stroke="#212121" strokeWidth="2.5" />
                <rect x="61" y="187" width="20" height="5" rx="2.5" fill="url(#vbCream)" stroke="#212121" strokeWidth="1.5" />
                <circle cx="62" cy="185" r="2.2" fill="#DDA44D" />
              </g>
              {/* Right Leg */}
              <g>
                <rect x="99" y="152" width="16" height="16" rx="6" fill="url(#vbCream)" stroke="#212121" strokeWidth="2.5" />
                <circle cx="108" cy="166" r="6" fill="url(#vbDark)" stroke="#212121" strokeWidth="2" />
                <rect x="101" y="168" width="15" height="16" rx="5" fill="url(#vbCream)" stroke="#212121" strokeWidth="2.5" />
                <rect x="98" y="181" width="22" height="12" rx="6" fill="url(#vbTeal)" stroke="#212121" strokeWidth="2.5" />
                <rect x="99" y="187" width="20" height="5" rx="2.5" fill="url(#vbCream)" stroke="#212121" strokeWidth="1.5" />
                <circle cx="118" cy="185" r="2.2" fill="#DDA44D" />
              </g>
            </g>
          ) : (
            /* STANDING / WALKING LEGS */
            <g>
              {/* Left Leg */}
              <g className={isWalking ? 'vb-leg-left-walk' : ''}>
                {/* Hip Socket */}
                <circle cx="74" cy="154" r="6.5" fill="url(#vbDark)" stroke="#212121" strokeWidth="2" />
                {/* Thigh */}
                <rect x="67" y="156" width="14" height="19" rx="5" fill="url(#vbCream)" stroke="#212121" strokeWidth="2.5" />
                {/* Knee Joint */}
                <circle cx="74" cy="177" r="5.5" fill="url(#vbDark)" stroke="#212121" strokeWidth="2" />
                {/* Shin */}
                <rect x="67" y="179" width="14" height="17" rx="5" fill="url(#vbCream)" stroke="#212121" strokeWidth="2.5" />
                {/* Boot */}
                <path
                  d="M 62 197 Q 62 192 74 192 Q 86 192 86 197 L 87 206 Q 87 210 82 210 L 64 210 Q 59 210 60 205 Z"
                  fill="url(#vbTeal)"
                  stroke="#212121"
                  strokeWidth="2.5"
                />
                <rect x="61" y="203" width="25" height="6" rx="3" fill="url(#vbCream)" stroke="#212121" strokeWidth="1.8" />
                <rect x="63" y="208" width="21" height="3" rx="1.5" fill="#DA6C4C" />
                <circle cx="64" cy="199" r="2.3" fill="#DDA44D" />
              </g>

              {/* Right Leg */}
              <g className={isWalking ? 'vb-leg-right-walk' : ''}>
                <circle cx="106" cy="154" r="6.5" fill="url(#vbDark)" stroke="#212121" strokeWidth="2" />
                <rect x="99" y="156" width="14" height="19" rx="5" fill="url(#vbCream)" stroke="#212121" strokeWidth="2.5" />
                <circle cx="106" cy="177" r="5.5" fill="url(#vbDark)" stroke="#212121" strokeWidth="2" />
                <rect x="99" y="179" width="14" height="17" rx="5" fill="url(#vbCream)" stroke="#212121" strokeWidth="2.5" />
                <path
                  d="M 94 197 Q 94 192 106 192 Q 118 192 118 197 L 120 205 Q 121 210 116 210 L 98 210 Q 93 210 93 206 Z"
                  fill="url(#vbTeal)"
                  stroke="#212121"
                  strokeWidth="2.5"
                />
                <rect x="94" y="203" width="25" height="6" rx="3" fill="url(#vbCream)" stroke="#212121" strokeWidth="1.8" />
                <rect x="96" y="208" width="21" height="3" rx="1.5" fill="#DA6C4C" />
                <circle cx="116" cy="199" r="2.3" fill="#DDA44D" />
              </g>
            </g>
          )}

          {/* ======================== LEFT ARM ======================== */}
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
            {/* Shoulder Joint */}
            <circle cx="56" cy="113" r="6.5" fill="url(#vbDark)" stroke="#212121" strokeWidth="2.2" />
            {/* Upper Arm */}
            <rect x="46" y="114" width="11" height="17" rx="5" fill="url(#vbDark)" stroke="#212121" strokeWidth="2.2" />
            {/* Elbow Joint */}
            <circle cx="51" cy="132" r="5" fill="url(#vbDark)" stroke="#212121" strokeWidth="2" />
            {/* Forearm */}
            <rect x="44" y="133" width="13" height="18" rx="6" fill="url(#vbCream)" stroke="#212121" strokeWidth="2.5" />
            {/* Mechanical Hand */}
            <path
              d="M 44 150 C 41 155, 43 161, 48 161 C 50 161, 51 158, 51 156 C 52 158, 54 161, 57 160 C 60 159, 60 153, 56 150 Z"
              fill="url(#vbDark)"
              stroke="#212121"
              strokeWidth="2"
            />
          </g>

          {/* ======================== RIGHT ARM ======================== */}
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
            <circle cx="124" cy="113" r="6.5" fill="url(#vbDark)" stroke="#212121" strokeWidth="2.2" />
            <rect x="123" y="114" width="11" height="17" rx="5" fill="url(#vbDark)" stroke="#212121" strokeWidth="2.2" />
            <circle cx="129" cy="132" r="5" fill="url(#vbDark)" stroke="#212121" strokeWidth="2" />
            <rect x="123" y="133" width="13" height="18" rx="6" fill="url(#vbCream)" stroke="#212121" strokeWidth="2.5" />
            <path
              d="M 124 150 C 120 153, 120 159, 123 160 C 126 161, 128 158, 129 156 C 129 158, 130 161, 132 161 C 137 161, 139 155, 136 150 Z"
              fill="url(#vbDark)"
              stroke="#212121"
              strokeWidth="2"
            />
          </g>

          {/* ======================== TORSO & PELVIS ======================== */}
          <g>
            {/* Pelvis / Waist Accent */}
            <path
              d="M 74 147 L 106 147 L 100 156 L 80 156 Z"
              fill="url(#vbTeal)"
              stroke="#212121"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />

            {/* Lower Cream Torso */}
            <rect
              x="61"
              y="124"
              width="58"
              height="24"
              rx="10"
              fill="url(#vbCream)"
              stroke="#212121"
              strokeWidth="2.8"
            />

            {/* Upper Dark Teal Torso */}
            <rect
              x="59"
              y="102"
              width="62"
              height="28"
              rx="11"
              fill="url(#vbTeal)"
              stroke="#212121"
              strokeWidth="2.8"
            />

            {/* Small Status LED on Upper Right Chest */}
            <circle
              cx="111"
              cy="110"
              r="2.8"
              fill={isListening ? '#FF6B4A' : '#DDA44D'}
              stroke="#212121"
              strokeWidth="1.2"
            />

            {/* Concentric Glowing Chest Speaker / Core */}
            <circle cx="90" cy="124" r="19" fill="url(#vbCoreGlow)" />
            <circle cx="90" cy="124" r="13.5" fill="#2A2E33" stroke={coreColor} strokeWidth="2.4" />
            <circle cx="90" cy="124" r="10" fill="none" stroke="#8C9196" strokeWidth="1.3" />
            <circle cx="90" cy="124" r="6.8" fill="none" stroke={coreColor} strokeWidth="1.4" opacity="0.85" />
            <circle
              cx="90"
              cy="124"
              r="3.6"
              fill={coreColor}
              className={isListening || isTranscribing ? 'animate-pulse' : ''}
            />

            {/* Mechanical Neck */}
            <rect x="81" y="94" width="18" height="10" rx="4" fill="url(#vbDark)" stroke="#212121" strokeWidth="2.4" />
          </g>

          {/* ======================== HEAD & CRT FACE ======================== */}
          <g className={isListening ? 'vb-head-listen' : ''}>
            {/* Antenna Stalk */}
            <line x1="90" y1="36" x2="90" y2="21" stroke="#212121" strokeWidth="4.5" strokeLinecap="round" />
            <line x1="90" y1="36" x2="90" y2="21" stroke="#0E6B64" strokeWidth="2.5" strokeLinecap="round" />
            {/* Antenna Base */}
            <ellipse cx="90" cy="36" rx="8" ry="3.5" fill="url(#vbTeal)" stroke="#212121" strokeWidth="2" />
            {/* Antenna Glow Ball */}
            <circle
              cx="90"
              cy="18"
              r="6.5"
              fill={isListening ? '#DA6C4C' : '#DDA44D'}
              stroke="#212121"
              strokeWidth="2.2"
            />
            <circle cx="88" cy="16" r="2" fill="#FFF4D9" opacity="0.85" />

            {/* Side Ear Modules */}
            <g>
              {/* Left Ear */}
              <rect x="38" y="55" width="11" height="26" rx="5.5" fill="url(#vbDark)" stroke="#212121" strokeWidth="2.5" />
              <circle cx="42" cy="68" r="5" fill={isListening ? '#DA6C4C' : '#07514C'} stroke={coreColor} strokeWidth="1.8" />
              {/* Right Ear */}
              <rect x="131" y="55" width="11" height="26" rx="5.5" fill="url(#vbDark)" stroke="#212121" strokeWidth="2.5" />
              <circle cx="138" cy="68" r="5" fill={isListening ? '#DA6C4C' : '#07514C'} stroke={coreColor} strokeWidth="1.8" />
            </g>

            {/* Outer Cream Head Shell */}
            <rect
              x="44"
              y="36"
              width="92"
              height="62"
              rx="18"
              fill="url(#vbCream)"
              stroke="#212121"
              strokeWidth="3"
            />

            {/* Teal Inner Screen Bezel */}
            <rect
              x="51"
              y="42"
              width="78"
              height="50"
              rx="13"
              fill="url(#vbTeal)"
              stroke="#212121"
              strokeWidth="2.2"
            />

            {/* Dark CRT Glass Face */}
            <rect
              x="55"
              y="46"
              width="70"
              height="42"
              rx="10"
              fill="url(#vbScreen)"
              stroke="#042D2A"
              strokeWidth="1.5"
            />

            {/* Subtle Glass Highlight */}
            <path
              d="M 60 51 Q 78 48 96 49"
              stroke="#2B8C84"
              strokeWidth="1.6"
              strokeLinecap="round"
              fill="none"
              opacity="0.45"
            />

            {/* ================= PIXEL-DOT CRT EXPRESSIONS ================= */}
            {isListening ? (
              /* LISTENING: Focused alert pixel eyes + attentive pixel mouth */
              <g fill={eyeColor}>
                {/* Left Pixel Eye (3x3 rounded grid) */}
                <rect x="69" y="59" width="4" height="4" rx="0.8" />
                <rect x="74" y="59" width="4" height="4" rx="0.8" />
                <rect x="69" y="64" width="4" height="4" rx="0.8" />
                <rect x="74" y="64" width="4" height="4" rx="0.8" />
                <rect x="74" y="60" width="2.5" height="2.5" rx="0.5" fill="#FFF2D6" />

                {/* Right Pixel Eye */}
                <rect x="102" y="59" width="4" height="4" rx="0.8" />
                <rect x="107" y="59" width="4" height="4" rx="0.8" />
                <rect x="102" y="64" width="4" height="4" rx="0.8" />
                <rect x="107" y="64" width="4" height="4" rx="0.8" />
                <rect x="107" y="60" width="2.5" height="2.5" rx="0.5" fill="#FFF2D6" />

                {/* Focused small pixel mouth */}
                <rect x="84" y="75" width="3" height="2.5" rx="0.5" />
                <rect x="88.5" y="75" width="3" height="2.5" rx="0.5" />
                <rect x="93" y="75" width="3" height="2.5" rx="0.5" />
              </g>
            ) : isTranscribing ? (
              /* TRANSCRIBING: Animated thinking dots */
              <g fill={eyeColor}>
                <circle cx="74" cy="64" r="5.5" fill="none" stroke={eyeColor} strokeWidth="2.5" strokeDasharray="5 3" className="animate-spin" style={{ transformOrigin: '74px 64px' }} />
                <circle cx="106" cy="64" r="5.5" fill="none" stroke={eyeColor} strokeWidth="2.5" strokeDasharray="5 3" className="animate-spin" style={{ transformOrigin: '106px 64px' }} />
                <rect x="82" y="75" width="3.5" height="3.5" rx="1" className="animate-bounce" />
                <rect x="88" y="75" width="3.5" height="3.5" rx="1" className="animate-bounce delay-75" />
                <rect x="94" y="75" width="3.5" height="3.5" rx="1" className="animate-bounce delay-150" />
              </g>
            ) : isSuccess ? (
              /* SUCCESS: Big happy ^ ^ pixel eyes & smile */
              <g fill={eyeColor}>
                <rect x="68" y="62" width="3.5" height="3.5" rx="0.8" />
                <rect x="72" y="58" width="3.5" height="3.5" rx="0.8" />
                <rect x="76" y="62" width="3.5" height="3.5" rx="0.8" />

                <rect x="100" y="62" width="3.5" height="3.5" rx="0.8" />
                <rect x="104" y="58" width="3.5" height="3.5" rx="0.8" />
                <rect x="108" y="62" width="3.5" height="3.5" rx="0.8" />

                <rect x="81" y="73" width="3" height="3" rx="0.6" />
                <rect x="85" y="76" width="3" height="3" rx="0.6" />
                <rect x="89" y="76" width="3" height="3" rx="0.6" />
                <rect x="93" y="76" width="3" height="3" rx="0.6" />
                <rect x="97" y="73" width="3" height="3" rx="0.6" />
              </g>
            ) : isSitting ? (
              /* SITTING: Relaxed serene pixel eyes & gentle smile */
              <g fill={eyeColor}>
                <rect x="68" y="62" width="3.5" height="2.8" rx="0.6" />
                <rect x="72" y="62" width="3.5" height="2.8" rx="0.6" />
                <rect x="76" y="62" width="3.5" height="2.8" rx="0.6" />

                <rect x="100" y="62" width="3.5" height="2.8" rx="0.6" />
                <rect x="104" y="62" width="3.5" height="2.8" rx="0.6" />
                <rect x="108" y="62" width="3.5" height="2.8" rx="0.6" />

                <rect x="83" y="73" width="3" height="2.8" rx="0.5" />
                <rect x="86.5" y="75.5" width="3" height="2.8" rx="0.5" />
                <rect x="90.5" y="75.5" width="3" height="2.8" rx="0.5" />
                <rect x="94" y="73" width="3" height="2.8" rx="0.5" />
              </g>
            ) : isWalking ? (
              /* WALKING: Bright cheerful pixel eyes & open smile */
              <g fill={eyeColor}>
                <rect x="70" y="58" width="3.5" height="3.5" rx="0.6" />
                <rect x="74" y="58" width="3.5" height="3.5" rx="0.6" />
                <rect x="70" y="62" width="3.5" height="3.5" rx="0.6" />
                <rect x="74" y="62" width="3.5" height="3.5" rx="0.6" />
                <rect x="74" y="58" width="2" height="2" fill="#FFF2D6" />

                <rect x="102" y="58" width="3.5" height="3.5" rx="0.6" />
                <rect x="106" y="58" width="3.5" height="3.5" rx="0.6" />
                <rect x="102" y="62" width="3.5" height="3.5" rx="0.6" />
                <rect x="106" y="62" width="3.5" height="3.5" rx="0.6" />
                <rect x="106" y="58" width="2" height="2" fill="#FFF2D6" />

                <rect x="82" y="72" width="3" height="2.8" rx="0.5" />
                <rect x="85.5" y="75" width="3" height="2.8" rx="0.5" />
                <rect x="89.5" y="75" width="3" height="2.8" rx="0.5" />
                <rect x="93" y="75" width="3" height="2.8" rx="0.5" />
                <rect x="96.5" y="72" width="3" height="2.8" rx="0.5" />
              </g>
            ) : (
              /* IDLE: Happy ^ ^ pixel eyes & warm smile (matching concept sheet IDLE) */
              <g fill={eyeColor}>
                <rect x="68" y="63" width="3.2" height="3.2" rx="0.6" />
                <rect x="72" y="59.5" width="3.2" height="3.2" rx="0.6" />
                <rect x="76" y="63" width="3.2" height="3.2" rx="0.6" />

                <rect x="100" y="63" width="3.2" height="3.2" rx="0.6" />
                <rect x="104" y="59.5" width="3.2" height="3.2" rx="0.6" />
                <rect x="108" y="63" width="3.2" height="3.2" rx="0.6" />

                <rect x="83" y="73" width="3" height="2.8" rx="0.5" />
                <rect x="86.5" y="75.5" width="3" height="2.8" rx="0.5" />
                <rect x="90.5" y="75.5" width="3" height="2.8" rx="0.5" />
                <rect x="94" y="73" width="3" height="2.8" rx="0.5" />
              </g>
            )}
          </g>
        </g>
      </svg>
    </div>
  );
};
