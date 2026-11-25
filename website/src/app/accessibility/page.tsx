import React from 'react';
import type { Metadata } from 'next';
import { Navbar, Footer } from '@/components/Navigation';
import { AnimatedVoxelBackground } from '@/components/AnimatedVoxelBackground';
import { Eye } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Accessibility Statement & Inclusive Design',
  description:
    'VoxQuest accessibility pledge: full keyboard navigation, high contrast modes, WCAG 2.1 AA compliance, and voice-first computing for individuals with motor or visual impairments.',
  keywords: [
    'accessible voice dictation',
    'motor impairment speech typing',
    'wcag 2.1 voice software',
    'hands-free computing',
  ],
};

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      <AnimatedVoxelBackground />
      <Navbar />

      <main className="flex-1 pt-28 pb-14 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full relative z-10">
        <div className="arcade-panel p-8 sm:p-12 bg-[#DFDFD4]/85 backdrop-blur-md space-y-6">
          <div className="flex items-center gap-3 text-[#07514C]">
            <Eye className="w-7 h-7 text-[#07514C]" />
            <h1 className="font-pixel text-xl sm:text-2xl text-[#212121]">ACCESSIBILITY</h1>
          </div>

          <div className="space-y-4 text-xs font-mono text-[#212121]/90 leading-relaxed border-t-2 border-[#212121] pt-4">
            <h2 className="font-pixel text-xs text-[#07514C]">WCAG 2.2 AA CONFORMANCE</h2>
            <p>
              Voice dictation is inherently an assistive technology. We ensure our website and product presentations remain fully accessible to screen readers, keyboard-only operators, and users with motor and visual impairments.
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>High-contrast text pairing meeting or exceeding 4.5:1 ratio against backgrounds.</li>
              <li>Visible high-contrast focus rings for keyboard navigation.</li>
              <li>Aria labels on all interactive triggers and expandable sections.</li>
              <li>Zero required mouse precision gestures.</li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
