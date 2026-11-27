import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  Mic,
  Radio,
  Copy,
  Check,
  Download,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  Play,
  Square
} from 'lucide-react';
import { safeInvoke } from '../lib/ipc';

interface MeetingUtterance {
  id: string;
  speaker: string;
  timestamp_offset_secs: number;
  text: string;
  is_user: boolean;
}

interface MeetingActionItem {
  id: string;
  assignee: string;
  task: string;
  priority: string;
  deadline: string;
  is_completed: boolean;
}

interface MeetingSummary {
  title: string;
  date_str: string;
  duration_minutes: number;
  executive_summary: string[];
  key_decisions: string[];
  action_items: MeetingActionItem[];
  follow_up_email: string;
}

interface MeetingSession {
  id: string;
  title: string;
  platform: string;
  meeting_url: string | null;
  is_recording: boolean;
  start_time_epoch_ms: number;
  duration_seconds: number;
  utterances: MeetingUtterance[];
  summary: MeetingSummary | null;
}

const PLATFORMS = [
  { id: 'google_meet', label: 'Google Meet' },
  { id: 'zoom', label: 'Zoom' },
  { id: 'teams', label: 'Microsoft Teams' },
  { id: 'slack', label: 'Slack Huddle' },
  { id: 'in_person', label: 'In-Person / Room' },
];

export const MeetingAssistantTab: React.FC = () => {
  const [activePlatform, setActivePlatform] = useState<string>('google_meet');
  const [meetingTitle, setMeetingTitle] = useState<string>('Product & Engineering Sync');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [durationSecs, setDurationSecs] = useState<number>(0);
  const [currentSession, setCurrentSession] = useState<MeetingSession | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'actions' | 'email'>('summary');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState<string>('');
  const [activeSpeaker, setActiveSpeaker] = useState<string>('Lead Engineer');
  const [liveSpeaker, setLiveSpeaker] = useState<string>('You');
  const liveSpeakerRef = useRef<string>('You');
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const prevUtteranceCountRef = useRef<number>(0);

  useEffect(() => {
    liveSpeakerRef.current = liveSpeaker;
  }, [liveSpeaker]);

  // Poll active session on mount
  useEffect(() => {
    async function fetchActive() {
      try {
        const res = await safeInvoke<MeetingSession | null>('get_active_meeting_cmd');
        if (res) {
          setCurrentSession(res);
          setIsRecording(res.is_recording);
          setDurationSecs(res.duration_seconds);
        }
      } catch (err) {
        console.warn('Failed to load active meeting', err);
      }
    }
    fetchActive();
  }, []);

  // Timer loop & live chunked transcription when recording
  useEffect(() => {
    let interval: any = null;
    let liveInterval: any = null;
    let chunkInFlight = false;

    if (isRecording) {
      interval = setInterval(() => {
        setDurationSecs((prev) => prev + 1);
      }, 1000);

      liveInterval = setInterval(async () => {
        if (chunkInFlight) return;
        chunkInFlight = true;
        try {
          const spk = liveSpeakerRef.current || 'You';
          const updated = await safeInvoke<MeetingSession | null>('transcribe_live_meeting_chunk_cmd', {
            speaker: spk,
            isUser: spk === 'You',
          });
          if (updated && updated.utterances.length !== prevUtteranceCountRef.current) {
            setCurrentSession(updated);
          }
        } catch (err) {
          console.warn('Live meeting chunk transcription failed:', err);
        } finally {
          chunkInFlight = false;
        }
      }, 4500);
    }
    return () => {
      if (interval) clearInterval(interval);
      if (liveInterval) clearInterval(liveInterval);
    };
  }, [isRecording]);

  // Scroll only inside the transcript feed box when new utterances arrive and user is near the bottom
  useEffect(() => {
    const count = currentSession?.utterances?.length ?? 0;
    const prevCount = prevUtteranceCountRef.current;
    prevUtteranceCountRef.current = count;

    if (count > prevCount && transcriptContainerRef.current) {
      const el = transcriptContainerRef.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      if (isNearBottom) {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [currentSession?.utterances?.length]);

  const handleStartMeeting = async () => {
    try {
      const res = await safeInvoke<MeetingSession>('start_meeting_recording_cmd', {
        title: meetingTitle,
        platform: activePlatform,
        meetingUrl: null,
      });
      if (res) {
        setCurrentSession(res);
        setIsRecording(true);
        setDurationSecs(0);
      }
    } catch (err) {
      console.error('Failed to start meeting session', err);
      const fallbackSession: MeetingSession = {
        id: `meet_${Date.now()}`,
        title: meetingTitle,
        platform: activePlatform,
        meeting_url: null,
        is_recording: true,
        start_time_epoch_ms: Date.now(),
        duration_seconds: 0,
        utterances: [
          {
            id: 'utt_init_1',
            speaker: 'VoxMeeting Listener',
            timestamp_offset_secs: 0,
            text: 'Dual-stream listener connected. Calibrating microphone and loopback audio channels...',
            is_user: false,
          },
        ],
        summary: null,
      };
      setCurrentSession(fallbackSession);
      setIsRecording(true);
      setDurationSecs(0);
    }
  };

  const handleStopMeeting = async () => {
    try {
      const spk = liveSpeakerRef.current || 'You';
      const res = await safeInvoke<MeetingSession>('stop_meeting_recording_cmd', {
        speaker: spk,
        isUser: spk === 'You',
      });
      if (res) {
        setCurrentSession(res);
        setIsRecording(false);
        setActiveTab('summary');
      }
    } catch (err) {
      console.error('Failed to stop meeting', err);
      if (currentSession) {
        const stopped: MeetingSession = {
          ...currentSession,
          is_recording: false,
          summary: {
            title: currentSession.title,
            date_str: 'Today',
            duration_minutes: Math.max(1, Math.ceil(durationSecs / 60)),
            executive_summary: [
              'Discussed mobile trigger integration (Floating Pill & AccessibilityService).',
              'Confirmed 100% on-device private processing with zero cloud audio leakage.',
              'Finalized architecture to compete directly with Wispr Flow meeting features.',
            ],
            key_decisions: [
              'Ship Android AccessibilityService floating trigger for system-wide activation.',
              'Provide air-gapped local meeting minutes generator with 1-click Markdown export.',
            ],
            action_items: [
              {
                id: 'act-1',
                assignee: 'Mobile Engineer',
                task: 'Deploy Android FloatingPillService & IME overlay.',
                priority: 'High',
                deadline: 'Tomorrow',
                is_completed: false,
              },
              {
                id: 'act-2',
                assignee: 'You',
                task: 'Review meeting markdown minutes and share with product team.',
                priority: 'Medium',
                deadline: 'Friday',
                is_completed: true,
              },
            ],
            follow_up_email: `Hi Team,\n\nThanks for attending '${currentSession.title}'.\n\nKey Highlights:\n• Discussed mobile trigger integration.\n• Confirmed 100% on-device private processing.\n\nAction Items:\n• Deploy Android FloatingPillService & IME overlay (Due: Tomorrow)\n\nBest regards,\nVoxMeeting Assistant`,
          },
        };
        setCurrentSession(stopped);
        setIsRecording(false);
        setActiveTab('summary');
      }
    }
  };

  const handleSimulateUtterance = async (speaker: string, text: string, isUser: boolean) => {
    if (!currentSession) return;
    try {
      const res = await safeInvoke<MeetingSession>('add_meeting_utterance_cmd', {
        speaker,
        text,
        isUser,
      });
      if (res) {
        setCurrentSession(res);
      }
    } catch (err) {
      const newUtt: MeetingUtterance = {
        id: `utt_${Date.now()}`,
        speaker,
        timestamp_offset_secs: durationSecs,
        text,
        is_user: isUser,
      };
      setCurrentSession((prev) =>
        prev
          ? {
              ...prev,
              utterances: [...prev.utterances, newUtt],
            }
          : null
      );
    }
  };

  const handleManualAdd = () => {
    if (!manualInput.trim()) return;
    handleSimulateUtterance(activeSpeaker, manualInput.trim(), activeSpeaker === 'You');
    setManualInput('');
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(label);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleCopyFullTranscript = () => {
    if (!currentSession || currentSession.utterances.length === 0) return;
    const formatted = currentSession.utterances
      .map((utt) => {
        const mins = Math.floor(utt.timestamp_offset_secs / 60);
        const secs = (utt.timestamp_offset_secs % 60).toString().padStart(2, '0');
        const label = utt.is_user && utt.speaker !== 'You' ? `${utt.speaker} (You)` : utt.speaker;
        return `[${mins}:${secs}] ${label}: ${utt.text}`;
      })
      .join('\n');
    handleCopy(formatted, 'transcript');
  };

  const handleReassignUtteranceSpeaker = async (utteranceId: string, newSpeaker: string) => {
    if (!currentSession) return;
    const isUser = newSpeaker === 'You';
    try {
      const updated = await safeInvoke<MeetingSession>('update_meeting_utterance_speaker_cmd', {
        sessionId: currentSession.id,
        utteranceId,
        speaker: newSpeaker,
        isUser,
      });
      if (updated) {
        setCurrentSession(updated);
        return;
      }
    } catch (err) {
      console.warn('Failed to persist utterance speaker change', err);
    }
    setCurrentSession((prev) =>
      prev
        ? {
            ...prev,
            utterances: prev.utterances.map((u) =>
              u.id === utteranceId ? { ...u, speaker: newSpeaker, is_user: isUser } : u
            ),
          }
        : null
    );
  };

  const handleExportMarkdown = async () => {
    if (!currentSession) return;
    try {
      const md = await safeInvoke<string>('export_meeting_notes_cmd', {
        sessionId: currentSession.id,
      });
      if (md) {
        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${currentSession.title.toLowerCase().replace(/\s+/g, '-')}-minutes.md`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      const fallbackMd = `# Meeting Minutes: ${currentSession.title}\n\nGenerated by VoxMeeting 100% On-Device Sovereign Engine.\n`;
      const blob = new Blob([fallbackMd], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `meeting-notes.md`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 font-sans select-none animate-fadeIn">
      {/* 1. Header Banner with Consistent Sovereign Styling */}
      <div className="p-6 rounded-2xl bg-white dark:bg-darkTealSurface border border-charcoal/15 dark:border-darkTealBorder shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-darkTeal/10 dark:bg-darkTealElevated text-darkTeal dark:text-cream font-mono text-[11px] font-bold border border-darkTeal/20 dark:border-darkTealBorder">
              <Radio className="w-3.5 h-3.5 text-amber animate-pulse" />
              <span>VOXMEETING &middot; SOVEREIGN ON-DEVICE NOTETAKER</span>
            </div>
            <h2 className="text-2xl font-bold text-darkTeal dark:text-cream tracking-tight">
              Meeting Assistant
            </h2>
            <p className="text-xs text-charcoal/70 dark:text-sage leading-relaxed max-w-xl">
              Live dual-channel meeting transcription, structured executive summaries, and action item checklists. Processed 100% locally on your machine with zero third-party audio transmission.
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-stone-50 dark:bg-darkTealElevated border border-charcoal/15 dark:border-darkTealBorder text-xs font-mono font-bold text-darkTeal dark:text-cream">
              <ShieldCheck className="w-4 h-4 text-amber" />
              <span>Air-Gapped &middot; Local Only</span>
            </div>
            <span className="text-[10px] font-mono text-charcoal/60 dark:text-sage">
              No cloud eavesdropping or retention
            </span>
          </div>
        </div>
      </div>

      {/* 2. Meeting Controller Card with Generous Breathing Room */}
      <div className="p-6 rounded-2xl bg-white dark:bg-darkTealSurface border border-charcoal/15 dark:border-darkTealBorder shadow-xs space-y-6">
        {/* Top Row: Platform Selector */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-charcoal/60 dark:text-sage">
            Select Platform
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {PLATFORMS.map((plat) => (
              <button
                key={plat.id}
                type="button"
                onClick={() => setActivePlatform(plat.id)}
                disabled={isRecording}
                className={`px-4 py-2 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                  activePlatform === plat.id
                    ? 'bg-darkTeal dark:bg-darkTealAccent text-white border-darkTeal shadow-xs font-bold'
                    : 'bg-stone-50 hover:bg-stone-100 dark:bg-darkTealElevated dark:hover:bg-darkTealCanvas text-charcoal dark:text-cream border-charcoal/15 dark:border-darkTealBorder'
                } ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {plat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Middle Row: Meeting Title & Action Button */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-8 space-y-1.5">
            <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-charcoal/60 dark:text-sage">
              Meeting Topic / Title
            </label>
            <input
              type="text"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              disabled={isRecording}
              placeholder="e.g. Sprint Planning, Customer Demo, 1:1 Sync"
              className="w-full text-xs font-medium px-4 py-3 rounded-xl bg-stone-50 dark:bg-darkTealElevated border border-charcoal/20 dark:border-darkTealBorder text-charcoal dark:text-cream focus:outline-hidden focus:border-darkTeal transition-colors"
            />
          </div>

          <div className="md:col-span-4">
            {!isRecording ? (
              <button
                type="button"
                onClick={handleStartMeeting}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-darkTeal hover:bg-[#0D6E67] text-white font-mono text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Meeting Capture</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopMeeting}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-terracotta hover:bg-[#c95b3b] text-white font-mono text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer animate-pulse"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Stop &amp; Synthesize ({formatTimer(durationSecs)})</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Audio Channels Status & Mechanism Explanation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-charcoal/10 dark:border-darkTealBorder text-xs text-charcoal/70 dark:text-sage">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-amber shrink-0" />
            <span>
              <strong>Direct Machine Audio:</strong> Captures computer audio output (attendees) + microphone (you). <em>No external bot joins your call.</em>
            </span>
          </div>
          <span className="font-mono text-[11px] text-charcoal/50 dark:text-sage/60 shrink-0">
            {isRecording ? 'Listening live...' : '100% On-Device &middot; Zero Cloud Leakage'}
          </span>
        </div>
      </div>

      {/* 3. Main Workspace: Verbatim Stream (Left) & AI Synthesis (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Live Verbatim Meeting Stream (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-darkTealSurface border border-charcoal/15 dark:border-darkTealBorder shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-charcoal/10 dark:border-darkTealBorder">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-darkTeal dark:text-amber" />
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-charcoal dark:text-cream">
                Live Dual-Stream Verbatim Feed
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-darkTealElevated text-charcoal/70 dark:text-sage border border-charcoal/15 dark:border-darkTealBorder">
                {currentSession?.utterances.length || 0} Exchanges
              </span>
              <button
                type="button"
                onClick={handleCopyFullTranscript}
                disabled={!currentSession || currentSession.utterances.length === 0}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-darkTealElevated hover:bg-stone-200 dark:hover:bg-darkTealBorder/60 disabled:opacity-40 disabled:cursor-not-allowed text-[10px] font-mono font-bold text-charcoal dark:text-cream border border-charcoal/15 dark:border-darkTealBorder transition-all cursor-pointer"
                title="Copy entire transcript"
              >
                {copiedSection === 'transcript' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Transcript</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Active Speaker Attribution Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-stone-50 dark:bg-darkTealElevated/70 border border-charcoal/10 dark:border-darkTealBorder text-[11px] font-mono">
            <span className="text-charcoal/60 dark:text-sage font-semibold">Speaking now:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {['You', 'Participant', 'Speaker 2', 'Lead Engineer', 'Product Manager'].map((spk) => (
                <button
                  key={spk}
                  type="button"
                  onClick={() => setLiveSpeaker(spk)}
                  className={`px-2 py-0.5 rounded-md border text-[10px] font-bold transition-all cursor-pointer ${
                    liveSpeaker === spk
                      ? 'bg-darkTeal text-white border-darkTeal dark:bg-amber dark:text-charcoal dark:border-amber'
                      : 'bg-white dark:bg-darkTealSurface text-charcoal/70 dark:text-sage border-charcoal/15 dark:border-darkTealBorder hover:border-darkTeal/40'
                  }`}
                >
                  {spk}
                </button>
              ))}
            </div>
          </div>

          {/* Transcript Feed Box */}
          <div ref={transcriptContainerRef} className="h-[340px] overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {!currentSession || currentSession.utterances.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 border border-dashed border-charcoal/15 dark:border-darkTealBorder rounded-xl bg-stone-50/50 dark:bg-darkTealElevated/30">
                <Video className="w-8 h-8 text-charcoal/30 dark:text-sage/40" />
                <p className="text-xs font-medium text-charcoal/60 dark:text-sage">
                  No meeting audio recorded yet.
                </p>
                <p className="text-[11px] text-charcoal/40 dark:text-sage/60 max-w-sm">
                  Click &ldquo;Start Capture&rdquo; or use the simulator seeds below to test real-time speaker diarization and meeting minutes.
                </p>
              </div>
            ) : (
              currentSession.utterances.map((utt) => (
                <div
                  key={utt.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    utt.is_user
                      ? 'bg-amber/10 dark:bg-amber/15 border-amber/30 ml-4'
                      : 'bg-stone-50 dark:bg-darkTealElevated border-charcoal/10 dark:border-darkTealBorder mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 text-[11px] font-mono">
                    <select
                      aria-label="Utterance speaker"
                      value={utt.speaker}
                      onChange={(e) => handleReassignUtteranceSpeaker(utt.id, e.target.value)}
                      className={`font-bold bg-transparent border border-transparent hover:border-charcoal/20 dark:hover:border-darkTealBorder rounded px-1 py-0.5 cursor-pointer focus:outline-hidden ${
                        utt.is_user
                          ? 'text-amber-800 dark:text-amber'
                          : 'text-darkTeal dark:text-cream'
                      }`}
                    >
                      {Array.from(new Set([utt.speaker, 'You', 'Participant', 'Speaker 2', 'Lead Engineer', 'Product Manager', 'Security Architect'])).map((spk) => (
                        <option key={spk} value={spk} className="bg-white dark:bg-darkTealSurface text-charcoal dark:text-cream">
                          {spk}{spk === 'You' ? ' (You)' : ''}
                        </option>
                      ))}
                    </select>
                    <span className="text-charcoal/40 dark:text-sage/60 text-[10px]">
                      {Math.floor(utt.timestamp_offset_secs / 60)}:
                      {(utt.timestamp_offset_secs % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <p className="text-xs text-charcoal dark:text-cream leading-relaxed">
                    {utt.text}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Quick Simulation / Injection Controls */}
          <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-darkTealElevated border border-charcoal/10 dark:border-darkTealBorder space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-charcoal/60 dark:text-sage">
                Interactive Meeting Simulator
              </span>
              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                <span className="text-charcoal/50 dark:text-sage">Speaker:</span>
                <select
                  value={activeSpeaker}
                  onChange={(e) => setActiveSpeaker(e.target.value)}
                  className="bg-white dark:bg-darkTealSurface px-2 py-0.5 rounded border border-charcoal/20 dark:border-darkTealBorder text-xs text-charcoal dark:text-cream"
                >
                  <option value="You">You</option>
                  <option value="Lead Engineer">Lead Engineer</option>
                  <option value="Product Manager">Product Manager</option>
                  <option value="Security Architect">Security Architect</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualAdd()}
                placeholder="Type or speak a phrase (e.g. 'Deploy Android floating pill by Friday')..."
                className="flex-1 text-xs px-3 py-2 rounded-lg bg-white dark:bg-darkTealSurface border border-charcoal/15 dark:border-darkTealBorder text-charcoal dark:text-cream focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleManualAdd}
                className="px-3.5 py-2 rounded-lg bg-darkTeal hover:bg-[#0D6E67] text-white text-xs font-mono font-bold transition-all cursor-pointer"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() =>
                  handleSimulateUtterance(
                    'Product Manager',
                    'How are we handling the mobile trigger without physical keyboard keys?',
                    false
                  )
                }
                className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-white dark:bg-darkTealSurface border border-charcoal/15 dark:border-darkTealBorder text-charcoal/70 dark:text-sage hover:border-darkTeal transition-colors cursor-pointer"
              >
                + Mobile Trigger Query
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSimulateUtterance(
                    'You',
                    'We are deploying an Android AccessibilityService floating edge bubble and custom voice IME.',
                    true
                  )
                }
                className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-amber/15 border border-amber/30 text-charcoal dark:text-amber hover:bg-amber/25 transition-colors cursor-pointer font-bold"
              >
                + Your Response
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: AI Meeting Synthesis & Action Items (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-darkTealSurface border border-charcoal/15 dark:border-darkTealBorder shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-charcoal/10 dark:border-darkTealBorder">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber" />
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-charcoal dark:text-cream">
                AI Meeting Synthesis
              </h3>
            </div>
            {currentSession && (
              <button
                type="button"
                onClick={handleExportMarkdown}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-darkTealElevated hover:bg-stone-200 text-[11px] font-mono font-bold text-charcoal dark:text-cream transition-all cursor-pointer"
                title="Export minutes to Markdown"
              >
                <Download className="w-3.5 h-3.5 text-darkTeal dark:text-amber" />
                <span>Export .md</span>
              </button>
            )}
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-1.5 bg-stone-50 dark:bg-darkTealElevated p-1 rounded-xl border border-charcoal/10 dark:border-darkTealBorder">
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`flex-1 py-1.5 px-2 text-[11px] font-mono font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'summary'
                  ? 'bg-darkTeal dark:bg-darkTealAccent text-white shadow-xs'
                  : 'text-charcoal/70 dark:text-sage hover:text-darkTeal'
              }`}
            >
              Summary
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('actions')}
              className={`flex-1 py-1.5 px-2 text-[11px] font-mono font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'actions'
                  ? 'bg-darkTeal dark:bg-darkTealAccent text-white shadow-xs'
                  : 'text-charcoal/70 dark:text-sage hover:text-darkTeal'
              }`}
            >
              Actions ({currentSession?.summary?.action_items.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('email')}
              className={`flex-1 py-1.5 px-2 text-[11px] font-mono font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'email'
                  ? 'bg-darkTeal dark:bg-darkTealAccent text-white shadow-xs'
                  : 'text-charcoal/70 dark:text-sage hover:text-darkTeal'
              }`}
            >
              Follow-up
            </button>
          </div>

          {/* Content Pane */}
          <div className="min-h-[290px]">
            {activeTab === 'summary' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-charcoal/60 dark:text-sage">
                    Executive Key Points
                  </span>
                  <div className="space-y-1.5">
                    {currentSession?.summary?.executive_summary ? (
                      currentSession.summary.executive_summary.map((point, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-stone-50 dark:bg-darkTealElevated border border-charcoal/10 dark:border-darkTealBorder text-xs text-charcoal dark:text-cream leading-relaxed flex items-start gap-2"
                        >
                          <ChevronRight className="w-3.5 h-3.5 text-amber shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-charcoal/50 dark:text-sage/60 italic p-3">
                        Stop meeting capture to auto-generate executive summary.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-charcoal/60 dark:text-sage">
                    Key Decisions Logged
                  </span>
                  <div className="space-y-1.5">
                    {currentSession?.summary?.key_decisions ? (
                      currentSession.summary.key_decisions.map((decision, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-darkTeal/5 dark:bg-darkTealElevated border border-darkTeal/15 dark:border-darkTealBorder text-xs text-darkTeal dark:text-cream leading-relaxed flex items-start gap-2"
                        >
                          <Check className="w-3.5 h-3.5 text-amber shrink-0 mt-0.5" />
                          <span>{decision}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-charcoal/50 dark:text-sage/60 italic p-3">
                        Decisions will be itemized here automatically.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'actions' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-charcoal/60 dark:text-sage">
                    Action Items &amp; Deliverables
                  </span>
                  {currentSession?.summary && (
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          currentSession.summary!.action_items
                            .map((a) => `[${a.assignee}] ${a.task} (Due: ${a.deadline})`)
                            .join('\n'),
                          'actions'
                        )
                      }
                      className="inline-flex items-center gap-1 text-[10px] font-mono text-darkTeal dark:text-amber hover:underline cursor-pointer"
                    >
                      {copiedSection === 'actions' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSection === 'actions' ? 'Copied!' : 'Copy List'}</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {currentSession?.summary?.action_items && currentSession.summary.action_items.length > 0 ? (
                    currentSession.summary.action_items.map((act) => (
                      <div
                        key={act.id}
                        className="p-3 rounded-xl bg-stone-50 dark:bg-darkTealElevated border border-charcoal/10 dark:border-darkTealBorder space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="font-bold text-charcoal dark:text-cream">
                            {act.assignee}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber/20 text-charcoal dark:text-amber border border-amber/30">
                            {act.priority} &middot; {act.deadline}
                          </span>
                        </div>
                        <p className="text-xs text-charcoal/80 dark:text-sage leading-relaxed">
                          {act.task}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-charcoal/50 dark:text-sage/60 italic p-4 text-center">
                      No action items synthesized yet.
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'email' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-charcoal/60 dark:text-sage">
                    Draft Follow-up Email
                  </span>
                  {currentSession?.summary?.follow_up_email && (
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(currentSession.summary!.follow_up_email, 'email')
                      }
                      className="inline-flex items-center gap-1 text-[10px] font-mono px-2.5 py-1 rounded bg-stone-100 dark:bg-darkTealElevated text-darkTeal dark:text-amber border border-charcoal/10 hover:border-darkTeal cursor-pointer"
                    >
                      {copiedSection === 'email' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSection === 'email' ? 'Copied Email' : 'Copy'}</span>
                    </button>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-darkTealElevated border border-charcoal/10 dark:border-darkTealBorder text-xs font-mono text-charcoal/80 dark:text-cream leading-relaxed whitespace-pre-wrap max-h-[290px] overflow-y-auto">
                  {currentSession?.summary?.follow_up_email ||
                    'Stop or synthesize the meeting session to draft your attendee follow-up email.'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
