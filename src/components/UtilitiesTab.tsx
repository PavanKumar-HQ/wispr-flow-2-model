import React, { useState } from 'react';
import { LayoutGrid, LocateFixed, CheckCircle2, RefreshCw, ExternalLink, ShieldCheck, Activity } from 'lucide-react';
import { CalendarClockWidget } from './capsule/CalendarClockWidget';
import { FocusTimerWidget } from './capsule/FocusTimerWidget';
import { MediaWidget } from './capsule/MediaWidget';
import { ClipboardHistoryWidget } from './capsule/ClipboardHistoryWidget';
import { ScheduleWidget } from './capsule/ScheduleWidget';
import { ToneRewriterWidget } from './capsule/ToneRewriterWidget';
import { SessionSnapshot } from '../types';
import { safeInvoke } from '../lib/ipc';

interface StorageCategoryFinding {
  id: string;
  name: string;
  description: string;
  size_mb: number;
  path_display: string;
  is_safe: boolean;
}

interface CleanResult {
  ram_reclaimed_mb: number;
  disk_cache_cleared_mb: number;
  ports_checked: number[];
  ports_freed: string[];
  squirrel_app_found: boolean;
  squirrel_app_name: string;
  items_cleaned: string[];
  findings?: StorageCategoryFinding[];
}

interface UtilitiesTabProps {
  session: SessionSnapshot;
  onCopy: (text: string) => void;
  onSummonPill?: () => void;
}

export const UtilitiesTab: React.FC<UtilitiesTabProps> = ({ session, onCopy, onSummonPill }) => {
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cleanResult, setCleanResult] = useState<CleanResult | null>(null);
  const [storageFindings, setStorageFindings] = useState<StorageCategoryFinding[] | null>(null);
  const [squirrelStatus, setSquirrelStatus] = useState<string>('');

  const handleFloatPill = () => {
    if (onSummonPill) {
      onSummonPill();
    } else {
      safeInvoke('center_pill_window').catch(() => {});
    }
  };

  const handleScanStorage = async () => {
    if (isScanning) return;
    setIsScanning(true);
    try {
      const findings = await safeInvoke<StorageCategoryFinding[]>('scan_mac_storage_cmd');
      setStorageFindings(findings);
    } catch (err) {
      console.warn('Scan storage error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleRunClean = async () => {
    if (isCleaning) return;
    setIsCleaning(true);
    try {
      const res = await safeInvoke<CleanResult>('run_system_clean_and_boost_cmd');
      setCleanResult(res);
      if (res.findings) {
        setStorageFindings(res.findings);
      }
    } catch (err) {
      console.warn('Clean error:', err);
    } finally {
      setIsCleaning(false);
    }
  };

  const handleLaunchSquirrel = async () => {
    try {
      const res = await safeInvoke<string>('launch_squirrel_cleaner_cmd');
      setSquirrelStatus(res || 'Squirrel Cleaner active');
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
          className="text-xs font-bold text-darkTeal dark:text-cream hover:text-deepTeal dark:hover:text-white flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 dark:bg-darkTealSurface dark:hover:bg-darkTealElevated border border-charcoal/15 dark:border-darkTealBorder shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
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
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-charcoal dark:text-cream">Quick Clean & System Boost</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50">
                  Ready
                </span>
              </div>
              <p className="text-xs text-charcoal/60 dark:text-sage mt-0.5">
                Purge GPU caches and kill orphaned dev ports in 1 click.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isScanning || isCleaning}
              onClick={handleScanStorage}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-stone-100 dark:bg-darkTealElevated hover:bg-stone-200 dark:hover:bg-darkTealSurface text-charcoal dark:text-cream border border-charcoal/15 dark:border-darkTealBorder flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
              title="Scan Mac caches and reclaimable developer storage"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-darkTeal dark:text-mint ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning...' : 'Scan Storage'}</span>
            </button>

            {cleanResult?.squirrel_app_found && (
              <button
                type="button"
                onClick={handleLaunchSquirrel}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber/20 hover:bg-amber/30 text-charcoal dark:text-cream border border-amber/50 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
                title="Launch standalone Mac storage cleaner application"
              >
                <ExternalLink className="w-3.5 h-3.5 text-darkTeal" />
                <span>{squirrelStatus || 'Launch Squirrel App'}</span>
              </button>
            )}

            <button
              type="button"
              disabled={isCleaning}
              onClick={handleRunClean}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs transition-all flex items-center gap-1.5 shrink-0 ${
                isCleaning
                  ? 'bg-darkTeal/60 dark:bg-darkTealAccent/60 cursor-wait'
                  : 'bg-darkTeal dark:bg-darkTealAccent hover:bg-darkTeal/90 dark:hover:bg-darkTealAccent/90 active:scale-95 cursor-pointer'
              }`}
            >
              {isCleaning ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Cleaning & Boosting...</span>
                </>
              ) : (
                <>
                  <Activity className="w-3.5 h-3.5 text-amber" />
                  <span>Quick Clean & Boost</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Scanned Storage Categories Breakdown */}
        {storageFindings && storageFindings.length > 0 && (
          <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-darkTealElevated border border-charcoal/15 dark:border-darkTealBorder space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-charcoal dark:text-cream">Reclaimable Cache Categories</span>
              <span className="font-mono text-[11px] font-bold text-darkTeal dark:text-mint">
                Total Detected: {storageFindings.reduce((s, f) => s + f.size_mb, 0)} MB
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {storageFindings.map((finding) => (
                <div key={finding.id} className="p-2.5 rounded-lg bg-white dark:bg-darkTealSurface border border-charcoal/10 dark:border-darkTealBorder">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-charcoal dark:text-cream truncate">{finding.name}</span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-darkTeal/10 dark:bg-darkTealElevated text-darkTeal dark:text-mint">
                      {finding.size_mb} MB
                    </span>
                  </div>
                  <div className="text-[10px] text-charcoal/60 dark:text-sage line-clamp-1">{finding.description}</div>
                  <div className="text-[9px] font-mono text-charcoal/40 dark:text-sage/60 mt-1">{finding.path_display}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clean Results Panel */}
        {cleanResult ? (
          <div className="p-4 rounded-xl bg-stone-50 dark:bg-darkTealSurface border border-charcoal/15 dark:border-darkTealBorder space-y-3 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-darkTeal dark:text-mint shrink-0" />
                <span className="text-xs font-bold text-charcoal dark:text-cream">Clean & Boost Complete</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-darkTeal/10 dark:bg-darkTealElevated text-darkTeal dark:text-cream font-bold border border-darkTeal/20 dark:border-darkTealBorder">
                  +{cleanResult.ram_reclaimed_mb} MB RAM Reclaimed
                </span>
                <span className="px-2 py-0.5 rounded bg-darkTeal/10 dark:bg-darkTeal/40 text-darkTeal dark:text-mint font-bold border border-darkTeal/20 dark:border-mint/40">
                  +{cleanResult.disk_cache_cleared_mb} MB Cache Cleared
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-charcoal/80 dark:text-cream/90 pt-1">
              {cleanResult.items_cleaned.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-darkTeal dark:text-mint shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        ) : !storageFindings ? (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8F8F5] dark:bg-darkTealSurface border border-charcoal/15 dark:border-darkTealBorder text-xs text-charcoal/70 dark:text-cream/70">
            <span>Optimize system resources, scan Mac caches, and terminate stale dev servers in 1 click.</span>
            <span className="font-mono text-[10px] text-charcoal/50 dark:text-cream/50">Ports: 3000, 5173, 8080</span>
          </div>
        ) : null}
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

        {/* Tool 5: AI Multi-Tone & Voice Rewriter */}
        <div className="space-y-2 lg:col-span-2">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-charcoal/60 dark:text-sage flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-darkTeal dark:bg-[#34A89E]" />
              <span>AI Multi-Tone & Smart Voice Rewriter</span>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-darkTeal/10 text-darkTeal font-bold border border-darkTeal/20">
              On-Demand • Zero Idle Battery
            </span>
          </div>
          <ToneRewriterWidget lastTranscript={session.last_transcript} onCopy={onCopy} />
        </div>
      </div>
    </div>
  );
};
