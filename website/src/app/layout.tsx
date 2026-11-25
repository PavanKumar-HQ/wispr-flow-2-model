import React from 'react';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VoxQuest — Open-Source Voice Dictation Platform',
  description: 'A privacy-first, open-source speech-to-text platform and desktop companion inspired by Wispr Flow, pixel exploration, and transparent computing.',
  openGraph: {
    title: 'VoxQuest — Voice Dictation Platform',
    description: 'Speak naturally. Turn your thoughts into clean, useful text without cloud lock-in.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect x='2' y='2' width='28' height='28' fill='%2307514C'/><rect x='8' y='8' width='16' height='16' fill='%23DDA44D'/></svg>" />
      </head>
      <body>{children}</body>
    </html>
  );
}

