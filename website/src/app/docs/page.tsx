import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/Navigation';
import { AnimatedVoxelBackground } from '@/components/AnimatedVoxelBackground';
import { InteractiveDocs } from '@/components/InteractiveDocs';

export const metadata: Metadata = {
  title: 'Documentation & User Manual',
  description:
    'Full documentation for VoxQuest: quickstart installation guide, global hotkey mapping, acoustic model calibration, custom developer dictionary configuration, and troubleshooting.',
  keywords: [
    'voxquest docs',
    'voice typing manual',
    'whisper model setup',
    'custom vocabulary guide',
    'developer hotkey setup',
  ],
};

export default function DocsPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* 3D Animated Minecraft Voxel Overworld Background */}
      <AnimatedVoxelBackground />

      <Navbar />

      <main className="flex-1 pt-28 pb-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="arcade-badge bg-[#DDA44D] text-[#212121] mb-3">TECHNICAL MANUAL</span>
          <h1 className="font-pixel text-2xl sm:text-4xl text-[#DFDFD4] tracking-wide uppercase drop-shadow-[4px_4px_0px_#212121]">
            VOXQUEST DOCUMENTATION
          </h1>
          <p className="mt-3 font-mono text-xs sm:text-sm text-[#DFDFD4] leading-relaxed drop-shadow-[2px_2px_0px_#212121]">
            Select any section in the index below to switch topics instantly without long scrolling.
          </p>
        </div>

        {/* Tabbed Interactive Docs Component */}
        <InteractiveDocs />
      </main>

      <Footer />
    </div>
  );
}
