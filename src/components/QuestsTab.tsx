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
  ArrowRight
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

  // Beginner Milestones & Badges
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
      case 'zap': return <Zap className="w-5 h-5 text-[#07514C] dark:text-[#DFDFD4]" />;
      case 'wand': return <Wand2 className="w-5 h-5 text-[#DDA44D] dark:text-[#DDA44D]" />;
      case 'scroll': return <Scroll className="w-5 h-5 text-[#DA6C4C] dark:text-[#DA6C4C]" />;
      case 'shield': return <Shield className="w-5 h-5 text-[#07514C] dark:text-[#DFDFD4]" />;
      case 'compass': return <Compass className="w-5 h-5 text-[#07514C] dark:text-[#DFDFD4]" />;
      case 'flame': return <Flame className="w-5 h-5 text-[#DA6C4C] dark:text-[#DA6C4C]" />;
      case 'star': return <Star className="w-5 h-5 text-[#DDA44D] dark:text-[#DDA44D]" />;
      default: return <Trophy className="w-5 h-5 text-[#07514C] dark:text-[#DFDFD4]" />;
    }
  };

  return (
    <div className="space-y-7 max-w-5xl mx-auto pb-16 font-sans select-none animate-fadeIn">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#DFDFD4]/60 dark:bg-darkTealSurface border-2 border-charcoal shadow-[4px_4px_0px_#212121]">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm bg-[#07514C] text-[#DFDFD4] font-mono text-[10px] font-bold border border-charcoal">
            <Trophy className="w-3.5 h-3.5 text-[#DDA44D]" />
            <span>SOVEREIGN PROGRESSION &amp; REPUTATION</span>
          </div>
          <h2 className="text-2xl font-bold text-[#07514C] dark:text-cream tracking-tight">
            Quests &amp; Habit Badges
          </h2>
          <p className="text-xs text-charcoal/80 dark:text-sage leading-relaxed max-w-xl">
            Build your high-speed spoken workflow. Earn XP, unlock milestone badges, and master hands-free voice dictation 100% on-device.
          </p>
        </div>

        {/* Player Level Banner */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-[#07514C] text-white border-2 border-charcoal shadow-[3px_3px_0px_#212121] shrink-0">
          <div className="p-2 rounded-lg bg-[#DDA44D] text-[#212121] border border-charcoal shadow-xs">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-[#DDA44D] font-bold tracking-wider">
              TIER {rankTier} &middot; {rankName.toUpperCase()}
            </div>
            <div className="text-sm font-extrabold font-mono text-white">
              {totalEarnedXp} / {totalPossibleXp} XP
            </div>
          </div>
        </div>
      </div>

      {/* Beginner Milestones & 50-Word Badge Ribbon */}
      <div className="p-5 rounded-2xl bg-[#ECECE5] dark:bg-darkTealSurface border-2 border-charcoal shadow-[4px_4px_0px_#212121] space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-[#DDA44D] fill-[#DDA44D]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal dark:text-cream">
              Beginner Milestones (e.g. First 50 Words)
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-sm bg-[#07514C] text-[#DFDFD4] border border-charcoal">
            {unlockedBadges.length} / {beginnerBadges.length} UNLOCKED
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {beginnerBadges.map((badge) => {
            const pct = Math.min(100, Math.round((badge.currentValue / badge.targetValue) * 100));
            return (
              <div
                key={badge.id}
                className={`p-3.5 rounded-xl border-2 transition-all ${
                  badge.isUnlocked
                    ? 'bg-[#DFDFD4] dark:bg-darkTealElevated border-charcoal shadow-[3px_3px_0px_#07514C]'
                    : 'bg-[#ECECE5]/80 dark:bg-darkTealSurface border-charcoal/40 opacity-85'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    {badge.isUnlocked ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#07514C] dark:text-[#DDA44D] shrink-0" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-charcoal/30 shrink-0" />
                    )}
                    <span className="text-xs font-bold text-charcoal dark:text-cream truncate">
                      {badge.title}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm bg-[#DDA44D] text-[#212121] border border-charcoal shrink-0 ml-1">
                    +{badge.xp} XP
                  </span>
                </div>
                <p className="text-[11px] text-charcoal/80 dark:text-sage mb-2.5 leading-snug line-clamp-2">
                  {badge.requirement}
                </p>
                <div className="flex items-center justify-between text-[10px] font-mono text-charcoal/70 dark:text-sage mb-1">
                  <span>{badge.currentValue} / {badge.targetValue}</span>
                  <span>{pct}%</span>
                </div>
                {/* Retro Segmented Bar */}
                <div className="w-full h-3 border border-charcoal bg-[#212121] p-0.5 overflow-hidden">
                  <div
                    className="h-full transition-all duration-500 bg-[#DDA44D] bg-[linear-gradient(90deg,transparent_4px,#212121_4px,#212121_6px)] bg-[length:6px_100%]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* The 6 Canonical Quest Cards Grid */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div className="text-xs font-bold uppercase tracking-widest text-charcoal dark:text-cream">
            Active Quest Catalog
          </div>
          <span className="text-[11px] font-mono text-charcoal/60 dark:text-sage">
            {completedQuests.length} of {quests.length} Completed
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {quests.map((quest) => {
            const pct = Math.min(100, Math.round((quest.currentCount / quest.targetCount) * 100));
            const isDone = quest.isCompleted;

            return (
              <div
                key={quest.id}
                className="p-5 rounded-xl border-2 border-charcoal bg-[#ECECE5] dark:bg-darkTealSurface shadow-[4px_4px_0px_#212121] flex flex-col justify-between transition-transform hover:-translate-y-0.5"
              >
                <div>
                  {/* Top Header Row with Category, XP and Card Number / Done status */}
                  <div className="flex items-center justify-between gap-2 mb-3.5">
                    <div className="flex items-center gap-1.5">
                      {/* Category Badge */}
                      <span className="px-2.5 py-0.5 border border-charcoal bg-[#07514C] text-[#DFDFD4] font-mono text-[10px] font-bold uppercase tracking-wider rounded-xs">
                        {quest.category}
                      </span>
                      {/* XP Badge */}
                      <span className="px-2.5 py-0.5 border border-charcoal bg-[#DDA44D] text-[#212121] font-mono text-[10px] font-bold tracking-wider rounded-xs">
                        +{quest.xpReward} XP
                      </span>
                    </div>

                    {/* Top Right: Status & Number (#01 .. #06) */}
                    <div className="flex items-center gap-2">
                      {isDone && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#07514C] dark:text-[#DDA44D]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#07514C] dark:text-[#DDA44D]" />
                          <span>DONE</span>
                        </span>
                      )}
                      <span className="font-mono font-bold text-xs text-charcoal/60 dark:text-sage/70">
                        {quest.number}
                      </span>
                    </div>
                  </div>

                  {/* Icon Box + Title + Description */}
                  <div className="flex items-start gap-3.5 mt-2">
                    <div className="w-11 h-11 border-2 border-charcoal bg-[#D5DFD9] dark:bg-darkTealElevated flex items-center justify-center shrink-0 rounded-xs shadow-xs">
                      {renderIcon(quest.icon)}
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-[#212121] dark:text-cream leading-tight">
                        {quest.title}
                      </h4>
                      <p className="text-[11px] text-[#212121]/80 dark:text-sage leading-relaxed">
                        {quest.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Black Solid Divider Line */}
                <div className="w-full h-[1.5px] bg-charcoal dark:bg-darkTealBorder my-3.5" />

                {/* Bottom Section: Progress Labels & Segmented Retro Bar */}
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold tracking-wider text-[#212121] dark:text-cream mb-1.5 uppercase">
                    <span>PROGRESS</span>
                    <span>TARGET: {quest.targetCount}</span>
                  </div>

                  {/* Segmented Pixel Bar Container */}
                  <div className="w-full h-4 border-2 border-charcoal bg-[#212121] p-0.5 flex items-center overflow-hidden">
                    {pct > 0 ? (
                      <div
                        className="h-full bg-[#DDA44D] bg-[linear-gradient(90deg,transparent_5px,#212121_5px,#212121_7px)] bg-[length:7px_100%] transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    ) : (
                      <div className="w-full h-full bg-[#212121]" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Habit Motivation Callout with Sovereign Branding */}
      <div className="p-5 rounded-2xl bg-[#07514C] text-[#DFDFD4] border-2 border-charcoal shadow-[4px_4px_0px_#212121] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-[#DDA44D] text-[#212121] border border-charcoal shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 font-mono">
            <div className="font-bold text-white text-sm">
              Daily Spoken Habit: 3x Speed Advantage
            </div>
            <p className="text-[#DFDFD4]/80 text-xs max-w-xl font-sans">
              Speaking aloud produces 150+ words per minute versus 40 WPM manual keyboard typing. Dictating your daily notes, slack messages, and docs builds fluency effortlessly.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('home')}
          className="px-5 py-2.5 rounded-xl bg-[#DDA44D] hover:bg-[#c9923e] text-[#212121] font-mono font-bold text-xs border border-charcoal shadow-[2px_2px_0px_#212121] transition-all active:scale-95 shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <span>Dictate Now</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
