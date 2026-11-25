import React from 'react';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/Navigation';
import { AnimatedVoxelBackground } from '@/components/AnimatedVoxelBackground';
import { Github, Scale, GitPullRequest, Terminal } from 'lucide-react';

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
            HOW TO CONTRIBUTE
          </h2>

          <div className="space-y-4 text-xs font-mono text-[#212121]/90">
            <p className="leading-relaxed">
              We welcome code contributions, vocabulary dictionary expansions, accessibility reviews, documentation improvements, and translations.
            </p>

            <div className="p-4 bg-[#212121] border-2 border-[#212121] space-y-1.5 font-mono text-xs text-[#DFDFD4]">
              <div className="text-[#B8CBC3]"># 1. Clone the repository</div>
              <div>git clone https://github.com/PavanKumar-HQ/wispr-flow-2-model.git voxquest</div>
              <div className="text-[#B8CBC3]"># 2. Install dependencies</div>
              <div>npm install</div>
              <div className="text-[#B8CBC3]"># 3. Run development server</div>
              <div>npm run dev</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-4 border-t-2 border-[#212121]">
            <a
              href="https://github.com/PavanKumar-HQ/wispr-flow-2-model"
              target="_blank"
              rel="noreferrer"
              className="arcade-btn arcade-btn-primary px-6 py-3.5 text-xs font-bold flex items-center gap-2"
            >
              <Github className="w-4 h-4 text-[#212121]" />
              <span>GITHUB REPOSITORY</span>
            </a>
            <Link href="/docs" className="arcade-btn arcade-btn-ghost px-6 py-3.5 text-xs font-bold bg-[#DFDFD4]">
              DEVELOPER GUIDE
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
