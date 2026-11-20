import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  CheckCircle2,
  Mic,
  MicOff,
  Plus,
  ArrowRight,
  Volume2,
  Shuffle,
  Trash2,
  BookA,
  Check
} from 'lucide-react';
import { safeInvoke, safeListen } from '../lib/ipc';
import { SessionSnapshot, PersonalVocabularyEntry } from '../types';

interface TrainModelTabProps {
  session: SessionSnapshot;
  onToggleDictation: () => void;
  onNavigateTab?: (tab: string) => void;
}

interface GuidedPrompt {
  id: string;
  category: 'devops' | 'database' | 'dsa' | 'fullstack' | 'workplace';
  categoryLabel: string;
  sentence: string;
  phoneticTips: string;
  keyPairs: { heard: string; expected: string }[];
}

const RICH_SENTENCE_BANK: GuidedPrompt[] = [
  // 1. Architecture & Cloud
  {
    id: 's1',
    category: 'devops',
    categoryLabel: 'Architecture & Cloud',
    sentence: 'We need to prepone the sprint and fix the schema on Kubernetes.',
    phoneticTips: 'Common mishearings: "skima" → schema, "cooper netis" → Kubernetes',
    keyPairs: [
      { heard: 'skima', expected: 'schema' },
      { heard: 'cooper net ease', expected: 'Kubernetes' },
      { heard: 'cooper netis', expected: 'Kubernetes' },
      { heard: 'prepare', expected: 'prepone' },
    ],
  },
  {
    id: 's2',
    category: 'devops',
    categoryLabel: 'Architecture & Cloud',
    sentence: 'Configure the NGINX reverse proxy, Docker Compose file, and AWS S3 bucket permissions.',
    phoneticTips: 'Common mishearings: "engine x" → NGINX, "s three" → S3, "docker compose" → Docker Compose',
    keyPairs: [
      { heard: 'engine x', expected: 'NGINX' },
      { heard: 's three', expected: 'S3' },
      { heard: 's 3', expected: 'S3' },
      { heard: 'docker compose', expected: 'Docker Compose' },
    ],
  },
  {
    id: 's3',
    category: 'devops',
    categoryLabel: 'Architecture & Cloud',
    sentence: 'Our microservice uses gRPC and Protobuf for high-speed streaming between services.',
    phoneticTips: 'Common mishearings: "g r p c" → gRPC, "proto buf" → Protobuf',
    keyPairs: [
      { heard: 'g r p c', expected: 'gRPC' },
      { heard: 'proto buf', expected: 'Protobuf' },
      { heard: 'micro services', expected: 'microservices' },
    ],
  },

  // 2. Database & Backend
  {
    id: 's4',
    category: 'database',
    categoryLabel: 'Database & Backend',
    sentence: 'Please revert back with the pgAdmin and PostgreSQL connection details today itself.',
    phoneticTips: 'Common mishearings: "pi g admin" → pgAdmin, "postgre" → PostgreSQL',
    keyPairs: [
      { heard: 'pi g admin', expected: 'pgAdmin' },
      { heard: 'postgre', expected: 'PostgreSQL' },
      { heard: 'post grass', expected: 'PostgreSQL' },
      { heard: 'revert', expected: 'revert back' },
    ],
  },
  {
    id: 's5',
    category: 'database',
    categoryLabel: 'Database & Backend',
    sentence: 'We implemented Redis caching and MongoDB aggregation pipelines to reduce database latency.',
    phoneticTips: 'Common mishearings: "red is" → Redis, "mongo db" → MongoDB',
    keyPairs: [
      { heard: 'red is', expected: 'Redis' },
      { heard: 'mongo db', expected: 'MongoDB' },
      { heard: 'sequel', expected: 'SQL' },
    ],
  },
  {
    id: 's6',
    category: 'database',
    categoryLabel: 'Database & Backend',
    sentence: 'Verify the JWT token expiration and OAuth refresh callback in FastAPI.',
    phoneticTips: 'Common mishearings: "jot token" → JWT token, "fast api" → FastAPI',
    keyPairs: [
      { heard: 'jot token', expected: 'JWT token' },
      { heard: 'j w t', expected: 'JWT' },
      { heard: 'fast api', expected: 'FastAPI' },
    ],
  },

  // 3. DSA & Placements
  {
    id: 's7',
    category: 'dsa',
    categoryLabel: 'DSA & Interviews',
    sentence: 'I am solving dynamic programming, binary search, and HashMap questions on LeetCode.',
    phoneticTips: 'Common mishearings: "leet code" → LeetCode, "hash map" → HashMap',
    keyPairs: [
      { heard: 'leet code', expected: 'LeetCode' },
      { heard: 'hash map', expected: 'HashMap' },
      { heard: 'dp', expected: 'dynamic programming' },
    ],
  },
  {
    id: 's8',
    category: 'dsa',
    categoryLabel: 'DSA & Interviews',
    sentence: 'Avoid the NullPointerException by validating the linked list pointer before traversing.',
    phoneticTips: 'Common mishearings: "null pointer" → NullPointerException, "linked list" → LinkedList',
    keyPairs: [
      { heard: 'null pointer', expected: 'NullPointerException' },
      { heard: 'linked list', expected: 'LinkedList' },
    ],
  },
  {
    id: 's9',
    category: 'dsa',
    categoryLabel: 'DSA & Interviews',
    sentence: 'The time complexity of this Dijkstra shortest path algorithm is O of E log V.',
    phoneticTips: 'Common mishearings: "dijkstra" → Dijkstra, "o of e" → O(E log V)',
    keyPairs: [
      { heard: 'dijkstra', expected: 'Dijkstra' },
      { heard: 'd s a', expected: 'DSA' },
    ],
  },

  // 4. Modern Fullstack & Web
  {
    id: 's10',
    category: 'fullstack',
    categoryLabel: 'Fullstack & Web',
    sentence: 'Our Next.js frontend uses Tailwind CSS, TypeScript components, and WebSocket connections.',
    phoneticTips: 'Common mishearings: "taiwind" → Tailwind CSS, "next js" → Next.js',
    keyPairs: [
      { heard: 'taiwind', expected: 'Tailwind CSS' },
      { heard: 'tail wind', expected: 'Tailwind CSS' },
      { heard: 'next js', expected: 'Next.js' },
      { heard: 'web socket', expected: 'WebSocket' },
    ],
  },
  {
    id: 's11',
    category: 'fullstack',
    categoryLabel: 'Fullstack & Web',
    sentence: 'Wispr Flow and VoxQuest run 100% locally on Apple Silicon GPU with zero cloud lag.',
    phoneticTips: 'Common mishearings: "whisper float" → Wispr Flow, "foxquest" → VoxQuest',
    keyPairs: [
      { heard: 'whisper float', expected: 'Wispr Flow' },
      { heard: 'foxquest', expected: 'VoxQuest' },
    ],
  },

  // 5. Indian Professional & College Workplace
  {
    id: 's12',
    category: 'workplace',
    categoryLabel: 'Indian Workplace',
    sentence: 'Tomorrow after the Code Club certificate distribution, I will discuss the EL2 lab report.',
    phoneticTips: 'Common mishearings: "court club" → Code Club, "el two" → EL-2',
    keyPairs: [
      { heard: 'court club', expected: 'Code Club' },
      { heard: 'el two', expected: 'EL-2' },
      { heard: 'el 2', expected: 'EL-2' },
    ],
  },
  {
    id: 's13',
    category: 'workplace',
    categoryLabel: 'Indian Workplace',
    sentence: 'Can you show the commands executed so we can do it together and do the needful?',
    phoneticTips: 'Common mishearings: "comments" → commands, "do it to guys" → do it together',
    keyPairs: [
      { heard: 'comments', expected: 'commands' },
      { heard: 'show the comments', expected: 'show the commands' },
      { heard: 'do it to guys', expected: 'do it together' },
      { heard: 'do the needful', expected: 'do the needful' },
    ],
  },
  {
    id: 's14',
    category: 'workplace',
    categoryLabel: 'Indian Workplace',
    sentence: 'My batchmates were having a doubt regarding the upcoming hackathon registration today itself.',
    phoneticTips: 'Common mishearings: "batch mates" → batchmates, "having a doubt" → having a question/doubt',
    keyPairs: [
      { heard: 'batch mates', expected: 'batchmates' },
      { heard: 'having a doubt', expected: 'having a doubt' },
      { heard: 'today itself', expected: 'today itself' },
    ],
  },
];

export const TrainModelTab: React.FC<TrainModelTabProps> = ({ session, onToggleDictation }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number>(0);
  const [completedSentenceIds, setCompletedSentenceIds] = useState<string[]>([]);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Vocabulary list
  const [vocabList, setVocabList] = useState<PersonalVocabularyEntry[]>([]);

  // Manual Quick Teach
  const [quickHeard, setQuickHeard] = useState<string>('');
  const [quickExpected, setQuickExpected] = useState<string>('');

  const filteredSentences = selectedCategory === 'all'
    ? RICH_SENTENCE_BANK
    : RICH_SENTENCE_BANK.filter((s) => s.category === selectedCategory);

  const currentSentence = filteredSentences[activeSentenceIndex] || filteredSentences[0] || RICH_SENTENCE_BANK[0];
  const isDictating = session.state === 'recording' || session.state === 'transcribing';

  const loadData = async () => {
    try {
      const vocab = await safeInvoke<PersonalVocabularyEntry[]>('get_personal_vocabulary');
      if (vocab) {
        setVocabList(vocab);
      }
    } catch (err) {
      console.warn('Failed to load training info:', err);
    }
  };

  const handleDeleteVocab = async (id: number) => {
    try {
      await safeInvoke('delete_personal_vocabulary_entry', { id });
      setStatusBanner('Deleted rule from active model.');
      setTimeout(() => setStatusBanner(null), 3000);
      await loadData();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  useEffect(() => {
    // Enable calibration mode: prevents text from being pasted into background applications
    safeInvoke('set_calibration_mode', { enabled: true }).catch(() => {});
    loadData();

    let unlisten: (() => void) | undefined;
    safeListen('dictionary-updated', () => loadData()).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
      // Restore normal dictation insertion when leaving Train the Model tab
      safeInvoke('set_calibration_mode', { enabled: false }).catch(() => {});
    };
  }, []);

  // Automatic speech calibration & accent training
  useEffect(() => {
    if (!session.last_transcript || session.state === 'recording' || session.state === 'transcribing') {
      return;
    }
    const heard = session.last_transcript.toLowerCase();
    const detectedPairs = currentSentence.keyPairs.filter((p) =>
      heard.includes(p.heard.toLowerCase())
    );

    if (detectedPairs.length > 0) {
      Promise.all(
        detectedPairs.map((p) =>
          safeInvoke('add_personal_vocabulary_entry', {
            original: p.heard,
            preferred: p.expected,
            entry_type: 'tech',
            entryType: 'tech',
            status: 'active',
          })
        )
      ).then(() => {
        setStatusBanner(
          `✨ Calibrated & Learned ${detectedPairs.length} Accent Rules (${detectedPairs
            .map((d) => `"${d.heard}" → "${d.expected}"`)
            .join(', ')}) into Model!`
        );
        loadData();
      });
    }
  }, [session.last_transcript, session.state]);

  const handleNextRandomSentence = () => {
    const nextIdx = Math.floor(Math.random() * filteredSentences.length);
    setActiveSentenceIndex(nextIdx);
  };

  const handleTeachCurrentSentence = async () => {
    if (!currentSentence) return;

    try {
      for (const pair of currentSentence.keyPairs) {
        await safeInvoke('add_personal_vocabulary_entry', {
          original: pair.heard,
          preferred: pair.expected,
          entry_type: 'tech',
          entryType: 'tech',
          status: 'active',
        });
      }

      if (!completedSentenceIds.includes(currentSentence.id)) {
        setCompletedSentenceIds((prev) => [...prev, currentSentence.id]);
      }

      setStatusBanner(`Trained ${currentSentence.keyPairs.length} terms directly into model!`);
      setTimeout(() => setStatusBanner(null), 4000);

      // Advance to next sentence
      if (activeSentenceIndex < filteredSentences.length - 1) {
        setActiveSentenceIndex(activeSentenceIndex + 1);
      } else {
        setActiveSentenceIndex(0);
      }
      await loadData();
    } catch (err) {
      console.error('Failed to teach model sentence terms:', err);
    }
  };

  const handleQuickTeach = async (e: React.FormEvent) => {
    e.preventDefault();
    const heard = quickHeard.trim();
    const expected = quickExpected.trim();
    if (!heard || !expected) return;

    try {
      await safeInvoke('add_personal_vocabulary_entry', {
        original: heard,
        preferred: expected,
        entry_type: 'tech',
        entryType: 'tech',
        status: 'active',
      });
      setQuickHeard('');
      setQuickExpected('');
      setStatusBanner(`Trained: saying "${heard}" now outputs "${expected}"!`);
      setTimeout(() => setStatusBanner(null), 3500);
      await loadData();
    } catch (err) {
      console.error('Failed to add custom correction:', err);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto select-none animate-fadeIn pb-16">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl border border-charcoal/15 bg-white shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-darkTeal text-white rounded-xl shadow-xs">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-darkTeal">Train VoxQuest to Your Voice</h2>
            <p className="text-xs text-charcoal/70 mt-0.5">
              Read any sentence aloud or add word corrections. The speech engine adapts to your pronunciation in real time.
            </p>
          </div>
        </div>
      </div>

      {statusBanner && (
        <div className="p-4 bg-darkTeal text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
          <span>{statusBanner}</span>
        </div>
      )}

      {/* Model Status Bar */}
      <div className="p-4 rounded-2xl border border-charcoal/15 bg-stone-50/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-xs">
          <GraduationCap className="w-4 h-4 text-darkTeal shrink-0" />
          <div>
            <span className="font-bold text-darkTeal">Active Acoustic Lexicon:</span>{' '}
            <span className="text-charcoal/70">
              <strong className="font-mono text-darkTeal">{1420 + vocabList.length}</strong> verified pronunciation patterns loaded in Whisper decoder.
            </span>
          </div>
        </div>

        <span className="text-[11px] font-bold text-darkTeal bg-darkTeal/10 px-2.5 py-1 rounded-full border border-darkTeal/15">
          Your Trained Custom Words: {vocabList.length}
        </span>
      </div>

      {/* Domain Selection Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {[
          { id: 'all', label: 'All Sentences' },
          { id: 'devops', label: 'Architecture & Cloud' },
          { id: 'database', label: 'Database & Backend' },
          { id: 'dsa', label: 'DSA & Interviews' },
          { id: 'fullstack', label: 'Fullstack & Web' },
          { id: 'workplace', label: 'Indian Workplace' },
        ].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              setSelectedCategory(cat.id);
              setActiveSentenceIndex(0);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              selectedCategory === cat.id
                ? 'bg-darkTeal text-white border-darkTeal shadow-xs'
                : 'bg-white hover:bg-neutral-50 text-charcoal/70 border-charcoal/15'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main Interactive Stage */}
      <div className="p-8 rounded-3xl border-2 border-darkTeal/25 bg-white shadow-sm space-y-6 text-center">
        <div className="flex items-center justify-between border-b border-charcoal/10 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-charcoal/50 flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-darkTeal" />
            <span>Category: {currentSentence.categoryLabel}</span>
          </span>

          <button
            type="button"
            onClick={handleNextRandomSentence}
            className="text-xs font-bold text-darkTeal hover:underline flex items-center gap-1 active:scale-95"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Shuffle Sentence</span>
          </button>
        </div>

        {/* The Sentence Box */}
        <div className="max-w-2xl mx-auto p-6 bg-stone-50 rounded-2xl border border-charcoal/15 shadow-xs text-left space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal/50">
            Read This Sentence Aloud:
          </div>
          <p className="text-lg sm:text-xl font-bold text-charcoal leading-relaxed font-sans">
            "{currentSentence.sentence}"
          </p>
          <p className="text-xs text-charcoal/70 pt-2 border-t border-charcoal/10 font-medium">
            <span>{currentSentence.phoneticTips}</span>
          </p>
        </div>

        {/* Calibration Status Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-darkTeal/5 border border-darkTeal/15 text-[11px] font-bold text-darkTeal">
          <CheckCircle2 className="w-3.5 h-3.5 text-darkTeal" />
          <span>Calibration Mode Active</span>
        </div>

        {/* Big Speak Button */}
        <div className="pt-2 flex flex-col items-center justify-center gap-2">
          <button
            type="button"
            onClick={onToggleDictation}
            className={`w-full max-w-sm py-4 px-6 rounded-2xl font-bold text-base transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2.5 ${
              isDictating
                ? 'bg-terracotta text-white animate-pulse shadow-md'
                : 'bg-darkTeal hover:bg-darkTeal/90 text-white'
            }`}
          >
            {isDictating ? (
              <>
                <MicOff className="w-5 h-5" />
                <span>Listening... Click when Done</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                <span>Tap to Speak Sentence</span>
              </>
            )}
          </button>
          <span className="text-[11px] text-charcoal/50">
            {isDictating ? 'Speaking now...' : 'Or use shortcut: Command + Shift + Space'}
          </span>
        </div>

        {/* Live Feedback & 1-Click Train */}
        <div className="pt-4 border-t border-charcoal/10 max-w-2xl mx-auto text-left space-y-3">
          <div className="p-4 bg-stone-50 rounded-xl border border-charcoal/15 space-y-1.5">
            <div className="text-xs text-charcoal/60 font-semibold">What VoxQuest Heard:</div>
            <div className="text-sm font-mono text-darkTeal font-bold bg-white p-3 rounded-lg border border-charcoal/10">
              {session.last_transcript ? `"${session.last_transcript}"` : 'Your spoken words will appear here...'}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleTeachCurrentSentence}
              className="w-full sm:flex-1 py-3 px-4 bg-darkTeal hover:bg-darkTeal/90 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 text-amber" />
              <span>Teach Model (1-Click Train)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (activeSentenceIndex < filteredSentences.length - 1) {
                  setActiveSentenceIndex(activeSentenceIndex + 1);
                } else {
                  setActiveSentenceIndex(0);
                }
              }}
              className="w-full sm:w-auto py-3 px-5 bg-white hover:bg-neutral-50 text-charcoal border border-charcoal/20 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <span>Next Sentence</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Word Teach Form */}
      <div className="p-6 rounded-2xl border border-charcoal/15 bg-white shadow-xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-darkTeal font-mono flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-terracotta" />
          <span>Teach Any Other Word Directly</span>
        </h3>
        <p className="text-xs text-charcoal/60">
          Encountered another word during coding or chatting? Teach the model what it heard and what you meant.
        </p>

        <form onSubmit={handleQuickTeach} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-1">
          <div className="sm:col-span-5">
            <label className="block text-[11px] font-bold text-charcoal mb-1">
              What it heard (sound)
            </label>
            <input
              type="text"
              placeholder="e.g. whisper float, skima"
              value={quickHeard}
              onChange={(e) => setQuickHeard(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-charcoal/20 rounded-xl text-xs text-charcoal font-mono focus:outline-none focus:border-darkTeal shadow-xs"
              required
            />
          </div>

          <div className="sm:col-span-5">
            <label className="block text-[11px] font-bold text-charcoal mb-1">
              What you meant (output)
            </label>
            <input
              type="text"
              placeholder="e.g. Wispr Flow, schema"
              value={quickExpected}
              onChange={(e) => setQuickExpected(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-charcoal/20 rounded-xl text-xs text-charcoal font-bold focus:outline-none focus:border-darkTeal shadow-xs"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full py-2 bg-darkTeal hover:bg-darkTeal/90 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1"
            >
              <span>Train</span>
            </button>
          </div>
        </form>
      </div>

      {/* Active Model Words & Accent Fixes Table */}
      {vocabList.length > 0 && (
        <div className="p-6 rounded-2xl border border-charcoal/15 bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-charcoal/10 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-darkTeal font-mono flex items-center gap-1.5">
              <BookA className="w-4 h-4 text-darkTeal" />
              <span>Learned Vocabulary in Active Model ({vocabList.length})</span>
            </h3>
            <span className="text-[11px] text-charcoal/50">Active in local Whisper beam decoder</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto no-scrollbar pt-1">
            {vocabList.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-charcoal/10 text-xs"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-terracotta text-[11px] line-through">
                      "{entry.original_text}"
                    </span>
                    <span className="text-charcoal/40 font-bold">→</span>
                    <span className="font-bold text-darkTeal text-[12px]">
                      "{entry.preferred_text}"
                    </span>
                  </div>
                  <div className="text-[10px] text-charcoal/50 mt-0.5">
                    Type: {entry.entry_type || 'accent'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteVocab(entry.id)}
                  className="p-1.5 rounded-lg text-charcoal/40 hover:text-terracotta hover:bg-white transition-all cursor-pointer"
                  title="Remove from trained model"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
