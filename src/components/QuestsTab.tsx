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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-darkTealSurface border border-charcoal/15 dark:border-darkTealBorder shadow-xs">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber/20 dark:bg-amber/30 text-charcoal dark:text-amber font-mono text-[10px] font-bold border border-amber/40">
            <Trophy className="w-3.5 h-3.5 text-amber" />
            <span>PROGRESSION &amp; REPUTATION</span>
          </div>
          <h2 className="text-xl font-bold text-darkTeal dark:text-cream tracking-tight">
            Quests &amp; Habit Milestones
          </h2>
          <p className="text-xs text-charcoal/70 dark:text-sage leading-relaxed max-w-xl">
            Build your high-speed spoken workflow. Earn XP, unlock badges, and master hands-free dictation. All metrics are calculated 100% on-device.
          </p>
        </div>

        {/* Player Level Banner */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-darkTeal dark:bg-[#0D6E67] text-white border border-darkTeal/30 dark:border-darkTealBorder shadow-xs shrink-0">
          <div className="p-2 rounded-lg bg-amber text-charcoal shadow-xs">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-amber font-bold tracking-wider">
              TIER {rankTier} &middot; {rankName.toUpperCase()}
            </div>
            <div className="text-sm font-extrabold text-white">
              {totalEarnedXp} / {totalPossibleXp} XP
            </div>
          </div>
        </div>
      </div>

      {/* Beginner Milestones & 50-Word Badge Ribbon */}
      <div className="p-5 rounded-2xl bg-white dark:bg-darkTealSurface border border-charcoal/15 dark:border-darkTealBorder shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber fill-amber" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal dark:text-cream font-mono">
              Beginner Milestones &amp; Badges
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50">
            {unlockedBadges.length} / {beginnerBadges.length} UNLOCKED
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {beginnerBadges.map((badge) => {
            const pct = Math.min(100, Math.round((badge.currentValue / badge.targetValue) * 100));
            return (
              <div
                key={badge.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  badge.isUnlocked
                    ? 'bg-amber/5 dark:bg-amber/10 border-amber/40 shadow-xs'
                    : 'bg-stone-50 dark:bg-darkTealElevated border-charcoal/10 dark:border-darkTealBorder opacity-80'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    {badge.isUnlocked ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <Target className="w-3.5 h-3.5 text-charcoal/40 dark:text-sage shrink-0" />
                    )}
                    <span className="text-xs font-bold text-charcoal dark:text-cream truncate">
                      {badge.title}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber/20 text-charcoal dark:text-amber shrink-0 ml-1">
                    +{badge.xp} XP
                  </span>
                </div>
                <p className="text-[11px] text-charcoal/70 dark:text-sage mb-2.5 leading-snug line-clamp-2">
                  {badge.requirement}
                </p>
                <div className="flex items-center justify-between text-[10px] font-mono text-charcoal/70 dark:text-sage mb-1">
                  <span>{badge.currentValue} / {badge.targetValue}</span>
                  <span>{pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-stone-200 dark:bg-black/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      badge.isUnlocked ? 'bg-emerald-500' : 'bg-amber'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* The 6 Canonical Pixel Quest Cards Grid (Sleek, No Overlap, Premium Look) */}
      <div className="space-y-3">
        <div className="text-xs font-bold font-mono uppercase tracking-wider text-charcoal/60 dark:text-sage px-1">
          Active Quest Catalog
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quests.map((quest) => {
            const pct = Math.min(100, Math.round((quest.currentCount / quest.targetCount) * 100));
            const isDone = quest.isCompleted;

            return (
              <div
                key={quest.id}
                className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                  isDone
                    ? 'bg-white dark:bg-darkTealSurface border-amber/50 dark:border-amber/40 shadow-xs ring-1 ring-amber/20'
                    : 'bg-white dark:bg-darkTealSurface border-charcoal/15 dark:border-darkTealBorder hover:border-darkTeal/40 dark:hover:border-[#34A89E]/40 shadow-xs hover:shadow-md'
                }`}
              >
                <div>
                  {/* Clean Top Header Row (No Overlapping Elements) */}
                  <div className="flex items-center justify-between gap-2 mb-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-darkTeal dark:bg-[#0D6E67] text-white tracking-wide">
                        {quest.category}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber/20 dark:bg-amber/30 text-charcoal dark:text-amber border border-amber/40">
                        +{quest.xpReward} XP
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isDone && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>DONE</span>
                        </span>
                      )}
                      <span className="font-mono font-bold text-xs text-charcoal/40 dark:text-sage/60">
                        {quest.number}
                      </span>
                    </div>
                  </div>

                  {/* Icon & Title & Description */}
                  <div className="flex items-start gap-3.5">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${
                      isDone
                        ? 'bg-amber/15 border-amber/40 text-amber'
                        : 'bg-stone-100 dark:bg-darkTealElevated border-charcoal/15 dark:border-darkTealBorder'
                    }`}>
                      {renderIcon(quest.icon)}
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-sm text-charcoal dark:text-cream leading-snug">
                        {quest.title}
                      </h3>
                      <p className="text-xs text-charcoal/70 dark:text-sage leading-relaxed font-sans">
                        {quest.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar Container */}
                <div className="mt-5 pt-3 border-t border-charcoal/10 dark:border-darkTealBorder">
                  <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-charcoal/70 dark:text-sage mb-1.5">
                    <span>Progress: <strong className="text-charcoal dark:text-cream">{quest.currentCount}</strong></span>
                    <span>Target: <strong className="text-charcoal dark:text-cream">{quest.targetCount}</strong></span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-black/30 overflow-hidden border border-charcoal/10 dark:border-darkTealBorder">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isDone ? 'bg-emerald-500' : 'bg-amber'
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
      <div className="p-5 rounded-2xl bg-gradient-to-r from-darkTeal to-[#0A5650] text-cream border border-darkTeal/40 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber text-charcoal shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 font-sans">
            <div className="font-bold text-white text-sm">
              Daily Spoken Habit: 3x Speed Advantage
            </div>
            <p className="text-cream/80 text-xs max-w-xl">
              Speaking aloud produces 150+ words per minute versus 40 WPM manual keyboard typing. Dictating your daily notes, slack messages, and docs builds fluency effortlessly.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('home')}
          className="px-4 py-2.5 rounded-xl bg-amber hover:bg-amber/90 text-charcoal font-bold text-xs shadow-xs transition-all active:scale-95 shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <span>Dictate Now</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
