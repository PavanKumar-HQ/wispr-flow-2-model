import React from 'react';

export const Mascot: React.FC<{ size?: number; className?: string }> = ({ size = 36, className = "" }) => (
  <svg 
    viewBox="0 0 100 100" 
    width={size} 
    height={size} 
    className={`inline-block select-none shrink-0 ${className}`}
  >
    <rect x="35" y="15" width="30" height="42" rx="15" fill="#07514C" stroke="#212121" strokeWidth="4"/>
    <line x1="40" y1="26" x2="60" y2="26" stroke="#DFDFD4" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="38" y1="33" x2="62" y2="33" stroke="#DFDFD4" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="40" y1="40" x2="60" y2="40" stroke="#DFDFD4" strokeWidth="2.5" strokeLinecap="round"/>
    <rect x="42" y="45" width="4" height="4" fill="#DFDFD4"/>
    <rect x="54" y="45" width="4" height="4" fill="#DFDFD4"/>
    <path d="M 50 51 C 47 48, 41 49, 36 53 C 41 55, 46 54, 50 52 C 54 54, 59 55, 64 53 C 59 49, 53 48, 50 51 Z" fill="#DDA44D" stroke="#212121" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M 28 35 C 28 62, 72 62, 72 35" fill="none" stroke="#212121" strokeWidth="4.5" strokeLinecap="round"/>
    <circle cx="28" cy="35" r="3" fill="#DDA44D" stroke="#212121" strokeWidth="2"/>
    <circle cx="72" cy="35" r="3" fill="#DDA44D" stroke="#212121" strokeWidth="2"/>
    <rect x="47" y="60" width="6" height="20" fill="#0F5B57" stroke="#212121" strokeWidth="3"/>
    <path d="M 26 84 C 26 80, 74 80, 74 84 L 78 89 L 22 89 Z" fill="#DA6C4C" stroke="#212121" strokeWidth="3.5" strokeLinejoin="round"/>
    <circle cx="50" cy="85" r="2.5" fill="#DDA44D"/>
  </svg>
);

