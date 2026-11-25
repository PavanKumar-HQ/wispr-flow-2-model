'use client';

import React from 'react';
import { Navbar, Footer } from '@/components/Navigation';
import { AnimatedVoxelBackground } from '@/components/AnimatedVoxelBackground';
import { SmartDownloadSection } from '@/components/SmartDownloadSection';
import { ShieldCheck, Zap, Laptop, Lock } from 'lucide-react';

export default function DownloadPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden font-sans">
      {/* Zero-Lag Ambient Background */}
      <AnimatedVoxelBackground />

      <Navbar />

      <main className="flex-1 pt-28 pb-14 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DDA44D]/20 text-[#DDA44D] border border-[#DDA44D]/40 font-mono text-xs font-bold mb-3 uppercase">
            <Zap className="w-3.5 h-3.5 text-[#DA6C4C]" />
            <span>NATIVE APPLICATION DOWNLOAD</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Download VoxQuest
          </h1>
          <p className="mt-3 text-sm sm:text-base text-white/80 leading-relaxed max-w-xl mx-auto font-sans">
            Push-to-talk voice dictation with zero cloud streaming, instant text injection, and full offline Whisper inference.
          </p>
        </div>

        {/* Smart OS Auto-Detection & Direct Software Binary Downloads */}
        <SmartDownloadSection />

        {/* Verification & Air-Gapped Security Guarantee */}
        <div className="mt-12 p-6 sm:p-8 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono uppercase tracking-wide">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Integrity &amp; Privacy Verification</span>
          </h3>
          <p className="text-xs text-white/75 leading-relaxed">
            All VoxQuest releases are self-contained standalone installers. The application runs entirely within your system sandbox, requires zero network connections after download, and processes all microphone audio locally via Apple Silicon Metal acceleration.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono text-white/80">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="text-emerald-400 font-bold mb-0.5">100% OFFLINE</div>
              <p className="text-[11px] text-white/60">Works without an internet connection or Wi-Fi.</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="text-[#DDA44D] font-bold mb-0.5">ZERO TELEMETRY</div>
              <p className="text-[11px] text-white/60">No audio packets are ever recorded or uploaded.</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="text-blue-400 font-bold mb-0.5">COMPACT 6.0 MB</div>
              <p className="text-[11px] text-white/60">Lightweight native binary with minimal storage impact.</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
