'use client';

import React from 'react';
import { VOXQUEST_QUESTS, Quest } from '@/lib/constants';
import { Trophy, Scroll, Compass, Zap, Shield, Award, Wand2 } from 'lucide-react';

export function QuestBoard() {
  return (
    <section id="quests" className="py-20 relative scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Quest Board Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 arcade-badge bg-[#DDA44D] text-[#212121] mb-4">
            <Trophy className="w-4 h-4 text-[#212121]" />
            <span>PROGRESSION &amp; MASTERY</span>
          </div>
          <h2 className="font-pixel text-2xl sm:text-4xl text-[#DFDFD4] tracking-wide uppercase drop-shadow-[4px_4px_0px_#212121]">
            VOXQUEST QUEST BOARD
          </h2>
          <p className="mt-4 text-xs sm:text-sm font-mono text-[#DFDFD4] leading-relaxed max-w-2xl mx-auto drop-shadow-[2px_2px_0px_#212121]">
            Hands-on dictation milestones. All progress is calculated locally from actual events on your machine.
          </p>

          {/* Player Level Banner */}
          <div className="mt-8 max-w-md mx-auto arcade-panel-dark p-4 flex items-center justify-between text-xs font-pixel bg-[#0F5B57]/70 backdrop-blur-md">
            <div className="flex items-center gap-2 text-[#DDA44D]">
              <Compass className="w-4 h-4 text-[#DA6C4C]" />
              <span>TIER: NOVICE SCRIBE</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#DFDFD4]">RANK #1</span>
              <span className="arcade-badge bg-[#DA6C4C] text-white text-[8px]">LOCAL</span>
            </div>
          </div>
        </div>

        {/* Quest Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {VOXQUEST_QUESTS.map((quest, index) => (
            <div
              key={quest.id}
              className="arcade-panel arcade-panel-hoverable p-6 flex flex-col justify-between relative group bg-[#DFDFD4]/85 backdrop-blur-md"
            >
              <div className="absolute top-3 right-3 font-pixel text-[9px] text-[#212121]/50">
                #0{index + 1}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="arcade-badge bg-[#07514C] text-[#DFDFD4] text-[8px]">
                    {quest.category}
                  </span>
                  <span className="arcade-badge bg-[#DDA44D] text-[#212121] text-[8px]">
                    +{quest.xpReward} XP
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 border-3 border-[#212121] bg-[#B8CBC3]/90 flex items-center justify-center flex-shrink-0 shadow-pixel-sm group-hover:rotate-6 transition-transform">
                    {quest.id === 'first-words' && <Zap className="w-6 h-6 text-[#07514C]" />}
                    {quest.id === 'clean-slate' && <Wand2 className="w-6 h-6 text-[#BA8330]" />}
                    {quest.id === 'custom-vocab' && <Scroll className="w-6 h-6 text-[#DA6C4C]" />}
                    {quest.id === 'deep-flow' && <Zap className="w-6 h-6 text-[#DA6C4C]" />}
                    {quest.id === 'offline-scholar' && <Shield className="w-6 h-6 text-[#07514C]" />}
                    {quest.id === 'source-cartographer' && <Compass className="w-6 h-6 text-[#07514C]" />}
                  </div>

                  <div>
                    <h3 className="font-pixel text-xs text-[#212121] leading-tight">
                      {quest.title}
                    </h3>
                    <p className="text-xs font-mono text-[#212121]/90 mt-2 leading-relaxed">
                      {quest.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t-2 border-[#212121]">
                <div className="flex items-center justify-between text-[9px] font-pixel text-[#212121] mb-2">
                  <span>PROGRESS</span>
                  <span>TARGET: {quest.targetCount}</span>
                </div>
                <div className="arcade-xp-container bg-[#212121]/90">
                  <div
                    className="arcade-xp-fill"
                    style={{ width: `${Math.min(100, (1 / quest.targetCount) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Constitution Banner */}
        <div className="mt-12 arcade-panel-amber p-6 text-xs text-[#212121] max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-5 bg-[#DDA44D]/90 backdrop-blur-md">
          <div className="p-3 bg-[#DFDFD4] border-2 border-[#212121] shadow-pixel-sm flex-shrink-0">
            <Award className="w-8 h-8 text-[#07514C]" />
          </div>
          <div className="space-y-1 font-mono">
            <div className="font-pixel text-xs text-[#212121]">THE OPEN-SOURCE CONSTITUTION</div>
            <p className="text-xs text-[#212121] leading-relaxed font-bold">
              No paywalls, no login friction, no commercial micro-transactions, and no audio surveillance. Quests are fun visual achievements designed to explore your own device's capabilities.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
