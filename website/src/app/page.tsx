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
  BookOpen
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* 1. Procedural 3D Voxel Canvas with Scroll & Mouse Parallax */}
      <AnimatedVoxelBackground />

      {/* 2. Top Navigation Bar */}
      <Navbar />

      <main className="flex-1 relative z-10 pt-20">
        {/* =========================================================================
            SECTION 1: HERO & PIXEL-ART WORLD
           ========================================================================= */}
        <section className="relative pt-12 pb-24 px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-5xl mx-auto">
            {/* Top Badge with subtle hover lift */}
            <div className="inline-flex items-center gap-2 arcade-badge bg-[#DDA44D] text-[#212121] mb-6 hover:scale-105 transition-transform cursor-default">
              <Zap className="w-3.5 h-3.5 text-[#DA6C4C]" />
              <span>VOXQUEST &middot; VOICE-FIRST EXPLORATION</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-pixel text-3xl sm:text-5xl lg:text-6xl text-[#DFDFD4] tracking-wider leading-tight mb-6 drop-shadow-[5px_5px_0px_#212121]">
              YOUR VOICE. <br />
              <span className="text-[#DDA44D]">YOUR WORDS. </span>
              <span className="text-[#DA6C4C]">YOUR WORLD.</span>
            </h1>

            {/* Intro Pitch */}
            <div className="max-w-2xl mx-auto arcade-panel-dark arcade-panel-hoverable p-5 mb-8 bg-[#0F5B57]/80 backdrop-blur-md">
              <p className="font-mono text-sm sm:text-base text-[#DFDFD4] leading-relaxed">
                Speak naturally. Turn your thoughts into clean, useful text without cloud lock-in. Spend less time typing and more time building.
              </p>
            </div>

            {/* Action CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
              <Link
                href="/download"
                className="arcade-btn arcade-btn-primary w-full sm:w-auto text-xs py-4 px-8 flex items-center justify-center gap-2 group shadow-pixel-sm hover:scale-105 transition-all"
              >
                <Download className="w-4 h-4 text-[#212121] group-hover:translate-y-0.5 transition-transform" />
                <span>DOWNLOAD VOXQUEST FREE</span>
              </Link>
              <Link
                href="/open-source"
                className="arcade-btn arcade-btn-ghost w-full sm:w-auto text-xs py-4 px-6 flex items-center justify-center gap-2 bg-[#DFDFD4]/85 backdrop-blur-sm hover:bg-[#DFDFD4]"
              >
                <FileCode className="w-4 h-4" />
                <span>INSPECT REPO SOURCE</span>
              </Link>
            </div>

            <div className="mb-8">
              <Link href="/download" className="inline-flex items-center gap-2 font-mono text-xs text-[#DDA44D] hover:underline bg-[#0F5B57]/60 px-3 py-1.5 border border-[#212121]">
                <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
                <span>Auto-detects macOS (Apple Silicon), Windows & Linux &rarr;</span>
              </Link>
            </div>

            {/* Platform Compatibility Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
              <span className="arcade-badge bg-[#DFDFD4]/90 backdrop-blur-sm text-[#212121]">MACOS UNIVERSAL</span>
              <span className="arcade-badge bg-[#DFDFD4]/90 backdrop-blur-sm text-[#212121]">LINUX X86_64</span>
              <span className="arcade-badge bg-[#DFDFD4]/90 backdrop-blur-sm text-[#212121]">WINDOWS 11</span>
              <span className="arcade-badge bg-[#DA6C4C] text-white">100% LOCAL WHISPER</span>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 2: THE PROBLEM (with ScrollReveal)
           ========================================================================= */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="arcade-panel arcade-panel-hoverable p-8 sm:p-12 bg-[#DFDFD4]/85 backdrop-blur-md">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1 space-y-4">
                  <span className="arcade-badge bg-[#DA6C4C] text-white text-[9px]">THE BOTTLENECK</span>
                  <h2 className="font-pixel text-xl sm:text-3xl text-[#212121] leading-tight">
                    YOUR IDEAS MOVE FASTER THAN YOUR FINGERS.
                  </h2>
                  <p className="font-mono text-xs sm:text-sm text-[#212121]/90 leading-relaxed font-medium">
                    The average person types at 40 words per minute, but speaks comfortably at 150 words per minute.
                    When wrestling with complex ideas, essays, or code architecture, typing becomes a friction barrier.
                  </p>
                  <div className="grid grid-cols-2 gap-4 pt-2 font-mono text-xs">
                    <div className="p-3 border-2 border-[#212121] bg-[#DFDFD4] hover:translate-y-[-2px] transition-transform">
                      <div className="font-pixel text-[10px] text-[#DA6C4C]">TYPING LIMIT</div>
                      <div className="font-bold text-lg text-[#212121]">40 WPM</div>
                      <div className="text-[10px] text-[#212121]/70">Fatigue & backspacing</div>
                    </div>
                    <div className="p-3 border-2 border-[#212121] bg-[#07514C] text-[#DFDFD4] hover:translate-y-[-2px] transition-transform">
                      <div className="font-pixel text-[10px] text-[#DDA44D]">VOXQUEST FLOW</div>
                      <div className="font-bold text-lg text-[#DFDFD4]">150+ WPM</div>
                      <div className="text-[10px] text-[#B8CBC3]">Spoken thought speed</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* =========================================================================
            SECTION 3: WORKFLOW SHOWCASE (with ScrollReveal)
           ========================================================================= */}
        <section id="workflow" className="py-16 px-4 sm:px-6 lg:px-8 scroll-mt-24">
          <ScrollReveal delay={50}>
            <WorkflowShowcase />
          </ScrollReveal>
        </section>

        {/* =========================================================================
            SECTION 4: FEATURES & CAPABILITY OVERVIEW
           ========================================================================= */}
        <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24">
          <ScrollReveal>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="arcade-badge bg-[#DDA44D] text-[#212121] mb-3">SYSTEM CAPABILITIES</span>
              <h2 className="font-pixel text-2xl sm:text-4xl text-[#DFDFD4] drop-shadow-[4px_4px_0px_#212121]">
                ENGINEERED FOR REAL PRODUCTIVITY
              </h2>
              <p className="mt-4 font-mono text-xs sm:text-sm text-[#DFDFD4] leading-relaxed drop-shadow-[2px_2px_0px_#212121]">
                Everything you need for effortless voice writing without privacy compromises.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ScrollReveal delay={100}>
              <div className="arcade-panel arcade-panel-hoverable p-6 flex flex-col justify-between bg-[#DFDFD4]/80 backdrop-blur-md h-full">
                <div>
                  <div className="w-12 h-12 border-3 border-[#212121] bg-[#B8CBC3] flex items-center justify-center mb-6 shadow-pixel-sm">
                    <Lock className="w-6 h-6 text-[#07514C]" />
                  </div>
                  <div className="arcade-badge bg-[#07514C] text-[#DFDFD4] text-[8px] mb-2">PRIVACY FIRST</div>
                  <h3 className="font-pixel text-sm text-[#212121] mb-2">ZERO CLOUD RETENTION</h3>
                  <p className="font-mono text-xs text-[#212121]/90 leading-relaxed font-semibold">
                    Audio never trains a third-party commercial model. Run 100% on-device Whisper models with zero background network pings.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t-2 border-[#212121] text-[10px] font-pixel text-[#07514C]">
                  <Link href="/privacy" className="hover:underline flex items-center gap-1 group">
                    <span>INSPECT PRIVACY PLEDGE</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <div className="arcade-panel arcade-panel-hoverable p-6 flex flex-col justify-between bg-[#DFDFD4]/80 backdrop-blur-md h-full">
                <div>
                  <div className="w-12 h-12 border-3 border-[#212121] bg-[#DDA44D] flex items-center justify-center mb-6 shadow-pixel-sm">
                    <Wand2 className="w-6 h-6 text-[#212121]" />
                  </div>
                  <div className="arcade-badge bg-[#DDA44D] text-[#212121] text-[8px] mb-2">INTELLIGENT REFINERY</div>
                  <h3 className="font-pixel text-sm text-[#212121] mb-2">DETERMINISTIC CLEANER</h3>
                  <p className="font-mono text-xs text-[#212121]/90 leading-relaxed font-semibold">
                    Automatically strip hesitation markers ("um", "uh", "you know") without mangling names, numbers, or code syntax.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t-2 border-[#212121] text-[10px] font-pixel text-[#07514C]">
                  <Link href="/features" className="hover:underline flex items-center gap-1 group">
                    <span>FEATURE MATRIX</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <div className="arcade-panel arcade-panel-hoverable p-6 flex flex-col justify-between bg-[#DFDFD4]/80 backdrop-blur-md h-full">
                <div>
                  <div className="w-12 h-12 border-3 border-[#212121] bg-[#DA6C4C] flex items-center justify-center mb-6 shadow-pixel-sm">
                    <Terminal className="w-6 h-6 text-white" />
                  </div>
                  <div className="arcade-badge bg-[#DA6C4C] text-white text-[8px] mb-2">CROSS-PLATFORM</div>
                  <h3 className="font-pixel text-sm text-[#212121] mb-2">GLOBAL HOTKEY INJECTION</h3>
                  <p className="font-mono text-xs text-[#212121]/90 leading-relaxed font-semibold">
                    Hold shortcut in any editor, terminal, or browser. Text pastes right where your cursor is blinking.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t-2 border-[#212121] text-[10px] font-pixel text-[#07514C]">
                  <Link href="/docs" className="hover:underline flex items-center gap-1 group">
                    <span>SYSTEM SHORTCUTS</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* =========================================================================
            SECTION 5: DEDICATED SECTIONS FOR STUDENTS & DEVELOPERS
           ========================================================================= */}
        <section id="audiences" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto scroll-mt-24">
          <ScrollReveal>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="arcade-badge bg-[#DDA44D] text-[#212121] mb-3">WHO IT IS FOR</span>
              <h2 className="font-pixel text-2xl sm:text-4xl text-[#DFDFD4] drop-shadow-[4px_4px_0px_#212121]">
                BUILT FOR STUDENTS &amp; BUILDERS
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ScrollReveal delay={100}>
              <div className="arcade-panel arcade-panel-hoverable p-8 bg-[#DFDFD4]/85 backdrop-blur-md flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-[#DDA44D] border-2 border-[#212121]">
                      <GraduationCap className="w-6 h-6 text-[#212121]" />
                    </div>
                    <div>
                      <h3 className="font-pixel text-base text-[#212121]">FOR STUDENTS</h3>
                      <div className="text-[10px] font-mono text-[#07514C] font-bold">Essays &bull; Brainstorming &bull; Notes</div>
                    </div>
                  </div>
                  <p className="font-mono text-xs text-[#212121]/90 leading-relaxed mb-4">
                    Overcome the blank page syndrome. Dictate your thesis argument, summarize lectures in your own words, and draft long essays in minutes instead of hours.
                  </p>
                  <ul className="space-y-2 font-mono text-xs text-[#212121]">
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-[#07514C]" />
                      <span>Free-flow brainstorming without backspace friction</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-[#07514C]" />
                      <span>Study notes dictated straight into Notion or Docs</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-[#07514C]" />
                      <span>Reduces late-night essay-writing physical fatigue</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-6 pt-4 border-t-2 border-[#212121]">
                  <span className="arcade-badge bg-[#07514C] text-[#DFDFD4] text-[8px]">ACADEMIC FLOW</span>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <div className="arcade-panel arcade-panel-hoverable p-8 bg-[#DFDFD4]/85 backdrop-blur-md flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-[#07514C] border-2 border-[#212121]">
                      <Code2 className="w-6 h-6 text-[#DDA44D]" />
                    </div>
                    <div>
                      <h3 className="font-pixel text-base text-[#212121]">FOR DEVELOPERS</h3>
                      <div className="text-[10px] font-mono text-[#07514C] font-bold">Commits &bull; PRs &bull; Tech Specs</div>
                    </div>
                  </div>
                  <p className="font-mono text-xs text-[#212121]/90 leading-relaxed mb-4">
                    Write detailed PR summaries, ADRs, Slack explanations, and commit logs without context switching away from your IDE or CLI.
                  </p>
                  <ul className="space-y-2 font-mono text-xs text-[#212121]">
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-[#DA6C4C]" />
                      <span>Custom dictionary for camelCase, Docker, PostgreSQL</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-[#DA6C4C]" />
                      <span>Types directly into VS Code, Zed, Neovim, or Terminal</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-[#DA6C4C]" />
                      <span>Offline Whisper inference with zero cloud telemetry</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-6 pt-4 border-t-2 border-[#212121]">
                  <span className="arcade-badge bg-[#DA6C4C] text-white text-[8px]">DEVELOPER READY</span>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* =========================================================================
            SECTION 6: QUESTS & PROGRESSION BOARD
           ========================================================================= */}
        <ScrollReveal>
          <QuestBoard />
        </ScrollReveal>

        {/* =========================================================================
            SECTION 7: OPEN SOURCE & COMMUNITY GUILD
           ========================================================================= */}
        <section id="community" className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto scroll-mt-24">
          <ScrollReveal>
            <div className="arcade-panel arcade-panel-hoverable p-8 sm:p-12 bg-[#DFDFD4]/85 backdrop-blur-md space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="p-3 bg-[#07514C] border-2 border-[#212121] w-fit shadow-pixel-sm">
                  <FileCode className="w-6 h-6 text-[#DDA44D]" />
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="arcade-badge bg-[#07514C] text-[#DFDFD4] text-[8px]">OPEN ECOSYSTEM</span>
                  </div>
                  <h2 className="font-pixel text-lg sm:text-2xl text-[#212121] leading-snug">
                    OPEN SOURCE &amp; COMMUNITY
                  </h2>
                </div>
              </div>

              <p className="font-mono text-xs sm:text-sm text-[#212121]/90 leading-relaxed">
                VoxQuest is designed to be free, inspectable, and community-governed. No hidden analytics SDKs, no cloud tracking beacons, and no bait-and-switch subscription walls.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 font-mono text-xs">
                <div className="p-4 border-2 border-[#212121] bg-[#DFDFD4] hover:translate-y-[-2px] transition-transform">
                  <div className="font-pixel text-[10px] text-[#07514C] mb-1">APACHE 2.0</div>
                  <p className="text-[11px] text-[#212121]/80">Permissive license allowing personal, academic, and enterprise usage.</p>
                </div>
                <div className="p-4 border-2 border-[#212121] bg-[#DFDFD4] hover:translate-y-[-2px] transition-transform">
                  <div className="font-pixel text-[10px] text-[#DDA44D] mb-1">LOCAL-FIRST</div>
                  <p className="text-[11px] text-[#212121]/80">Whisper GGML inference runs on your own device with zero network calls.</p>
                </div>
                <div className="p-4 border-2 border-[#212121] bg-[#DFDFD4] hover:translate-y-[-2px] transition-transform">
                  <div className="font-pixel text-[10px] text-[#DA6C4C] mb-1">EXTENSIBLE</div>
                  <p className="text-[11px] text-[#212121]/80">Contribute vocabulary dictionaries, shortcuts, and platform integrations.</p>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap gap-4 border-t-2 border-[#212121]">
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
                  className="arcade-btn arcade-btn-ghost text-xs py-3 px-6 flex items-center gap-2 bg-[#DFDFD4]"
                >
                  <span>READ CONTRIBUTION GUIDE</span>
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* =========================================================================
            SECTION 8: FAQ & TRANSPARENT STATUS
           ========================================================================= */}
        <ScrollReveal>
          <FaqSection />
        </ScrollReveal>

        {/* =========================================================================
            SECTION 9: FINAL CTA BANNER
           ========================================================================= */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 text-center relative">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto arcade-panel arcade-panel-hoverable p-8 sm:p-12 relative bg-[#DFDFD4]/85 backdrop-blur-md">
              <h2 className="font-pixel text-xl sm:text-3xl text-[#212121] mb-4">
                READY TO EXPLORE VOXQUEST?
              </h2>
              <p className="font-mono text-xs sm:text-sm text-[#212121] mb-8 max-w-xl mx-auto leading-relaxed font-bold">
                Join the open-source movement bringing sovereign, private voice dictation to computers everywhere.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/download"
                  className="arcade-btn arcade-btn-primary w-full sm:w-auto text-xs py-4 px-8 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4 text-[#212121]" />
                  <span>EXPLORE ALPHA BUILDS</span>
                </Link>
                <Link
                  href="/docs"
                  className="arcade-btn arcade-btn-ghost w-full sm:w-auto text-xs py-4 px-6 flex items-center justify-center gap-2 bg-[#DFDFD4]/90"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>READ DOCUMENTATION</span>
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </section>
      </main>

      {/* SECTION 10: FOOTER */}
      <Footer />
    </div>
  );
}
