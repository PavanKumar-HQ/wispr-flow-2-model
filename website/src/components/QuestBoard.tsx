'use client';

import React from 'react';
import { VOXQUEST_QUESTS } from '@/lib/constants';
import { Trophy, Scroll, Compass, Zap, Shield, Award, Wand2, Star, CheckCircle2 } from 'lucide-react';

export function QuestBoard() {
  return (
    <section id="quests" className="py-20 relative scroll-mt-24 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Quest Board Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DDA44D]/20 text-[#DDA44D] border border-[#DDA44D]/40 font-mono text-xs font-bold mb-4 uppercase">
            <Trophy className="w-4 h-4 text-[#DDA44D]" />
            <span>PROGRESSION &amp; MASTERY</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight uppercase">
            VoxQuest Quest Board
          </h2>
          <p className="mt-4 text-sm text-white/80 leading-relaxed max-w-2xl mx-auto font-sans">
            Hands-on dictation milestones. All progress is calculated locally from actual speech events on your own machine.
          </p>

          {/* Player Level Banner */}
          <div className="mt-8 max-w-md mx-auto p-4 rounded-xl border border-white/20 flex items-center justify-between text-xs font-mono bg-black/40 backdrop-blur-md text-white shadow-xl">
            <div className="flex items-center gap-2 text-[#DDA44D] font-bold">
              <Compass className="w-4 h-4 text-[#DA6C4C]" />
              <span>TIER: NOVICE SCRIBE</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/80">RANK #1</span>
              <span className="px-2 py-0.5 rounded-full bg-[#DA6C4C] text-white text-[9px] font-bold">100% LOCAL</span>
            </div>
          </div>
        </div>

        {/* Quest Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {VOXQUEST_QUESTS.map((quest, index) => (
            <div
              key={quest.id}
              className="arcade-panel arcade-panel-hoverable p-6 flex flex-col justify-between relative group bg-[#DFDFD4]/95 backdrop-blur-md"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#07514C] text-[#DFDFD4] uppercase">
                      {quest.category}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#DDA44D] text-[#212121]">
                      +{quest.xpReward} XP
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#212121]/50">
                    #0{index + 1}
                  </span>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl border border-[#212121]/20 bg-[#B8CBC3]/60 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    {quest.id === 'first-words' && <Zap className="w-5 h-5 text-[#07514C]" />}
                    {quest.id === 'clean-slate' && <Wand2 className="w-5 h-5 text-[#BA8330]" />}
                    {quest.id === 'custom-vocab' && <Scroll className="w-5 h-5 text-[#DA6C4C]" />}
                    {quest.id === 'deep-flow' && <Zap className="w-5 h-5 text-[#DA6C4C]" />}
                    {quest.id === 'offline-scholar' && <Shield className="w-5 h-5 text-[#07514C]" />}
                    {quest.id === 'source-cartographer' && <Compass className="w-5 h-5 text-[#07514C]" />}
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-[#212121] leading-tight font-sans">
                      {quest.title}
                    </h3>
                    <p className="text-xs text-[#212121]/80 mt-1.5 leading-relaxed font-sans">
                      {quest.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#212121]/15">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[#212121] mb-2">
                  <span>PROGRESS: 1</span>
                  <span>TARGET: {quest.targetCount}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#212121]/15 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#DDA44D] transition-all"
                    style={{ width: `${Math.min(100, (1 / quest.targetCount) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Open-Source Constitution Banner */}
        <div className="mt-12 p-6 rounded-2xl border border-white/20 bg-gradient-to-r from-[#DDA44D]/90 to-[#C99039]/90 text-[#212121] max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-5 shadow-2xl backdrop-blur-md">
          <div className="p-3 bg-white rounded-xl shadow-md shrink-0">
            <Award className="w-8 h-8 text-[#07514C]" />
          </div>
          <div className="space-y-1 font-sans">
            <div className="font-bold text-sm text-[#212121] uppercase tracking-wider font-mono">
              THE SOVEREIGN PROMISE
            </div>
            <p className="text-xs text-[#212121] leading-relaxed font-medium">
              No paywalls, no login friction, no cloud surveillance, and no audio training feeds. Quests are fun visual badges designed to help you master on-device speech typing.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
