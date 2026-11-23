import React, { useState } from 'react';
import { LayoutGrid, LocateFixed, Sparkles, CheckCircle2, RefreshCw, ExternalLink, ShieldCheck, Zap } from 'lucide-react';
import { CalendarClockWidget } from './capsule/CalendarClockWidget';
import { FocusTimerWidget } from './capsule/FocusTimerWidget';
import { MediaWidget } from './capsule/MediaWidget';
import { ClipboardHistoryWidget } from './capsule/ClipboardHistoryWidget';
import { ScheduleWidget } from './capsule/ScheduleWidget';
import { SessionSnapshot } from '../types';
import { safeInvoke } from '../lib/ipc';

interface CleanResult {
  ram_reclaimed_mb: number;
  disk_cache_cleared_mb: number;
  ports_checked: number[];
  ports_freed: string[];
  squirrel_app_found: boolean;
  squirrel_path: string;
  items_cleaned: string[];
}

interface UtilitiesTabProps {
  session: SessionSnapshot;
  onCopy: (text: string) => void;
  onSummonPill?: () => void;
}

export const UtilitiesTab: React.FC<UtilitiesTabProps> = ({ session, onCopy, onSummonPill }) => {
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [cleanResult, setCleanResult] = useState<CleanResult | null>(null);
  const [squirrelStatus, setSquirrelStatus] = useState<string>('');

  const handleFloatPill = () => {
    if (onSummonPill) {
      onSummonPill();
    } else {
      safeInvoke('center_pill_window').catch(() => {});
    }
  };

  const handleRunClean = async () => {
    if (isCleaning) return;
    setIsCleaning(true);
    try {
      const res = await safeInvoke<CleanResult>('run_system_clean_and_boost_cmd');
      setCleanResult(res);
    } catch (err) {
      console.warn('Clean error:', err);
    } finally {
      setIsCleaning(false);
    }
  };

  const handleLaunchSquirrel = async () => {
    try {
      const res = await safeInvoke<string>('launch_squirrel_cleaner_cmd');
      setSquirrelStatus(res || 'Squirrel launched');
      setTimeout(() => setSquirrelStatus(''), 4000);
    } catch {
      setSquirrelStatus('Could not launch Squirrel');
      setTimeout(() => setSquirrelStatus(''), 4000);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto select-none animate-fadeIn pb-16 font-sans">
      {/* Top Banner Header */}
      <div className="p-6 rounded-2xl border border-charcoal/15 dark:border-darkTealBorder bg-white dark:bg-darkTealSurface shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-darkTeal dark:bg-[#0D6E67] text-white rounded-xl shadow-xs">
            <LayoutGrid className="w-6 h-6 text-amber" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-darkTeal dark:text-cream">Productivity & System Utilities</h2>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-darkTeal/10 dark:bg-darkTeal/30 text-darkTeal dark:text-[#34A89E] border border-darkTeal/20 dark:border-[#34A89E]/30">
                Studio Tools & Mac Cleaner
              </span>
            </div>
            <p className="text-xs text-charcoal/70 dark:text-sage mt-0.5">
              1-Click System Boost, Squirrel Mac Cleaner, interactive calendar, focus stations, and voice clipboard.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleFloatPill}
          className="text-xs font-bold text-darkTeal dark:text-cream hover:text-deepTeal dark:hover:text-white flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 dark:bg-[#05332F] dark:hover:bg-[#0B4A45] border border-charcoal/15 dark:border-darkTealBorder shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          title="Float mini capsule pill over your active windows"
        >
          <LocateFixed className="w-3.5 h-3.5 text-terracotta" />
          <span>Float on Screen</span>
        </button>
      </div>

      {/* 1-Click System Boost & Squirrel Mac Cleaner */}
      <div className="p-5 rounded-2xl border border-charcoal/15 dark:border-darkTealBorder bg-white dark:bg-darkTealSurface shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-charcoal/10 dark:border-darkTealBorder pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-terracotta/10 text-terracotta flex items-center justify-center font-bold">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-charcoal dark:text-cream">Quick Clean & System Boost</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50">
                  Ready
                </span>
              </div>
              <p className="text-xs text-charcoal/60 dark:text-sage mt-0.5">
                Flushes GPU tensors, frees RAM, kills orphaned dev server ports (3000, 5173, 8080), and integrates with Squirrel.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {cleanResult?.squirrel_app_found && (
              <button
                type="button"
                onClick={handleLaunchSquirrel}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-stone-100 dark:bg-[#05332F] hover:bg-stone-200 dark:hover:bg-[#0B4A45] text-charcoal dark:text-cream border border-charcoal/15 dark:border-darkTealBorder flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
                title="Open Squirrel native storage cleaner application"
              >
                <ExternalLink className="w-3.5 h-3.5 text-darkTeal dark:text-[#34A89E]" />
                <span>{squirrelStatus || 'Open Squirrel App'}</span>
              </button>
            )}

            <button
              type="button"
              disabled={isCleaning}
              onClick={handleRunClean}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs transition-all flex items-center gap-1.5 shrink-0 ${
                isCleaning
                  ? 'bg-darkTeal/60 dark:bg-[#0D6E67]/60 cursor-wait'
                  : 'bg-darkTeal dark:bg-[#0D6E67] hover:bg-darkTeal/90 dark:hover:bg-[#10857D] active:scale-95 cursor-pointer'
              }`}
            >
              {isCleaning ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Scanning & Cleaning...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber" />
                  <span>Quick Clean & Boost</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Clean Results Panel */}
        {cleanResult ? (
          <div className="p-4 rounded-xl bg-stone-50 dark:bg-[#05332F] border border-charcoal/15 dark:border-darkTealBorder space-y-3 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-charcoal dark:text-cream">Clean & Boost Complete</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-700/50">
                  +{cleanResult.ram_reclaimed_mb} MB RAM Reclaimed
                </span>
                <span className="px-2 py-0.5 rounded bg-darkTeal/10 dark:bg-darkTeal/40 text-darkTeal dark:text-[#34A89E] font-bold border border-darkTeal/20 dark:border-[#34A89E]/40">
                  +{cleanResult.disk_cache_cleared_mb} MB Cache Cleared
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-charcoal/80 dark:text-cream/90 pt-1">
              {cleanResult.items_cleaned.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-darkTeal dark:text-[#34A89E] shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50/70 dark:bg-[#05332F] border border-dashed border-charcoal/20 dark:border-darkTealBorder text-xs text-charcoal/60 dark:text-sage">
            <span>Click <strong>Quick Clean & Boost</strong> to scan listening ports, purge unused GPU tensor memory, and optimize your system in 1 click.</span>
            <span className="font-mono text-[11px] text-charcoal/40 dark:text-sage/60">Ports: 3000, 5173, 8080</span>
          </div>
        )}
      </div>

      {/* Main Utilities Grid (Comfortable 2-Column Responsive Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Tool 1: Interactive Calendar & Clock */}
        <div className="space-y-2">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-charcoal/60 dark:text-sage flex items-center gap-1.5 px-1">
            <span className="w-2 h-2 rounded-full bg-darkTeal dark:bg-[#34A89E]" />
            <span>Time & Interactive Calendar</span>
          </div>
          <CalendarClockWidget />
        </div>

        {/* Tool 2: Deep Focus Timer */}
        <div className="space-y-2">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-charcoal/60 dark:text-sage flex items-center gap-1.5 px-1">
            <span className="w-2 h-2 rounded-full bg-terracotta" />
            <span>Focus & Stopwatch Timer</span>
          </div>
          <FocusTimerWidget />

          {/* Tool 5: Schedule & Commitments below Focus Timer */}
          <div className="pt-3">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-charcoal/60 dark:text-sage flex items-center gap-1.5 px-1 pb-2">
              <span className="w-2 h-2 rounded-full bg-amber" />
              <span>Schedule & Commitments</span>
            </div>
            <ScheduleWidget />
          </div>
        </div>

        {/* Tool 3: YouTube & Focus Audio Station */}
        <div className="space-y-2">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-charcoal/60 dark:text-sage flex items-center gap-1.5 px-1">
            <span className="w-2 h-2 rounded-full bg-red-600" />
            <span>YouTube & Focus Audio</span>
          </div>
          <MediaWidget />
        </div>

        {/* Tool 4: Voice Clipboard History */}
        <div className="space-y-2">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-charcoal/60 dark:text-sage flex items-center gap-1.5 px-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-500" />
            <span>Voice Clipboard History</span>
          </div>
          <ClipboardHistoryWidget lastTranscript={session.last_transcript} onCopy={onCopy} />
        </div>
      </div>
    </div>
  );
};
