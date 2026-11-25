import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/Navigation';
import { AnimatedVoxelBackground } from '@/components/AnimatedVoxelBackground';
import { Users, MessageSquare, Github, Heart, Layers, Bug } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Community Guild & Open Collaboration',
  description:
    'Join the VoxQuest open-source community. Contribute code, suggest dictionary terms, report bugs, and build the future of sovereign voice AI together.',
  keywords: [
    'voxquest community',
    'open source voice AI',
    'whisper contributors',
    'voice OS discord github',
  ],
};

export default function CommunityPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      <AnimatedVoxelBackground />
      <Navbar />

      <main className="flex-1 pt-28 pb-14 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="arcade-badge bg-[#DDA44D] text-[#212121] mb-3">OPEN COLLABORATION</span>
          <h1 className="font-pixel text-2xl sm:text-4xl text-[#DFDFD4] tracking-wide uppercase drop-shadow-[4px_4px_0px_#212121]">
            COMMUNITY &amp; GUILD
          </h1>
          <p className="mt-4 font-mono text-xs sm:text-sm text-[#DFDFD4] leading-relaxed drop-shadow-[2px_2px_0px_#212121]">
            VoxQuest is built in the open. Join fellow developers, writers, accessibility advocates, and speech enthusiasts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="arcade-panel p-6 bg-[#DFDFD4]/85 backdrop-blur-md space-y-4">
            <div className="flex items-center gap-2 text-[#07514C]">
              <Bug className="w-5 h-5 text-[#07514C]" />
              <h3 className="font-pixel text-xs sm:text-sm text-[#212121]">BUILT-IN FEEDBACK &amp; ROADMAP</h3>
            </div>
            <p className="text-xs font-mono text-[#212121]/80 leading-relaxed">
              Encountered a bug or want to suggest a new custom vocabulary package? Send feedback directly through the in-app Studio tab.
            </p>
            <Link
              href="/download"
              className="arcade-btn arcade-btn-ghost px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <span>GET THE APP</span>
            </Link>
          </div>

          <div className="arcade-panel p-6 bg-[#DFDFD4]/85 backdrop-blur-md space-y-4">
            <div className="flex items-center gap-2 text-[#DA6C4C]">
              <MessageSquare className="w-5 h-5 text-[#DA6C4C]" />
              <h3 className="font-pixel text-xs sm:text-sm text-[#212121]">COMMUNITY DISCUSSIONS</h3>
            </div>
            <p className="text-xs font-mono text-[#212121]/80 leading-relaxed">
              Share prompt templates, custom dictionary lists for specific frameworks, and desktop workflow hacks.
            </p>
            <Link
              href="/features"
              className="arcade-btn arcade-btn-ghost px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <span>VIEW CAPABILITIES</span>
            </Link>
          </div>
        </div>

        {/* Code of Conduct */}
        <div className="arcade-panel-dark p-6 bg-[#0F5B57]/80 backdrop-blur-md space-y-3">
          <h3 className="font-pixel text-xs text-[#DDA44D] flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#DA6C4C]" />
            <span>COMMUNITY CODE OF CONDUCT</span>
          </h3>
          <p className="text-xs font-mono text-[#DFDFD4]/90 leading-relaxed">
            We are committed to providing a friendly, safe, and welcoming environment for all contributors, regardless of experience level, gender identity, sexual orientation, disability, personal appearance, race, ethnicity, or religion.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

