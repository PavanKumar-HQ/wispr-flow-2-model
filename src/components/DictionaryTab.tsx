import React, { useState, useEffect } from 'react';
import { BookA, Plus, Trash2, Search, Tag, Check, Info, CheckCircle2, XCircle, RotateCcw, Download } from 'lucide-react';
import { safeInvoke } from '../lib/ipc';
import { DictionaryEntry, PersonalVocabularyEntry } from '../types';

export const DictionaryTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'candidates' | 'add'>('active');
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [vocabEntries, setVocabEntries] = useState<PersonalVocabularyEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // New entry form state
  const [original, setOriginal] = useState<string>('');
  const [replacement, setReplacement] = useState<string>('');
  const [category, setCategory] = useState<string>('name');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [dictData, vocabData] = await Promise.all([
        safeInvoke<DictionaryEntry[]>('get_dictionary_entries'),
        safeInvoke<PersonalVocabularyEntry[]>('get_personal_vocabulary'),
      ]);
      setEntries(dictData || []);
      setVocabEntries(vocabData || []);
    } catch (err) {
      console.error('Failed to load vocabulary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const orig = original.trim();
    const repl = replacement.trim();
    if (!orig || !repl) return;

    try {
      await Promise.all([
        safeInvoke('add_personal_vocabulary_entry', {
          original: orig,
          preferred: repl,
          entry_type: category,
          entryType: category,
          status: 'active',
        }),
        safeInvoke('add_dictionary_entry', {
          original: orig,
          replacement: repl,
          category,
        }),
      ]);
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
      // Also ensure it is present in custom dictionary
      await safeInvoke('add_dictionary_entry', {
        original: entry.original_text,
        replacement: entry.preferred_text,
        category: entry.entry_type || 'name',
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

      {/* Sub Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-charcoal/15 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveSubTab('active')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'active'
                ? 'bg-darkTeal text-white shadow-xs'
                : 'bg-white hover:bg-neutral-50 text-charcoal border border-charcoal/15 shadow-xs'
            }`}
          >
            Active Vocabulary ({combinedActive.length})
          </button>
          <button
            onClick={() => setActiveSubTab('candidates')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all relative ${
              activeSubTab === 'candidates'
                ? 'bg-darkTeal text-white shadow-xs'
                : 'bg-white hover:bg-neutral-50 text-charcoal border border-charcoal/15 shadow-xs'
            }`}
          >
            Learned Candidates
            {candidateEntries.length > 0 && (
              <span className="ml-2 px-1.5 py-0.2 text-[9px] bg-amber text-charcoal rounded-full font-bold">
                {candidateEntries.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('add')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'add'
                ? 'bg-darkTeal text-white shadow-xs'
                : 'bg-white hover:bg-neutral-50 text-charcoal border border-charcoal/15 shadow-xs'
            }`}
          >
            <Plus className="w-3.5 h-3.5 inline mr-1" />
            Add New Term
          </button>
        </div>

        {activeVocab.length > 0 && (
          <button
            onClick={handleResetPersonalization}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs active:scale-95 ${
              confirmingReset
                ? 'bg-terracotta text-white animate-pulse'
                : 'bg-white hover:bg-terracotta/10 border border-terracotta/30 text-terracotta'
            }`}
            title="Reset learned candidate history"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1 inline" />
            <span>{confirmingReset ? 'Confirm Reset All?' : 'Reset Learned Terms'}</span>
          </button>
        )}
      </div>

      {statusMsg && (
        <div className="flex items-center gap-2 text-xs font-semibold text-darkTeal bg-darkTeal/10 px-3.5 py-2 rounded-xl border border-darkTeal/20 shadow-xs">
          <Check className="w-4 h-4 text-darkTeal shrink-0" />
          <span>{statusMsg}</span>
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
            <div className="text-center py-10 text-xs text-vq-charcoal/60">
              Loading active vocabulary...
            </div>
          ) : filteredActive.length === 0 ? (
            <div className="text-center py-12 text-vq-charcoal/60 space-y-2">
              <BookA className="w-8 h-8 mx-auto text-vq-charcoal/30" />
              <p className="text-sm font-bold text-vq-charcoal">No active terms found</p>
              <p className="text-xs text-vq-charcoal/60">Add your first custom slang or technical word above.</p>
            </div>
          ) : (
            <div className="divide-y-2 divide-vq-border/40">
              {filteredActive.map((entry) => (
                <div
                  key={`${entry.isVocab ? 'v' : 'd'}-${entry.id}`}
                  className="py-3 flex items-center justify-between gap-4 group hover:bg-white/80 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 bg-vq-surfaceLight border border-vq-border rounded-lg text-vq-charcoal/60">
                      <Tag className="w-3.5 h-3.5 text-vq-tealDark" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-vq-charcoal/60 line-through decoration-vq-terracotta/40">
                          {entry.original}
                        </span>
                        <span className="text-xs text-vq-charcoal/40 font-bold">→</span>
                        <span className="text-sm font-bold text-vq-charcoal">
                          {entry.replacement}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-vq-charcoal/60 mt-1 flex-wrap font-semibold">
                        <span>{entry.source}</span>
                        {entry.applications > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-vq-sage/40 text-vq-tealDark border border-vq-sage font-bold">
                            {entry.applications} applied
                          </span>
                        )}
                        {entry.recognitions > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold">
                            {entry.recognitions} recognized
                          </span>
                        )}
                        {entry.corrections > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-vq-amber/20 text-vq-charcoal border border-vq-amber/40 font-bold">
                            {entry.corrections} corrections
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        entry.category === 'slang'
                          ? 'bg-vq-amber/20 text-vq-charcoal border-vq-amber/40'
                          : entry.category === 'tech'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : entry.category === 'acronym'
                          ? 'bg-purple-100 text-purple-800 border-purple-300'
                          : 'bg-vq-sage/40 text-vq-tealDark border-vq-sage'
                      }`}
                    >
                      {entry.category}
                    </span>

                    <button
                      onClick={() =>
                        entry.isVocab
                          ? handleDeleteVocab(entry.id)
                          : handleDeleteDict(entry.id)
                      }
                      className="p-1.5 rounded-lg bg-white hover:bg-terracotta/10 border border-charcoal/20 hover:border-terracotta/30 text-charcoal/60 hover:text-terracotta transition-all shadow-xs active:scale-95"
                      title="Delete term"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
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
