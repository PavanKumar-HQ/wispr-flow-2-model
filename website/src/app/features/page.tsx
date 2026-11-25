import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/Navigation';
import { AnimatedVoxelBackground } from '@/components/AnimatedVoxelBackground';

export const metadata: Metadata = {
  title: 'Features Matrix & Wispr Flow Parity',
  description:
    'Comprehensive feature breakdown of VoxQuest: on-device Whisper Metal transcription, real-time filler word stripping, custom technical vocabularies, AI meeting notetaker, and local storage cleaner.',
  keywords: [
    'voxquest features',
    'wispr flow comparison',
    'speech to text features',
    'filler word removal',
    'offline whisper models',
    'developer voice dictation',
  ],
};

const FEATURES = [
  {
    category: 'CORE DICTATION & SPEECH',
    items: [
      { name: 'SPEECH-TO-TEXT TRANSCRIPTION', status: 'AVAILABLE', notes: 'Continuous push-to-talk speech transcription with real-time silence detection.' },
      { name: 'PUSH-TO-TALK GLOBAL HOTKEY', status: 'AVAILABLE', notes: 'Configurable system-wide shortcut across all background apps.' },
      { name: 'MULTILINGUAL SPEECH RECOGNITION', status: 'AVAILABLE', notes: 'Over 99 languages supported via Whisper multilingual models.' },
      { name: 'CONTINUOUS LONG-FORM RECORDING', status: 'PLANNED', notes: 'Streaming transcription chunking supported with VAD.' }
    ]
  },
  {
    category: 'TEXT CLEANUP & FORMATTING',
    items: [
      { name: 'FILLER WORD REMOVAL', status: 'AVAILABLE', notes: 'Removes "um", "uh", "you know", "like", and hesitation speech.' },
      { name: 'AUTOMATIC PUNCTUATION & CAPITALIZATION', status: 'AVAILABLE', notes: 'Normalizes sentence boundaries and capitalization.' },
      { name: 'CUSTOM VOCABULARY & DICTIONARY', status: 'AVAILABLE', notes: 'Preserves technical acronyms, names, and programming terms.' },
      { name: 'DEVELOPER MODE FORMATTING', status: 'AVAILABLE', notes: 'Preserves camelCase, snake_case, and code identifiers.' }
    ]
  },
  {
    category: 'SYSTEM INTEGRATION & PRIVACY',
    items: [
      { name: 'ACTIVE WINDOW TEXT INSERTION', status: 'AVAILABLE', notes: 'Automated paste into active editor cursor position.' },
      { name: 'ZERO AUDIO RETENTION GUARANTEE', status: 'AVAILABLE', notes: 'Audio is discarded immediately after transcription.' },
      { name: 'LOCAL-ONLY DICTATION HISTORY', status: 'AVAILABLE', notes: 'Inspectable local history with one-click purge.' },
      { name: '100% OFFLINE WHISPER MODE', status: 'AVAILABLE', notes: 'Zero internet connection required on local client.' }
    ]
  }
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      <AnimatedVoxelBackground />
      <Navbar />

      <main className="flex-1 pt-28 pb-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="arcade-badge bg-[#DDA44D] text-[#212121] mb-3">SYSTEM CAPABILITIES</span>
          <h1 className="font-pixel text-2xl sm:text-4xl text-[#DFDFD4] tracking-wide uppercase drop-shadow-[4px_4px_0px_#212121]">
            CAPABILITY MATRIX
          </h1>
          <p className="mt-4 font-mono text-xs sm:text-sm text-[#DFDFD4] leading-relaxed drop-shadow-[2px_2px_0px_#212121]">
            VoxQuest adheres to strict production truth. Every feature below is transparently labelled by its implementation and roadmap status.
          </p>
        </div>

        <div className="space-y-8">
          {FEATURES.map((section) => (
            <div key={section.category} className="arcade-panel arcade-panel-hoverable p-6 sm:p-8 bg-[#DFDFD4]/85 backdrop-blur-md">
              <h2 className="font-pixel text-xs sm:text-sm text-[#07514C] border-b-2 border-[#212121] pb-3 mb-6">
                {section.category}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.items.map((item) => (
                  <div key={item.name} className="feature-card p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-pixel text-[11px] text-[#212121]">{item.name}</span>
                        <span className={`arcade-badge ${
                          item.status === 'AVAILABLE' ? 'bg-[#07514C] text-[#DFDFD4]' : 'bg-[#DDA44D] text-[#212121]'
                        } text-[8px]`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-[#212121]/80 leading-relaxed mt-2">
                        {item.notes}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/download" className="arcade-btn arcade-btn-primary px-8 py-4 text-xs font-bold inline-flex items-center gap-2">
            <span>GET CLIENT BUILDS</span>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
