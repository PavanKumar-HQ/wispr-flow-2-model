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
  ArrowRight,
  Zap,
  Edit3
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
  interactionMode?: string;
  onUpdateInteractionMode?: (mode: 'push_to_talk' | 'toggle') => void;
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
  interactionMode = 'push_to_talk',
  onUpdateInteractionMode,
  onCopy,
  onDeleteHistory,
  onClearHistory: _onClearHistory,
  onToggleDictation,
  onNavigateTab,
  onSummonPill,
}) => {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [activeTeachId, setActiveTeachId] = useState<number | null>(null);
  const [teachTexts, setTeachTexts] = useState<{ [id: number]: string }>({});
  const [teachLearnedId, setTeachLearnedId] = useState<number | null>(null);

  const handleSaveTeach = async (id: number, origText: string) => {
    const newText = teachTexts[id];
    if (newText !== undefined && newText.trim() && newText.trim() !== origText.trim()) {
      try {
        await safeInvoke('update_recovery_text', { id, newText: newText.trim() });
        await safeInvoke('add_personal_vocabulary_entry', {
          original: origText.trim(),
          preferred: newText.trim(),
          entry_type: 'tech',
          status: 'active',
        });
        setTeachLearnedId(id);
        setActiveTeachId(null);
        setTimeout(() => setTeachLearnedId(null), 3000);
      } catch (err) {
        console.warn('Failed to teach vocabulary:', err);
      }
    } else {
      setActiveTeachId(null);
    }
  };
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
          className="tactile-btn tactile-btn-teal px-3.5 py-2 text-xs font-bold shrink-0"
          title="Bring the floating pill onto your screen"
        >
          <LocateFixed className="w-3.5 h-3.5 text-amber" />
          <span>Summon Pill</span>
        </button>
      </div>

      {/* Proactive Adaptive Model Shifting Suggestion */}
      {session.technical_suggestion && (
        <div className="bg-gradient-to-r from-amber/20 via-amber/10 to-transparent border-2 border-amber/60 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber/30 rounded-xl text-charcoal border border-amber/50 shrink-0 mt-0.5 shadow-xs">
              <Zap className="w-4 h-4 text-darkTeal" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-darkTeal text-amber px-2 py-0.5 rounded-md shadow-xs">
                  Adaptive Intelligence
                </span>
                {session.active_model_name && (
                  <span className="text-[11px] text-charcoal/70">
                    Active: <strong className="text-charcoal">{session.active_model_name}</strong>
                  </span>
                )}
              </div>
              <p className="text-xs text-charcoal mt-1 font-medium leading-relaxed">
                {session.technical_suggestion}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={async () => {
                const targetProfile = session.technical_suggestion?.includes('Developer') ? 'developer' : 'balanced';
                await safeInvoke('switch_speech_profile', { profile: targetProfile });
              }}
              className="tactile-btn tactile-btn-primary px-3.5 py-1.5 text-xs font-bold"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{session.technical_suggestion?.includes('Developer') ? 'Switch to Developer' : 'Switch to Balanced'}</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                await safeInvoke('dismiss_technical_suggestion');
              }}
              className="tactile-btn tactile-btn-surface px-3 py-1.5 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* 2. Interactive Voice Dictation Canvas */}
      <div className="bg-[#1A332E] text-cream border-2 border-darkTeal/40 rounded-2xl p-5 sm:p-6 shadow-md relative overflow-hidden space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-[10px] font-bold text-amber uppercase tracking-wider bg-black/40 px-2.5 py-0.5 rounded-full border border-amber/30 shadow-xs">
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
            className={`tactile-btn px-6 py-3.5 text-xs font-bold transition-all shadow-md active:scale-95 ${
              isRecording
                ? 'tactile-btn-danger animate-pulse'
                : isTranscribing
                ? 'tactile-btn-primary opacity-90 cursor-wait'
                : 'tactile-btn-primary'
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

        {/* Activation Mode Selector: Push-to-Talk vs Toggle */}
        <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-cream/80 text-[11px]">
            <span className="font-bold text-amber">Activation Mode:</span>
            <span>{interactionMode === 'push_to_talk' ? 'Hold shortcut while speaking, release to paste' : 'Tap shortcut once to speak hands-free, tap again to paste'}</span>
          </div>

          <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => onUpdateInteractionMode && onUpdateInteractionMode('push_to_talk')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                interactionMode === 'push_to_talk'
                  ? 'bg-amber text-charcoal shadow-sm'
                  : 'text-cream/70 hover:text-white hover:bg-white/10'
              }`}
              title="Hold key to talk, release key to paste"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Hold to Talk</span>
            </button>
            <button
              type="button"
              onClick={() => onUpdateInteractionMode && onUpdateInteractionMode('toggle')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                interactionMode !== 'push_to_talk'
                  ? 'bg-amber text-charcoal shadow-sm'
                  : 'text-cream/70 hover:text-white hover:bg-white/10'
              }`}
              title="Tap shortcut once to speak, tap again to paste"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Tap to Toggle</span>
            </button>
          </div>
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

            {/* Action Buttons: Paste to App, Enhance, Spec Builder, Copy */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (session.last_transcript) {
                    safeInvoke('insert_into_selected_field', { id: session.recovery_id || 0, text: session.last_transcript });
                  }
                }}
                className="tactile-btn tactile-btn-primary px-4 py-2 text-xs font-bold"
                title="Paste directly into your active app at your cursor position"
              >
                <CornerDownLeft className="w-3.5 h-3.5 text-darkTeal" />
                <span>Paste to App</span>
              </button>

              <button
                type="button"
                onClick={() => setShowEnhanceSession(!showEnhanceSession)}
                className={`tactile-btn px-4 py-2 text-xs font-bold ${
                  showEnhanceSession
                    ? 'tactile-btn-teal'
                    : 'tactile-btn-dark-subtle'
                }`}
                title="Enhance clarity, grammar, and phrasing without inventing facts"
                aria-label="Enhance dictated text"
              >
                <Wand2 className="w-3.5 h-3.5 text-amber shrink-0" />
                <span>{showEnhanceSession ? 'Close Enhance' : 'Enhance Text'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopySessionText}
                className="tactile-btn tactile-btn-dark-subtle px-3.5 py-2 text-xs font-bold ml-auto"
                title="Copy to clipboard"
                aria-label="Copy transcript"
              >
                {copiedSessionText ? <Check className="w-3.5 h-3.5 text-amber" /> : <Copy className="w-3.5 h-3.5 text-cream" />}
                <span>{copiedSessionText ? 'Copied' : 'Copy'}</span>
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

      {/* 4. Recent Dictations (Clean, modern & seamless) */}
      <div className="bg-white border border-charcoal/10 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-charcoal">Recent Dictations</h2>
            <span className="px-2 py-0.5 rounded-full bg-darkTeal/10 text-darkTeal font-bold text-[10px]">
              {history.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('history')}
            className="px-3 py-1.5 rounded-xl border border-charcoal/20 bg-white hover:bg-neutral-50 hover:border-darkTeal/40 text-darkTeal font-semibold text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
            title="Open complete dictation history"
          >
            <span>View all in History</span>
            <ArrowRight className="w-3.5 h-3.5 text-darkTeal" />
          </button>
        </div>

        {recentHistory.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-charcoal/15 rounded-xl bg-sage/5 space-y-1.5">
            <Clock className="w-6 h-6 mx-auto text-charcoal/30" />
            <p className="text-xs font-bold text-charcoal">No dictations yet</p>
            <p className="text-[11px] text-charcoal/60 max-w-xs mx-auto">
              Hold <kbd className="font-mono font-bold text-darkTeal">{formatShortcut(shortcut)}</kbd> in WhatsApp, Notes, or your browser to dictate.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-charcoal/10">
            {recentHistory.map((item) => {
              const date = new Date(item.timestamp_ms);
              const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const isCopied = copiedId === item.id;
              const wordCount = item.formatted_text.trim().split(/\s+/).filter(Boolean).length;
              const isVault = !item.target_app || item.target_app === 'Clipboard Vault';

              return (
                <div
                  key={item.id}
                  className="py-3 first:pt-0 last:pb-0 space-y-2 group transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] shrink-0 whitespace-nowrap ${
                          isVault
                            ? 'bg-sage/30 text-darkTeal'
                            : 'bg-darkTeal/10 text-darkTeal'
                        }`}
                      >
                        {isVault ? 'Clipboard' : item.target_app}
                      </span>
                      <span className="text-[11px] font-mono text-charcoal/60 shrink-0 whitespace-nowrap">
                        {timeStr} • {wordCount} words
                      </span>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap sm:justify-end">
                      {/* 1. Paste - Single clear accent button */}
                      <button
                        type="button"
                        onClick={() => handleInsertHistoryItem(item.id, item.formatted_text)}
                        className="tactile-btn tactile-btn-xs tactile-btn-teal shrink-0"
                        title="Paste directly into your active app at cursor position"
                        aria-label="Paste to App"
                      >
                        <CornerDownLeft className="w-3 h-3" />
                        <span>Paste</span>
                      </button>

                      {/* 2. Enhance - Ghost action */}
                      <button
                        type="button"
                        onClick={() => setEnhanceHistoryItemId(enhanceHistoryItemId === item.id ? null : item.id)}
                        className={`ghost-action-btn shrink-0 ${
                          enhanceHistoryItemId === item.id
                            ? 'bg-amber/20 text-charcoal font-bold'
                            : ''
                        }`}
                        title="Enhance grammar, clarity, or convert to prompt"
                        aria-label="Enhance dictation"
                      >
                        <Wand2 className="w-3.5 h-3.5 text-amber-700" />
                        <span>Enhance</span>
                      </button>

                      {/* 3. Copy - Icon-only */}
                      <button
                        type="button"
                        onClick={() => handleCopyItem(item.id, item.formatted_text)}
                        className="ghost-action-btn p-1.5 text-charcoal/70 hover:text-darkTeal shrink-0"
                        title={isCopied ? 'Copied to clipboard!' : 'Copy to clipboard'}
                        aria-label="Copy text"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-darkTeal" />}
                      </button>

                      {/* 4. Teach - Ghost action */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTeachId(activeTeachId === item.id ? null : item.id);
                          if (teachTexts[item.id] === undefined) {
                            setTeachTexts((prev) => ({ ...prev, [item.id]: item.formatted_text }));
                          }
                        }}
                        className="ghost-action-btn shrink-0"
                        title="Teach preferred spelling"
                        aria-label="Teach vocabulary"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-darkTeal" />
                        <span>Teach</span>
                      </button>

                      {/* 5. Delete - Ghost action */}
                      <button
                        type="button"
                        onClick={() => onDeleteHistory(item.id)}
                        className="ghost-action-btn ghost-action-btn-danger p-1 text-charcoal/40 hover:text-terracotta shrink-0"
                        title="Delete item"
                        aria-label="Delete item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {activeTeachId === item.id ? (
                    <div className="space-y-2 mt-2 bg-stone-50 p-2.5 rounded-xl border border-charcoal/15">
                      <input
                        type="text"
                        value={teachTexts[item.id] !== undefined ? teachTexts[item.id] : item.formatted_text}
                        onChange={(e) => setTeachTexts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        className="w-full text-xs font-mono p-2 rounded-lg border border-charcoal/20 bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-darkTeal/20 focus:border-darkTeal"
                        placeholder="Corrected spelling or phrase..."
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-charcoal/70">
                          Teaches VoxQuest preferred phrasing for future dictations.
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveTeachId(null)}
                            className="px-2.5 py-1 text-xs font-medium text-charcoal/70 hover:text-charcoal"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveTeach(item.id, item.formatted_text)}
                            className="tactile-btn tactile-btn-xs tactile-btn-teal"
                          >
                            <Check className="w-3 h-3" />
                            <span>Save & Teach</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[13px] font-medium text-charcoal/90 leading-relaxed select-text">
                      "{item.formatted_text}"
                    </p>
                  )}

                  {teachLearnedId === item.id && (
                    <div className="mt-1.5 text-[11px] font-bold text-darkTeal bg-darkTeal/10 px-2.5 py-0.5 rounded-lg border border-darkTeal/20 inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-darkTeal" />
                      <span>Correction saved to Personal Vocabulary!</span>
                    </div>
                  )}

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
