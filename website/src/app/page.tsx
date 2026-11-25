import React from 'react';
import Link from 'next/link';
import { Navbar, Footer } from '@/components/Navigation';
import { QuestBoard } from '@/components/QuestBoard';
import { WorkflowShowcase } from '@/components/WorkflowShowcase';
import { FaqSection } from '@/components/FaqSection';
import { AnimatedVoxelBackground } from '@/components/AnimatedVoxelBackground';
import { ScrollReveal } from '@/components/ScrollReveal';
import { PixelLogo } from '@/components/PixelIcons';
import { 
  Download, 
  FileCode, 
  Lock, 
  Wand2, 
  Terminal, 
  ArrowRight, 
  Shield, 
  Layers, 
  Zap, 
  GraduationCap, 
  Code2, 
  BookOpen,
  Check,
  X,
  Sparkles,
  Cpu,
  ShieldCheck,
  Gauge,
  Flame,
  Globe,
  Trash2
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden font-sans">
      {/* 1. Procedural 3D Voxel Canvas with Scroll & Mouse Parallax */}
      <AnimatedVoxelBackground />

      {/* 2. Top Navigation Bar */}
      <Navbar />

      <main className="flex-1 relative z-10 pt-20">
        {/* =========================================================================
            SECTION 1: HERO & MODERN PRODUCT ANNOUNCEMENT
           ========================================================================= */}
        <section className="relative pt-16 pb-24 px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-5xl mx-auto">
            {/* Top Pill with subtle glow */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[#DDA44D] text-xs font-mono font-bold mb-8 hover:scale-105 transition-transform shadow-lg cursor-default">
              <Sparkles className="w-4 h-4 text-[#DDA44D]" />
              <span>VOXQUEST &middot; 100% AIR-GAPPED ON-DEVICE VOICE OS</span>
            </div>

            {/* Main Crisp Headline */}
            <h1 className="font-extrabold text-4xl sm:text-6xl lg:text-7xl text-white tracking-tight leading-[1.1] mb-6 drop-shadow-md">
              Speak at 150 WPM. <br />
              <span className="bg-gradient-to-r from-[#DDA44D] via-[#F3C474] to-[#DA6C4C] bg-clip-text text-transparent">
                Zero Cloud. Zero Subscriptions.
              </span>
            </h1>

            {/* Intro Pitch */}
            <p className="max-w-2xl mx-auto text-base sm:text-lg text-white/90 leading-relaxed font-medium mb-8 drop-shadow-sm">
              Dictate notes, code, and messages into any application with zero lag. Powered by on-device Apple Silicon Whisper models with 100% private local consensus.
            </p>

            {/* Action CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-5">
              <Link
                href="/download"
                className="arcade-btn arcade-btn-primary w-full sm:w-auto text-sm py-4 px-8 flex items-center justify-center gap-2.5 group shadow-xl hover:scale-105 transition-all"
              >
                <Download className="w-4 h-4 text-[#212121] group-hover:translate-y-0.5 transition-transform" />
                <span>DOWNLOAD VOXQUEST FREE</span>
              </Link>
              <Link
                href="/open-source"
                className="arcade-btn arcade-btn-ghost w-full sm:w-auto text-sm py-4 px-6 flex items-center justify-center gap-2.5 bg-white/90 backdrop-blur-md hover:bg-white"
              >
                <FileCode className="w-4 h-4" />
                <span>VIEW SOURCE (APACHE 2.0)</span>
              </Link>
            </div>

            <div className="mb-10">
              <Link href="/download" className="inline-flex items-center gap-2 font-mono text-xs text-[#DDA44D] hover:underline bg-black/40 px-3.5 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Auto-detects macOS (Apple Silicon 6.0 MB), Windows & Linux &rarr;</span>
              </Link>
            </div>

            {/* Platform Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs font-mono">
              <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white">MACOS UNIVERSAL (M1/M2/M3/M4)</span>
              <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white">LINUX X86_64</span>
              <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white">WINDOWS 11</span>
              <span className="px-3 py-1 rounded-full bg-[#DA6C4C]/90 text-white font-bold">100% OFFLINE WHISPER</span>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 2: WHY VOXQUEST OVERTAKES WISPR FLOW (Interactive Matrix)
           ========================================================================= */}
        <section id="compare" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto scroll-mt-24">
          <ScrollReveal>
            <div className="text-center max-w-3xl mx-auto mb-14">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DDA44D]/20 text-[#DDA44D] border border-[#DDA44D]/40 font-mono text-xs font-bold mb-3 uppercase">
                <ShieldCheck className="w-4 h-4" />
                <span>DIRECT PLATFORM COMPARISON</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Why Builders Choose VoxQuest Over Wispr Flow
              </h2>
              <p className="mt-3 text-sm text-white/80 leading-relaxed">
                Compare sovereign on-device engineering against closed cloud subscription services.
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl overflow-hidden shadow-2xl">
              <div className="grid grid-cols-3 p-4 sm:p-6 bg-black/30 border-b border-white/10 text-xs font-mono font-bold tracking-wider uppercase text-white/70">
                <div>CAPABILITY</div>
                <div className="text-center text-[#DA6C4C]">WISPR FLOW</div>
                <div className="text-center text-[#34D399] font-extrabold">VOXQUEST (LOCAL)</div>
              </div>

              <div className="divide-y divide-white/10 text-xs sm:text-sm">
                {/* Row 1 */}
                <div className="grid grid-cols-3 p-4 sm:p-5 items-center hover:bg-white/[0.03] transition-colors">
                  <div>
                    <div className="font-bold text-white">Transcription Engine</div>
                    <div className="text-xs text-white/60">Where audio is processed</div>
                  </div>
                  <div className="text-center text-white/80 flex flex-col items-center gap-1">
                    <span className="text-xs text-red-300 font-mono flex items-center gap-1">
                      <X className="w-3.5 h-3.5 text-red-400" /> Cloud Streaming
                    </span>
                    <span className="text-[11px] text-white/50">High latency, breaks offline</span>
                  </div>
                  <div className="text-center flex flex-col items-center gap-1">
                    <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> 100% On-Device Metal
                    </span>
                    <span className="text-[11px] text-white/80">Zero packets leave device</span>
                  </div>
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-3 p-4 sm:p-5 items-center hover:bg-white/[0.03] transition-colors">
                  <div>
                    <div className="font-bold text-white">Pricing &amp; Cost</div>
                    <div className="text-xs text-white/60">Subscription model</div>
                  </div>
                  <div className="text-center text-white/80 font-mono">
                    <div className="text-red-300 font-bold">$12 - $15 / month</div>
                    <div className="text-[11px] text-white/50">$180 recurring annually</div>
                  </div>
                  <div className="text-center">
                    <div className="text-emerald-400 font-mono font-bold">$0 &middot; Free Forever</div>
                    <div className="text-[11px] text-white/80">Sovereign &amp; Open-Source</div>
                  </div>
                </div>

                {/* Row 3 */}
                <div className="grid grid-cols-3 p-4 sm:p-5 items-center hover:bg-white/[0.03] transition-colors">
                  <div>
                    <div className="font-bold text-white">Developer &amp; Terminal Syntax</div>
                    <div className="text-xs text-white/60">Code, CLI flags, casing</div>
                  </div>
                  <div className="text-center text-white/60 text-xs">
                    <span className="text-red-300">Basic prose only</span>
                    <div className="text-[11px] text-white/40">"docker run dash i t"</div>
                  </div>
                  <div className="text-center text-emerald-300 text-xs font-bold">
                    <span>Native Terminal Engine</span>
                    <div className="text-[11px] text-white/80">Auto camelCase &amp; CLI flags</div>
                  </div>
                </div>

                {/* Row 4 */}
                <div className="grid grid-cols-3 p-4 sm:p-5 items-center hover:bg-white/[0.03] transition-colors">
                  <div>
                    <div className="font-bold text-white">Mac Storage Cleaner</div>
                    <div className="text-xs text-white/60">System utility suite</div>
                  </div>
                  <div className="text-center text-white/40 text-xs">None</div>
                  <div className="text-center text-emerald-400 text-xs font-bold">
                    <span>Integrated Squirrel Rules</span>
                    <div className="text-[11px] text-white/80">DerivedData &amp; cache cleaner</div>
                  </div>
                </div>

                {/* Row 5 */}
                <div className="grid grid-cols-3 p-4 sm:p-5 items-center hover:bg-white/[0.03] transition-colors">
                  <div>
                    <div className="font-bold text-white">Gamification &amp; Quests</div>
                    <div className="text-xs text-white/60">Habit motivation system</div>
                  </div>
                  <div className="text-center text-white/40 text-xs">None</div>
                  <div className="text-center text-emerald-400 text-xs font-bold">
                    <span>Retro Pixel Quests &amp; Badges</span>
                    <div className="text-[11px] text-white/80">50-word milestone calibration</div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* =========================================================================
            SECTION 3: WORKFLOW SHOWCASE
           ========================================================================= */}
        <section id="workflow" className="py-16 px-4 sm:px-6 lg:px-8 scroll-mt-24">
          <ScrollReveal delay={50}>
            <WorkflowShowcase />
          </ScrollReveal>
        </section>

        {/* =========================================================================
            SECTION 4: SYSTEM CAPABILITIES
           ========================================================================= */}
        <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24">
          <ScrollReveal>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="arcade-badge bg-[#DDA44D] text-[#212121] mb-3">SYSTEM CAPABILITIES</span>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
                Engineered for Real Productivity
              </h2>
              <p className="mt-4 text-sm sm:text-base text-white/80 leading-relaxed font-sans">
                Everything you need for effortless voice writing without privacy compromises.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ScrollReveal delay={100}>
              <div className="arcade-panel arcade-panel-hoverable p-6 flex flex-col justify-between h-full">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#07514C] text-[#DDA44D] flex items-center justify-center mb-5 shadow-sm">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div className="arcade-badge bg-[#07514C] text-[#DFDFD4] text-[9px] mb-2">PRIVACY FIRST</div>
                  <h3 className="font-bold text-base text-[#212121] mb-2 font-sans">ZERO CLOUD RETENTION</h3>
                  <p className="text-xs text-[#212121]/80 leading-relaxed">
                    Audio never trains a third-party commercial model. Run 100% on-device Whisper models with zero background network pings.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#212121]/15 text-xs font-bold text-[#07514C]">
                  <Link href="/privacy" className="hover:underline flex items-center gap-1 group">
                    <span>Inspect Privacy Architecture</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <div className="arcade-panel arcade-panel-hoverable p-6 flex flex-col justify-between h-full">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#DDA44D] text-[#212121] flex items-center justify-center mb-5 shadow-sm">
                    <Wand2 className="w-6 h-6" />
                  </div>
                  <div className="arcade-badge bg-[#DDA44D] text-[#212121] text-[9px] mb-2">INTELLIGENT REFINERY</div>
                  <h3 className="font-bold text-base text-[#212121] mb-2 font-sans">DETERMINISTIC CLEANER</h3>
                  <p className="text-xs text-[#212121]/80 leading-relaxed">
                    Automatically strip hesitation markers ("um", "uh", "you know") without mangling technical acronyms, variable names, or numbers.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#212121]/15 text-xs font-bold text-[#07514C]">
                  <Link href="/features" className="hover:underline flex items-center gap-1 group">
                    <span>Explore Formatting Rules</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <div className="arcade-panel arcade-panel-hoverable p-6 flex flex-col justify-between h-full">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#DA6C4C] text-white flex items-center justify-center mb-5 shadow-sm">
                    <Terminal className="w-6 h-6" />
                  </div>
                  <div className="arcade-badge bg-[#DA6C4C] text-white text-[9px] mb-2">CROSS-PLATFORM</div>
                  <h3 className="font-bold text-base text-[#212121] mb-2 font-sans">GLOBAL SHORTCUT INJECTION</h3>
                  <p className="text-xs text-[#212121]/80 leading-relaxed">
                    Hold shortcut in any editor, terminal, or browser. Text pastes right where your cursor is blinking without clipboard pollution.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#212121]/15 text-xs font-bold text-[#07514C]">
                  <Link href="/docs" className="hover:underline flex items-center gap-1 group">
                    <span>System Hotkey Guide</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* =========================================================================
            SECTION 5: QUESTS & PROGRESSION BOARD
           ========================================================================= */}
        <ScrollReveal>
          <QuestBoard />
        </ScrollReveal>

        {/* =========================================================================
            SECTION 6: OPEN SOURCE GUILD
           ========================================================================= */}
        <section id="community" className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto scroll-mt-24">
          <ScrollReveal>
            <div className="arcade-panel arcade-panel-hoverable p-8 sm:p-12 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="p-3 bg-[#07514C] rounded-xl text-[#DDA44D] w-fit shadow-sm">
                  <FileCode className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className="arcade-badge bg-[#07514C] text-[#DFDFD4] text-[9px]">SOVEREIGN ECOSYSTEM</span>
                  <h2 className="text-2xl font-bold text-[#212121] font-sans">
                    Open Source &amp; Community First
                  </h2>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-[#212121]/90 leading-relaxed font-sans">
                VoxQuest is built to be inspectable and community-governed. No hidden analytics SDKs, no audio telemetry pings, and no commercial subscription walls.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs font-sans">
                <div className="p-4 rounded-xl border border-charcoal/15 bg-white/60">
                  <div className="font-bold text-[#07514C] text-xs mb-1 font-mono">APACHE 2.0</div>
                  <p className="text-[11px] text-[#212121]/80">Permissive license allowing personal, academic, and enterprise modification.</p>
                </div>
                <div className="p-4 rounded-xl border border-charcoal/15 bg-white/60">
                  <div className="font-bold text-[#DDA44D] text-xs mb-1 font-mono">LOCAL-FIRST</div>
                  <p className="text-[11px] text-[#212121]/80">Whisper Metal inference runs entirely on your hardware with 0 network calls.</p>
                </div>
                <div className="p-4 rounded-xl border border-charcoal/15 bg-white/60">
                  <div className="font-bold text-[#DA6C4C] text-xs mb-1 font-mono">EXTENSIBLE</div>
                  <p className="text-[11px] text-[#212121]/80">Contribute custom technical vocabularies, shortcuts, and dictionary rules.</p>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap gap-4 border-t border-charcoal/15">
                <a
                  href="https://github.com/PavanKumar-HQ/wispr-flow-2-model"
                  target="_blank"
                  rel="noreferrer"
                  className="arcade-btn arcade-btn-primary text-xs py-3 px-6 flex items-center gap-2"
                >
                  <FileCode className="w-4 h-4 text-[#212121]" />
                  <span>GITHUB REPOSITORY</span>
                </a>
                <Link
                  href="/open-source"
                  className="arcade-btn arcade-btn-ghost text-xs py-3 px-6 flex items-center gap-2 bg-white"
                >
                  <span>CONTRIBUTION GUIDE</span>
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* =========================================================================
            SECTION 7: FAQ SECTION
           ========================================================================= */}
        <ScrollReveal>
          <FaqSection />
        </ScrollReveal>

        {/* =========================================================================
            SECTION 8: FINAL CTA BANNER
           ========================================================================= */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 text-center relative">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto arcade-panel arcade-panel-hoverable p-8 sm:p-12 relative">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-[#212121] mb-3 font-sans">
                Experience Sovereign Voice Typing
              </h2>
              <p className="text-xs sm:text-sm text-[#212121]/80 mb-8 max-w-xl mx-auto leading-relaxed font-sans font-medium">
                Download the native desktop release for Apple Silicon and start speaking at the speed of thought.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/download"
                  className="arcade-btn arcade-btn-primary w-full sm:w-auto text-xs py-4 px-8 flex items-center justify-center gap-2 shadow-lg"
                >
                  <Download className="w-4 h-4 text-[#212121]" />
                  <span>DOWNLOAD VOXQUEST FREE</span>
                </Link>
                <Link
                  href="/docs"
                  className="arcade-btn arcade-btn-ghost w-full sm:w-auto text-xs py-4 px-6 flex items-center justify-center gap-2 bg-white"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>READ DOCUMENTATION</span>
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </section>
      </main>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}
