'use client';

import React, { useState } from 'react';
import { ArrowRight, Check, FileText, Code2, GraduationCap, Compass, Wand2 } from 'lucide-react';

export function WorkflowShowcase() {
  const [activeStep, setActiveStep] = useState<0 | 1 | 2>(0);

  const steps = [
    {
      title: '1. SPEAK',
      subtitle: 'Natural Voice Input',
      desc: 'Speak freely in any app with a quick push-to-talk shortcut. Brainstorm your thesis, dictate a git commit, or draft an email at the speed of thought without stopping to fix spelling.',
      icon: Compass,
      exampleRaw: '"Um, okay so basically I think we should rewrite the auth middleware and deploy it to PostgreSQL and Next.js by tomorrow."',
    },
    {
      title: '2. SHAPE',
      subtitle: 'Intelligent Voice Cleanup',
      desc: 'VoxQuest strips hesitation sounds ("um", "uh", "you know"), normalizes sentence punctuation, and preserves technical terminology and proper capitalization deterministically.',
      icon: Wand2,
      exampleClean: '"We should rewrite the auth middleware and deploy it to PostgreSQL and Next.js by tomorrow."',
    },
    {
      title: '3. CREATE',
      subtitle: 'Instant Active Cursor Paste',
      desc: 'Clean, formatted text is placed directly where your cursor is blinking in VS Code, Obsidian, Notion, Google Docs, or Terminal. No copying and pasting back and forth.',
      icon: Check,
      benefit: '3.5× faster than manual keyboard typing with zero cloud lock-in.',
    },
  ];

  return (
    <div className="arcade-panel p-6 sm:p-10 max-w-5xl mx-auto bg-[#DFDFD4]/85 backdrop-blur-md">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="arcade-badge bg-[#DDA44D] text-[#212121] mb-3">CONCEPTUAL PIPELINE</span>
        <h3 className="font-pixel text-xl sm:text-3xl text-[#212121]">
          SPEAK &rarr; SHAPE &rarr; CREATE
        </h3>
        <p className="font-mono text-xs sm:text-sm text-[#212121]/80 mt-2">
          How VoxQuest transforms rough, rapid thoughts into polished prose and code.
        </p>
      </div>

      {/* Stepped Interactive Workflow Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 items-stretch">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = activeStep === idx;
          return (
            <button
              key={step.title}
              onClick={() => setActiveStep(idx as 0 | 1 | 2)}
              className={`p-4 border-3 border-[#212121] text-left transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-[#07514C] text-[#DFDFD4] shadow-pixel'
                  : 'bg-[#B8CBC3]/40 text-[#212121] hover:bg-[#B8CBC3]/70 hover:shadow-pixel-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-pixel text-[11px] ${isActive ? 'text-[#DDA44D]' : 'text-[#07514C]'}`}>
                    {step.title}
                  </span>
                  <div className={`p-1 border border-[#212121] ${isActive ? 'bg-[#DDA44D]' : 'bg-[#DFDFD4]'}`}>
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#212121]' : 'text-[#07514C]'}`} />
                  </div>
                </div>
                <div className="font-mono font-bold text-xs leading-snug">
                  {step.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Step Details Panel */}
      <div className="border-3 border-[#212121] p-6 bg-[#053B37] text-[#DFDFD4] shadow-pixel-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b-2 border-[#212121]">
          <div>
            <div className="font-pixel text-xs sm:text-sm text-[#DDA44D]">
              {steps[activeStep].title} &mdash; {steps[activeStep].subtitle}
            </div>
            <p className="font-mono text-xs text-[#B8CBC3] mt-1.5 max-w-xl leading-relaxed">
              {steps[activeStep].desc}
            </p>
          </div>
          <div className="arcade-badge bg-[#DA6C4C] text-white text-[9px] flex-shrink-0">
            STAGE 0{activeStep + 1}
          </div>
        </div>

        {/* Live Visual Comparison Block */}
        <div className="mt-6 font-mono text-xs space-y-3">
          {activeStep === 0 && (
            <div className="p-4 bg-[#212121] border border-[#212121]">
              <div className="text-[10px] font-pixel text-[#DA6C4C] mb-1">VOICE CAPTURE RAW STREAM:</div>
              <p className="text-[#DFDFD4] italic">{steps[0].exampleRaw}</p>
            </div>
          )}

          {activeStep === 1 && (
            <div className="space-y-2">
              <div className="p-3 bg-[#212121] border border-[#212121] text-[#DA6C4C] line-through">
                "Um, okay so basically I think we should rewrite..."
              </div>
              <div className="p-3 bg-[#07514C] border-2 border-[#DDA44D] text-[#DFDFD4] font-bold flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-[#DDA44D] flex-shrink-0" />
                <span>{steps[1].exampleClean}</span>
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="p-4 bg-[#07514C] border-2 border-[#DDA44D] text-[#DFDFD4] space-y-2">
              <div className="text-[10px] font-pixel text-[#DDA44D]">DIRECT INSERTION:</div>
              <p className="font-bold text-sm">
                "We should rewrite the auth middleware and deploy it to PostgreSQL and Next.js by tomorrow."
                <span className="inline-block w-2 h-4 bg-[#DDA44D] ml-1 animate-pulse align-middle" />
              </p>
              <div className="text-[11px] text-[#B8CBC3] pt-2 border-t border-[#0F5B57]">
                {steps[2].benefit}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
