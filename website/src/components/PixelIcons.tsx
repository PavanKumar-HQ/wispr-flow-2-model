import React from 'react';

export function PixelMicIcon({ className = "w-6 h-6", active = false }: { className?: string; active?: boolean }) {
  const fillColor = active ? '#DA6C4C' : '#07514C';
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Microphone capsule */}
      <rect x="9" y="3" width="6" height="10" fill={fillColor} stroke="#212121" strokeWidth="1.5" />
      <rect x="11" y="5" width="2" height="3" fill="#DFDFD4" />
      {/* Cradle */}
      <path d="M6 10V12C6 15.3137 8.68629 18 12 18C15.3137 18 18 15.3137 18 12V10" stroke="#212121" strokeWidth="2" strokeLinecap="square" />
      {/* Stand */}
      <path d="M12 18V21" stroke="#212121" strokeWidth="2" />
      <path d="M8 21H16" stroke="#212121" strokeWidth="2" strokeLinecap="square" />
    </svg>
  );
}

export function PixelLogo({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer badge frame */}
      <rect x="2" y="2" width="28" height="28" fill="#07514C" stroke="#212121" strokeWidth="2" />

      {/* Microphone body / head */}
      <rect x="11" y="5" width="10" height="12" rx="2" fill="#DFDFD4" stroke="#212121" strokeWidth="1.5" />
      <rect x="13" y="7" width="2" height="4" fill="#07514C" />
      <rect x="17" y="7" width="2" height="4" fill="#07514C" />

      {/* Playful Pixel Eyes */}
      <rect x="13" y="9" width="2" height="2" fill="#212121" />
      <rect x="17" y="9" width="2" height="2" fill="#212121" />

      {/* Big Friendly Handlebar / Classic Detective Mustache */}
      {/* Center mustache block */}
      <rect x="13" y="12" width="6" height="3" fill="#212121" />
      {/* Left handlebar wing curling up */}
      <rect x="9" y="13" width="4" height="2" fill="#212121" />
      <rect x="8" y="11" width="2" height="2" fill="#212121" />
      {/* Right handlebar wing curling up */}
      <rect x="19" y="13" width="4" height="2" fill="#212121" />
      <rect x="22" y="11" width="2" height="2" fill="#212121" />

      {/* Mic cradle & stand */}
      <path d="M8 12V15C8 17.2 9.8 19 12 19H20C22.2 19 24 17.2 24 15V12" stroke="#212121" strokeWidth="1.5" strokeLinecap="square" />
      <rect x="15" y="19" width="2" height="5" fill="#212121" />
      <rect x="10" y="24" width="12" height="3" fill="#DDA44D" stroke="#212121" strokeWidth="1" />
    </svg>
  );
}

export function PixelBadgeIcon({ type = 'microphone' }: { type?: string }) {
  if (type === 'microphone-pixel') {
    return <PixelMicIcon className="w-5 h-5 text-darkTeal" />;
  }
  return (
    <svg className="w-5 h-5" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="12" fill="#DDA44D" stroke="#212121" strokeWidth="1.5" />
      <rect x="6" y="6" width="4" height="4" fill="#DFDFD4" />
    </svg>
  );
}

