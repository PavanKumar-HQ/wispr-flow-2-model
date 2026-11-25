import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/Navigation';
import { AnimatedVoxelBackground } from '@/components/AnimatedVoxelBackground';
import { Github, Scale, GitPullRequest, Terminal } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Open Source Software & Licensing',
  description:
    'VoxQuest is 100% free and open-source under the Apache 2.0 license. Inspect the code, verify the zero-network sandbox, and contribute freely.',
  keywords: [
    'open source speech to text',
    'apache 2.0 voice software',
    'inspectable whisper client',
    'sovereign open source dictation',
  ],
};

export default function OpenSourcePage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* 3D Animated Minecraft Voxel Overworld Background */}
      <AnimatedVoxelBackground />

      <Navbar />

      <main className="flex-1 pt-28 pb-14 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="arcade-badge bg-[#DDA44D] text-[#212121] mb-3">PUBLIC REPOSITORY</span>
          <h1 className="font-pixel text-2xl sm:text-4xl text-[#DFDFD4] tracking-wide uppercase drop-shadow-[4px_4px_0px_#212121]">
            OPEN SOURCE LORE
          </h1>
          <p className="mt-4 font-mono text-xs sm:text-sm text-[#DFDFD4] leading-relaxed drop-shadow-[2px_2px_0px_#212121]">
            VoxQuest is licensed under the Apache 2.0 license. No proprietary lock-in, no hidden telemetry scripts, and no commercial hostage-taking of your voice.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div className="arcade-panel p-6 sm:p-8 bg-[#DFDFD4]/85 backdrop-blur-md space-y-3">
            <div className="flex items-center gap-2 text-[#07514C]">
              <Scale className="w-5 h-5" />
              <h3 className="font-pixel text-xs sm:text-sm text-[#212121]">PERMISSIVE LICENSING</h3>
            </div>
            <p className="text-xs font-mono text-[#212121]/90 leading-relaxed">
              VoxQuest is released under the <strong>Apache 2.0 License</strong>. You are free to audit the source code, fork the repository, deploy private instances inside your university or enterprise, and redistribute improvements without royalty obligations.
            </p>
          </div>

          <div className="arcade-panel p-6 sm:p-8 bg-[#DFDFD4]/85 backdrop-blur-md space-y-3">
            <div className="flex items-center gap-2 text-[#DDA44D]">
              <GitPullRequest className="w-5 h-5 text-[#212121]" />
              <h3 className="font-pixel text-xs sm:text-sm text-[#212121]">CLEAN ARCHITECTURE</h3>
            </div>
            <p className="text-xs font-mono text-[#212121]/90 leading-relaxed">
              Maintainable Next.js 16 + Tailwind CSS frontend paired with modular, local-first Whisper speech recognition models.
            </p>
          </div>
        </div>

        <div className="arcade-panel p-6 sm:p-8 bg-[#DFDFD4]/85 backdrop-blur-md space-y-6">
          <h2 className="font-pixel text-sm sm:text-base text-[#212121] border-b-2 border-[#212121] pb-3">
            APPLICATION ARCHITECTURE &amp; DISTRIBUTION
          </h2>

          <div className="space-y-4 text-xs font-mono text-[#212121]/90">
            <p className="leading-relaxed">
              VoxQuest delivers native, pre-packaged binaries for macOS, Windows, and Linux. All core speech recognition features run offline through on-device models.
            </p>

            <div className="p-4 bg-[#212121] border-2 border-[#212121] space-y-2 font-mono text-xs text-[#DFDFD4]">
              <div className="text-[#34D399] font-bold"># Standalone Native Software Package</div>
              <div>Native macOS Installer: VoxQuest_0.1.0_aarch64.dmg (6.0 MB)</div>
              <div>Runtime: Local Whisper Engine via Metal GPU / Apple Silicon Accelerate</div>
              <div>Telemetry: 0 network connections / 100% Air-Gapped Privacy</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-4 border-t-2 border-[#212121]">
            <Link
              href="/download"
              className="arcade-btn arcade-btn-primary px-6 py-3.5 text-xs font-bold flex items-center gap-2"
            >
              <span>DOWNLOAD SOFTWARE</span>
            </Link>
            <Link href="/docs" className="arcade-btn arcade-btn-ghost px-6 py-3.5 text-xs font-bold bg-[#DFDFD4]">
              DOCUMENTATION GUIDE
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
