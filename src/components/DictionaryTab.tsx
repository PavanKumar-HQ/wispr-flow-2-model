import React, { useState, useEffect } from 'react';
import { BookA, Plus, Trash2, Search, Tag, Check, Info, CheckCircle2, XCircle, RotateCcw, Download, Mail, Phone, Link2, Zap, Box, FolderCode, RefreshCw, Pencil } from 'lucide-react';
import { safeInvoke, safeListen } from '../lib/ipc';
import { DictionaryEntry, PersonalVocabularyEntry, IngestCapsuleResult } from '../types';

export const DictionaryTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'candidates' | 'snippets' | 'add' | 'capsules'>('active');
  const [capsuleName, setCapsuleName] = useState<string>('wispr-flow');
  const [capsuleResult, setCapsuleResult] = useState<IngestCapsuleResult | null>(null);
  const [isIngesting, setIsIngesting] = useState<boolean>(false);
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [vocabEntries, setVocabEntries] = useState<PersonalVocabularyEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Smart voice snippet shortcuts state
  const [snippetEmail, setSnippetEmail] = useState<string>('');
  const [snippetPhone, setSnippetPhone] = useState<string>('');
  const [snippetCalendar, setSnippetCalendar] = useState<string>('');
  const [customSnippetTrigger, setCustomSnippetTrigger] = useState<string>('');
  const [customSnippetExpansion, setCustomSnippetExpansion] = useState<string>('');

  // New entry form state
  const [original, setOriginal] = useState<string>('');
  const [replacement, setReplacement] = useState<string>('');
  const [category, setCategory] = useState<string>('name');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Inline edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editOriginal, setEditOriginal] = useState<string>('');
  const [editReplacement, setEditReplacement] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('name');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const handleStartEdit = (entry: { id: number; original: string; replacement: string; category: string }) => {
    setEditingId(entry.id);
    setEditOriginal(entry.original);
    setEditReplacement(entry.replacement);
    setEditCategory(entry.category || 'name');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditOriginal('');
    setEditReplacement('');
  };

  const handleSaveEdit = async (id: number) => {
    const orig = editOriginal.trim();
    const repl = editReplacement.trim();
    if (!orig || !repl) return;

    setIsSavingEdit(true);
    try {
      await safeInvoke('update_personal_vocabulary_entry', {
        id,
        original_text: orig,
        originalText: orig,
        preferred_text: repl,
        preferredText: repl,
        entry_type: editCategory,
        entryType: editCategory,
        status: 'active',
      });
      setEditingId(null);
      setStatusMsg(`Updated "${repl}" in dictionary!`);
      setTimeout(() => setStatusMsg(null), 3500);
      await loadAll();
    } catch (err) {
      console.error('Failed to update entry:', err);
      setStatusMsg(`Error updating entry: ${err}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const loadAll = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const [dictData, vocabData] = await Promise.all([
        safeInvoke<DictionaryEntry[]>('get_dictionary_entries'),
        safeInvoke<PersonalVocabularyEntry[]>('get_personal_vocabulary'),
      ]);
      setEntries(dictData || []);
      setVocabEntries(vocabData || []);

      // Auto-prefill snippet fields from saved dictionary entries
      const foundEmail = (dictData || []).find((e: any) => (e.original || e.original_phrase || '').toLowerCase() === 'my email');
      if (foundEmail) setSnippetEmail((foundEmail.replacement || (foundEmail as any).replacement_phrase || ''));

      const foundPhone = (dictData || []).find((e: any) => (e.original || e.original_phrase || '').toLowerCase() === 'my phone');
      if (foundPhone) setSnippetPhone((foundPhone.replacement || (foundPhone as any).replacement_phrase || ''));

      const foundCal = (dictData || []).find((e: any) => (e.original || e.original_phrase || '').toLowerCase() === 'my calendar');
      if (foundCal) setSnippetCalendar((foundCal.replacement || (foundCal as any).replacement_phrase || ''));
    } catch (err) {
      console.error('Failed to load vocabulary:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSnippet = async (triggers: string[], value: string, label: string) => {
    const val = value.trim();
    if (!val) return;
    try {
      for (const trig of triggers) {
        await safeInvoke('add_personal_vocabulary_entry', {
          original: trig,
          preferred: val,
          entry_type: 'tech',
          entryType: 'tech',
          status: 'active',
        });
      }
      setStatusMsg(`Saved ${label}: saying "${triggers[0]}" will now paste "${val}"`);
      setTimeout(() => setStatusMsg(null), 4000);
      await loadAll();
    } catch (e) {
      console.error('Failed to save snippet:', e);
      setStatusMsg(`Error saving snippet: ${e}`);
    }
  };

  const handleIngestCapsule = async () => {
    setIsIngesting(true);
    try {
      const res = await safeInvoke<IngestCapsuleResult>('ingest_project_context_capsule_cmd', {
        projectName: capsuleName || 'current-project',
        projectPath: '.',
      });
      if (res) {
        setCapsuleResult(res);
        setStatusMsg(`Ingested ${res.terms_ingested} terms from ${res.project_name} into Context Capsule.`);
        setTimeout(() => setStatusMsg(null), 4000);
        await loadAll();
      }
    } catch (err) {
      console.error('Failed to ingest capsule:', err);
      setStatusMsg(`Error ingesting capsule: ${err}`);
    } finally {
      setIsIngesting(false);
    }
  };

  useEffect(() => {
    loadAll(true);

    let unlisten: (() => void) | undefined;
    safeListen('dictionary-updated', () => {
      loadAll(false);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const orig = original.trim();
    const repl = replacement.trim();
    if (!orig || !repl) return;

    try {
      await safeInvoke('add_personal_vocabulary_entry', {
        original: orig,
        preferred: repl,
        entry_type: category,
        entryType: category,
        status: 'active',
      });
      setOriginal('');
      setReplacement('');
      setStatusMsg(`Added "${repl}" to your active dictionary!`);
      setTimeout(() => setStatusMsg(null), 3500);
      await loadAll();
      setActiveSubTab('active');
    } catch (err) {
      console.error('Failed to add entry:', err);
      setStatusMsg(`Error adding entry: ${err}`);
    }
  };

  const handleDeleteDict = async (id: number) => {
    try {
      await safeInvoke('delete_dictionary_entry', { id });
      await loadAll();
    } catch (err) {
      console.error('Failed to delete dictionary entry:', err);
    }
  };

  const handleDeleteVocab = async (id: number) => {
    try {
      await safeInvoke('delete_personal_vocabulary_entry', { id });
      await loadAll();
    } catch (err) {
      console.error('Failed to delete personal vocabulary entry:', err);
    }
  };

  const handleExportJson = async () => {
    try {
      const json = await safeInvoke<string>('export_dictionary_json');
      const blob = new Blob([json || '[]'], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voxquest-dictionary-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMsg('Personal dictionary exported to JSON!');
      setTimeout(() => setStatusMsg(null), 3500);
    } catch (e) {
      console.error('Export failed:', e);
      setStatusMsg(`Export failed: ${e}`);
    }
  };

  const handleApproveCandidate = async (entry: PersonalVocabularyEntry) => {
    try {
      await safeInvoke('update_personal_vocabulary_entry', {
        id: entry.id,
        preferredText: entry.preferred_text,
        status: 'active',
      });
      setStatusMsg(`Approved "${entry.preferred_text}" as active vocabulary!`);
      setTimeout(() => setStatusMsg(null), 3000);
      await loadAll();
    } catch (err) {
      console.error('Failed to approve candidate:', err);
    }
  };

  const handleRejectCandidate = async (entry: PersonalVocabularyEntry) => {
    try {
      await safeInvoke('update_personal_vocabulary_entry', {
        id: entry.id,
        preferredText: entry.preferred_text,
        status: 'rejected',
      });
      await loadAll();
    } catch (err) {
      console.error('Failed to reject candidate:', err);
    }
  };

  const [confirmingReset, setConfirmingReset] = useState<boolean>(false);

  const handleResetPersonalization = async () => {
    if (!confirmingReset) {
      setConfirmingReset(true);
      setTimeout(() => setConfirmingReset(false), 4000);
      return;
    }
    setConfirmingReset(false);
    try {
      await safeInvoke('reset_personalization');
      setStatusMsg('Personalization learning history reset.');
      setTimeout(() => setStatusMsg(null), 3000);
      await loadAll();
    } catch (err) {
      console.error('Failed to reset personalization:', err);
    }
  };

  const categories = [
    { id: 'all', label: 'All Terms' },
    { id: 'name', label: 'Names & Brands' },
    { id: 'tech', label: 'Technical Words' },
    { id: 'acronym', label: 'Acronyms' },
    { id: 'spelling', label: 'Spelling Fixes' },
    { id: 'slang', label: 'Slang & Casual' },
  ];

  const candidateEntries = (vocabEntries || []).filter((v) => v && v.status === 'candidate');
  const activeVocab = (vocabEntries || []).filter((v) => v && v.status === 'active');

  // Combined active list for display with defensive null guards
  const normalizedDict = (entries || []).map((e) => {
    const orig = (e.original || (e as any).original_phrase || '').trim();
    const repl = (e.replacement || (e as any).replacement_phrase || '').trim();
    return {
      id: e.id,
      isVocab: false,
      original: orig,
      replacement: repl,
      category: e.category || 'name',
      source: 'Custom Dictionary',
      confidence: 1.0,
      applications: 0,
      recognitions: 0,
      corrections: 0,
      lastUsed: null as number | null,
    };
  }).filter((item) => item.original || item.replacement);

  const normalizedVocab = (activeVocab || []).map((v) => ({
    id: v.id,
    isVocab: true,
    original: (v.original_text || '').trim(),
    replacement: (v.preferred_text || '').trim(),
    category: v.entry_type || 'name',
    source: (v.positive_count && v.positive_count > 1) ? `Learned (${v.positive_count}x confirmed)` : 'Vocabulary / Approved',
    confidence: v.confidence ?? 1.0,
    applications: v.application_count || 0,
    recognitions: v.recognition_count || 0,
    corrections: v.correction_count || 0,
    lastUsed: v.last_used_at || null,
  })).filter((item) => item.original || item.replacement);

  // De-duplicate: If a term is in both custom_dictionary and personal_vocabulary, prefer the personal_vocabulary record with metrics
  const vocabOrigSet = new Set(normalizedVocab.map((v) => v.original.toLowerCase()));
  const deduplicatedDict = normalizedDict.filter((d) => !vocabOrigSet.has(d.original.toLowerCase()));

  const combinedActive = [...deduplicatedDict, ...normalizedVocab];

  const filteredActive = combinedActive.filter((item) => {
    const orig = (item.original || '').toLowerCase();
    const repl = (item.replacement || '').toLowerCase();
    const q = (search || '').trim().toLowerCase();
    const matchesSearch = !q || orig.includes(q) || repl.includes(q);
    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto select-none animate-fadeIn">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl border border-charcoal/15 bg-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-darkTeal/10 text-darkTeal rounded-xl border border-darkTeal/20 shadow-xs">
              <BookA className="w-5 h-5 text-darkTeal" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-darkTeal">Personal Vocabulary & Self-Learning</h2>
                <span className="text-[10px] font-bold text-darkTeal bg-darkTeal/10 border border-darkTeal/20 px-2.5 py-0.5 rounded-full">Adaptive</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-charcoal/70 mt-1 max-w-xl leading-relaxed">
            VoxQuest adapts to your voice without retraining models. When you correct transcriptions, recurring names, acronyms, and terminology are learned automatically.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <button
            onClick={handleExportJson}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-charcoal/20 bg-white hover:bg-neutral-50 text-charcoal shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
            title="Export personal vocabulary and rules as JSON"
          >
            <Download className="w-3.5 h-3.5 text-darkTeal" />
            <span>Export JSON</span>
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-darkTeal/10 border border-darkTeal/20 text-darkTeal rounded-xl text-xs font-semibold shadow-xs">
            <BookA className="w-3.5 h-3.5 text-darkTeal" />
            <span>Self-Learning Active</span>
          </div>
        </div>
      </div>

      {/* Sub Tabs Navigation - Responsive, Scrollable on Mobile without Wrap Overflow */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-charcoal/15 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => setActiveSubTab('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
              activeSubTab === 'active'
                ? 'bg-darkTeal text-white border-darkTeal shadow-xs font-bold'
                : 'bg-white hover:bg-neutral-50 text-charcoal border-charcoal/15 shadow-xs'
            }`}
          >
            Active Vocabulary ({combinedActive.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('candidates')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border relative ${
              activeSubTab === 'candidates'
                ? 'bg-darkTeal text-white border-darkTeal shadow-xs font-bold'
                : 'bg-white hover:bg-neutral-50 text-charcoal border-charcoal/15 shadow-xs'
            }`}
          >
            Learned Candidates
            {candidateEntries.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 text-[9px] bg-amber text-charcoal rounded-full font-bold">
                {candidateEntries.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('snippets')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
              activeSubTab === 'snippets'
                ? 'bg-darkTeal text-white border-darkTeal shadow-xs font-bold'
                : 'bg-white hover:bg-neutral-50 text-charcoal border-charcoal/15 shadow-xs'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Voice Snippets</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('capsules')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
              activeSubTab === 'capsules'
                ? 'bg-darkTeal text-white border-darkTeal shadow-xs font-bold'
                : 'bg-white hover:bg-neutral-50 text-charcoal border-charcoal/15 shadow-xs'
            }`}
          >
            <Box className="w-3.5 h-3.5 text-amber" />
            <span>Context Capsules</span>
          </button>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('add')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 shadow-xs active:scale-95 ${
              activeSubTab === 'add'
                ? 'bg-darkTeal text-white border-darkTeal font-bold'
                : 'bg-white hover:bg-neutral-50 text-darkTeal border-darkTeal/30'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Term</span>
          </button>

          {activeVocab.length > 0 && (
            <button
              type="button"
              onClick={handleResetPersonalization}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shadow-xs active:scale-95 ${
                confirmingReset
                  ? 'bg-terracotta text-white animate-pulse'
                  : 'bg-white hover:bg-terracotta/10 border border-terracotta/30 text-terracotta'
              }`}
              title="Reset learned candidate history"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1 inline" />
              <span>{confirmingReset ? 'Confirm Reset?' : 'Reset Learned'}</span>
            </button>
          )}
        </div>
      </div>

      {statusMsg && (
        <div className="flex items-center gap-2 text-xs font-semibold text-darkTeal bg-darkTeal/10 px-3.5 py-2 rounded-xl border border-darkTeal/20 shadow-xs">
          <Check className="w-4 h-4 text-darkTeal shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Sub Tab: Smart Voice Snippets & Macros */}
      {activeSubTab === 'snippets' && (
        <div className="space-y-4">
          <div className="bg-white border border-charcoal/15 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-darkTeal">Personal Voice Snippets</h3>
                <span className="text-[10px] font-bold text-darkTeal bg-darkTeal/10 border border-darkTeal/20 px-2 py-0.5 rounded-full font-mono">Voice Macros</span>
              </div>
              <p className="text-xs text-charcoal/70 mt-1">
                Saying key trigger phrases will automatically type your exact contact details and links instead of the spoken words.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Email Snippet Card */}
              <div className="p-4 rounded-xl border border-charcoal/15 bg-neutral-50/70 space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-darkTeal" />
                    <span className="text-xs font-bold text-charcoal">My Email ID</span>
                  </div>
                  <p className="text-[11px] text-charcoal/60">
                    Triggers: <code className="bg-white px-1 py-0.5 rounded border border-charcoal/10 font-mono text-[10px]">"my email"</code>, <code className="bg-white px-1 py-0.5 rounded border border-charcoal/10 font-mono text-[10px]">"my email ID"</code>
                  </p>
                  <input
                    type="email"
                    placeholder="e.g. name@company.com"
                    value={snippetEmail}
                    onChange={(e) => setSnippetEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-charcoal/20 rounded-xl text-xs text-charcoal font-sans focus:outline-none focus:ring-2 focus:ring-darkTeal/20 focus:border-darkTeal shadow-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveSnippet(['my email', 'my email id', 'my email ID'], snippetEmail, 'Email Snippet')}
                  className="w-full py-2 bg-darkTeal hover:bg-darkTeal/90 text-white rounded-xl text-xs font-semibold shadow-xs active:scale-95 transition-all"
                >
                  Save Email Snippet
                </button>
              </div>

              {/* Phone Snippet Card */}
              <div className="p-4 rounded-xl border border-charcoal/15 bg-neutral-50/70 space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-darkTeal" />
                    <span className="text-xs font-bold text-charcoal">My Phone Number</span>
                  </div>
                  <p className="text-[11px] text-charcoal/60">
                    Triggers: <code className="bg-white px-1 py-0.5 rounded border border-charcoal/10 font-mono text-[10px]">"my phone"</code>, <code className="bg-white px-1 py-0.5 rounded border border-charcoal/10 font-mono text-[10px]">"my phone number"</code>
                  </p>
                  <input
                    type="tel"
                    placeholder="e.g. +91 9876543210"
                    value={snippetPhone}
                    onChange={(e) => setSnippetPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-charcoal/20 rounded-xl text-xs text-charcoal font-sans focus:outline-none focus:ring-2 focus:ring-darkTeal/20 focus:border-darkTeal shadow-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveSnippet(['my phone', 'my phone number', 'my mobile'], snippetPhone, 'Phone Snippet')}
                  className="w-full py-2 bg-darkTeal hover:bg-darkTeal/90 text-white rounded-xl text-xs font-semibold shadow-xs active:scale-95 transition-all"
                >
                  Save Phone Snippet
                </button>
              </div>

              {/* Meeting Link Snippet Card */}
              <div className="p-4 rounded-xl border border-charcoal/15 bg-neutral-50/70 space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-darkTeal" />
                    <span className="text-xs font-bold text-charcoal">Meeting Link</span>
                  </div>
                  <p className="text-[11px] text-charcoal/60">
                    Triggers: <code className="bg-white px-1 py-0.5 rounded border border-charcoal/10 font-mono text-[10px]">"my calendar"</code>, <code className="bg-white px-1 py-0.5 rounded border border-charcoal/10 font-mono text-[10px]">"my meeting link"</code>
                  </p>
                  <input
                    type="url"
                    placeholder="e.g. https://cal.com/username"
                    value={snippetCalendar}
                    onChange={(e) => setSnippetCalendar(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-charcoal/20 rounded-xl text-xs text-charcoal font-sans focus:outline-none focus:ring-2 focus:ring-darkTeal/20 focus:border-darkTeal shadow-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveSnippet(['my calendar', 'my calendar link', 'my meeting link'], snippetCalendar, 'Meeting Link')}
                  className="w-full py-2 bg-darkTeal hover:bg-darkTeal/90 text-white rounded-xl text-xs font-semibold shadow-xs active:scale-95 transition-all"
                >
                  Save Calendar Snippet
                </button>
              </div>
            </div>

            {/* Custom Voice Macro */}
            <div className="pt-4 border-t border-charcoal/10 space-y-2">
              <span className="text-xs font-bold text-charcoal block">Create Custom Voice Macro</span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-medium text-charcoal/80 mb-1">When I speak:</label>
                  <input
                    type="text"
                    placeholder="e.g. my address, zoom link, my github"
                    value={customSnippetTrigger}
                    onChange={(e) => setCustomSnippetTrigger(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-charcoal/20 rounded-xl text-xs text-charcoal font-sans focus:outline-none focus:ring-2 focus:ring-darkTeal/20 focus:border-darkTeal shadow-xs"
                  />
                </div>
                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-medium text-charcoal/80 mb-1">Paste this text:</label>
                  <input
                    type="text"
                    placeholder="e.g. Flat 402, Sunshine Residency, Bangalore"
                    value={customSnippetExpansion}
                    onChange={(e) => setCustomSnippetExpansion(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-charcoal/20 rounded-xl text-xs text-charcoal font-sans focus:outline-none focus:ring-2 focus:ring-darkTeal/20 focus:border-darkTeal shadow-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!customSnippetTrigger.trim() || !customSnippetExpansion.trim()) return;
                      handleSaveSnippet([customSnippetTrigger.trim()], customSnippetExpansion.trim(), 'Custom Macro');
                      setCustomSnippetTrigger('');
                      setCustomSnippetExpansion('');
                    }}
                    className="w-full py-2 bg-terracotta hover:bg-terracotta/90 text-white rounded-xl text-xs font-semibold shadow-xs active:scale-95 transition-all"
                  >
                    Add Macro
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub Tab: Context Capsules */}
      {activeSubTab === 'capsules' && (
        <div className="bg-white border-2 border-charcoal/20 rounded-2xl p-5 shadow-sm space-y-5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-charcoal/10 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-darkTeal" />
                <h3 className="text-base font-extrabold text-darkTeal">Project Context Capsules</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber text-charcoal px-2.5 py-0.5 rounded-full border border-amber/50 shadow-xs">
                  Zero Cloud Ingestion
                </span>
              </div>
              <p className="text-xs text-charcoal/70 mt-1 max-w-xl">
                Automatically harvest library names and symbols from your active codebase manifests (<code>package.json</code>, <code>Cargo.toml</code>). Project terms are isolated to project scope and bias Whisper recognition without polluting your global vocabulary.
              </p>
            </div>
          </div>

          {/* Ingestion Trigger Bar */}
          <div className="p-4 rounded-xl border-2 border-darkTeal/20 bg-[#F4F9F7] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-darkTeal flex items-center gap-1">
                <FolderCode className="w-3.5 h-3.5 text-amber" />
                Project Scope Name
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={capsuleName}
                  onChange={(e) => setCapsuleName(e.target.value)}
                  placeholder="e.g. wispr-flow, backend-api"
                  className="px-3 py-1.5 rounded-xl border-2 border-charcoal/20 bg-white text-xs font-bold font-mono text-darkTeal focus:outline-none focus:border-darkTeal shadow-xs"
                />
                <span className="text-xs text-charcoal/60">Target: Local Workspace</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleIngestCapsule}
              disabled={isIngesting}
              className="tactile-btn tactile-btn-teal px-4 py-2 text-xs font-bold shrink-0"
            >
              {isIngesting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Harvesting Symbols...</span>
                </>
              ) : (
                <>
                  <FolderCode className="w-3.5 h-3.5 text-amber" />
                  <span>Scan & Ingest Codebase</span>
                </>
              )}
            </button>
          </div>

          {/* Ingest Result Card */}
          {capsuleResult && (
            <div className="p-3.5 rounded-xl border-2 border-amber/40 bg-amber/10 space-y-2 animate-fadeIn">
              <span className="text-xs font-bold text-charcoal flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Successfully Ingested {capsuleResult.terms_ingested} terms for project "{capsuleResult.project_name}":
              </span>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {capsuleResult.terms.map((t, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-lg bg-white border border-amber/40 text-[11px] font-mono font-bold text-darkTeal shadow-xs">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sourced Vocabulary Table */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal/60">
              Capsule-Scoped Identifiers ({vocabEntries.filter(v => v.source === 'capsule').length} active)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {vocabEntries.filter(v => v.source === 'capsule').map((v) => (
                <div key={v.id} className="p-2.5 rounded-xl border-2 border-charcoal/15 bg-stone-50 flex items-center justify-between shadow-xs">
                  <span className="font-mono text-xs font-bold text-darkTeal">{v.preferred_text}</span>
                  <span className="text-[9px] font-bold uppercase bg-darkTeal/10 text-darkTeal px-1.5 py-0.5 rounded">Capsule</span>
                </div>
              ))}
              {vocabEntries.filter(v => v.source === 'capsule').length === 0 && (
                <div className="col-span-full py-8 text-center text-xs text-charcoal/60 border-2 border-dashed border-charcoal/20 rounded-xl bg-stone-50">
                  No capsule terms ingested yet. Click "Scan & Ingest Codebase" to automatically extract dependencies from package.json and Cargo.toml.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sub Tab: Add New Term Form */}
      {activeSubTab === 'add' && (
        <div className="bg-white border border-charcoal/15 rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-darkTeal mb-3 flex items-center gap-1.5 font-mono">
            <Plus className="w-4 h-4 text-terracotta" />
            Add Personal Term or Preferred Spelling
          </h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-charcoal mb-1">
                Spoken sound or misspelling
              </label>
              <input
                type="text"
                placeholder="e.g. Brand X, api, satoshi"
                value={original}
                onChange={(e) => setOriginal(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-charcoal/20 rounded-xl text-xs text-charcoal font-sans focus:outline-none focus:ring-2 focus:ring-darkTeal/20 focus:border-darkTeal shadow-xs"
                required
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-charcoal mb-1">
                Preferred output replacement
              </label>
              <input
                type="text"
                placeholder="e.g. Brandex, API, Satoshi"
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-charcoal/20 rounded-xl text-xs text-charcoal font-sans focus:outline-none focus:ring-2 focus:ring-darkTeal/20 focus:border-darkTeal shadow-xs"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-charcoal mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-charcoal/20 rounded-xl text-xs text-charcoal font-sans focus:outline-none focus:ring-2 focus:ring-darkTeal/20 focus:border-darkTeal shadow-xs"
              >
                <option value="name">Name / Brand</option>
                <option value="tech">Technical</option>
                <option value="acronym">Acronym</option>
                <option value="spelling">Spelling</option>
                <option value="slang">Slang</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-darkTeal hover:bg-deepTeal text-white rounded-xl text-xs font-semibold transition-all border border-darkTeal shadow-xs active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Save Term</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sub Tab: Learned Candidates */}
      {activeSubTab === 'candidates' && (
        <div className="bg-white border border-charcoal/15 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-charcoal">
                Learned Correction Candidates ({candidateEntries.length})
              </h3>
              <p className="text-xs text-charcoal/70 mt-0.5">
                These candidate rules were automatically detected from your transcript edits. Consistent edits promote automatically, or you can approve them now.
              </p>
            </div>
          </div>

          {candidateEntries.length === 0 ? (
            <div className="text-center py-12 text-charcoal/60 space-y-2">
              <BookA className="w-8 h-8 mx-auto text-charcoal/30" />
              <p className="text-sm font-bold text-charcoal">No pending candidates</p>
              <p className="text-xs text-charcoal/60">
                When you correct any transcribed word in History or Recovery, VoxQuest extracts the correction candidate and displays it here for review.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-charcoal/10">
              {candidateEntries.map((cand) => (
                <div
                  key={cand.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50 px-3 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-amber/20 text-charcoal rounded-xl border border-amber/30">
                      <Tag className="w-4 h-4 text-amber-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-charcoal/60 line-through decoration-terracotta">
                          {cand.original_text}
                        </span>
                        <span className="text-xs text-charcoal/40 font-bold">→</span>
                        <span className="text-sm font-bold text-charcoal">
                          {cand.preferred_text}
                        </span>
                        <span className="px-2 py-0.5 bg-neutral-100 text-[10px] font-bold rounded-md border border-charcoal/10 text-charcoal/70 uppercase">
                          {cand.entry_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-charcoal/60 font-medium">
                        <span>{cand.positive_count} {cand.positive_count === 1 ? 'correction recorded' : 'corrections recorded'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleApproveCandidate(cand)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-darkTeal hover:bg-deepTeal text-white rounded-xl text-xs font-semibold transition-all border border-darkTeal shadow-xs active:scale-95"
                      title="Promote to active dictionary"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleRejectCandidate(cand)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-charcoal/20 hover:bg-neutral-50 text-charcoal rounded-xl text-xs font-semibold transition-all shadow-xs active:scale-95"
                      title="Reject candidate"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => handleDeleteVocab(cand.id)}
                      className="p-1.5 rounded-lg border border-charcoal/20 bg-white hover:bg-terracotta/10 hover:border-terracotta/30 text-charcoal/60 hover:text-terracotta transition-all shadow-xs active:scale-95"
                      title="Delete candidate"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sub Tab: Active Vocabulary */}
      {activeSubTab === 'active' && (
        <div className="bg-white border border-charcoal/15 rounded-2xl p-5 shadow-sm space-y-4">
          {/* Filters Header */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pb-3 border-b border-charcoal/10">
            {/* Category Tabs */}
            <div className="p-1 bg-stone-100 rounded-xl inline-flex flex-wrap items-center gap-1 border border-charcoal/5">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                    selectedCategory === c.id
                      ? 'bg-white text-darkTeal shadow-xs font-bold'
                      : 'text-charcoal/70 hover:text-charcoal hover:bg-white/50'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-64 shrink-0">
              <Search className="w-3.5 h-3.5 text-charcoal/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search words..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-charcoal/20 rounded-xl text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-darkTeal/20 focus:border-darkTeal shadow-xs"
              />
            </div>
          </div>

          {/* Entries Table */}
          {loading ? (
            <div className="text-center py-10 text-xs text-charcoal/60">
              Loading active vocabulary...
            </div>
          ) : filteredActive.length === 0 ? (
            <div className="text-center py-12 text-charcoal/60 space-y-2">
              <BookA className="w-8 h-8 mx-auto text-charcoal/30" />
              <p className="text-sm font-bold text-charcoal">No active terms found</p>
              <p className="text-xs text-charcoal/60">Add your first custom slang or technical word above.</p>
            </div>
          ) : (
            <div className="divide-y divide-charcoal/10">
              {filteredActive.map((entry) => {
                const isEditing = editingId === entry.id;

                if (isEditing) {
                  return (
                    <div
                      key={`edit-${entry.id}`}
                      className="py-3 px-2 bg-emerald-50/40 rounded-xl space-y-2.5 border border-darkTeal/20 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-charcoal/70 block mb-0.5">Spoken Sound / Misspelling</label>
                          <input
                            type="text"
                            value={editOriginal}
                            onChange={(e) => setEditOriginal(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-charcoal/20 rounded-lg focus:outline-none focus:border-darkTeal font-mono"
                            placeholder="e.g. madan sir"
                          />
                        </div>
                        <span className="text-xs text-charcoal/40 font-bold self-center hidden sm:inline">→</span>
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-charcoal/70 block mb-0.5">Preferred Output</label>
                          <input
                            type="text"
                            value={editReplacement}
                            onChange={(e) => setEditReplacement(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-charcoal/20 rounded-lg focus:outline-none focus:border-darkTeal font-bold"
                            placeholder="e.g. Madan Sir"
                          />
                        </div>
                        <div className="w-full sm:w-32 shrink-0">
                          <label className="text-[10px] font-bold text-charcoal/70 block mb-0.5">Category</label>
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-charcoal/20 rounded-lg focus:outline-none focus:border-darkTeal"
                          >
                            <option value="name">Name / Brand</option>
                            <option value="tech">Technical</option>
                            <option value="acronym">Acronym</option>
                            <option value="spelling">Spelling</option>
                            <option value="slang">Slang</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-3 py-1 rounded-lg text-xs font-semibold text-charcoal/70 bg-white hover:bg-neutral-100 border border-charcoal/20 transition-all active:scale-95"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSavingEdit}
                          onClick={() => handleSaveEdit(entry.id)}
                          className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-darkTeal hover:bg-deepTeal transition-all shadow-xs flex items-center gap-1 active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isSavingEdit ? 'Saving...' : 'Save Changes'}</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={`${entry.isVocab ? 'v' : 'd'}-${entry.id}`}
                    className="py-3 flex items-center justify-between gap-4 group hover:bg-neutral-50 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-1.5 bg-stone-100 border border-charcoal/10 rounded-lg text-charcoal/60">
                        <Tag className="w-3.5 h-3.5 text-darkTeal" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-charcoal/60 line-through decoration-terracotta/40">
                            {entry.original}
                          </span>
                          <span className="text-xs text-charcoal/40 font-bold">→</span>
                          <span className="text-sm font-bold text-charcoal">
                            {entry.replacement}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-charcoal/60 mt-1 flex-wrap font-semibold">
                          <span>{entry.source}</span>
                          {entry.applications > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-darkTeal/10 text-darkTeal border border-darkTeal/20 font-bold">
                              {entry.applications} applied
                            </span>
                          )}
                          {entry.recognitions > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                              {entry.recognitions} recognized
                            </span>
                          )}
                          {entry.corrections > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber/20 text-charcoal border border-amber/30 font-bold">
                              {entry.corrections} corrections
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          entry.category === 'slang'
                            ? 'bg-amber/20 text-charcoal border-amber/30'
                            : entry.category === 'tech'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : entry.category === 'acronym'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-darkTeal/10 text-darkTeal border-darkTeal/20'
                        }`}
                      >
                        {entry.category}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleStartEdit(entry)}
                        className="p-1.5 rounded-lg bg-white hover:bg-neutral-100 border border-charcoal/20 hover:border-darkTeal text-charcoal/70 hover:text-darkTeal transition-all shadow-xs active:scale-95"
                        title="Edit term spelling and replacement"
                        aria-label="Edit term"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          entry.isVocab
                            ? handleDeleteVocab(entry.id)
                            : handleDeleteDict(entry.id)
                        }
                        className="p-1.5 rounded-lg bg-white hover:bg-terracotta/10 border border-charcoal/20 hover:border-terracotta/30 text-charcoal/60 hover:text-terracotta transition-all shadow-xs active:scale-95"
                        title="Delete term"
                        aria-label="Delete term"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer info notice */}
          <div className="pt-3 border-t border-charcoal/10 flex items-center gap-2 text-xs text-charcoal/70">
            <Info className="w-3.5 h-3.5 text-darkTeal shrink-0" />
            <span>
              {combinedActive.length} active terms. Top 25 terms are automatically injected into the acoustic model to bias speech recognition upfront.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
