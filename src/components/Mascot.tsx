import React from 'react';

export type MascotAvatar = 'bot' | 'owl' | 'cat';
export type MascotState = 'idle' | 'listening' | 'transcribing' | 'success';
export type MascotAction = 'float' | 'walk' | 'jump' | 'sit' | 'sleep';

interface MascotProps {
  size?: number;
  className?: string;
  state?: MascotState;
  avatar?: MascotAvatar;
  action?: MascotAction;
  onClick?: (e: React.MouseEvent) => void;
  interactive?: boolean;
}

/**
 * VoxQuest Desktop Mascot Companions Suite.
 * 
 * Avatars:
 * 1. 'bot' (VoxBot) - Retro-futuristic Cyber Robot with CRT face & antenna.
 * 2. 'owl' (VoxOwl) - 16-bit Cyber Familiar Owl with amber visor eyes & voxel feathers.
 * 3. 'cat' (VoxCat) - Retro Arcade Cyber Cat with twitching ears & glowing tail.
 * 
 * Free-floating character: 100% SVG vector with 0% CPU, no button outlines, zero battery drain.
 */
export const Mascot: React.FC<MascotProps> = ({
  size = 36,
  className = '',
  state = 'idle',
  avatar,
  action = 'float',
  onClick,
  interactive = false,
}) => {
  // Read avatar preference from localStorage if not explicitly passed
  const currentAvatar: MascotAvatar = avatar || (() => {
    try {
      return (localStorage.getItem('voxquest_mascot_avatar') as MascotAvatar) || 'bot';
    } catch {
      return 'bot';
    }
  })();

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center justify-center select-none overflow-visible ${
        interactive ? 'cursor-pointer group' : ''
      } ${className}`}
      style={{ width: size, height: size * 1.2 }}
      title={interactive ? 'Click to dictate' : 'VoxQuest Companion'}
    >
      <svg
        viewBox="0 -16 100 120"
        width={size}
        height={size * 1.2}
        className="overflow-visible drop-shadow-md"
      >
        {/* =========================================================================
            AVATAR 1: VOXBOT (Retro Cybernetic Mini Robot)
           ========================================================================= */}
        {currentAvatar === 'bot' && (
          <g>
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

            {/* DYNAMIC CRT FACE EXPRESSIONS */}
            {state === 'listening' ? (
              /* CUTE FRIENDLY LISTENING: Wide glowing eyes, cute blush, warm curved smile, floating acoustic speech bubble */
              <g>
                <ellipse cx="37" cy="41" rx="6" ry="7" fill="#DDA44D" />
                <circle cx="39" cy="39" r="2.5" fill="#FFF2D6" />
                <ellipse cx="63" cy="41" rx="6" ry="7" fill="#DDA44D" />
                <circle cx="65" cy="39" r="2.5" fill="#FFF2D6" />

                {/* Cute rosy blush cheeks */}
                <rect x="29" y="47" width="5" height="2.5" rx="1.2" fill="#DA6C4C" opacity="0.9" />
                <rect x="66" y="47" width="5" height="2.5" rx="1.2" fill="#DA6C4C" opacity="0.9" />

                {/* Friendly open smile */}
                <path
                  d="M 44 49 Q 50 54 56 49"
                  stroke="#DFDFD4"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />

                {/* Gentle acoustic radio aura rings above antenna */}
                <path d="M 40 4 Q 50 -1 60 4" stroke="#DDA44D" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.8" className="animate-pulse" />
                <path d="M 44 0 Q 50 -4 56 0" stroke="#DDA44D" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" className="animate-pulse delay-75" />

                {/* ANIMATED FLOATING LISTENING SPEECH BUBBLE */}
                <g className="anim-speech-bubble" style={{ transformOrigin: '70px 16px' }}>
                  {/* Speech bubble pointer notch */}
                  <polygon points="68,16 75,19 73,12" fill="#07514C" stroke="#DDA44D" strokeWidth="1.2" />
                  {/* Bubble capsule */}
                  <rect x="68" y="0" width="30" height="17" rx="6" fill="#07514C" stroke="#DDA44D" strokeWidth="1.5" />
                  {/* Three animated dancing waveform dots inside bubble */}
                  <circle cx="76" cy="8.5" r="2.2" fill="#DDA44D" className="anim-bubble-dot-1" />
                  <circle cx="83" cy="8.5" r="2.2" fill="#DFDFD4" className="anim-bubble-dot-2" />
                  <circle cx="90" cy="8.5" r="2.2" fill="#DA6C4C" className="anim-bubble-dot-3" />
                </g>

                {/* SHIMMERING RISING SOUND BUBBLES */}
                <g pointerEvents="none">
                  <circle cx="28" cy="20" r="3.5" fill="#DDA44D" fillOpacity="0.65" stroke="#FFF2D6" strokeWidth="1" className="anim-bubble-1" />
                  <circle cx="24" cy="26" r="2.5" fill="#34A89E" fillOpacity="0.75" stroke="#DFDFD4" strokeWidth="0.8" className="anim-bubble-2" />
                  <circle cx="75" cy="24" r="3.0" fill="#DDA44D" fillOpacity="0.6" stroke="#FFF2D6" strokeWidth="0.9" className="anim-bubble-3" />
                </g>
              </g>
            ) : action === 'sleep' ? (
              /* SLEEPING: Serene curved closed eyes (-.-) with floating z Z Z */
              <g>
                <path d="M 32 43 Q 37 47 42 43" stroke="#DDA44D" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M 58 43 Q 63 47 68 43" stroke="#DDA44D" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M 46 51 Q 50 53 54 51" stroke="#DFDFD4" strokeWidth="2" strokeLinecap="round" fill="none" />
                {/* Floating retro pixel z Z Z */}
                <text x="74" y="22" fill="#DDA44D" className="font-pixel text-[9px] anim-zzz-1 font-bold select-none">z</text>
                <text x="82" y="14" fill="#DFDFD4" className="font-pixel text-[11px] anim-zzz-2 font-bold select-none">Z</text>
              </g>
            ) : state === 'transcribing' ? (
              <g>
                <circle cx="37" cy="42" r="5" fill="#DDA44D" stroke="#DFDFD4" strokeWidth="1.5" strokeDasharray="4 2" className="animate-spin" />
                <circle cx="63" cy="42" r="5" fill="#DDA44D" stroke="#DFDFD4" strokeWidth="1.5" strokeDasharray="4 2" className="animate-spin" />
                <rect x="44" y="52" width="3" height="3" rx="0.5" fill="#DFDFD4" className="animate-bounce" />
                <rect x="49" y="52" width="3" height="3" rx="0.5" fill="#DDA44D" className="animate-bounce delay-75" />
                <rect x="54" y="52" width="3" height="3" rx="0.5" fill="#DFDFD4" className="animate-bounce delay-150" />
              </g>
            ) : state === 'success' ? (
              <g>
                <path d="M 33 43 Q 37 36 41 43" stroke="#DDA44D" strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M 59 43 Q 63 36 67 43" stroke="#DDA44D" strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M 44 51 Q 50 56 56 51" stroke="#DFDFD4" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </g>
            ) : (
              <g>
                <rect x="34" y="37" width="8" height="8" rx="2" fill="#DDA44D" />
                <rect x="36" y="39" width="3" height="3" fill="#FFF2D6" />
                <rect x="58" y="37" width="8" height="8" rx="2" fill="#DDA44D" />
                <rect x="60" y="39" width="3" height="3" fill="#FFF2D6" />
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
          </g>
        )}

        {/* =========================================================================
            AVATAR 2: VOXOWL (Pixel Cyber Familiar Owl)
           ========================================================================= */}
        {currentAvatar === 'owl' && (
          <g>
            {/* Owl Feathers / Crown Crest */}
            <polygon points="26,14 36,26 22,28" fill="#DA6C4C" stroke="#212121" strokeWidth="3" strokeLinejoin="round" />
            <polygon points="74,14 64,26 78,28" fill="#DA6C4C" stroke="#212121" strokeWidth="3" strokeLinejoin="round" />
            <polygon points="50,16 43,26 57,26" fill="#DDA44D" stroke="#212121" strokeWidth="2.5" strokeLinejoin="round" />

            {/* Owl Body Shell */}
            <ellipse cx="50" cy="52" rx="34" ry="32" fill="#DFDFD4" stroke="#212121" strokeWidth="4" />

            {/* Wings on Sides */}
            <path
              d="M 17 44 C 12 55, 16 68, 24 74 C 23 64, 25 52, 28 46 Z"
              fill="#07514C"
              stroke="#212121"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path
              d="M 83 44 C 88 55, 84 68, 76 74 C 77 64, 75 52, 72 46 Z"
              fill="#07514C"
              stroke="#212121"
              strokeWidth="3"
              strokeLinejoin="round"
            />

            {/* Owl Breast Feathers (Dark Teal / Cream Chevron) */}
            <path d="M 40 60 L 50 68 L 60 60" stroke="#07514C" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M 42 68 L 50 74 L 58 68" stroke="#DDA44D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />

            {/* Big Expressive Owl Eyes */}
            <circle cx="38" cy="40" r="13" fill="#07514C" stroke="#212121" strokeWidth="3.5" />
            <circle cx="62" cy="40" r="13" fill="#07514C" stroke="#212121" strokeWidth="3.5" />

            {state === 'listening' ? (
              <g>
                <circle cx="38" cy="40" r="8" fill="#DDA44D" />
                <circle cx="62" cy="40" r="8" fill="#DDA44D" />
                <circle cx="38" cy="40" r="4" fill="#DA6C4C" />
                <circle cx="62" cy="40" r="4" fill="#DA6C4C" />
                {/* Listening Speech Bubble */}
                <g className="anim-speech-bubble" style={{ transformOrigin: '70px 16px' }}>
                  <polygon points="68,16 75,19 73,12" fill="#07514C" stroke="#DDA44D" strokeWidth="1.2" />
                  <rect x="68" y="0" width="30" height="17" rx="6" fill="#07514C" stroke="#DDA44D" strokeWidth="1.5" />
                  <circle cx="76" cy="8.5" r="2.2" fill="#DDA44D" className="anim-bubble-dot-1" />
                  <circle cx="83" cy="8.5" r="2.2" fill="#DFDFD4" className="anim-bubble-dot-2" />
                  <circle cx="90" cy="8.5" r="2.2" fill="#DA6C4C" className="anim-bubble-dot-3" />
                </g>
                <g pointerEvents="none">
                  <circle cx="28" cy="20" r="3.0" fill="#DDA44D" fillOpacity="0.65" stroke="#FFF2D6" strokeWidth="1" className="anim-bubble-1" />
                  <circle cx="74" cy="22" r="2.5" fill="#34A89E" fillOpacity="0.75" stroke="#DFDFD4" strokeWidth="0.8" className="anim-bubble-2" />
                </g>
              </g>
            ) : state === 'transcribing' ? (
              <g>
                <circle cx="38" cy="40" r="7" fill="#DDA44D" stroke="#DFDFD4" strokeWidth="2" strokeDasharray="3 2" className="animate-spin" />
                <circle cx="62" cy="40" r="7" fill="#DDA44D" stroke="#DFDFD4" strokeWidth="2" strokeDasharray="3 2" className="animate-spin" />
              </g>
            ) : state === 'success' ? (
              <g>
                <path d="M 31 40 Q 38 32 45 40" stroke="#DDA44D" strokeWidth="4" strokeLinecap="round" fill="none" />
                <path d="M 55 40 Q 62 32 69 40" stroke="#DDA44D" strokeWidth="4" strokeLinecap="round" fill="none" />
              </g>
            ) : (
              <g>
                <circle cx="38" cy="40" r="7" fill="#DDA44D" />
                <circle cx="62" cy="40" r="7" fill="#DDA44D" />
                <circle cx="40" cy="38" r="2.5" fill="#FFF2D6" />
                <circle cx="64" cy="38" r="2.5" fill="#FFF2D6" />
              </g>
            )}

            {/* Cybernetic Golden Beak */}
            <polygon points="50,45 44,55 56,55" fill="#DDA44D" stroke="#212121" strokeWidth="2.5" strokeLinejoin="round" />

            {/* Talons / Perch */}
            <rect x="36" y="82" width="6" height="5" rx="2" fill="#DA6C4C" stroke="#212121" strokeWidth="2" />
            <rect x="58" y="82" width="6" height="5" rx="2" fill="#DA6C4C" stroke="#212121" strokeWidth="2" />
          </g>
        )}

        {/* =========================================================================
            AVATAR 3: VOXCAT (16-bit Retro Arcade Cyber Cat)
           ========================================================================= */}
        {currentAvatar === 'cat' && (
          <g>
            {/* Pointed Cyber Cat Ears with Terracotta Core */}
            <polygon points="20,16 34,36 14,38" fill="#DFDFD4" stroke="#212121" strokeWidth="3.5" strokeLinejoin="round" />
            <polygon points="21,22 30,34 17,35" fill="#DA6C4C" />
            <polygon points="80,16 66,36 86,38" fill="#DFDFD4" stroke="#212121" strokeWidth="3.5" strokeLinejoin="round" />
            <polygon points="79,22 70,34 83,35" fill="#DA6C4C" />

            {/* Cat Head / Body Shell */}
            <ellipse cx="50" cy="48" rx="34" ry="28" fill="#DFDFD4" stroke="#212121" strokeWidth="4" />

            {/* Cyber Collar with Golden Mic Bell */}
            <rect x="32" y="72" width="36" height="7" rx="3" fill="#07514C" stroke="#212121" strokeWidth="2.5" />
            <circle cx="50" cy="80" r="5" fill="#DDA44D" stroke="#212121" strokeWidth="2" />
            <circle cx="50" cy="80" r="2" fill="#212121" />

            {/* Curled Tail with Glow Accent */}
            <path
              d="M 82 58 C 92 62, 94 76, 88 82 C 84 86, 78 84, 76 80"
              stroke="#212121"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 82 58 C 92 62, 94 76, 88 82 C 84 86, 78 84, 76 80"
              stroke="#DDA44D"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />

            {/* Visor Area */}
            <rect x="25" y="34" width="50" height="26" rx="8" fill="#07514C" stroke="#212121" strokeWidth="3" />

            {/* DYNAMIC CAT VISOR EXPRESSIONS */}
            {state === 'listening' ? (
              <g>
                <polygon points="32,46 38,40 44,46" fill="#DDA44D" />
                <polygon points="56,46 62,40 68,46" fill="#DDA44D" />
                <rect x="46" y="44" width="8" height="6" rx="2" fill="#DA6C4C" />
                {/* Listening Speech Bubble */}
                <g className="anim-speech-bubble" style={{ transformOrigin: '70px 16px' }}>
                  <polygon points="68,16 75,19 73,12" fill="#07514C" stroke="#DDA44D" strokeWidth="1.2" />
                  <rect x="68" y="0" width="30" height="17" rx="6" fill="#07514C" stroke="#DDA44D" strokeWidth="1.5" />
                  <circle cx="76" cy="8.5" r="2.2" fill="#DDA44D" className="anim-bubble-dot-1" />
                  <circle cx="83" cy="8.5" r="2.2" fill="#DFDFD4" className="anim-bubble-dot-2" />
                  <circle cx="90" cy="8.5" r="2.2" fill="#DA6C4C" className="anim-bubble-dot-3" />
                </g>
                <g pointerEvents="none">
                  <circle cx="26" cy="22" r="3.0" fill="#DDA44D" fillOpacity="0.65" stroke="#FFF2D6" strokeWidth="1" className="anim-bubble-1" />
                  <circle cx="72" cy="24" r="2.5" fill="#34A89E" fillOpacity="0.75" stroke="#DFDFD4" strokeWidth="0.8" className="anim-bubble-2" />
                </g>
              </g>
            ) : state === 'transcribing' ? (
              <g>
                <circle cx="38" cy="47" r="5" fill="#DDA44D" stroke="#DFDFD4" strokeWidth="1.5" strokeDasharray="3 2" className="animate-spin" />
                <circle cx="62" cy="47" r="5" fill="#DDA44D" stroke="#DFDFD4" strokeWidth="1.5" strokeDasharray="3 2" className="animate-spin" />
              </g>
            ) : state === 'success' ? (
              <g>
                <path d="M 32 48 Q 38 40 44 48" stroke="#DDA44D" strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M 56 48 Q 62 40 68 48" stroke="#DDA44D" strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M 46 54 Q 50 57 54 54" stroke="#DFDFD4" strokeWidth="2" strokeLinecap="round" fill="none" />
              </g>
            ) : (
              <g>
                <ellipse cx="38" cy="47" rx="5" ry="6" fill="#DDA44D" />
                <ellipse cx="62" cy="47" rx="5" ry="6" fill="#DDA44D" />
                <circle cx="39" cy="45" r="2" fill="#FFF2D6" />
                <circle cx="63" cy="45" r="2" fill="#FFF2D6" />
                <polygon points="50,52 47,49 53,49" fill="#DA6C4C" />
              </g>
            )}

            {/* Whiskers */}
            <line x1="12" y1="46" x2="23" y2="48" stroke="#212121" strokeWidth="2" strokeLinecap="round" />
            <line x1="10" y1="53" x2="22" y2="52" stroke="#212121" strokeWidth="2" strokeLinecap="round" />
            <line x1="88" y1="46" x2="77" y2="48" stroke="#212121" strokeWidth="2" strokeLinecap="round" />
            <line x1="90" y1="53" x2="78" y2="52" stroke="#212121" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}
      </svg>
    </div>
  );
};



