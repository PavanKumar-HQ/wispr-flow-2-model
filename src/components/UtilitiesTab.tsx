import React from 'react';
import { LayoutGrid, LocateFixed } from 'lucide-react';
import { CalendarClockWidget } from './capsule/CalendarClockWidget';
import { FocusTimerWidget } from './capsule/FocusTimerWidget';
import { MediaWidget } from './capsule/MediaWidget';
import { ClipboardHistoryWidget } from './capsule/ClipboardHistoryWidget';
import { ScheduleWidget } from './capsule/ScheduleWidget';
import { SessionSnapshot } from '../types';
import { safeInvoke } from '../lib/ipc';

interface UtilitiesTabProps {
  session: SessionSnapshot;
  onCopy: (text: string) => void;
  onSummonPill?: () => void;
}

export const UtilitiesTab: React.FC<UtilitiesTabProps> = ({ session, onCopy, onSummonPill }) => {
  const handleFloatPill = () => {
    if (onSummonPill) {
      onSummonPill();
    } else {
      safeInvoke('center_pill_window').catch(() => {});
    }
  };

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto select-none animate-fadeIn pb-16 font-sans">
      {/* Top Banner Header */}
      <div className="p-6 rounded-2xl border border-charcoal/15 bg-white shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-darkTeal text-white rounded-xl shadow-xs">
            <LayoutGrid className="w-6 h-6 text-amber" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-darkTeal">Productivity Utilities</h2>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-darkTeal/10 text-darkTeal border border-darkTeal/20">
                5 Studio Tools
              </span>
            </div>
            <p className="text-xs text-charcoal/70 mt-0.5">
              Interactive calendar & clock, YouTube focus audio streams, Pomodoro timer, and voice clipboard.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleFloatPill}
          className="text-xs font-bold text-darkTeal hover:text-deepTeal flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-charcoal/15 shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          title="Float mini capsule pill over your active windows"
        >
          <LocateFixed className="w-3.5 h-3.5 text-terracotta" />
          <span>Float on Screen</span>
        </button>
      </div>

      {/* Main Utilities Grid (Comfortable 2-Column Responsive Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Tool 1: Interactive Calendar & Clock */}
        <div className="space-y-2">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-charcoal/60 flex items-center gap-1.5 px-1">
            <span className="w-2 h-2 rounded-full bg-darkTeal" />
            <span>Time & Interactive Calendar</span>
          </div>
          <CalendarClockWidget />
        </div>

        {/* Tool 2: Deep Focus Timer */}
        <div className="space-y-2">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-charcoal/60 flex items-center gap-1.5 px-1">
            <span className="w-2 h-2 rounded-full bg-terracotta" />
            <span>Focus & Stopwatch Timer</span>
          </div>
          <FocusTimerWidget />

          {/* Tool 5: Schedule & Commitments below Focus Timer */}
          <div className="pt-3">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-charcoal/60 flex items-center gap-1.5 px-1 pb-2">
              <span className="w-2 h-2 rounded-full bg-amber" />
              <span>Schedule & Commitments</span>
            </div>
            <ScheduleWidget />
          </div>
        </div>

        {/* Tool 3: YouTube & Focus Audio Station */}
        <div className="space-y-2">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-charcoal/60 flex items-center gap-1.5 px-1">
            <span className="w-2 h-2 rounded-full bg-red-600" />
            <span>YouTube & Focus Audio</span>
          </div>
          <MediaWidget />
        </div>

        {/* Tool 4: Voice Clipboard History */}
        <div className="space-y-2">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-charcoal/60 flex items-center gap-1.5 px-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>Voice Clipboard History</span>
          </div>
          <ClipboardHistoryWidget lastTranscript={session.last_transcript} onCopy={onCopy} />
        </div>
      </div>
    </div>
  );
};
