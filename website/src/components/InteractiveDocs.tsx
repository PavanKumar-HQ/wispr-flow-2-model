'use client';

import React, { useState } from 'react';
import { Terminal, Shield, Mic, FileText, AlertCircle, ChevronRight, CheckCircle2 } from 'lucide-react';

const DOC_SECTIONS = [
  {
    id: 'quickstart',
    num: '1',
    title: 'Quickstart Guide',
    icon: Terminal,
    content: (
      <div className="space-y-4">
        <p className="text-xs font-mono text-[#212121]/90 leading-relaxed">
          VoxQuest runs as a lightweight, background voice client. Follow these 5 steps to dictate anywhere:
        </p>
        <div className="space-y-2.5">
          {[
            { step: '01', title: 'Menu Bar Status', desc: 'A subtle VoxQuest indicator appears in your menu bar or system tray.' },
            { step: '02', title: 'Device Selection', desc: 'Confirm your active microphone in preferences (defaults to system input).' },
            { step: '03', title: 'Push-To-Talk', desc: 'Press & hold Control+Space (or Command+Shift+Space on macOS).' },
            { step: '04', title: 'Natural Speech', desc: 'Speak naturally without stopping to format. Release the key when finished.' },
            { step: '05', title: 'Instant Typing', desc: 'Refined, punctuated text is typed directly at your blinking cursor.' }
          ].map((item) => (
            <div key={item.step} className="p-3 bg-[#B8CBC3]/30 border-2 border-[#212121] flex items-start gap-3">
              <span className="font-pixel text-[10px] text-[#07514C] bg-[#DFDFD4] px-1.5 py-0.5 border border-[#212121]">{item.step}</span>
              <div>
                <strong className="text-xs text-[#212121] font-mono">{item.title}:</strong>
                <span className="text-xs text-[#212121]/80 font-mono ml-1.5">{item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    id: 'permissions',
    num: '2',
    title: 'System Permissions',
    icon: Shield,
    content: (
      <div className="space-y-4">
        <p className="text-xs font-mono text-[#212121]/90 leading-relaxed">
          Because VoxQuest types on your behalf into arbitrary applications, your operating system requires explicit user authorization:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 bg-[#B8CBC3]/30 border-2 border-[#212121] space-y-1.5">
            <div className="font-pixel text-[10px] text-[#07514C]">MACOS</div>
            <p className="text-xs font-mono text-[#212121]/80 leading-relaxed">
              Open <em>System Settings &gt; Privacy &amp; Security</em>. Enable <strong>Microphone</strong> and <strong>Accessibility</strong>.
            </p>
          </div>
          <div className="p-4 bg-[#B8CBC3]/30 border-2 border-[#212121] space-y-1.5">
            <div className="font-pixel text-[10px] text-[#07514C]">LINUX</div>
            <p className="text-xs font-mono text-[#212121]/80 leading-relaxed">
              Ensure <code>xdotool</code> and <code>xclip</code> are installed for X11, or <code>ydotool</code> for Wayland compositors.
            </p>
          </div>
          <div className="p-4 bg-[#B8CBC3]/30 border-2 border-[#212121] space-y-1.5">
            <div className="font-pixel text-[10px] text-[#07514C]">WINDOWS</div>
            <p className="text-xs font-mono text-[#212121]/80 leading-relaxed">
              Verify Microphone Privacy Settings allow desktop app access to recording devices.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'whisper',
    num: '3',
    title: 'Whisper Inference',
    icon: Mic,
    content: (
      <div className="space-y-4">
        <p className="text-xs font-mono text-[#212121]/90 leading-relaxed">
          Choose the speech recognition backend that matches your performance and hardware requirements:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-[#B8CBC3]/40 border-2 border-[#212121] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-[11px] text-[#07514C]">LOCAL WHISPER (OFFLINE)</span>
              <span className="arcade-badge bg-[#DA6C4C] text-white text-[7px]">RECOMMENDED</span>
            </div>
            <p className="text-xs font-mono text-[#212121]/80 leading-relaxed">
              Runs 100% locally on your CPU/GPU using <code>whisper.cpp</code> or ONNX. Zero packets sent over the network.
            </p>
            <div className="text-[10px] font-mono text-[#07514C]">Models: Tiny (75MB), Base (142MB), Small (466MB)</div>
          </div>
          <div className="p-4 bg-[#B8CBC3]/40 border-2 border-[#212121] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-[11px] text-[#07514C]">BYOK CLOUD ENDPOINT</span>
              <span className="arcade-badge bg-[#DDA44D] text-[#212121] text-[7px]">SELF-HOSTED</span>
            </div>
            <p className="text-xs font-mono text-[#212121]/80 leading-relaxed">
              Point to your private OpenAI Whisper-compliant endpoint, local Ollama, vLLM, or LocalAI cluster.
            </p>
            <div className="text-[10px] font-mono text-[#07514C]">Direct HTTPS &bull; Zero proxy retention</div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'dictionary',
    num: '4',
    title: 'Custom Lexicon & Rules',
    icon: FileText,
    content: (
      <div className="space-y-4">
        <p className="text-xs font-mono text-[#212121]/90 leading-relaxed">
          Teach VoxQuest specialized programming terminology, team member names, and project acronyms in your <code>~/.voxquest/preferences.json</code>:
        </p>
        <pre className="p-4 bg-[#212121] border-2 border-[#212121] text-xs font-mono overflow-x-auto text-[#DFDFD4]">
{`{
  "cleanupOptions": {
    "removeFillers": true,
    "autoCapitalize": true,
    "customDictionary": {
      "k8s": "Kubernetes",
      "pavan": "Pavan",
      "postgres": "PostgreSQL",
      "voxquest": "VoxQuest"
    }
  }
}`}
        </pre>
      </div>
    )
  },
  {
    id: 'troubleshooting',
    num: '5',
    title: 'Troubleshooting & FAQ',
    icon: AlertCircle,
    content: (
      <div className="space-y-3 text-xs font-mono text-[#212121]/90 leading-relaxed">
        <div className="p-3 bg-[#B8CBC3]/30 border-2 border-[#212121]">
          <strong>Q: Dictation records audio but text doesn't type into the active app?</strong>
          <p className="text-xs text-[#212121]/80 mt-1">Check that Accessibility permissions are granted. On macOS, restart the terminal/IDE if permissions were just assigned.</p>
        </div>
        <div className="p-3 bg-[#B8CBC3]/30 border-2 border-[#212121]">
          <strong>Q: How do I purge my dictation history?</strong>
          <p className="text-xs text-[#212121]/80 mt-1">Click the tray icon and select "Purge History", or delete <code>~/.voxquest/history.json</code> directly.</p>
        </div>
      </div>
    )
  }
];

export function InteractiveDocs() {
  const [activeTab, setActiveTab] = useState<string>('quickstart');

  const currentSection = DOC_SECTIONS.find(s => s.id === activeTab) || DOC_SECTIONS[0];
  const IconComponent = currentSection.icon;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
      {/* 1. Sticky Interactive Index Sidebar */}
      <div className="md:col-span-4 sticky top-28">
        <div className="arcade-panel p-5 bg-[#DFDFD4]/90 backdrop-blur-md">
          <div className="flex items-center justify-between border-b-2 border-[#212121] pb-3 mb-4">
            <h3 className="font-pixel text-[11px] text-[#07514C] uppercase tracking-wider">
              INDEX
            </h3>
            <span className="arcade-badge bg-[#07514C] text-[#DFDFD4] text-[8px]">
              {DOC_SECTIONS.length} SECTIONS
            </span>
          </div>

          <nav className="space-y-1.5" aria-label="Documentation sections">
            {DOC_SECTIONS.map((sec) => {
              const isSelected = activeTab === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveTab(sec.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-left border-2 transition-all ${
                    isSelected
                      ? 'bg-[#07514C] text-[#DFDFD4] border-[#212121] shadow-pixel-sm translate-x-1'
                      : 'bg-[#DFDFD4]/60 text-[#212121] border-transparent hover:border-[#212121] hover:bg-[#B8CBC3]/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 text-xs font-mono font-bold">
                    <span className={`w-2 h-2 ${isSelected ? 'bg-[#DDA44D]' : 'bg-[#07514C]'}`} />
                    <span>{sec.num}. {sec.title}</span>
                  </div>
                  {isSelected && <ChevronRight className="w-4 h-4 text-[#DDA44D]" />}
                </button>
              );
            })}
          </nav>

          <div className="mt-6 pt-4 border-t-2 border-[#212121] flex items-center justify-between text-[10px] font-mono text-[#212121]/70">
            <span>ACTIVE:</span>
            <span className="font-bold text-[#07514C] truncate">{currentSection.title}</span>
          </div>
        </div>
      </div>

      {/* 2. Focused Single-Panel Viewer (Eliminates excessive scrolling!) */}
      <div className="md:col-span-8">
        <div className="arcade-panel p-6 sm:p-8 bg-[#DFDFD4]/90 backdrop-blur-md min-h-[480px] flex flex-col justify-between">
          <div>
            {/* Header with breadcrumb and active indicator */}
            <div className="flex flex-wrap items-center justify-between border-b-2 border-[#212121] pb-4 mb-6 gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#07514C] border-2 border-[#212121]">
                  <IconComponent className="w-5 h-5 text-[#DDA44D]" />
                </div>
                <div>
                  <div className="text-[10px] font-pixel text-[#07514C]">SECTION 0{currentSection.num}</div>
                  <h2 className="font-pixel text-sm sm:text-base text-[#212121]">{currentSection.title}</h2>
                </div>
              </div>
              <span className="arcade-badge bg-[#DDA44D] text-[#212121] text-[8px]">
                INSPECTING
              </span>
            </div>

            {/* Dynamic Content */}
            <div className="pt-2">
              {currentSection.content}
            </div>
          </div>

          {/* Bottom Fast Navigation Bar between sections */}
          <div className="mt-8 pt-4 border-t-2 border-[#212121] flex items-center justify-between">
            <button
              onClick={() => {
                const curIdx = DOC_SECTIONS.findIndex(s => s.id === activeTab);
                if (curIdx > 0) setActiveTab(DOC_SECTIONS[curIdx - 1].id);
              }}
              disabled={activeTab === DOC_SECTIONS[0].id}
              className="arcade-btn arcade-btn-ghost text-[9px] py-2 px-3 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              &larr; PREVIOUS
            </button>

            <span className="text-[10px] font-pixel text-[#212121]">
              {currentSection.num} / {DOC_SECTIONS.length}
            </span>

            <button
              onClick={() => {
                const curIdx = DOC_SECTIONS.findIndex(s => s.id === activeTab);
                if (curIdx < DOC_SECTIONS.length - 1) setActiveTab(DOC_SECTIONS[curIdx + 1].id);
              }}
              disabled={activeTab === DOC_SECTIONS[DOC_SECTIONS.length - 1].id}
              className="arcade-btn arcade-btn-primary text-[9px] py-2 px-3 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              NEXT &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

