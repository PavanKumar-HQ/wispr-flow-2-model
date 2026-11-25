import React from 'react';
import type { Metadata } from 'next';
import { Navbar, Footer } from '@/components/Navigation';
import { AnimatedVoxelBackground } from '@/components/AnimatedVoxelBackground';
import { SmartDownloadSection } from '@/components/SmartDownloadSection';
import { ShieldCheck, Zap, Laptop, Lock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Download VoxQuest — Native Desktop Client for Mac, Windows & Linux',
  description:
    'Download the official native client of VoxQuest. Available for Apple Silicon (M1/M2/M3/M4 DMG), Intel Mac, Windows 10/11 (setup.exe), and Linux (AppImage). Free, open-source, and 100% offline.',
  keywords: [
    'download voxquest',
    'voxquest mac installer',
    'voxquest windows exe',
    'whisper ai download',
    'offline dictation mac dmg',
    'windows speech to text installer',
    'wispr flow free download alternative',
  ],
};

export default function DownloadPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden font-sans">
      {/* Zero-Lag Ambient Voxel Background */}
      <AnimatedVoxelBackground />

      <Navbar />

      <main className="flex-1 pt-24 sm:pt-28 pb-14 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DDA44D]/20 text-[#DDA44D] border border-[#DDA44D]/40 font-mono text-xs font-bold mb-3 uppercase">
            <Zap className="w-3.5 h-3.5 text-[#DA6C4C]" />
            <span>DIRECT NATIVE CLIENT DOWNLOAD</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Install VoxQuest for Your OS
          </h1>
          <p className="text-sm sm:text-base text-white/80 max-w-xl mx-auto leading-relaxed">
            Direct standalone installer with integrated local Whisper acoustic models. No cloud dependencies, no account registration required.
          </p>
        </div>

        {/* Smart Client Platform Auto-Detection & Direct Installer Downloads */}
        <SmartDownloadSection />

        {/* Guarantee Banner */}
        <div className="mt-12 sm:mt-16 p-6 rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-md grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-white/80">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[#07514C] text-[#DDA44D] shrink-0 border border-white/10">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm mb-1">100% Air-Gapped</h3>
              <p className="leading-relaxed">All voice recognition models execute locally on your GPU/Metal cores. Zero voice data is transmitted over the internet.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[#07514C] text-[#DDA44D] shrink-0 border border-white/10">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm mb-1">System-Wide Dictation</h3>
              <p className="leading-relaxed">Works out of the box in VS Code, Obsidian, Notion, Slack, Discord, Google Docs, and browser inputs.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[#07514C] text-[#DDA44D] shrink-0 border border-white/10">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm mb-1">Permissive Apache 2.0</h3>
              <p className="leading-relaxed">Free for personal, academic, and enterprise usage. You retain complete ownership of your code, voice, and models.</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
