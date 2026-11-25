import React from 'react';
import { Navbar, Footer } from '@/components/Navigation';
import { AnimatedVoxelBackground } from '@/components/AnimatedVoxelBackground';
import { ShieldCheck } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* 3D Animated Minecraft Voxel Overworld Background */}
      <AnimatedVoxelBackground />

      <Navbar />

      <main className="flex-1 pt-28 pb-14 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full relative z-10">
        <div className="arcade-panel p-8 sm:p-12 bg-[#DFDFD4]/85 backdrop-blur-md space-y-6">
          <div className="flex items-center gap-3 text-[#07514C]">
            <ShieldCheck className="w-7 h-7 text-[#07514C]" />
            <h1 className="font-pixel text-xl sm:text-2xl text-[#212121]">PRIVACY PLEDGE</h1>
          </div>
          <p className="text-xs font-mono text-[#212121]/70">Effective Date: October 30, 2026</p>

          <div className="space-y-4 text-xs font-mono text-[#212121]/90 leading-relaxed border-t-2 border-[#212121] pt-4">
            <h2 className="font-pixel text-xs text-[#07514C]">1. ZERO AUDIO RETENTION</h2>
            <p>
              VoxQuest was conceived specifically to counter intrusive cloud audio capture.
              When running in Local Whisper Mode, no audio, transcripts, or telemetry bytes ever leave your device. Inference executes 100% locally on your CPU or GPU.
            </p>

            <h2 className="font-pixel text-xs text-[#07514C]">2. BYOK &amp; SELF-HOSTED CLOUD</h2>
            <p>
              If you configure an external endpoint or self-hosted server, audio is transmitted exclusively to that address over encrypted HTTPS. VoxQuest operates zero intermediary proxy servers.
            </p>

            <h2 className="font-pixel text-xs text-[#07514C]">3. ZERO ANALYTICS OR TRACKING</h2>
            <p>
              VoxQuest contains no surveillance SDKs, crash beacons, marketing cookies, or telemetry pings.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
