import React, { useState } from 'react';
import {
  Mic,
  Square,
  Copy,
  Check,
  Trash2,
  CornerDownLeft,
  Clock,
  LocateFixed,
  FileText,
  Gauge,
  Flame,
  CheckCircle2,
  Wand2,
  ArrowRight
} from 'lucide-react';
import { InsightsData, HistoryRecord, SessionSnapshot } from '../types';
import { AudioWaveform } from './AudioWaveform';
import { Mascot } from './Mascot';
import { EnhanceReviewCard } from './EnhanceReviewCard';
import { safeInvoke } from '../lib/ipc';

interface HomeTabProps {
  insights: InsightsData | null;
  history: HistoryRecord[];
  session: SessionSnapshot;
  shortcut: string;
  onCopy: (text: string) => void;
  onDeleteHistory: (id: number) => void;
  onClearHistory: () => void;
  onToggleDictation: () => void;
  onNavigateTab: (tab: 'insights' | 'history' | 'dictionary' | 'models' | 'settings') => void;
  onSummonPill: () => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  insights,
  history,
  session,
  shortcut,
  onCopy,
  onDeleteHistory,
  onClearHistory: _onClearHistory,
  onToggleDictation,
  onNavigateTab,
  onSummonPill,
}) => {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedSessionText, setCopiedSessionText] = useState(false);
  const [showEnhanceSession, setShowEnhanceSession] = useState(false);
  const [enhanceHistoryItemId, setEnhanceHistoryItemId] = useState<number | null>(null);

  const isRecording = session.state === 'recording';
  const isTranscribing = session.state === 'transcribing' || session.state === 'formatting';

  const formatSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatShortcut = (sc: string) => {
    return sc
      .replace('CommandOrControl', '⌘')
      .replace('Shift', '⇧')
      .replace('Space', 'Space');
  };

  const handleCopyItem = (id: number, text: string) => {
    onCopy(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleCopySessionText = () => {
    if (session.last_transcript) {
      onCopy(session.last_transcript);
      setCopiedSessionText(true);
      setTimeout(() => setCopiedSessionText(false), 1800);
    }
  };

  const handleInsertHistoryItem = async (id: number, text: string) => {
    try {
      await safeInvoke('insert_into_selected_field', { id, text });
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch (e) {
      console.warn('Insert history item error:', e);
      handleCopyItem(id, text);
    }
  };

  const totalWords = insights?.total_words ?? history.reduce(
    (acc, h) => acc + h.formatted_text.trim().split(/\s+/).filter(Boolean).length,
    0
  );
  const avgWpm = insights?.average_wpm ?? (history.length > 0 ? Math.round(totalWords / Math.max(1, history.reduce((acc, h) => acc + h.duration_seconds, 0) / 60)) : 0);
  const streakDays = insights?.streak_days ?? (history.length > 0 ? 1 : 0);

  // Recent 3 dictations for clean home overview
  const recentHistory = history.slice(0, 3);

  return (
    <div className="space-y-5 animate-fadeIn select-none w-full max-w-4xl mx-auto">
      {/* 1. Welcome & Status Banner */}
      <div className="bg-white border border-charcoal/15 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0">
            <Mascot size={46} />
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                isRecording
                  ? 'bg-terracotta animate-ping'
                  : isTranscribing
                  ? 'bg-amber animate-spin'
                  : 'bg-darkTeal animate-pulse'
              }`}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-charcoal">
                Voice Dictation
              </h1>
            </div>
            <p className="text-xs text-charcoal/70 mt-0.5 font-sans">
              Press <kbd className="px-1.5 py-0.5 rounded bg-sage/30 border border-charcoal/20 font-mono text-[11px] font-bold text-darkTeal shadow-xs">{formatShortcut(shortcut)}</kbd> anywhere or tap below to speak naturally into any app.
            </p>
          </div>
        </div>

        <button
          onClick={onSummonPill}
          className="px-3.5 py-2 rounded-xl bg-darkTeal hover:bg-deepTeal text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
          title="Bring the floating pill onto your screen"
        >
          <LocateFixed className="w-3.5 h-3.5 text-amber" />
          <span>Summon Pill</span>
        </button>
      </div>

      {/* 2. Interactive Voice Dictation Canvas */}
      <div className="bg-[#1A332E] text-cream border border-darkTeal/30 rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-[10px] font-bold text-amber uppercase tracking-wider bg-black/30 px-2.5 py-0.5 rounded-full border border-amber/30">
                {isRecording ? 'Listening Now' : isTranscribing ? 'Processing...' : 'Ready to Dictate'}
              </span>
            </div>
            <p className="text-xs text-cream/80 font-sans">
              {isRecording
                ? 'Speak your thoughts, notes, or prompts naturally...'
                : isTranscribing
                ? 'Turning your voice into clean formatted text...'
                : 'Click the button or hold your shortcut key to start speaking.'}
            </p>
          </div>

          {/* Main Action Button */}
          <button
            onClick={onToggleDictation}
            className={`rounded-xl px-5 py-3 text-xs font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95 ${
              isRecording
                ? 'bg-terracotta hover:bg-terracotta/90 text-white animate-pulse'
                : isTranscribing
                ? 'bg-amber text-charcoal opacity-90 cursor-wait'
                : 'bg-amber hover:bg-amber/90 text-charcoal'
            }`}
          >
            {isRecording ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span>Stop & Paste ({formatSeconds(session.elapsed_seconds)})</span>
              </>
            ) : isTranscribing ? (
              <>
                <span className="w-4 h-4 border-2 border-charcoal border-t-transparent rounded-full animate-spin" />
                <span>Transcribing...</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 text-charcoal fill-charcoal/20" />
                <span>Tap to Speak</span>
              </>
            )}
          </button>
        </div>

        {/* Live Audio Visualizer when speaking */}
        {isRecording && (
          <div className="p-3.5 rounded-xl bg-deepTeal/70 border border-white/10 flex items-center justify-center animate-fadeIn">
            <AudioWaveform isRecording={true} isTranscribing={false} liveLevel={0.5} barCount={23} theme="dark" />
          </div>
        )}

        {/* Recognized Transcript & Quick Polish/Prompt Superpowers */}
        {session.last_transcript && !isRecording && (
          <div className="pt-3 border-t border-white/10 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between text-xs text-sage font-semibold">
              <span className="flex items-center gap-1.5 text-amber">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Latest Dictation
              </span>
              <span className="text-[11px] font-mono text-cream/70">
                {session.last_transcript.trim().split(/\s+/).filter(Boolean).length} words
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-deepTeal/80 border border-sage/30 text-sm font-medium text-cream leading-relaxed select-text shadow-inner">
              "{session.last_transcript}"
            </div>

            {/* Action Buttons: Enhance, Copy */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <button
                onClick={() => setShowEnhanceSession(!showEnhanceSession)}
                className={`rounded-xl text-xs py-2 px-3.5 font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 ${
                  showEnhanceSession
                    ? 'bg-darkTeal text-white border border-darkTeal'
                    : 'bg-amber text-charcoal hover:bg-amber/90'
                }`}
                title="Enhance clarity, grammar, and phrasing without inventing facts"
                aria-label="Enhance dictated text"
              >
                <Wand2 className="w-3.5 h-3.5 text-charcoal shrink-0" />
                <span>{showEnhanceSession ? 'Close Enhance' : 'Enhance'}</span>
              </button>

              <button
                onClick={handleCopySessionText}
                className="p-2 rounded-xl ml-auto flex items-center justify-center text-xs font-semibold bg-white/10 hover:bg-white/20 text-cream border border-white/15 transition-all shadow-xs active:scale-95"
                title="Copy to clipboard"
                aria-label="Copy transcript"
              >
                {copiedSessionText ? <Check className="w-4 h-4 text-amber" /> : <Copy className="w-4 h-4 text-cream" />}
              </button>
            </div>

            {/* In-place Enhancement Review Card */}
            {showEnhanceSession && (
              <div className="pt-2">
                <EnhanceReviewCard
                  originalText={session.last_transcript}
                  sessionId={session.session_id}
                  onAccept={(enhanced) => {
                    setShowEnhanceSession(false);
                    onCopy(enhanced);
                  }}
                  onInsert={(text) => {
                    safeInvoke('insert_into_selected_field', { id: 0, text });
                  }}
                  onCopy={(text) => onCopy(text)}
                  onDiscard={() => setShowEnhanceSession(false)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Sleek Student Progress Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {/* Words Dictated */}
        <div
          onClick={() => onNavigateTab('insights')}
          className="bg-white hover:bg-neutral-50/80 border border-charcoal/15 rounded-xl p-3 sm:p-3.5 shadow-xs transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="p-2 rounded-lg bg-darkTeal/10 text-darkTeal border border-darkTeal/20">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-extrabold text-charcoal font-mono leading-none">
              {totalWords.toLocaleString()}
            </div>
            <div className="text-[11px] font-bold text-charcoal/60 uppercase tracking-wider mt-1">WORDS</div>
          </div>
        </div>

        {/* Speed */}
        <div
          onClick={() => onNavigateTab('insights')}
          className="bg-white hover:bg-neutral-50/80 border border-charcoal/15 rounded-xl p-3 sm:p-3.5 shadow-xs transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="p-2 rounded-lg bg-amber/20 text-charcoal border border-amber/40">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-extrabold text-charcoal font-mono leading-none">
              {avgWpm > 0 ? `${avgWpm}` : '--'} <span className="text-xs font-normal text-charcoal/60">WPM</span>
            </div>
            <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mt-1">
              {avgWpm > 0 ? `${(avgWpm / 38).toFixed(1)}x FASTER` : 'SPEED'}
            </div>
          </div>
        </div>

        {/* Daily Streak */}
        <div
          onClick={() => onNavigateTab('insights')}
          className="bg-white hover:bg-neutral-50/80 border border-charcoal/15 rounded-xl p-3 sm:p-3.5 shadow-xs transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="p-2 rounded-lg bg-terracotta/15 text-terracotta border border-terracotta/30">
            <Flame className="w-4 h-4 fill-terracotta" />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-extrabold text-charcoal font-mono leading-none">
              {streakDays} <span className="text-xs font-normal text-charcoal/60">Day{streakDays === 1 ? '' : 's'}</span>
            </div>
            <div className="text-[11px] font-bold text-terracotta uppercase tracking-wider mt-1">STREAK</div>
          </div>
        </div>
      </div>

      {/* 4. Recent Dictations (Clean, light & uncluttered) */}
      <div className="bg-white border border-charcoal/15 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-charcoal">Recent Dictations</h2>
            <span className="px-2 py-0.5 rounded-full bg-darkTeal/10 text-darkTeal font-bold text-[10px] border border-darkTeal/20">
              {history.length}
            </span>
          </div>

          <button
            onClick={() => onNavigateTab('history')}
            className="text-xs font-bold text-darkTeal hover:underline flex items-center gap-1 group"
          >
            <span>View all in History</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {recentHistory.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-charcoal/20 rounded-xl bg-sage/10 space-y-1.5">
            <Clock className="w-6 h-6 mx-auto text-charcoal/40" />
            <p className="text-xs font-bold text-charcoal">No dictations yet</p>
            <p className="text-[11px] text-charcoal/60 max-w-xs mx-auto">
              Hold <kbd className="font-mono font-bold text-darkTeal">{formatShortcut(shortcut)}</kbd> in WhatsApp, Notes, or your browser to dictate.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentHistory.map((item) => {
              const date = new Date(item.timestamp_ms);
              const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const isCopied = copiedId === item.id;
              const wordCount = item.formatted_text.trim().split(/\s+/).filter(Boolean).length;
              const isVault = !item.target_app || item.target_app === 'Clipboard Vault';

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-charcoal/15 hover:border-charcoal/30 bg-white transition-all shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                          isVault
                            ? 'bg-sage/30 text-darkTeal border-darkTeal/20'
                            : 'bg-darkTeal/10 text-darkTeal border-darkTeal/20'
                        }`}
                      >
                        {isVault ? 'Clipboard' : item.target_app}
                      </span>
                      <span className="text-[10px] font-mono text-charcoal/60">
                        {timeStr} • {wordCount} words
                      </span>
                    </div>

                    <div className="flex items-center gap-1 bg-stone-100/90 p-1 rounded-xl border border-charcoal/10 shadow-xs">
                      {/* 1. Enhance Icon Button */}
                      <button
                        onClick={() => setEnhanceHistoryItemId(enhanceHistoryItemId === item.id ? null : item.id)}
                        className={`p-1.5 rounded-lg transition-all active:scale-95 ${
                          enhanceHistoryItemId === item.id
                            ? 'bg-darkTeal text-white shadow-xs'
                            : 'text-charcoal/70 hover:text-amber-700 hover:bg-white'
                        }`}
                        title="Enhance grammar, clarity, or convert to prompt"
                        aria-label="Enhance dictation"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                      </button>

                      {/* 2. Insert into Active Cursor */}
                      <button
                        onClick={() => handleInsertHistoryItem(item.id, item.formatted_text)}
                        className="p-1.5 rounded-lg text-charcoal/70 hover:text-darkTeal hover:bg-white transition-all active:scale-95"
                        title="Insert into active cursor"
                        aria-label="Insert text"
                      >
                        <CornerDownLeft className="w-3.5 h-3.5" />
                      </button>

                      {/* 3. Copy to Clipboard */}
                      <button
                        onClick={() => handleCopyItem(item.id, item.formatted_text)}
                        className="p-1.5 rounded-lg text-charcoal/70 hover:text-darkTeal hover:bg-white transition-all active:scale-95"
                        title="Copy to clipboard"
                        aria-label="Copy text"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      {/* 4. Delete */}
                      <button
                        onClick={() => onDeleteHistory(item.id)}
                        className="p-1.5 rounded-lg text-charcoal/40 hover:text-terracotta hover:bg-white transition-all active:scale-95"
                        title="Delete"
                        aria-label="Delete item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs font-medium text-charcoal leading-relaxed select-text truncate">
                    "{item.formatted_text}"
                  </p>

                  {enhanceHistoryItemId === item.id && (
                    <div className="pt-2">
                      <EnhanceReviewCard
                        originalText={item.formatted_text}
                        historyId={item.id}
                        onAccept={(enhanced) => {
                          setEnhanceHistoryItemId(null);
                          item.formatted_text = enhanced;
                          onCopy(enhanced);
                        }}
                        onInsert={(text) => handleInsertHistoryItem(item.id, text)}
                        onCopy={(text) => onCopy(text)}
                        onDiscard={() => setEnhanceHistoryItemId(null)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
