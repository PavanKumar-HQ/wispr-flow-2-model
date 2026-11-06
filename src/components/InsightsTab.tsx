import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Laptop, Clock, Zap, FileText } from 'lucide-react';
import { InsightsData, HistoryRecord } from '../types';

interface InsightsTabProps {
  insights: InsightsData | null;
  history: HistoryRecord[];
  shortcut: string;
  onCopy: (text: string) => void;
  onStartTest: () => void;
}

export const InsightsTab: React.FC<InsightsTabProps> = ({
  insights,
  history,
}) => {
  const [monthOffset, setMonthOffset] = useState<number>(0);

  // Real calculations directly from SQLite insights or fallback to history
  const totalWords = insights?.total_words ?? history.reduce((sum, h) => {
    return sum + h.formatted_text.trim().split(/\s+/).filter(Boolean).length;
  }, 0);

  const totalChars = insights?.total_characters ?? history.reduce((sum, h) => sum + h.formatted_text.length, 0);
  const totalDurationSecs = insights?.total_duration_seconds ?? history.reduce((sum, h) => sum + (h.duration_seconds || 0), 0);
  const totalSessions = insights?.total_sessions ?? history.length;

  const avgWpm = insights?.average_wpm ?? (totalDurationSecs > 0 && totalWords > 0
    ? Math.round(totalWords / (totalDurationSecs / 60))
    : 0);

  // Real time saved (Manual typing is ~40 WPM)
  const rawTimeSaved = insights?.time_saved_minutes ?? (totalWords > 0 && avgWpm > 0
    ? Math.max(0, totalWords / 40 - totalWords / avgWpm)
    : 0);
  const timeSavedMinutes = Math.round(Number(rawTimeSaved) || 0);

  // Real app usage breakdown from insights or fallback to history
  const appUsage = (insights?.app_usage && insights.app_usage.length > 0)
    ? insights.app_usage
    : (() => {
        const appMap = new Map<string, number>();
        for (const h of history) {
          const app = h.target_app && h.target_app.trim() ? h.target_app.trim() : 'Clipboard Vault';
          const words = h.formatted_text.trim().split(/\s+/).filter(Boolean).length;
          appMap.set(app, (appMap.get(app) || 0) + words);
        }
        return Array.from(appMap.entries())
          .map(([app_name, word_count]) => ({
            app_name,
            word_count,
            percentage: totalWords > 0 ? (word_count / totalWords) * 100 : 0,
          }))
          .sort((a, b) => b.word_count - a.word_count);
      })();

  // Real daily activity map (dateKey -> { count, words })
  const dailyActivity = new Map<string, { count: number; words: number }>();
  for (const h of history) {
    const d = new Date(h.timestamp_ms);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const words = h.formatted_text.trim().split(/\s+/).filter(Boolean).length;
    const prev = dailyActivity.get(key) || { count: 0, words: 0 };
    dailyActivity.set(key, { count: prev.count + 1, words: prev.words + words });
  }

  const streakDays = dailyActivity.size;
  // Calculate the 4 visible calendar months based on monthOffset
  const now = new Date();
  const visibleMonths = [-3, -2, -1, 0].map((delta) => {
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset + delta, 1);
    return d.toLocaleDateString('default', { month: 'short' });
  });

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-charcoal/15 pb-3">
        <div>
          <h2 className="text-xl font-bold text-darkTeal tracking-tight">Voice Analytics</h2>
          <p className="text-xs text-charcoal/70 mt-1">Dictation speed, volume, and daily typing productivity.</p>
        </div>
      </div>

      {/* Top 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Words Per Minute */}
        <div className="p-5 sm:p-6 rounded-2xl border border-charcoal/15 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-3xl font-extrabold text-charcoal tracking-tight font-mono">
                {avgWpm > 0 ? avgWpm : '—'}
              </span>
              <div className="p-2 rounded-xl bg-amber/20 border border-amber/30">
                <Zap className="w-5 h-5 text-amber-700 fill-amber-400" />
              </div>
            </div>
            <div className="text-xs font-semibold text-charcoal/70 mb-2">
              Words Per Minute
            </div>
            <p className="text-xs text-charcoal/60 leading-relaxed mb-4">
              {avgWpm > 0
                ? `~${(avgWpm / 40).toFixed(1)}× faster than manual keyboard typing.`
                : 'Dictate speech into any app to calculate your speed.'}
            </p>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-charcoal/10">
            <div className="flex items-center justify-between text-[11px] text-charcoal/70 font-medium">
              <span>Benchmark (40 WPM)</span>
              <span className="font-bold text-darkTeal">{avgWpm > 0 ? `${avgWpm} WPM` : 'Baseline'}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
              <div
                className="bg-darkTeal h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(10, (avgWpm / 150) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Total Words & Characters */}
        <div className="p-5 sm:p-6 rounded-2xl border border-charcoal/15 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-3xl font-extrabold text-charcoal tracking-tight font-mono">
                {totalWords.toLocaleString()}
              </span>
              <div className="p-2 rounded-xl bg-darkTeal/10 border border-darkTeal/20">
                <FileText className="w-5 h-5 text-darkTeal" />
              </div>
            </div>
            <div className="text-xs font-semibold text-charcoal/70 mb-2">
              Total Words Dictated
            </div>
            <p className="text-xs text-charcoal/60 leading-relaxed mb-4">
              {totalWords > 0
                ? `${totalChars.toLocaleString()} characters recorded across ${totalSessions} dictations.`
                : 'Your spoken words across all applications will appear here.'}
            </p>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-charcoal/10">
            <div className="flex items-center justify-between text-[11px] text-charcoal/70 font-medium">
              <span>Volume</span>
              <span className="font-bold text-darkTeal">{totalSessions} sessions</span>
            </div>
            <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
              <div
                className="bg-darkTeal h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(8, (totalWords / 500) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Time Saved */}
        <div className="p-5 sm:p-6 rounded-2xl border border-charcoal/15 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-3xl font-extrabold text-charcoal tracking-tight font-mono">
                {timeSavedMinutes} <span className="text-base font-normal">mins</span>
              </span>
              <div className="p-2 rounded-xl bg-sage/30 border border-charcoal/20">
                <Clock className="w-5 h-5 text-darkTeal" />
              </div>
            </div>
            <div className="text-xs font-semibold text-charcoal/70 mb-2">
              Estimated Time Saved
            </div>
            <p className="text-xs text-charcoal/60 leading-relaxed mb-4">
              {timeSavedMinutes > 0
                ? `Saved ~${timeSavedMinutes} minutes compared to manual typing.`
                : 'Speaking saves ~60% of physical typing time.'}
            </p>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-charcoal/10">
            <div className="flex items-center justify-between text-[11px] text-charcoal/70 font-medium">
              <span>Time saved</span>
              <span className="font-bold text-darkTeal">{timeSavedMinutes}m</span>
            </div>
            <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
              <div
                className="bg-darkTeal h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(8, timeSavedMinutes * 10))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Desktop App Usage + Activity Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real Desktop Usage Breakdown */}
        <div className="p-5 sm:p-6 rounded-2xl border border-charcoal/15 bg-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-charcoal">Desktop Applications Used</h3>
              <span className="text-xs font-semibold text-darkTeal bg-darkTeal/10 px-2.5 py-0.5 rounded-full border border-darkTeal/20">
                {appUsage.length} {appUsage.length === 1 ? 'App' : 'Apps'}
              </span>
            </div>

            {appUsage.length === 0 ? (
              <div className="py-12 text-center text-xs text-charcoal/50 flex flex-col items-center justify-center gap-2">
                <Laptop className="w-7 h-7 text-charcoal/30" />
                <p className="font-bold text-charcoal">No applications recorded yet</p>
                <p className="text-[11px] text-charcoal/60">Dictate into WhatsApp, Notes, Slack, or any app to see your breakdown.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {appUsage.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-charcoal">{item.app_name}</span>
                      <span className="text-[10px] text-charcoal/70 font-mono">{item.word_count} words ({Math.round(item.percentage)}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-cream border border-charcoal/15 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-darkTeal transition-all duration-500"
                        style={{ width: `${Math.max(5, item.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-charcoal/10 flex items-center justify-between text-xs text-charcoal/60">
            <span>Primary application: <strong className="text-darkTeal font-semibold">{appUsage[0]?.app_name || 'None'}</strong></span>
            <span>{totalWords.toLocaleString()} words</span>
          </div>
        </div>

        {/* GitHub-Style Activity Contributions Heatmap */}
        <div className="p-5 sm:p-6 rounded-2xl border border-charcoal/15 bg-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="font-bold text-base text-charcoal">
                  Activity Calendar
                </h3>
                <p className="text-xs text-charcoal/60 mt-0.5">
                  {totalSessions} {totalSessions === 1 ? 'dictation' : 'dictations'} contributed in the last 4 months
                </p>
              </div>
              <span className="self-start sm:self-auto text-xs font-semibold text-darkTeal bg-darkTeal/10 px-2.5 py-1 rounded-full border border-darkTeal/20">
                {streakDays} Day Streak
              </span>
            </div>

            {/* Month labels with pagination */}
            <div className="flex items-center justify-between text-xs text-charcoal/60 mb-2 pt-1">
              <button
                onClick={() => setMonthOffset((prev) => prev - 1)}
                className="p-1 rounded-lg border border-charcoal/20 bg-white hover:bg-neutral-50 text-charcoal shadow-xs active:scale-95 transition-all"
                title="Previous months"
                aria-label="Previous months"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-8 sm:gap-12 font-medium text-[11px] text-charcoal/70">
                {visibleMonths.map((m, idx) => (
                  <span key={idx}>{m}</span>
                ))}
              </div>
              <button
                onClick={() => setMonthOffset((prev) => Math.min(0, prev + 1))}
                disabled={monthOffset >= 0}
                className="p-1 rounded-lg border border-charcoal/20 bg-white hover:bg-neutral-50 text-charcoal shadow-xs active:scale-95 transition-all disabled:opacity-30 disabled:hover:bg-white"
                title="Next months"
                aria-label="Next months"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* GitHub Style Heatmap Grid */}
            <div className="flex gap-2 overflow-x-auto py-2 scrollbar-none">
              <div className="flex flex-col justify-between text-[10px] text-charcoal/40 pr-1 py-0.5 font-medium select-none">
                <span className="h-3 leading-3">Mon</span>
                <span className="h-3 leading-3">Wed</span>
                <span className="h-3 leading-3">Fri</span>
              </div>

              <div className="grid grid-rows-7 grid-flow-col gap-[3px] flex-1 min-w-[280px]">
                {Array.from({ length: 7 * 16 }).map((_, idx) => {
                  const daysBack = (7 * 16 - 1) - idx - (monthOffset * 30);
                  const cellDate = new Date();
                  cellDate.setDate(cellDate.getDate() - daysBack);
                  const dateKey = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
                  const activity = dailyActivity.get(dateKey);

                  // GitHub exact colors: level 0 to level 4
                  let cellBg = 'bg-[#ebedf0] hover:bg-[#dfe1e5]';
                  if (activity && activity.count > 0) {
                    if (activity.count >= 8 || activity.words >= 150) {
                      cellBg = 'bg-[#216e39] hover:bg-[#1a572c]'; // Level 4
                    } else if (activity.count >= 5 || activity.words >= 70) {
                      cellBg = 'bg-[#30a14e] hover:bg-[#278640]'; // Level 3
                    } else if (activity.count >= 2 || activity.words >= 25) {
                      cellBg = 'bg-[#40c463] hover:bg-[#34a753]'; // Level 2
                    } else {
                      cellBg = 'bg-[#9be9a8] hover:bg-[#85da93]'; // Level 1
                    }
                  }

                  const formattedDate = cellDate.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' });
                  const title = activity && activity.count > 0
                    ? `${activity.count} dictation${activity.count > 1 ? 's' : ''} (${activity.words} words) on ${formattedDate}`
                    : `No dictations on ${formattedDate}`;

                  return (
                    <div
                      key={idx}
                      className={`w-[12px] h-[12px] rounded-[2px] ${cellBg} transition-all hover:scale-125 cursor-pointer`}
                      title={title}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-charcoal/10 flex items-center justify-between text-xs text-charcoal/70">
            <div className="flex items-center gap-1.5 text-[10px] text-charcoal/60 font-medium">
              <span>Less</span>
              <span className="w-[10px] h-[10px] rounded-[2px] bg-[#ebedf0]" />
              <span className="w-[10px] h-[10px] rounded-[2px] bg-[#9be9a8]" />
              <span className="w-[10px] h-[10px] rounded-[2px] bg-[#40c463]" />
              <span className="w-[10px] h-[10px] rounded-[2px] bg-[#30a14e]" />
              <span className="w-[10px] h-[10px] rounded-[2px] bg-[#216e39]" />
              <span>More</span>
            </div>

            <span className="text-[11px] font-medium text-charcoal/60">
              Contribution Activity
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
