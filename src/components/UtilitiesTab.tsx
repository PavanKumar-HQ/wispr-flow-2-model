import React, { useState } from 'react';
import { 
  LayoutGrid, 
  LocateFixed, 
  CheckCircle2, 
  RefreshCw, 
  ShieldCheck, 
  Activity, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Download, 
  Check, 
  Sparkles 
} from 'lucide-react';
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

interface CleanedItemDetail {
  name: string;
  category: string;
  path_display: string;
  size_mb: number;
  rule_id: string;
  status: string;
}

interface CleanResult {
  ram_reclaimed_mb: number;
  disk_cache_cleared_mb: number;
  ports_checked: number[];
  ports_freed: string[];
  summary_headline?: string;
  timestamp_rfc3339?: string;
  items_cleaned: string[];
  detailed_items?: CleanedItemDetail[];
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
  const [showDetailedReport, setShowDetailedReport] = useState<boolean>(false);
  const [reportCopied, setReportCopied] = useState<boolean>(false);

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

  const handleCopyReport = () => {
    if (!cleanResult) return;
    const reportText = JSON.stringify(cleanResult, null, 2);
    onCopy(reportText);
    setReportCopied(true);
    setTimeout(() => setReportCopied(false), 2000);
  };

  const handleDownloadReport = () => {
    if (!cleanResult) return;
    const reportText = JSON.stringify(cleanResult, null, 2);
    const blob = new Blob([reportText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voxquest-storage-cleanup-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 w-full max-w-5xl mx-auto select-none animate-fadeIn pb-16 font-sans">
      {/* Compact Header */}
      <div className="px-5 py-4 rounded-2xl border border-charcoal/15 dark:border-darkTealBorder bg-white dark:bg-darkTealSurface shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-darkTeal dark:bg-[#0D6E67] text-white rounded-xl shadow-xs">
            <LayoutGrid className="w-5 h-5 text-amber" />
          </div>
          <h2 className="text-lg font-bold text-darkTeal dark:text-cream">Utilities</h2>
        </div>

        <button
          type="button"
          onClick={handleFloatPill}
          className="text-xs font-bold text-darkTeal dark:text-cream hover:text-deepTeal dark:hover:text-white flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 dark:bg-darkTealSurface dark:hover:bg-darkTealElevated border border-charcoal/15 dark:border-darkTealBorder shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
          title="Float mini capsule pill over your active windows"
        >
          <LocateFixed className="w-3.5 h-3.5 text-terracotta" />
          <span>Float on Screen</span>
        </button>
      </div>

      {/* System Boost & Mac Cleaner */}
      <div className="p-4 rounded-2xl border border-charcoal/15 dark:border-darkTealBorder bg-white dark:bg-darkTealSurface shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-terracotta/10 text-terracotta flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-charcoal dark:text-cream">System Boost & Mac Cleaner</h3>
              <p className="text-[11px] text-charcoal/55 dark:text-sage">
                Clear caches & stale dev ports
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
                  <span>Cleaning via Squirrel Rules...</span>
                </>
              ) : (
                <>
                  <Activity className="w-3.5 h-3.5 text-amber" />
                  <span>Clean & Boost</span>
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

        {/* Clean Results Panel & Detailed Report */}
        {cleanResult && (
          <div className="p-4 rounded-xl bg-stone-50 dark:bg-darkTealSurface border border-charcoal/15 dark:border-darkTealBorder space-y-3 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-darkTeal dark:text-mint shrink-0" />
                <span className="text-xs font-bold text-charcoal dark:text-cream">
                  {cleanResult.summary_headline || 'Clean & Boost Complete'}
                </span>
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

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-charcoal/10 dark:border-darkTealBorder">
              <div className="flex items-center gap-2 text-xs text-charcoal/80 dark:text-cream/90">
                <Sparkles className="w-3.5 h-3.5 text-amber shrink-0" />
                <span>Cleaned safely using internal Squirrel rules (zero external window).</span>
              </div>

              <button
                type="button"
                onClick={() => setShowDetailedReport(!showDetailedReport)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-darkTealElevated hover:bg-neutral-100 dark:hover:bg-darkTealCanvas border border-charcoal/15 dark:border-darkTealBorder text-darkTeal dark:text-cream transition-all cursor-pointer shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5 text-amber" />
                <span>{showDetailedReport ? 'Hide Detailed Report' : 'View Detailed Audit Report'}</span>
                {showDetailedReport ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Expandable Detailed Audit Report */}
            {showDetailedReport && (
              <div className="mt-3 p-4 rounded-xl bg-white dark:bg-darkTealElevated border border-charcoal/15 dark:border-darkTealBorder space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-charcoal dark:text-cream font-mono uppercase tracking-wide">
                      Comprehensive Cleanup Audit Journal
                    </h4>
                    <p className="text-[11px] text-charcoal/60 dark:text-sage">
                      Itemized breakdown of targets sanitized according to evidence-based safety criteria.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyReport}
                      className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-stone-100 dark:bg-darkTealSurface hover:bg-stone-200 dark:hover:bg-darkTealCanvas text-charcoal dark:text-cream border border-charcoal/15 dark:border-darkTealBorder flex items-center gap-1 transition-all cursor-pointer"
                      title="Copy raw audit log JSON to clipboard"
                    >
                      {reportCopied ? <Check className="w-3 h-3 text-darkTeal dark:text-amber" /> : <Copy className="w-3 h-3" />}
                      <span>{reportCopied ? 'Copied' : 'Copy JSON'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadReport}
                      className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-darkTeal text-white hover:bg-darkTeal/90 flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                      title="Download report JSON file"
                    >
                      <Download className="w-3 h-3 text-amber" />
                      <span>Export Report</span>
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-charcoal/10 dark:divide-darkTealBorder text-xs">
                  {cleanResult.detailed_items && cleanResult.detailed_items.length > 0 ? (
                    cleanResult.detailed_items.map((item, idx) => (
                      <div key={idx} className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-charcoal dark:text-cream">{item.name}</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-darkTeal/10 dark:bg-darkTealSurface text-darkTeal dark:text-mint">
                              {item.rule_id}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-charcoal/50 dark:text-sage/70">
                            {item.path_display} &bull; {item.category}
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          {item.size_mb > 0 && (
                            <span className="font-mono font-bold text-darkTeal dark:text-mint">
                              +{item.size_mb} MB
                            </span>
                          )}
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-darkTeal/10 dark:bg-darkTealElevated text-darkTeal dark:text-amber border border-darkTeal/20">
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    cleanResult.items_cleaned.map((item, idx) => (
                      <div key={idx} className="py-1.5 flex items-center gap-2 text-xs text-charcoal/80 dark:text-cream/90">
                        <ShieldCheck className="w-3.5 h-3.5 text-darkTeal dark:text-mint shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
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
            <span className="w-2 h-2 rounded-full bg-darkTeal dark:bg-[#34A89E]" />
            <span>Voice Clipboard History</span>
          </div>
          <ClipboardHistoryWidget lastTranscript={session.last_transcript} onCopy={onCopy} />
        </div>

        {/* Tool 5: AI Multi-Tone & Voice Rewriter */}
        <div className="space-y-2 lg:col-span-2">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-charcoal/60 dark:text-sage flex items-center gap-1.5 px-1">
            <span className="w-2 h-2 rounded-full bg-darkTeal dark:bg-[#34A89E]" />
            <span>AI Multi-Tone & Smart Voice Rewriter</span>
          </div>
          <ToneRewriterWidget lastTranscript={session.last_transcript} onCopy={onCopy} />
        </div>
      </div>
    </div>
  );
};
