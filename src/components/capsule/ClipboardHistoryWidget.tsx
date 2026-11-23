import React, { useState, useEffect, useCallback } from 'react';
import { Clipboard, Copy, CornerDownLeft, Check, Bookmark } from 'lucide-react';
import { safeInvoke } from '../../lib/ipc';
import { HistoryRecord } from '../../types';

interface ClipboardItem {
  id: string;
  text: string;
  pinned: boolean;
  timestampMs: number;
}

interface ClipboardHistoryWidgetProps {
  lastTranscript?: string | null;
  onCopy?: (text: string) => void;
}

export const ClipboardHistoryWidget: React.FC<ClipboardHistoryWidgetProps> = ({
  lastTranscript,
  onCopy,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'pinned'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pastedId, setPastedId] = useState<string | null>(null);
  const [items, setItems] = useState<ClipboardItem[]>([]);

  // Built-in system dynamic relative time calculator
  const formatDynamicRelativeTime = useCallback((timestampMs: number): string => {
    const diffSec = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000));
    if (diffSec < 45) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }, []);

  // Fetch real dictation records from local system SQLite database
  const loadRealHistory = useCallback(async () => {
    try {
      const records = await safeInvoke<HistoryRecord[]>('get_history', { limit: 20 });
      let pinnedIds: string[] = [];
      try {
        const stored = localStorage.getItem('voxquest_pinned_clips');
        if (stored) pinnedIds = JSON.parse(stored);
      } catch (e) {
        console.warn('Load pinned clips failed:', e);
      }

      if (records && records.length > 0) {
        let mapped: ClipboardItem[] = records.map((r) => ({
          id: `db-${r.id}`,
          text: r.formatted_text || r.original_text,
          pinned: pinnedIds.includes(`db-${r.id}`),
          timestampMs: r.timestamp_ms || Date.now(),
        }));

        // Fetch real macOS active system clipboard item
        try {
          const sysClip = await safeInvoke<string>('get_system_clipboard_cmd');
          if (sysClip && sysClip.trim().length > 0 && !mapped.some((m) => m.text.trim() === sysClip.trim())) {
            mapped.unshift({
              id: `sys-${Date.now()}`,
              text: sysClip.trim(),
              pinned: false,
              timestampMs: Date.now(),
            });
          }
        } catch (clipErr) {
          // System clipboard access gracefully handled
        }

        setItems(mapped);
      } else {
        // Fallback to active session or default prompt
        setItems([
          {
            id: 'init-1',
            text: 'System microphone and Whisper engine ready for dictation.',
            pinned: false,
            timestampMs: Date.now() - 60000,
          },
        ]);
      }
    } catch (err) {
      console.warn('Failed to query real history:', err);
    }
  }, []);

  useEffect(() => {
    loadRealHistory();
  }, [loadRealHistory]);

  // Insert newly completed transcript into live clipboard list dynamically
  useEffect(() => {
    if (lastTranscript && lastTranscript.trim().length > 0) {
      const text = lastTranscript.trim();
      setItems((prev) => {
        if (prev.some((item) => item.text === text)) return prev;
        const newItem: ClipboardItem = {
          id: `recent-${Date.now()}`,
          text,
          pinned: false,
          timestampMs: Date.now(),
        };
        return [newItem, ...prev.slice(0, 19)];
      });
    }
  }, [lastTranscript]);

  const handleCopy = (item: ClipboardItem) => {
    if (onCopy) {
      onCopy(item.text);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(item.text);
    }
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handlePaste = async (item: ClipboardItem) => {
    try {
      await safeInvoke('insert_into_selected_field', { id: 0, text: item.text });
      setPastedId(item.id);
      setTimeout(() => setPastedId(null), 1800);
    } catch (err) {
      console.warn('Native paste failed, falling back to copy:', err);
      handleCopy(item);
    }
  };

  const handleTogglePin = (id: string) => {
    setItems((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, pinned: !item.pinned } : item));
      const pinnedIds = next.filter((i) => i.pinned).map((i) => i.id);
      try {
        localStorage.setItem('voxquest_pinned_clips', JSON.stringify(pinnedIds));
      } catch (e) {
        console.warn('Save pinned clips failed:', e);
      }
      return next;
    });
  };

  const filteredItems = activeFilter === 'pinned' ? items.filter((i) => i.pinned) : items;

  return (
    <div
      data-tauri-no-drag
      className="bg-white dark:bg-darkTealSurface rounded-2xl p-3.5 border border-charcoal/15 dark:border-darkTealBorder shadow-sm space-y-2.5"
    >
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-bold text-darkTeal dark:text-cream">
          <Clipboard className="w-3.5 h-3.5 text-terracotta" />
          <span>Voice Clipboard History</span>
        </div>
        {/* Filter Pills */}
        <div className="flex items-center bg-[#F6F6F2] dark:bg-darkTealCanvas p-0.5 rounded-lg border border-charcoal/15 dark:border-darkTealBorder text-[10px]">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-darkTeal dark:bg-darkTealAccent text-white shadow-xs'
                : 'text-charcoal/80 dark:text-cream/80 hover:text-charcoal dark:hover:text-cream'
            }`}
          >
            All ({items.length})
          </button>
          <button
            onClick={() => setActiveFilter('pinned')}
            className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
              activeFilter === 'pinned'
                ? 'bg-darkTeal dark:bg-darkTealAccent text-white shadow-xs'
                : 'text-charcoal/80 dark:text-cream/80 hover:text-charcoal dark:hover:text-cream'
            }`}
          >
            Pinned ({items.filter((i) => i.pinned).length})
          </button>
        </div>
      </div>

      {/* Snippet list - fully scrollable with comfortable padding and zero vertical clipping */}
      <div className="space-y-2 max-h-[260px] overflow-y-auto p-1 no-scrollbar">
        {filteredItems.length === 0 ? (
          <div className="py-6 text-center text-xs text-charcoal/60 dark:text-sage/70 italic">
            No pinned dictations recorded yet
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-xl bg-[#F8F8F5] dark:bg-darkTealElevated hover:bg-[#EBEBE4] dark:hover:bg-darkTealCanvas border border-charcoal/15 dark:border-darkTealBorder text-xs hover:border-darkTeal/40 dark:hover:border-mint/50 transition-all group"
            >
              <div className="min-w-0 mr-2 flex-1">
                <div className="text-charcoal dark:text-cream font-semibold text-xs leading-relaxed break-words line-clamp-2">
                  "{item.text}"
                </div>
                <div className="text-[10px] text-charcoal/60 dark:text-sage font-mono mt-1">
                  {formatDynamicRelativeTime(item.timestampMs)}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => handleTogglePin(item.id)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    item.pinned
                      ? 'text-terracotta bg-terracotta/10 dark:bg-terracotta/20'
                      : 'text-charcoal/60 dark:text-sage hover:text-charcoal dark:hover:text-cream hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  title={item.pinned ? 'Unpin snippet' : 'Pin snippet'}
                  aria-label="Pin snippet"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(item)}
                  className="p-1.5 rounded-lg text-darkTeal dark:text-mint hover:text-darkTeal dark:hover:text-white hover:bg-darkTeal/10 dark:hover:bg-darkTealAccent/40 transition-colors cursor-pointer"
                  title="Copy to clipboard"
                  aria-label="Copy snippet"
                >
                  {copiedId === item.id ? (
                    <Check className="w-3.5 h-3.5 text-darkTeal dark:text-amber" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handlePaste(item)}
                  className="p-1.5 rounded-lg text-darkTeal dark:text-cream hover:bg-darkTeal/10 dark:hover:bg-darkTealAccent/40 transition-colors cursor-pointer"
                  title="Paste directly to active app"
                  aria-label="Paste snippet"
                >
                  {pastedId === item.id ? (
                    <Check className="w-3.5 h-3.5 text-terracotta" />
                  ) : (
                    <CornerDownLeft className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
