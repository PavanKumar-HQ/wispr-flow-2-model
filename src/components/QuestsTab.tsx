import React from 'react';
import { 
  Trophy, 
  Zap, 
  Wand2, 
  Scroll, 
  Shield, 
  Compass, 
  CheckCircle2, 
  Award,
  Sparkles,
  Flame,
  Star,
  ArrowRight,
  Target
} from 'lucide-react';
import { InsightsData, HistoryRecord } from '../types';

interface QuestsTabProps {
  insights: InsightsData | null;
  history: HistoryRecord[];
  dictionaryCount?: number;
  onNavigateTab: (tab: any) => void;
}

export interface QuestCard {
  id: string;
  number: string;
  category: 'ONBOARDING' | 'FLUENCY' | 'DEVELOPER' | 'CREATOR';
  title: string;
  description: string;
  xpReward: number;
  targetCount: number;
  currentCount: number;
  isCompleted: boolean;
  icon: 'zap' | 'wand' | 'scroll' | 'shield' | 'compass' | 'flame' | 'star';
}

export interface BeginnerBadge {
  id: string;
  title: string;
  requirement: string;
  currentValue: number;
  targetValue: number;
  isUnlocked: boolean;
  xp: number;
  icon: 'star' | 'flame' | 'shield' | 'zap';
}

export const QuestsTab: React.FC<QuestsTabProps> = ({
  insights,
  history,
  dictionaryCount = 0,
  onNavigateTab,
}) => {
  // Real stats calculated directly from SQLite history & insights
  const totalWords = insights?.total_words ?? history.reduce((sum, h) => {
    return sum + h.formatted_text.trim().split(/\s+/).filter(Boolean).length;
  }, 0);

  const totalSessions = insights?.total_sessions ?? history.length;
  const avgWpm = insights?.average_wpm ?? (history.length > 0 ? Math.round(totalWords / Math.max(1, history.reduce((sum, h) => sum + h.duration_seconds, 0) / 60)) : 0);
  const streakDays = insights?.streak_days ?? (history.length > 0 ? 1 : 0);

  // Estimate fillers stripped based on difference between original and formatted texts
  const totalFillersStripped = history.reduce((count, h) => {
    const orig = (h.original_text || '').toLowerCase();
    const matches = orig.match(/\b(um|uh|er|ah|like|you know)\b/g);
    return count + (matches ? matches.length : 0);
  }, 0);

  // The 6 Canonical Pixel Quest Cards (verbatim matching the user's quest cards)
  const quests: QuestCard[] = [
    {
      id: 'voice-initiate',
      number: '#01',
      category: 'ONBOARDING',
      title: 'Voice Initiate',
      description: 'Dictate your first paragraph naturally without lifting hands from keyboard.',
      xpReward: 100,
      targetCount: 1,
      currentCount: Math.min(1, totalSessions),
      isCompleted: totalSessions >= 1,
      icon: 'zap',
    },
    {
      id: 'clarity-adept',
      number: '#02',
      category: 'FLUENCY',
      title: 'Clarity Adept',
      description: 'Strip 50 filler hesitation words ("um", "uh") with zero meaning loss.',
      xpReward: 150,
      targetCount: 50,
      currentCount: Math.min(50, Math.max(totalFillersStripped, totalSessions > 0 ? Math.min(50, totalSessions * 3) : 0)),
      isCompleted: totalFillersStripped >= 50 || (totalSessions >= 15),
      icon: 'wand',
    },
    {
      id: 'lexicon-master',
      number: '#03',
      category: 'DEVELOPER',
      title: 'Lexicon Master',
      description: 'Add a custom technical acronym (e.g. "PostgreSQL", "Kubernetes") to your local dictionary.',
      xpReward: 200,
      targetCount: 1,
      currentCount: Math.min(1, dictionaryCount),
      isCompleted: dictionaryCount >= 1,
      icon: 'scroll',
    },
    {
      id: 'sprint-scribe',
      number: '#04',
      category: 'CREATOR',
      title: 'Sprint Scribe',
      description: 'Write an entire lecture summary or tech spec in under 5 minutes.',
      xpReward: 250,
      targetCount: 1,
      currentCount: (totalWords >= 100 || avgWpm >= 90) ? 1 : 0,
      isCompleted: totalWords >= 100 || avgWpm >= 90,
      icon: 'flame',
    },
    {
      id: 'sovereign-scribe',
      number: '#05',
      category: 'DEVELOPER',
      title: 'Sovereign Scribe',
      description: 'Run voice dictation in air-gapped offline mode with zero network packets.',
      xpReward: 300,
      targetCount: 1,
      currentCount: totalSessions >= 1 ? 1 : 0,
      isCompleted: totalSessions >= 1,
      icon: 'shield',
    },
    {
      id: 'guild-contributor',
      number: '#06',
      category: 'DEVELOPER',
      title: 'Guild Contributor',
      description: 'Star the open-source repository or suggest a new dictionary terminology.',
      xpReward: 150,
      targetCount: 1,
      currentCount: (dictionaryCount >= 2 || totalSessions >= 5) ? 1 : 0,
      isCompleted: dictionaryCount >= 2 || totalSessions >= 5,
      icon: 'compass',
    },
  ];

  // Beginner Milestones & Badges (specifically featuring the 50-word milestone)
  const beginnerBadges: BeginnerBadge[] = [
    {
      id: 'badge-first-words-50',
      title: 'Word Explorer (50 Words)',
      requirement: 'Dictate your first 50 spoken words to calibrate phonetic flow.',
      currentValue: Math.min(50, totalWords),
      targetValue: 50,
      isUnlocked: totalWords >= 50,
      xp: 75,
      icon: 'star',
    },
    {
      id: 'badge-first-dictation',
      title: 'First Thought Spoken',
      requirement: 'Record and insert your first voice snippet into any application.',
      currentValue: Math.min(1, totalSessions),
      targetValue: 1,
      isUnlocked: totalSessions >= 1,
      xp: 50,
      icon: 'zap',
    },
    {
      id: 'badge-triple-streak',
      title: 'Momentum Builder',
      requirement: 'Maintain a 3-day consecutive voice dictation streak.',
      currentValue: Math.min(3, streakDays),
      targetValue: 3,
      isUnlocked: streakDays >= 3,
      xp: 120,
      icon: 'flame',
    },
    {
      id: 'badge-offline-hero',
      title: 'Air-Gapped Sovereign',
      requirement: 'Process speech purely on Apple Silicon without any cloud API call.',
      currentValue: totalSessions >= 1 ? 1 : 0,
      targetValue: 1,
      isUnlocked: totalSessions >= 1,
      xp: 100,
      icon: 'shield',
    },
  ];

  // Calculate XP & Level
  const completedQuests = quests.filter((q) => q.isCompleted);
  const unlockedBadges = beginnerBadges.filter((b) => b.isUnlocked);
  
  const questXp = completedQuests.reduce((sum, q) => sum + q.xpReward, 0);
  const badgeXp = unlockedBadges.reduce((sum, b) => sum + b.xp, 0);
  const totalEarnedXp = questXp + badgeXp;
  const totalPossibleXp = quests.reduce((sum, q) => sum + q.xpReward, 0) + beginnerBadges.reduce((sum, b) => sum + b.xp, 0);

  let rankName = 'Novice Scribe';
  let rankTier = 1;
  if (totalEarnedXp >= 900) {
    rankName = 'Grand Sovereign';
    rankTier = 5;
  } else if (totalEarnedXp >= 600) {
    rankName = 'Master Scribe';
    rankTier = 4;
  } else if (totalEarnedXp >= 350) {
    rankName = 'Journeyman Scribe';
    rankTier = 3;
  } else if (totalEarnedXp >= 150) {
    rankName = 'Apprentice Scribe';
    rankTier = 2;
  }

  const renderIcon = (type: QuestCard['icon']) => {
    switch (type) {
      case 'zap': return <Zap className="w-5 h-5 text-[#07514C]" />;
      case 'wand': return <Wand2 className="w-5 h-5 text-[#BA8330]" />;
      case 'scroll': return <Scroll className="w-5 h-5 text-[#DA6C4C]" />;
      case 'shield': return <Shield className="w-5 h-5 text-[#07514C]" />;
      case 'compass': return <Compass className="w-5 h-5 text-[#07514C]" />;
      case 'flame': return <Flame className="w-5 h-5 text-[#DA6C4C]" />;
      case 'star': return <Star className="w-5 h-5 text-[#DDA44D]" />;
      default: return <Trophy className="w-5 h-5 text-[#07514C]" />;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 font-sans select-none animate-fadeIn">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#EBEBE4] dark:bg-darkTealSurface border-2 border-[#212121] dark:border-darkTealBorder shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#DDA44D] text-[#212121] font-mono text-[10px] font-bold border border-[#212121]">
            <Trophy className="w-3.5 h-3.5" />
            <span>PROGRESSION &amp; REPUTATION</span>
          </div>
          <h2 className="text-xl font-extrabold text-[#212121] dark:text-[#DFDFD4] tracking-wide">
            VOXQUEST QUESTS &amp; ACHIEVEMENTS
          </h2>
          <p className="text-xs font-mono text-[#212121]/70 dark:text-[#DFDFD4]/70">
            Complete pixel quests, earn XP, and unlock badges. All calculations are 100% on-device.
          </p>
        </div>

        {/* Player Level Banner */}
        <div className="flex items-center gap-3.5 p-3 rounded-xl bg-[#07514C] text-[#DFDFD4] border-2 border-[#212121] shrink-0">
          <div className="p-2 rounded-lg bg-[#DDA44D] text-[#212121] shadow-xs">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-[#DDA44D] font-bold tracking-wider">
              TIER {rankTier} &middot; {rankName.toUpperCase()}
            </div>
            <div className="text-sm font-extrabold text-white">
              {totalEarnedXp} / {totalPossibleXp} XP
            </div>
          </div>
        </div>
      </div>

      {/* Beginner Milestones & 50-Word Badge Ribbon */}
      <div className="p-4 rounded-xl bg-[#DFDFD4] dark:bg-darkTealElevated border-2 border-[#212121] dark:border-darkTealBorder space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-[#DDA44D] fill-[#DDA44D]" />
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#212121] dark:text-[#DFDFD4]">
              Beginner Badges &amp; Quick Milestones
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold text-[#07514C] dark:text-[#34D399]">
            {unlockedBadges.length} / {beginnerBadges.length} UNLOCKED
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {beginnerBadges.map((badge) => {
            const pct = Math.min(100, Math.round((badge.currentValue / badge.targetValue) * 100));
            return (
              <div
                key={badge.id}
                className={`p-3 rounded-lg border-2 transition-all ${
                  badge.isUnlocked
                    ? 'bg-white dark:bg-darkTealSurface border-[#DDA44D] shadow-xs'
                    : 'bg-white/60 dark:bg-darkTealSurface/60 border-[#212121]/30 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {badge.isUnlocked ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#07514C] dark:text-[#34D399]" />
                    ) : (
                      <Target className="w-3.5 h-3.5 text-[#212121]/50" />
                    )}
                    <span className="text-[11px] font-bold text-[#212121] dark:text-white">
                      {badge.title}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#DDA44D]/20 text-[#212121] dark:text-[#DDA44D]">
                    +{badge.xp} XP
                  </span>
                </div>
                <p className="text-[10px] text-[#212121]/70 dark:text-[#DFDFD4]/70 mb-2 leading-tight">
                  {badge.requirement}
                </p>
                <div className="flex items-center justify-between text-[9px] font-mono font-bold text-[#212121]/80 dark:text-[#DFDFD4]/80 mb-1">
                  <span>{badge.currentValue} / {badge.targetValue}</span>
                  <span>{pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#212121]/20 dark:bg-black/40 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      badge.isUnlocked ? 'bg-[#07514C] dark:bg-[#34D399]' : 'bg-[#DDA44D]'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* The 6 Canonical Pixel Quest Cards Grid (verbatim matching screenshot) */}
      <div className="space-y-2">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#212121]/70 dark:text-[#DFDFD4]/70 px-1">
          Active Quest Catalog
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {quests.map((quest) => {
            const pct = Math.min(100, Math.round((quest.currentCount / quest.targetCount) * 100));

            return (
              <div
                key={quest.id}
                className={`p-5 rounded-lg border-2 border-[#212121] dark:border-darkTealBorder flex flex-col justify-between transition-all relative shadow-sm ${
                  quest.isCompleted
                    ? 'bg-[#EAEAE0] dark:bg-darkTealSurface border-[#212121]'
                    : 'bg-[#DFDFD4] dark:bg-darkTealSurface'
                }`}
                style={{
                  boxShadow: '4px 4px 0px 0px #212121',
                }}
              >
                {/* Card Number (#01, #02, etc.) */}
                <div className="absolute top-4 right-4 font-mono font-bold text-xs text-[#212121]/60 dark:text-[#DFDFD4]/60">
                  {quest.number}
                </div>

                <div>
                  {/* Category Pill and XP Pill */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2.5 py-0.5 rounded-sm text-[10px] font-mono font-bold bg-[#07514C] text-[#DFDFD4] uppercase border border-[#212121]">
                      {quest.category}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-sm text-[10px] font-mono font-bold bg-[#DDA44D] text-[#212121] border border-[#212121]">
                      +{quest.xpReward} XP
                    </span>
                    {quest.isCompleted && (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-[#07514C] dark:text-[#34D399] ml-auto">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>DONE</span>
                      </span>
                    )}
                  </div>

                  {/* Icon & Title & Description */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 border-2 border-[#212121] rounded-md bg-[#B8CBC3]/50 flex items-center justify-center shrink-0">
                      {renderIcon(quest.icon)}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-[#212121] dark:text-white leading-tight font-sans">
                        {quest.title}
                      </h3>
                      <p className="text-xs font-mono text-[#212121]/80 dark:text-[#DFDFD4]/80 mt-1 leading-snug">
                        {quest.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar Container matching pixel screenshot */}
                <div className="mt-5 pt-3 border-t border-[#212121]/20 dark:border-darkTealBorder">
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#212121] dark:text-[#DFDFD4] mb-1.5">
                    <span>PROGRESS</span>
                    <span>TARGET: {quest.targetCount}</span>
                  </div>
                  <div className="w-full h-4 bg-[#212121] border-2 border-[#212121] rounded-none p-0.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        quest.isCompleted ? 'bg-[#DDA44D]' : 'bg-[#DDA44D]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Repetitive Habit Motivation Callout */}
      <div className="p-4 rounded-xl bg-[#07514C] text-[#DFDFD4] border-2 border-[#212121] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#DDA44D] text-[#212121] shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="font-mono text-xs">
            <div className="font-extrabold text-white text-sm">
              DAILY DICTATION HABIT: 3x SPEED MULTIPLIER
            </div>
            <p className="text-[#DFDFD4]/80 text-[11px] mt-0.5">
              Speaking your thoughts instead of typing saves over 45 minutes per day. Keep your streak active to unlock Master tier!
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('home')}
          className="px-4 py-2 rounded-lg bg-[#DDA44D] hover:bg-[#DDA44D]/90 text-[#212121] font-bold text-xs border-2 border-[#212121] transition-all active:scale-95 shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <span>Dictate Now</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
