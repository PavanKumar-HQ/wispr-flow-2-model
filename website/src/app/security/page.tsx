import React from 'react';
import type { Metadata } from 'next';
import { Navbar, Footer } from '@/components/Navigation';
import { AnimatedVoxelBackground } from '@/components/AnimatedVoxelBackground';
import { Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Security Architecture & Threat Model',
  description:
    'VoxQuest security architecture: air-gapped voice processing, local memory sanitization, zero network sockets for audio, and complete protection against cloud eavesdropping.',
  keywords: [
    'air-gapped voice security',
    'private speech to text',
    'zero audio telemetry',
    'enterprise local dictation',
  ],
};

export default function SecurityPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      <AnimatedVoxelBackground />
      <Navbar />

      <main className="flex-1 pt-28 pb-14 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full relative z-10">
        <div className="arcade-panel p-8 sm:p-12 bg-[#DFDFD4]/85 backdrop-blur-md space-y-6">
          <div className="flex items-center gap-3 text-[#07514C]">
            <Shield className="w-7 h-7 text-[#07514C]" />
            <h1 className="font-pixel text-xl sm:text-2xl text-[#212121]">SECURITY POLICY</h1>
          </div>
          <p className="text-xs font-mono text-[#212121]/70">Effective Date: October 30, 2026</p>

          <div className="space-y-4 text-xs font-mono text-[#212121]/90 leading-relaxed border-t-2 border-[#212121] pt-4">
            <h2 className="font-pixel text-xs text-[#07514C]">1. SANDBOXING &amp; INPUT VALIDATION</h2>
            <p>
              Desktop text cleanup and dictionary rewriting strictly validate all inputs and reject buffer overflow or recursive expansion hazards. Operating system automation scripts sanitize quotes to mitigate injection risks.
            </p>

            <h2 className="font-pixel text-xs text-[#07514C]">2. CREDENTIAL MANAGEMENT</h2>
            <p>
              If configured, API keys are kept strictly local in user configuration files with restrictive file permissions. No keys are ever written to browser cookies or public client bundles.
            </p>

            <h2 className="font-pixel text-xs text-[#07514C]">3. RESPONSIBLE DISCLOSURE</h2>
            <p>
              If you identify a security issue in VoxQuest, please report it via private security advisory on GitHub or email the maintainers directly.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
