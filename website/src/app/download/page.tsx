'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/Navigation';
import { AnimatedVoxelBackground } from '@/components/AnimatedVoxelBackground';
import { SmartDownloadSection } from '@/components/SmartDownloadSection';
import { Terminal, Shield, Zap } from 'lucide-react';

export default function DownloadPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* 3D Animated Minecraft Voxel Overworld Background */}
      <AnimatedVoxelBackground />

      <Navbar />

      <main className="flex-1 pt-28 pb-14 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 arcade-badge bg-[#DDA44D] text-[#212121] mb-3">
            <Zap className="w-3.5 h-3.5 text-[#DA6C4C]" />
            <span>DIRECT NATIVE INSTALLERS</span>
          </div>
          <h1 className="font-pixel text-2xl sm:text-4xl text-[#DFDFD4] tracking-wide uppercase drop-shadow-[4px_4px_0px_#212121]">
            DOWNLOAD VOXQUEST
          </h1>
          <p className="mt-4 font-mono text-xs sm:text-sm text-[#DFDFD4] leading-relaxed drop-shadow-[2px_2px_0px_#212121]">
            Push-to-talk voice dictation with zero cloud streaming, instant text injection, and full offline Whisper inference.
          </p>
        </div>

        {/* Smart OS Auto-Detection & Direct Downloads */}
        <SmartDownloadSection />

        {/* Source Build Instructions */}
        <div className="mt-12 arcade-panel-dark p-6 sm:p-8 bg-[#0F5B57]/80 backdrop-blur-md border-3 border-[#212121]">
          <h3 className="font-pixel text-xs sm:text-sm text-[#DDA44D] mb-3 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#DDA44D]" />
            <span>BUILDING FROM VERIFIED SOURCE</span>
          </h3>
          <p className="text-xs font-mono text-[#DFDFD4] leading-relaxed mb-4">
            Prefer compiling natively on your own machine? Clone the open-source repository:
          </p>
          <pre className="p-4 bg-[#212121] border-2 border-[#212121] text-xs font-mono overflow-x-auto text-[#DFDFD4] space-y-1">
{`git clone https://github.com/PavanKumar-HQ/wispr-flow-2-model.git voxquest
cd voxquest
pnpm install
pnpm tauri build`}
          </pre>
        </div>
      </main>

      <Footer />
    </div>
  );
}
