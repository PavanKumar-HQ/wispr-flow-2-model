import React, { useState } from 'react';
import { Copy, Trash2, Clock, AlertCircle, CornerDownLeft, Search, CheckCircle2, Edit3, Check, Wand2, RotateCcw } from 'lucide-react';
import { HistoryRecord } from '../types';
import { EnhanceReviewCard } from './EnhanceReviewCard';
import { safeInvoke } from '../lib/ipc';

interface HistoryTabProps {
  history: HistoryRecord[];
  onCopy: (text: string) => void;
  onDelete: (id: number) => void;
  onClearAll: () => void;
  onReload?: () => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  history,
  onCopy,
  onDelete,
  onClearAll,
  onReload,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTexts, setEditingTexts] = useState<{ [id: number]: string }>({});
  const [insertSuccessId, setInsertSuccessId] = useState<number | null>(null);
  const [activeEditId, setActiveEditId] = useState<number | null>(null);
  const [enhanceRecordId, setEnhanceRecordId] = useState<number | null>(null);
  const [enhanceRecoveryId, setEnhanceRecoveryId] = useState<number | null>(null);
  const [learnedNoticeId, setLearnedNoticeId] = useState<number | null>(null);
  const [confirmingClear, setConfirmingClear] = useState<boolean>(false);

  const handleClearClick = () => {
    if (!confirmingClear) {
      setConfirmingClear(true);
      setTimeout(() => setConfirmingClear(false), 4000);
    } else {
      onClearAll();
      setConfirmingClear(false);
    }
  };

  // Filter recoverable records: recovery_required, uncertain, failed
  const recoveryRecords = history.filter(
    (h) => h.status === 'recovery_required' || h.status === 'uncertain' || h.status === 'failed'
  );

  const regularRecords = history.filter(
    (h) => h.status === 'inserted' || (h.status !== 'recovery_required' && h.status !== 'uncertain' && h.status !== 'failed')
  );

  const filteredHistory = regularRecords.filter((item) =>
    item.formatted_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.target_app && item.target_app.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleTextChange = (id: number, text: string) => {
    setEditingTexts((prev) => ({ ...prev, [id]: text }));
  };

  const handleSaveText = async (id: number) => {
    const newText = editingTexts[id];
    if (newText !== undefined) {
      try {
        await safeInvoke('update_recovery_text', { id, newText });
      } catch (err) {
        console.warn('Failed to persist text edit:', err);
      }
    }
  };

  const handleSaveRegularEdit = async (id: number) => {
    const newText = editingTexts[id];
    if (newText !== undefined && newText.trim()) {
      try {
        await safeInvoke('update_recovery_text', { id, newText: newText.trim() });
        setLearnedNoticeId(id);
        setActiveEditId(null);
        setTimeout(() => setLearnedNoticeId(null), 3000);
        if (onReload) onReload();
      } catch (err) {
        console.warn('Failed to save correction:', err);
      }
    } else {
      setActiveEditId(null);
    }
  };

  const handleInsertIntoActive = async (id: number, overrideText?: string) => {
    const currentText = overrideText !== undefined ? overrideText : editingTexts[id];
    try {
      await safeInvoke('insert_into_selected_field', { id, text: currentText || null });
      setInsertSuccessId(id);
      setTimeout(() => {
        setInsertSuccessId(null);
        if (onReload) onReload();
      }, 1500);
    } catch (err) {
      alert(`Could not insert into active field: ${err}`);
    }
  };

  const [restoredId, setRestoredId] = useState<number | null>(null);

  const handleRollbackOriginal = async (id: number) => {
    try {
      const restored = await safeInvoke<string>('restore_original_history_cmd', { id });
      if (restored) {
        setEditingTexts((prev) => ({ ...prev, [id]: restored }));
        setRestoredId(id);
        setTimeout(() => setRestoredId(null), 2500);
        if (onReload) onReload();
      }
    } catch (err) {
      console.warn('Rollback failed:', err);
    }
  };

  const handleDismiss = async (id: number) => {
    try {
      await safeInvoke('dismiss_recovery_record', { id });
      onDelete(id);
      if (onReload) onReload();
    } catch (err) {
      console.warn('Failed to dismiss recovery item:', err);
    }
  };

  return (
    <div className="space-y-6 select-none animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-darkTeal">History & Recovery</h2>
          <p className="text-xs text-charcoal/70 mt-1">
            Your personal speech history. All voice dictations stay strictly private on your device.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleClearClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all self-start sm:self-auto shadow-xs active:scale-95 ${
              confirmingClear
                ? 'bg-terracotta text-white border-terracotta animate-pulse'
                : 'border-charcoal/20 bg-white text-terracotta hover:border-terracotta hover:bg-terracotta/10'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{confirmingClear ? 'Confirm Clear All?' : 'Clear History'}</span>
          </button>
        )}
      </div>

      {/* Recoverable Transcripts Section (Actionable recovery panel) */}
      {recoveryRecords.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber animate-pulse" />
            <h3 className="font-bold text-sm text-charcoal">
              Pending Placement ({recoveryRecords.length})
            </h3>
            <span className="text-[10px] text-charcoal/80 bg-amber/20 border border-amber/40 px-2 py-0.5 rounded-full font-semibold">
              Action needed
            </span>
          </div>

          <div className="space-y-3">
            {recoveryRecords.map((item) => {
              const currentText = editingTexts[item.id] !== undefined ? editingTexts[item.id] : item.formatted_text;
              const date = new Date(item.timestamp_ms);
              const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 rounded-2xl border border-amber/40 bg-[#FFFDF8] shadow-sm transition-all space-y-3 overflow-hidden"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-semibold text-charcoal">
                      <AlertCircle className="w-4 h-4 text-terracotta shrink-0" />
                      <span>{item.failure_reason || 'Target text box changed'}</span>
                    </div>
                    <span className="text-[11px] font-mono text-charcoal/60">{timeStr}</span>
                  </div>

                  {/* Editable textarea so user can fix typos or tweak formatting */}
                  <textarea
                    value={currentText}
                    onChange={(e) => handleTextChange(item.id, e.target.value)}
                    onBlur={() => handleSaveText(item.id)}
                    className="w-full text-xs font-medium text-charcoal bg-white p-3 rounded-xl border border-amber/30 focus:outline-none focus:ring-2 focus:ring-darkTeal/20 focus:border-darkTeal leading-relaxed resize-y min-h-[60px] shadow-xs"
                    placeholder="Transcript text..."
                  />

                  {/* Recovery Actions */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-b border-amber/20 pb-2">
                    <p className="text-[11px] text-charcoal/70 flex items-center gap-1">
                      <span>Click inside any app's text box, then tap</span>
                      <strong className="text-darkTeal font-bold">Paste to App</strong>.
                    </p>

                    <div className="flex items-center flex-wrap gap-1.5 sm:justify-end">
                      {/* 1. Paste to App */}
                      <button
                        onClick={() => handleInsertIntoActive(item.id)}
                        className={`tactile-btn tactile-btn-sm ${
                          insertSuccessId === item.id
                            ? 'tactile-btn-primary'
                            : 'tactile-btn-teal'
                        }`}
                        title="Paste directly into your active app at cursor position"
                        aria-label="Paste to App"
                      >
                        {insertSuccessId === item.id ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber" />
                            <span>Pasted to App!</span>
                          </>
                        ) : (
                          <>
                            <CornerDownLeft className="w-3.5 h-3.5" />
                            <span>Paste</span>
                          </>
                        )}
                      </button>

                      {/* 2. Enhance */}
                      <button
                        onClick={() => setEnhanceRecoveryId(enhanceRecoveryId === item.id ? null : item.id)}
                        className={`tactile-btn tactile-btn-sm ${
                          enhanceRecoveryId === item.id 
                            ? 'tactile-btn-primary' 
                            : 'tactile-btn-surface'
                        }`}
                        title="Enhance phrasing before placing text"
                        aria-label="Enhance recovery text"
                      >
                        <Wand2 className="w-3.5 h-3.5 text-amber-700" />
                        <span>Enhance</span>
                      </button>

                      {/* 3. Copy - Icon-only */}
                      <button
                        onClick={() => onCopy(currentText)}
                        className="ghost-action-btn p-1.5 text-charcoal/70 hover:text-darkTeal shrink-0"
                        title="Copy text to clipboard"
                        aria-label="Copy text"
                      >
                        <Copy className="w-3.5 h-3.5 text-darkTeal" />
                      </button>

                      {/* 4. Dismiss */}
                      <button
                        onClick={() => handleDismiss(item.id)}
                        className="tactile-btn tactile-btn-sm tactile-btn-surface p-1.5 hover:text-terracotta"
                        title="Dismiss recovery item"
                        aria-label="Dismiss"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {enhanceRecoveryId === item.id && (
                    <div className="pt-2">
                      <EnhanceReviewCard
                        originalText={currentText}
                        historyId={item.id}
                        onAccept={(enhanced) => {
                          setEditingTexts((prev) => ({ ...prev, [item.id]: enhanced }));
                          item.formatted_text = enhanced;
                          setEnhanceRecoveryId(null);
                          if (onReload) onReload();
                        }}
                        onInsert={async (enhancedText) => {
                          setEditingTexts((prev) => ({ ...prev, [item.id]: enhancedText }));
                          item.formatted_text = enhancedText;
                          try {
                            await safeInvoke('insert_into_selected_field', { id: item.id, text: enhancedText });
                            setInsertSuccessId(item.id);
                            setTimeout(() => {
                              setInsertSuccessId(null);
                              if (onReload) onReload();
                            }, 1500);
                          } catch (err) {
                            console.warn('Insert enhanced text failed:', err);
                            onCopy(enhancedText);
                          }
                        }}
                        onCopy={(text) => onCopy(text)}
                        onDiscard={() => setEnhanceRecoveryId(null)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search Bar for Transcriptions */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal/50" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search spoken dictations..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-charcoal/15 bg-white text-xs font-medium text-charcoal placeholder-charcoal/40 focus:outline-none focus:ring-2 focus:ring-darkTeal/20 focus:border-darkTeal shadow-xs"
        />
      </div>

      {/* History List */}
      {filteredHistory.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-charcoal/20 rounded-2xl bg-white shadow-xs">
          <Clock className="w-8 h-8 text-charcoal/30 mx-auto mb-2" />
          <p className="text-sm font-bold text-charcoal">
            {searchQuery ? 'No matching dictations found' : 'No dictations recorded yet'}
          </p>
          <p className="text-xs text-charcoal/60 mt-1">
            {searchQuery ? 'Try searching for different words' : 'Hold your shortcut key to speak into any text box'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((item) => {
            const date = new Date(item.timestamp_ms);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

            return (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-charcoal/10 hover:border-charcoal/20 bg-white transition-all shadow-xs group overflow-hidden space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-charcoal/70">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="font-bold text-charcoal whitespace-nowrap">{dateStr}, {timeStr}</span>
                    <span>•</span>
                    <span className="font-mono text-[11px] font-bold whitespace-nowrap">{item.duration_seconds.toFixed(1)}s</span>
                    {item.target_app && (
                      <>
                        <span>•</span>
                        <span className="bg-darkTeal/10 text-darkTeal px-2 py-0.5 rounded-md font-bold text-[10px] whitespace-nowrap">
                          {item.target_app}
                        </span>
                      </>
                    )}
                    {item.user_edited_text && item.user_edited_text !== item.original_text && (
                      <>
                        <span>•</span>
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold text-[10px] whitespace-nowrap">
                          Synced from Edit
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-wrap sm:justify-end">
                    {/* 1. Paste Button - Primary accent */}
                    <button
                      type="button"
                      onClick={() => handleInsertIntoActive(item.id)}
                      className="tactile-btn tactile-btn-xs tactile-btn-teal shrink-0"
                      title="Paste directly into your active app at cursor position"
                      aria-label="Paste to App"
                    >
                      {insertSuccessId === item.id ? (
                        <>
                          <Check className="w-3 h-3 text-amber" />
                          <span>Pasted!</span>
                        </>
                      ) : (
                        <>
                          <CornerDownLeft className="w-3 h-3" />
                          <span>Paste</span>
                        </>
                      )}
                    </button>

                    {/* 2. Enhance - Ghost action */}
                    <button
                      type="button"
                      onClick={() => setEnhanceRecordId(enhanceRecordId === item.id ? null : item.id)}
                      className={`ghost-action-btn shrink-0 ${
                        enhanceRecordId === item.id 
                          ? 'bg-amber/20 text-charcoal font-bold' 
                          : ''
                      }`}
                      title="Enhance grammar, clarity, or convert to prompt"
                      aria-label="Enhance"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-amber-700" />
                      <span>Enhance</span>
                    </button>

                    {/* 3. Copy - Icon-only */}
                    <button
                      type="button"
                      onClick={() => onCopy(item.formatted_text)}
                      className="ghost-action-btn p-1.5 text-charcoal/70 hover:text-darkTeal shrink-0"
                      title="Copy text to clipboard"
                      aria-label="Copy text"
                    >
                      <Copy className="w-3.5 h-3.5 text-darkTeal" />
                    </button>

                    {/* 4. Teach - Ghost action */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveEditId(item.id);
                        if (editingTexts[item.id] === undefined) {
                          setEditingTexts((prev) => ({ ...prev, [item.id]: item.formatted_text }));
                        }
                      }}
                      className="ghost-action-btn shrink-0"
                      title="Teach preferred spelling"
                      aria-label="Teach vocabulary"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-darkTeal" />
                      <span>Teach</span>
                    </button>

                    {/* 5. Rollback to Raw Speech Button */}
                    {(item.original_text !== item.formatted_text || item.user_edited_text) && (
                      <button
                        type="button"
                        onClick={() => handleRollbackOriginal(item.id)}
                        className="ghost-action-btn shrink-0"
                        title={restoredId === item.id ? 'Restored to raw speech!' : 'Roll back to verbatim raw speech'}
                        aria-label="Roll back to raw speech"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                        <span>{restoredId === item.id ? 'Restored!' : 'Rollback'}</span>
                      </button>
                    )}

                    {/* 6. Delete - Ghost action */}
                    <button
                      type="button"
                      onClick={() => onDelete(item.id)}
                      className="ghost-action-btn ghost-action-btn-danger p-1 text-charcoal/40 hover:text-terracotta shrink-0"
                      title="Delete entry"
                      aria-label="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {activeEditId === item.id ? (
                  <div className="space-y-2.5 mt-2">
                    <textarea
                      value={editingTexts[item.id] !== undefined ? editingTexts[item.id] : item.formatted_text}
                      onChange={(e) => handleTextChange(item.id, e.target.value)}
                      className="w-full text-xs font-mono p-3 rounded-xl border border-charcoal/20 bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-darkTeal/20 focus:border-darkTeal shadow-xs"
                      rows={2}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-charcoal/70">
                        Editing will teach VoxQuest recurring corrections for future dictations.
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveEditId(null)}
                          className="px-3 py-1.5 rounded-xl border border-charcoal/20 bg-white text-charcoal hover:bg-neutral-50 text-xs font-medium shadow-xs active:scale-95 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveRegularEdit(item.id)}
                          className="flex items-center gap-1 px-3.5 py-1.5 bg-darkTeal hover:bg-deepTeal text-white rounded-xl text-xs font-semibold border border-darkTeal shadow-xs active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save & Teach</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-charcoal leading-relaxed select-text whitespace-pre-wrap py-0.5">
                    "{item.formatted_text}"
                  </p>
                )}

                {learnedNoticeId === item.id && (
                  <div className="mt-2 text-[11px] font-bold text-darkTeal bg-darkTeal/10 px-2.5 py-1 rounded-lg border border-darkTeal/20 inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-darkTeal" />
                    <span>Correction saved! Candidate recorded in Personal Vocabulary.</span>
                  </div>
                )}

                {enhanceRecordId === item.id && (
                  <div className="pt-2">
                    <EnhanceReviewCard
                      originalText={item.formatted_text}
                      historyId={item.id}
                      onAccept={(enhanced) => {
                        setEnhanceRecordId(null);
                        setEditingTexts((prev) => ({ ...prev, [item.id]: enhanced }));
                        item.formatted_text = enhanced;
                        if (onReload) onReload();
                      }}
                      onRestoreOriginal={() => {
                        setEnhanceRecordId(null);
                        if (onReload) onReload();
                      }}
                      onInsert={async (enhancedText) => {
                        setEditingTexts((prev) => ({ ...prev, [item.id]: enhancedText }));
                        item.formatted_text = enhancedText;
                        try {
                          await safeInvoke('insert_into_selected_field', { id: item.id, text: enhancedText });
                          setInsertSuccessId(item.id);
                          setTimeout(() => {
                            setInsertSuccessId(null);
                            if (onReload) onReload();
                          }, 1500);
                        } catch (err) {
                          console.warn('Insert enhanced text failed:', err);
                          onCopy(enhancedText);
                        }
                      }}
                      onCopy={(text) => onCopy(text)}
                      onDiscard={() => setEnhanceRecordId(null)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
