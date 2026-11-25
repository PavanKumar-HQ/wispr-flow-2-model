import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/Navigation';
import { AnimatedVoxelBackground } from '@/components/AnimatedVoxelBackground';
import { Mic, Cpu, Wand2, MonitorCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Architecture & Inference Pipeline',
  description:
    'Deep dive into the VoxQuest technical architecture: CoreAudio loopback, GGML Whisper Metal acceleration, local SQLite persistence, and zero-telemetry audio pipelines.',
  keywords: [
    'whisper architecture',
    'metal ggml inference',
    'coreaudio loopback',
    'local speech pipeline',
    'tauri voice engine',
  ],
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* 3D Animated Minecraft Voxel Overworld Background */}
      <AnimatedVoxelBackground />

      <Navbar />

      <main className="flex-1 pt-28 pb-14 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="arcade-badge bg-[#DDA44D] text-[#212121] mb-3">TECHNICAL ARCHITECTURE</span>
          <h1 className="font-pixel text-2xl sm:text-4xl text-[#DFDFD4] tracking-wide uppercase drop-shadow-[4px_4px_0px_#212121]">
            HOW VOXQUEST WORKS
          </h1>
          <p className="mt-4 font-mono text-xs sm:text-sm text-[#DFDFD4] leading-relaxed drop-shadow-[2px_2px_0px_#212121]">
            A step-by-step examination of our audio pipeline, speech recognition engines, text cleanup transformations, and local persistence.
          </p>
        </div>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className="arcade-panel p-6 sm:p-8 bg-[#DFDFD4]/85 backdrop-blur-md flex flex-col sm:flex-row gap-6 items-start">
            <div className="w-12 h-12 border-3 border-[#212121] bg-[#07514C] text-[#DFDFD4] flex items-center justify-center font-pixel text-sm flex-shrink-0 shadow-pixel-sm">
              01
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-[#07514C]" />
                <h3 className="font-pixel text-xs sm:text-sm text-[#212121]">GLOBAL HOTKEY &amp; AUDIO CAPTURE</h3>
              </div>
              <p className="text-xs font-mono text-[#212121]/90 leading-relaxed">
                When you press the global shortcut (e.g. <code className="bg-[#B8CBC3]/50 px-1.5 py-0.5 border border-[#212121] text-[11px]">Command+Shift+Space</code>), the listener awakens and initializes a 16kHz PCM audio stream from your hardware mic. Silence is monitored to prevent empty audio bloat.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="arcade-panel p-6 sm:p-8 bg-[#DFDFD4]/85 backdrop-blur-md flex flex-col sm:flex-row gap-6 items-start">
            <div className="w-12 h-12 border-3 border-[#212121] bg-[#DDA44D] text-[#212121] flex items-center justify-center font-pixel text-sm flex-shrink-0 shadow-pixel-sm">
              02
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#07514C]" />
                <h3 className="font-pixel text-xs sm:text-sm text-[#212121]">SPEECH-TO-TEXT TRANSCRIPTION</h3>
              </div>
              <p className="text-xs font-mono text-[#212121]/90 leading-relaxed">
                Audio is forwarded to your selected transcription backend:
              </p>
              <ul className="list-disc list-inside text-xs font-mono text-[#212121]/80 space-y-1 pl-2">
                <li><strong>Local Whisper Engine:</strong> Runs entirely on your CPU or GPU without sending bytes across the internet.</li>
                <li><strong>BYOK Cloud / Remote Server:</strong> Connects to your private OpenAI Whisper API, Ollama instance, or LocalAI endpoint using encrypted HTTPS.</li>
              </ul>
            </div>
          </div>

          {/* Step 3 */}
          <div className="arcade-panel p-6 sm:p-8 bg-[#DFDFD4]/85 backdrop-blur-md flex flex-col sm:flex-row gap-6 items-start">
            <div className="w-12 h-12 border-3 border-[#212121] bg-[#DA6C4C] text-white flex items-center justify-center font-pixel text-sm flex-shrink-0 shadow-pixel-sm">
              03
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-[#DA6C4C]" />
                <h3 className="font-pixel text-xs sm:text-sm text-[#212121]">DETERMINISTIC TEXT CLEANUP ENGINE</h3>
              </div>
              <p className="text-xs font-mono text-[#212121]/90 leading-relaxed">
                The raw transcript passes through our regex text cleanup pipeline:
              </p>
              <div className="p-3 bg-[#B8CBC3]/30 border-2 border-[#212121] text-xs font-mono space-y-1">
                <div className="text-[#DA6C4C] line-through">- "Um, we should literally like deploy postgresql"</div>
                <div className="text-[#07514C] font-bold">+ "We should deploy PostgreSQL"</div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="arcade-panel p-6 sm:p-8 bg-[#DFDFD4]/85 backdrop-blur-md flex flex-col sm:flex-row gap-6 items-start">
            <div className="w-12 h-12 border-3 border-[#212121] bg-[#07514C] text-[#DFDFD4] flex items-center justify-center font-pixel text-sm flex-shrink-0 shadow-pixel-sm">
              04
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <MonitorCheck className="w-4 h-4 text-[#07514C]" />
                <h3 className="font-pixel text-xs sm:text-sm text-[#212121]">ACTIVE WINDOW INSERTION &amp; LOCAL HISTORY</h3>
              </div>
              <p className="text-xs font-mono text-[#212121]/90 leading-relaxed">
                The cleaned text is typed into the focused application at your cursor. Dictation records are appended to your local, isolated store, which you can wipe at any time.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link href="/open-source" className="arcade-btn arcade-btn-primary px-8 py-4 text-xs font-bold inline-flex items-center gap-2">
            <span>READ SOURCE SPECS</span>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
