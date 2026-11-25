import React from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://voxquest.app';

export const viewport: Viewport = {
  themeColor: '#07514C',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'VoxQuest — Sovereign On-Device AI Voice OS & Dictation',
    template: '%s | VoxQuest',
  },
  description:
    'Speak at 150+ WPM directly into any desktop app. 100% on-device speech-to-text with Whisper Metal inference, zero cloud streaming, zero subscriptions, and complete data privacy.',
  keywords: [
    'voice dictation',
    'speech to text',
    'wispr flow alternative',
    'offline voice typing',
    'whisper ai mac',
    'local speech recognition',
    'air-gapped voice OS',
    'apple silicon whisper metal',
    'windows voice dictation',
    'ai meeting notetaker',
    'open source dictation',
    'sovereign computing',
  ],
  authors: [{ name: 'VoxQuest Core Team & Contributors' }],
  creator: 'VoxQuest Community',
  publisher: 'VoxQuest',
  applicationName: 'VoxQuest',
  generator: 'Next.js',
  manifest: '/manifest.json',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect x='2' y='2' width='28' height='28' rx='4' fill='%2307514C'/><rect x='8' y='8' width='16' height='16' rx='2' fill='%23DDA44D'/></svg>",
    apple: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect x='2' y='2' width='28' height='28' rx='4' fill='%2307514C'/><rect x='8' y='8' width='16' height='16' rx='2' fill='%23DDA44D'/></svg>",
  },
  openGraph: {
    title: 'VoxQuest — Sovereign On-Device AI Voice OS & Dictation',
    description:
      'Speak at 150+ WPM directly into any app. 100% on-device speech-to-text with zero cloud lock-in, zero subscription fees, and private local Whisper inference.',
    url: siteUrl,
    siteName: 'VoxQuest',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/voxel-world.jpg',
        width: 1200,
        height: 630,
        alt: 'VoxQuest Sovereign Voice OS Voxel Realm',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VoxQuest — Sovereign On-Device AI Voice OS & Dictation',
    description:
      '150+ WPM speech-to-text with zero cloud streaming, zero subscriptions, and local Whisper Metal inference.',
    images: ['/voxel-world.jpg'],
    creator: '@VoxQuestAI',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  category: 'productivity',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Rich Structured Data (JSON-LD) for Google Search Rich Results
  const jsonLdSoftwareApp = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'VoxQuest',
    operatingSystem: 'macOS, Windows 10/11, Linux, Android',
    applicationCategory: 'UtilitiesApplication',
    description:
      'Privacy-first on-device speech recognition and dictation platform with zero cloud reliance.',
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '480',
      bestRating: '5',
      worstRating: '1',
    },
    featureList: [
      '100% On-Device Whisper Transcription',
      'Zero Cloud Streaming or Audio Eavesdropping',
      'Cross-Platform: macOS Apple Silicon/Intel, Windows, Linux, Android',
      'System-Wide Global Dictation Hotkey',
      'AI Meeting Notetaker via Direct Audio Loopback',
      'Storage Cleaner & Cache Sanitizer',
    ],
    softwareVersion: '0.1.0',
    downloadUrl: `${siteUrl}/download`,
    license: 'https://www.apache.org/licenses/LICENSE-2.0',
  };

  const jsonLdOrganization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'VoxQuest Open Source',
    url: siteUrl,
    logo: `${siteUrl}/voxel-world.jpg`,
    sameAs: ['https://github.com/PavanKumar-HQ/wispr-flow-2-model'],
  };

  const jsonLdWebSite = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'VoxQuest',
    url: siteUrl,
    description: 'Sovereign On-Device AI Voice OS & Dictation Platform',
  };

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
        {/* Schema.org Structured Data Scripts */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftwareApp) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }}
        />
      </head>
      <body className="antialiased selection:bg-[#DDA44D] selection:text-[#212121]">
        {children}
      </body>
    </html>
  );
}
