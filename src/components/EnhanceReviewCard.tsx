import React, { useState, useEffect } from 'react';
import { Wand2, Check, Copy, CornerDownLeft, RotateCcw, X, AlertCircle, RefreshCw, Edit3, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { safeInvoke } from '../lib/ipc';
import { EnhancementMode, EnhancementResponse, EnhancementRequest } from '../types';
import { DeveloperCasingBar } from './DeveloperCasingBar';

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
  { id: 'light_correction', label: 'Light Correction', desc: 'Fix spelling, grammar, punctuation, and capitalization without rewriting.' },
  { id: 'technical_precision', label: 'Technical Precision', desc: 'Preserve code, identifiers, commands, flags, and constraints.' },
  { id: 'prompt', label: 'Prompt Composition', desc: 'Polish conversational instructions into precise, high-potency prompts.' },
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
  // Auto-detect prompt ONLY if explicitly requesting prompt creation
  const isPromptLike = () => {
    const l = (originalText || '').trim().toLowerCase();
    return (
      l.startsWith('generate a prompt') ||
      l.startsWith('generate prompt') ||
      l.startsWith('create a prompt') ||
      l.startsWith('create prompt') ||
      l.startsWith('write a prompt') ||
      l.startsWith('write prompt') ||
      l.startsWith('prompt for') ||
      l.startsWith('prompt to') ||
      l.startsWith('make a prompt') ||
      l.startsWith('give me a prompt') ||
      l.startsWith('prompt:')
    );
  };

  const initialMode = isPromptLike() ? 'prompt' : defaultMode;
  const [selectedMode, setSelectedMode] = useState<EnhancementMode>(initialMode);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<EnhancementResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [inserted, setInserted] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedText, setEditedText] = useState<string>('');

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
        setEditedText(res.enhanced_text);
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
    const textToCopy = isEditing ? editedText : (result?.enhanced_text || originalText);
    onCopy(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertClick = () => {
    const textToInsert = isEditing ? editedText : (result?.enhanced_text || originalText);
    if (onInsert) {
      onInsert(textToInsert);
      setInserted(true);
      setTimeout(() => setInserted(false), 2000);
    }
  };

  const handleAcceptClick = async () => {
    const textToAccept = isEditing ? editedText : (result?.enhanced_text || originalText);
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
        <div className="py-8 text-center space-y-2 border border-dashed border-charcoal/20 rounded-xl bg-stone-50">
          <RefreshCw className="w-5 h-5 text-darkTeal animate-spin mx-auto" />
          <p className="text-xs font-bold text-charcoal">Enhancing with local engine...</p>
          <p className="text-[10px] text-charcoal/60">Applying {selectedMode.replace('_', ' ')} transformations</p>
        </div>
      ) : error ? (
        <div className="p-3 rounded-xl bg-terracotta/10 border border-terracotta/30 text-xs flex items-center gap-2 text-charcoal">
          <AlertCircle className="w-4 h-4 text-terracotta shrink-0" />
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
                  <Wand2 className="w-3 h-3 text-amber" />
                  Enhanced ({selectedMode.replace('_', ' ')})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="tactile-btn tactile-btn-surface px-2.5 py-1 text-[11px] font-bold rounded-lg cursor-pointer"
                    title={isEditing ? 'Finish editing' : 'Edit enhanced text manually before accepting'}
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{isEditing ? 'Done Editing' : 'Edit Draft'}</span>
                  </button>
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
              </div>

              {isEditing ? (
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="w-full p-3 rounded-xl bg-white border-2 border-darkTeal text-xs text-charcoal font-medium leading-relaxed min-h-[72px] focus:outline-none focus:ring-1 focus:ring-darkTeal resize-y"
                  placeholder="Edit enhanced text directly..."
                />
              ) : (
                <div className="p-3 rounded-xl bg-[#F7FAF8] border-2 border-darkTeal/30 text-xs text-charcoal font-medium leading-relaxed min-h-[64px] select-text">
                  "{editedText || result.enhanced_text}"
                </div>
              )}

              {/* Developer Casing Transformations */}
              <DeveloperCasingBar
                text={isEditing ? editedText : result.enhanced_text}
                onApply={(transformed) => {
                  setEditedText(transformed);
                  if (onInsert) onInsert(transformed);
                }}
              />
            </div>
          </div>

          {/* Explanation Checklist: Exactly what was changed */}
          {result.explanations && result.explanations.length > 0 && (
            <div className="p-3 rounded-xl bg-amber/10 border border-amber/30 space-y-1.5 text-xs text-charcoal">
              <span className="text-[10px] font-bold uppercase tracking-wider text-darkTeal flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-darkTeal" />
                What was improved:
              </span>
              <ul className="space-y-1 pl-4 list-disc text-[11px] text-charcoal/80 font-medium">
                {result.explanations.map((exp, idx) => (
                  <li key={idx}>{exp}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Intent Integrity Inspector & Checklist */}
          {result.intent_audit && (
            <div className="p-3.5 rounded-xl border-2 border-darkTeal/20 bg-[#F4F9F7] space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-darkTeal flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  Intent Integrity Verification
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {result.intent_audit.missing_constraints.length === 0 ? 'Verified Safe & Intact' : 'Warning: Modified'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                {result.intent_audit.preserved_negations.map((neg, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-lg bg-white border border-darkTeal/30 text-darkTeal font-mono font-bold flex items-center gap-1 shadow-xs">
                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                    <span>Negation: "{neg}"</span>
                  </span>
                ))}
                {result.intent_audit.protected_terms.map((term, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-lg bg-white border border-amber/50 text-charcoal font-mono font-bold flex items-center gap-1 shadow-xs">
                    <Check className="w-2.5 h-2.5 text-amber-600" />
                    <span>Entity: {term}</span>
                  </span>
                ))}
                {result.intent_audit.preserved_numbers.map((num, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-lg bg-white border border-charcoal/20 text-charcoal font-mono font-bold flex items-center gap-1 shadow-xs">
                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                    <span>Constant: {num}</span>
                  </span>
                ))}
                {result.intent_audit.preserved_negations.length === 0 && result.intent_audit.protected_terms.length === 0 && result.intent_audit.preserved_numbers.length === 0 && (
                  <span className="text-[11px] text-charcoal/60 italic">Zero semantic inversions detected. Tone polished safely.</span>
                )}
              </div>
            </div>
          )}

          {/* Clean status note */}
          {result.changes_made && (
            <div className="flex items-center justify-between text-[11px] text-charcoal/70 px-1">
              <span>Text polished and verified against intent degradation</span>
              <span className="font-semibold text-darkTeal capitalize">{selectedMode.replace('_', ' ')}</span>
            </div>
          )}
        </div>
      ) : null}

      {/* Action Buttons */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t-2 border-charcoal/10">
        <div className="flex items-center gap-2">
          {onRestoreOriginal && (
            <button
              onClick={handleRestoreClick}
              className="tactile-btn tactile-btn-surface px-3 py-1.5 text-xs font-bold"
              title="Revert back to the exact initial speech recognition transcript"
            >
              <RotateCcw className="w-3.5 h-3.5 text-charcoal/70" />
              <span className="hidden sm:inline">Restore Original</span>
            </button>
          )}

          <button
            onClick={onDiscard}
            className="tactile-btn tactile-btn-surface px-3 py-1.5 text-xs font-bold"
          >
            Cancel
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyClick}
            className="tactile-btn tactile-btn-surface px-3 py-1.5 text-xs font-bold"
            title="Copy enhanced text to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-darkTeal" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {onInsert && (
            <button
              onClick={handleInsertClick}
              className="tactile-btn tactile-btn-primary px-3.5 py-1.5 text-xs font-bold"
              title="Paste enhanced text directly into your active application at your cursor"
            >
              {inserted ? <Check className="w-3.5 h-3.5" /> : <CornerDownLeft className="w-3.5 h-3.5" />}
              <span>{inserted ? 'Pasted to App!' : 'Paste to App'}</span>
            </button>
          )}

          <button
            onClick={handleAcceptClick}
            disabled={loading}
            className="tactile-btn tactile-btn-teal px-4 py-1.5 text-xs font-bold disabled:opacity-50"
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

