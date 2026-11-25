import React from 'react';
import type { Metadata } from 'next';
import { Navbar, Footer } from '@/components/Navigation';
import { AnimatedVoxelBackground } from '@/components/AnimatedVoxelBackground';
import { FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Terms of service and software use agreement for VoxQuest. Transparent, free from lock-in, and governed by the Apache 2.0 open-source license.',
  keywords: [
    'voxquest terms',
    'open source terms of service',
    'apache 2.0 license terms',
  ],
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      <AnimatedVoxelBackground />
      <Navbar />

      <main className="flex-1 pt-28 pb-14 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full relative z-10">
        <div className="arcade-panel p-8 sm:p-12 bg-[#DFDFD4]/85 backdrop-blur-md space-y-6">
          <div className="flex items-center gap-3 text-[#07514C]">
            <FileText className="w-7 h-7 text-[#07514C]" />
            <h1 className="font-pixel text-xl sm:text-2xl text-[#212121]">TERMS OF SERVICE</h1>
          </div>
          <p className="text-xs font-mono text-[#212121]/70">Last Updated: October 30, 2026</p>

          <div className="space-y-4 text-xs font-mono text-[#212121]/90 leading-relaxed border-t-2 border-[#212121] pt-4">
            <h2 className="font-pixel text-xs text-[#07514C]">1. OPEN SOURCE LICENSE</h2>
            <p>
              VoxQuest is provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and noninfringement.
            </p>

            <h2 className="font-pixel text-xs text-[#07514C]">2. RESPONSIBLE USAGE</h2>
            <p>
              Users are responsible for complying with local audio recording consent laws (e.g. two-party consent jurisdictions) when using VoxQuest in meeting environments.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
