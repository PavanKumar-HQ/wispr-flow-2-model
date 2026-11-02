import React, { useState, useEffect } from 'react';
import { Wand2, Check, Copy, CornerDownLeft, RotateCcw, X, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { safeInvoke } from '../lib/ipc';
import { EnhancementMode, EnhancementResponse, EnhancementRequest } from '../types';

interface EnhanceReviewCardProps {
  originalText: string;
  onAccept: (enhancedText: string) => void;
  onInsert?: (text: string) => void;
  onCopy: (text: string) => void;
  onDiscard: () => void;
  onRestoreOriginal?: () => void;
  historyId?: number;
  sessionId?: string;
  defaultMode?: EnhancementMode;
  className?: string;
}

const MODES: { id: EnhancementMode; label: string; desc: string }[] = [
  { id: 'light_correction', label: 'Light Correction', desc: 'Fix spelling, grammar, punctuation, and capitalization.' },
  { id: 'prompt', label: 'AI Prompt', desc: 'Polish conversational instructions into precise, high-potency prompts.' },
  { id: 'professional', label: 'Professional', desc: 'Improve clarity, grammar, and workplace tone while preserving facts.' },
  { id: 'concise', label: 'Concise', desc: 'Remove unnecessary repetition and wordiness without losing meaning.' },
  { id: 'natural', label: 'Natural', desc: 'Improve readability while retaining your natural conversational voice.' },
];

export const EnhanceReviewCard: React.FC<EnhanceReviewCardProps> = ({
  originalText,
  onAccept,
  onInsert,
  onCopy,
  onDiscard,
  onRestoreOriginal,
  historyId,
  sessionId,
  defaultMode = 'light_correction',
  className = '',
}) => {
  // Auto-detect prompt if spoken text represents an AI prompt or contains prompt instructions
  const isPromptLike = () => {
    const l = (originalText || '').trim().toLowerCase();
    return l.startsWith('prompt') || l.startsWith('verify') || l.startsWith('write') || l.startsWith('create') || l.startsWith('generate') || l.startsWith('explain') || l.startsWith('fix') || l.startsWith('debug') || l.includes('prompt');
  };

  const initialMode = isPromptLike() ? 'prompt' : defaultMode;
  const [selectedMode, setSelectedMode] = useState<EnhancementMode>(initialMode);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<EnhancementResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [inserted, setInserted] = useState<boolean>(false);

  const runEnhancement = async (mode: EnhancementMode) => {
    if (!originalText.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const req: EnhancementRequest = {
        session_id: sessionId || null,
        text: originalText.trim(),
        mode,
      };

      const res = await safeInvoke<EnhancementResponse>('enhance_text_cmd', { request: req });
      if (res && res.enhanced_text) {
        setResult(res);
      } else {
        setError('Enhancement returned empty output.');
      }
    } catch (err: any) {
      console.warn('Enhancement failed:', err);
      setError(typeof err === 'string' ? err : 'Local enhancement engine unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runEnhancement(selectedMode);
  }, [originalText]);

  const handleModeChange = (mode: EnhancementMode) => {
    setSelectedMode(mode);
    runEnhancement(mode);
  };

  const handleCopyClick = () => {
    const textToCopy = result?.enhanced_text || originalText;
    onCopy(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertClick = () => {
    const textToInsert = result?.enhanced_text || originalText;
    if (onInsert) {
      onInsert(textToInsert);
      setInserted(true);
      setTimeout(() => setInserted(false), 2000);
    }
  };

  const handleAcceptClick = async () => {
    const textToAccept = result?.enhanced_text || originalText;
    if (historyId) {
      try {
        await safeInvoke('accept_enhancement_history_cmd', {
          id: historyId,
          enhancedText: textToAccept,
        });
      } catch (err) {
        console.warn('Failed to update history enhancement:', err);
      }
    } else if (sessionId) {
      try {
        await safeInvoke('accept_enhancement_session_cmd', {
          enhancedText: textToAccept,
        });
      } catch (err) {
        console.warn('Failed to update session enhancement:', err);
      }
    }
    onAccept(textToAccept);
  };

  const handleRestoreClick = async () => {
    if (historyId && onRestoreOriginal) {
      try {
        await safeInvoke('restore_original_history_cmd', { id: historyId });
      } catch (err) {
        console.warn('Failed to restore original in history:', err);
      }
      onRestoreOriginal();
    } else {
      onDiscard();
    }
  };

  return (
    <div className={`p-4 sm:p-5 rounded-2xl border border-charcoal/15 bg-white shadow-sm space-y-4 animate-fadeIn ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-charcoal/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber/20 border border-amber/40 text-charcoal">
            <Wand2 className="w-4 h-4 text-darkTeal" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal">
              Enhance Dictation
            </h4>
            <p className="text-[11px] text-charcoal/70">
              Improve clarity, grammar, and tone while preserving your original intent.
            </p>
          </div>
        </div>

        <button
          onClick={onDiscard}
          className="p-1.5 rounded-lg border border-charcoal/15 bg-white hover:bg-neutral-50 text-charcoal/60 hover:text-charcoal shadow-xs active:scale-95 transition-all"
          title="Close review without changing"
          aria-label="Discard enhancement"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {MODES.map((m) => {
          const isSelected = selectedMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => handleModeChange(m.id)}
              disabled={loading}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-darkTeal text-white border-darkTeal shadow-xs'
                  : 'bg-white border-charcoal/15 text-charcoal hover:bg-neutral-50 shadow-xs'
              }`}
              title={m.desc}
            >
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Comparison View */}
      {loading ? (
        <div className="py-8 text-center space-y-2 border-2 border-dashed border-vq-border rounded-xl bg-vq-surface/50">
          <RefreshCw className="w-5 h-5 text-vq-tealDark animate-spin mx-auto" />
          <p className="text-xs font-bold text-vq-charcoal">Enhancing with local engine...</p>
          <p className="text-[10px] text-vq-charcoal/60">Applying {selectedMode.replace('_', ' ')} transformations</p>
        </div>
      ) : error ? (
        <div className="p-3 rounded-xl bg-vq-terracotta/10 border-2 border-vq-terracotta/40 text-xs flex items-center gap-2 text-vq-charcoal">
          <AlertCircle className="w-4 h-4 text-vq-terracotta shrink-0" />
          <span>{error}</span>
        </div>
      ) : result ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Original Box */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold text-charcoal/60 uppercase tracking-wide">
                Original Spoken Text
              </span>
              <div className="p-3 rounded-xl bg-stone-50 border border-charcoal/15 text-xs text-charcoal font-medium leading-relaxed min-h-[64px] select-text">
                "{result.original_text}"
              </div>
            </div>

            {/* Enhanced Draft Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-darkTeal uppercase tracking-wide flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                  Enhanced ({selectedMode.replace('_', ' ')})
                </span>
                {result.changes_made ? (
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Refined
                  </span>
                ) : (
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-charcoal/70 border border-charcoal/10">
                    No changes needed
                  </span>
                )}
              </div>
              <div className="p-3 rounded-xl bg-[#F7FAF8] border border-darkTeal/40 text-xs text-charcoal font-medium leading-relaxed min-h-[64px] select-text">
                "{result.enhanced_text}"
              </div>
            </div>
          </div>

          {/* Clean status note */}
          {result.changes_made && (
            <div className="flex items-center justify-between text-[11px] text-charcoal/70 px-1">
              <span>Text polished and ready to place</span>
              <span className="font-semibold text-darkTeal capitalize">{selectedMode.replace('_', ' ')}</span>
            </div>
          )}
        </div>
      ) : null}

      {/* Action Buttons */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-charcoal/10">
        <div className="flex items-center gap-2">
          {onRestoreOriginal && (
            <button
              onClick={handleRestoreClick}
              className="px-3 py-1.5 rounded-xl border border-charcoal/20 bg-white text-charcoal hover:bg-neutral-50 text-xs font-medium transition-all shadow-xs active:scale-95 flex items-center gap-1.5"
              title="Revert back to the exact initial speech recognition transcript"
            >
              <RotateCcw className="w-3.5 h-3.5 text-charcoal/70" />
              <span className="hidden sm:inline">Restore Original</span>
            </button>
          )}

          <button
            onClick={onDiscard}
            className="px-3 py-1.5 rounded-xl border border-charcoal/20 bg-white text-charcoal/70 hover:bg-neutral-50 text-xs font-medium transition-all shadow-xs active:scale-95"
          >
            Cancel
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyClick}
            className="px-3 py-1.5 rounded-xl border border-charcoal/20 bg-white text-charcoal hover:bg-neutral-50 text-xs font-medium transition-all shadow-xs active:scale-95 flex items-center gap-1.5"
            title="Copy enhanced text to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-darkTeal" /> : <Copy className="w-3.5 h-3.5 text-darkTeal" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {onInsert && (
            <button
              onClick={handleInsertClick}
              className="px-3 py-1.5 rounded-xl border border-darkTeal/20 bg-darkTeal/10 text-darkTeal hover:bg-darkTeal/20 text-xs font-semibold transition-all shadow-xs active:scale-95 flex items-center gap-1.5"
              title="Insert enhanced text into active app cursor"
            >
              {inserted ? <Check className="w-3.5 h-3.5 text-darkTeal" /> : <CornerDownLeft className="w-3.5 h-3.5 text-amber" />}
              <span className="hidden sm:inline">{inserted ? 'Inserted!' : 'Insert'}</span>
            </button>
          )}

          <button
            onClick={handleAcceptClick}
            disabled={loading}
            className="px-4 py-1.5 rounded-xl bg-darkTeal text-white hover:bg-deepTeal text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center gap-1.5 disabled:opacity-50 border border-darkTeal"
            title="Accept enhanced draft as current transcript"
          >
            <Check className="w-3.5 h-3.5 text-amber" />
            <span>Accept & Save</span>
          </button>
        </div>
      </div>
    </div>
  );
};

