import React, { useState } from 'react';
import { FileText, Plus, Trash2, Check, Copy, CornerDownLeft } from 'lucide-react';
import { safeInvoke } from '../../lib/ipc';

interface Snippet {
  id: string;
  title: string;
  content: string;
  shortcut?: string;
}

const DEFAULT_SNIPPETS: Snippet[] = [
  {
    id: 's1',
    title: 'Calendly Link',
    shortcut: 'calendly',
    content: 'Feel free to schedule a time that suits you on my calendar here: https://calendly.com/your-name/30min',
  },
  {
    id: 's2',
    title: 'Personal Zoom',
    shortcut: 'zoom',
    content: 'Here is my personal meeting room: https://zoom.us/j/1234567890 (Passcode: 4242)',
  },
  {
    id: 's3',
    title: 'Email Sign-off',
    shortcut: 'signature',
    content: 'Best regards,\nEngineering & Architecture Team',
  },
  {
    id: 's4',
    title: 'Daily Standup Template',
    shortcut: 'standup',
    content: '• Yesterday: Completed core speech formatting pipeline\n• Today: UI ergonomics and hub utilities\n• Blockers: None',
  },
];

export const VoiceSnippetsWidget: React.FC = () => {
  const [snippets, setSnippets] = useState<Snippet[]>(() => {
    try {
      const stored = localStorage.getItem('voxquest_voice_snippets');
      if (stored) return JSON.parse(stored);
    } catch {
      // Fallback
    }
    return DEFAULT_SNIPPETS;
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pastedId, setPastedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newContent, setNewContent] = useState<string>('');

  const saveSnippets = (updated: Snippet[]) => {
    setSnippets(updated);
    try {
      localStorage.setItem('voxquest_voice_snippets', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save snippets:', e);
    }
  };

  const handleCopy = (snip: Snippet) => {
    navigator.clipboard?.writeText(snip.content);
    setCopiedId(snip.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handlePasteToApp = async (snip: Snippet) => {
    try {
      await safeInvoke('insert_into_selected_field', { text: snip.content });
      setPastedId(snip.id);
      setTimeout(() => setPastedId(null), 1500);
    } catch {
      handleCopy(snip);
    }
  };

  const handleDelete = (id: string) => {
    const updated = snippets.filter((s) => s.id !== id);
    saveSnippets(updated);
  };

  const handleAdd = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    const newSnip: Snippet = {
      id: `snip-${Date.now()}`,
      title: newTitle.trim(),
      content: newContent.trim(),
    };
    saveSnippets([newSnip, ...snippets]);
    setNewTitle('');
    setNewContent('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-2.5 font-sans">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-darkTeal flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-amber-600" />
          <span>Quick Voice Snippets & Text Expander</span>
        </span>
        <button
          onClick={() => setShowAddForm((prev) => !prev)}
          className="px-2 py-0.5 rounded-lg bg-darkTeal text-white text-[10px] font-bold flex items-center gap-1 active:scale-95 cursor-pointer shadow-xs"
        >
          <Plus className="w-3 h-3" />
          <span>{showAddForm ? 'Cancel' : 'New Snippet'}</span>
        </button>
      </div>

      {/* Add Form Drawer */}
      {showAddForm && (
        <div className="p-2.5 rounded-xl bg-white border border-charcoal/20 space-y-2 shadow-sm animate-fadeIn">
          <input
            type="text"
            placeholder="Snippet Title (e.g. My Calendly, PR Template)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-charcoal/20 focus:outline-none focus:border-darkTeal"
          />
          <textarea
            placeholder="Snippet content to paste..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="w-full text-xs p-2 rounded-lg border border-charcoal/20 focus:outline-none focus:border-darkTeal h-14 resize-none"
          />
          <div className="flex justify-end">
            <button
              onClick={handleAdd}
              disabled={!newTitle.trim() || !newContent.trim()}
              className="px-3 py-1 bg-darkTeal hover:bg-darkTeal/90 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
            >
              Save Snippet
            </button>
          </div>
        </div>
      )}

      {/* Snippet List */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
        {snippets.map((snip) => (
          <div
            key={snip.id}
            className="p-2 rounded-xl bg-white border border-charcoal/15 flex items-center justify-between gap-2 shadow-2xs hover:border-darkTeal/40 transition-all"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-darkTeal truncate">{snip.title}</span>
                {snip.shortcut && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-stone-100 text-charcoal/60 border border-charcoal/10">
                    {snip.shortcut}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-charcoal/60 truncate font-mono mt-0.5">{snip.content}</p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleCopy(snip)}
                className="p-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-charcoal text-[10px] font-bold flex items-center transition-all cursor-pointer border border-charcoal/10"
                title="Copy snippet"
              >
                {copiedId === snip.id ? <Check className="w-3 h-3 text-darkTeal" /> : <Copy className="w-3 h-3" />}
              </button>
              <button
                onClick={() => handlePasteToApp(snip)}
                className="px-2 py-1 rounded-lg bg-darkTeal hover:bg-darkTeal/90 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="Paste directly to current app"
              >
                {pastedId === snip.id ? <Check className="w-3 h-3 text-amber" /> : <CornerDownLeft className="w-3 h-3" />}
                <span>{pastedId === snip.id ? 'Pasted!' : 'Paste'}</span>
              </button>
              <button
                onClick={() => handleDelete(snip.id)}
                className="p-1 rounded-lg hover:bg-red-50 text-charcoal/40 hover:text-red-600 transition-all cursor-pointer"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
