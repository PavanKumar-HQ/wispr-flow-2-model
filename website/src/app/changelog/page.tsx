import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/Navigation';
import { AnimatedVoxelBackground } from '@/components/AnimatedVoxelBackground';
import { CheckCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Changelog & Version History',
  description:
    'Detailed release notes and updates for VoxQuest: native Windows installer (.exe), universal Mac DMG, cross-platform storage cleaner, and VoxMeeting assistant.',
  keywords: [
    'voxquest changelog',
    'release notes voice dictation',
    'offline whisper updates',
    'windows installer voxquest',
  ],
};

const RELEASES = [
  {
    version: 'v0.1.0-alpha.1',
    date: '2026-10-30',
    title: 'Initial Alpha: Web Portal, 3D Voxel Engine & Quest Board',
    highlights: [
      'Interactive Speak -> Shape -> Create conceptual voice transformation pipeline.',
      'Procedural 3D WebGL Minecraft voxel world with dynamic lighting and camera drift.',
      'Dedicated persona sections for students and developers.',
      'Arcade Quest Board with XP progression milestones.',
      'Verified desktop download manifests and architecture specifications.'
    ]
  }
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* 3D Animated Minecraft Voxel Overworld Background */}
      <AnimatedVoxelBackground />

      <Navbar />

      <main className="flex-1 pt-28 pb-14 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="arcade-badge bg-[#DDA44D] text-[#212121] mb-3">PATCH NOTES</span>
          <h1 className="font-pixel text-2xl sm:text-4xl text-[#DFDFD4] tracking-wide uppercase drop-shadow-[4px_4px_0px_#212121]">
            CHANGELOG &amp; RELEASES
          </h1>
          <p className="mt-4 font-mono text-xs sm:text-sm text-[#DFDFD4] leading-relaxed drop-shadow-[2px_2px_0px_#212121]">
            All notable changes, verified releases, and platform enhancements are documented here chronologically.
          </p>
        </div>

        <div className="space-y-6">
          {RELEASES.map((rel) => (
            <div key={rel.version} className="arcade-panel p-6 sm:p-8 bg-[#DFDFD4]/85 backdrop-blur-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-[#212121] pb-3 gap-2">
                <div className="flex items-center gap-2">
                  <span className="arcade-badge bg-[#07514C] text-[#DFDFD4] text-[9px]">{rel.version}</span>
                  <span className="text-xs font-mono text-[#212121]/70">{rel.date}</span>
                </div>
                <span className="arcade-badge bg-[#DDA44D] text-[#212121] text-[8px]">ALPHA BUILD</span>
              </div>

              <h2 className="font-pixel text-xs sm:text-sm text-[#212121]">{rel.title}</h2>

              <ul className="space-y-2">
                {rel.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-mono text-[#212121]/90 leading-relaxed">
                    <CheckCircle className="w-4 h-4 text-[#07514C] flex-shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
