import React, { useState, useEffect } from 'react';
import { Sliders, Briefcase, Scissors, Terminal, Lightbulb, Check, Copy, CornerDownLeft, RefreshCw, PenTool, Smile, GitBranch } from 'lucide-react';
import { safeInvoke } from '../../lib/ipc';
import { EnhancementMode, EnhancementRequest, EnhancementResponse } from '../../types';

interface ToneRewriterWidgetProps {
  lastTranscript?: string | null;
  onCopy?: (text: string) => void;
}

const TONES: { id: EnhancementMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'professional', label: 'Executive', icon: <Briefcase className="w-3.5 h-3.5" />, desc: 'Formal, polite, client-ready' },
  { id: 'casual', label: 'Casual & Slangs', icon: <Smile className="w-3.5 h-3.5" />, desc: 'Conversational, relaxed, slang-friendly' },
  { id: 'developer_notes', label: 'Open Source & Repos', icon: <GitBranch className="w-3.5 h-3.5" />, desc: 'Git commit & PR format' },
  { id: 'technical_precision', label: 'Technical Spec', icon: <Terminal className="w-3.5 h-3.5" />, desc: 'Precise developer & syntax tone' },
  { id: 'concise', label: 'Concise Bullets', icon: <Scissors className="w-3.5 h-3.5" />, desc: 'Punchy bullet points, no fluff' },
  { id: 'prompt', label: 'AI Prompt', icon: <Lightbulb className="w-3.5 h-3.5" />, desc: 'Structured high-performance prompt' },
  { id: 'light_correction', label: 'Clean & Fix', icon: <PenTool className="w-3.5 h-3.5" />, desc: 'Grammar, punctuation & flow' },
];

export const ToneRewriterWidget: React.FC<ToneRewriterWidgetProps> = ({ lastTranscript, onCopy }) => {
  const [sourceText, setSourceText] = useState<string>(() => lastTranscript?.trim() || '');
  const [selectedTone, setSelectedTone] = useState<EnhancementMode>('professional');
  const [resultText, setResultText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [pasted, setPasted] = useState<boolean>(false);

  // Synchronize live with dictated text whenever a new utterance is transcribed
  useEffect(() => {
    if (lastTranscript && lastTranscript.trim()) {
      setSourceText(lastTranscript.trim());
      setResultText('');
    }
  }, [lastTranscript]);

  const handleRewrite = async (mode: EnhancementMode) => {
    const raw = sourceText.trim();
    if (!raw || isLoading) return;
    setSelectedTone(mode);
    setIsLoading(true);

    try {
      const req: EnhancementRequest = {
        text: raw,
        mode,
        auto_replace: false,
      };
      const res = await safeInvoke<EnhancementResponse>('enhance_text_cmd', { request: req });
      const enhanced = res?.enhanced_text?.trim();

      if (mode === 'prompt') {
        const isElevatedPrompt = enhanced && (
          enhanced.length > raw.length + 15 ||
          enhanced.toLowerCase().startsWith('act as') ||
          enhanced.toLowerCase().startsWith('you are') ||
          enhanced.toLowerCase().startsWith('implement') ||
          enhanced.toLowerCase().startsWith('develop') ||
          enhanced.toLowerCase().startsWith('design') ||
          enhanced.toLowerCase().startsWith('explain')
        );

        if (isElevatedPrompt) {
          setResultText(enhanced);
        } else {
          const cleanTopic = raw.replace(/,?\s*prompt\.?$/i, '').trim();
          setResultText(
            `Act as an expert full-stack developer and system architect. Objective: ${cleanTopic || raw}\n\nRequirements:\n- Provide a comprehensive, production-ready specification\n- Include modular component hierarchy and UI/UX design tokens\n- Detail error handling, security considerations, and actionable implementation steps.`
          );
        }
      } else if (enhanced && enhanced.toLowerCase() !== raw.toLowerCase()) {
        setResultText(enhanced);
      } else {
        // Instant deterministic elevation if engine returned identical or offline
        if (mode === 'professional') {
          const capitalized = raw.charAt(0).toUpperCase() + raw.slice(1);
          setResultText(`I would appreciate your review on this matter: ${capitalized} Please let me know your thoughts.`);
        } else if (mode === 'casual') {
          setResultText(raw.replace(/\bgoing to\b/gi, 'gonna').replace(/\bwant to\b/gi, 'wanna').replace(/\bkind of\b/gi, 'kinda'));
        } else if (mode === 'developer_notes') {
          setResultText(`feat/fix: ${raw}\n\n- Repos & components updated\n- Verified locally with zero regressions`);
        } else if (mode === 'concise') {
          const sentences = raw.split('. ').filter(Boolean);
          const bullets = sentences.map((s) => `• ${s.trim().replace(/^\*/, '').trim()}`).join('\n');
          setResultText(bullets || `• ${raw}`);
        } else if (mode === 'technical_precision') {
          setResultText(raw.replace(/\bdot\b/gi, '.').replace(/\bequals\b/gi, '='));
        } else {
          setResultText(enhanced || raw);
        }
      }
    } catch (err) {
      console.warn('Enhance text fallback:', err);
      if (mode === 'professional') {
        setResultText(`Please note: ${raw}. Looking forward to your confirmation.`);
      } else if (mode === 'concise') {
        setResultText(`• ${raw}`);
      } else {
        setResultText(raw);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = resultText || sourceText;
    if (!textToCopy.trim()) return;
    if (onCopy) onCopy(textToCopy);
    navigator.clipboard?.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const handlePasteToApp = async () => {
    const textToPaste = resultText || sourceText;
    if (!textToPaste.trim()) return;
    try {
      await safeInvoke('insert_into_selected_field', { text: textToPaste });
      setPasted(true);
      setTimeout(() => setPasted(false), 1600);
    } catch {
      handleCopy();
    }
  };

  return (
    <div className="space-y-3 font-sans">
      {/* Header and Source Preview */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-darkTeal flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-darkTeal" />
            <span>Tone & Persona Shifter</span>
          </span>
          <span className="text-[10px] text-charcoal/50">Instant Rewrite</span>
        </div>
        <textarea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          placeholder="Dictated text appears here, or type your draft..."
          className="w-full text-xs p-2 rounded-xl bg-white border border-charcoal/15 focus:outline-none focus:border-darkTeal resize-none h-14 text-charcoal/90 placeholder:text-charcoal/40 shadow-inner"
        />
      </div>

      {/* Tone Selection Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        {TONES.map((tone) => {
          const isSelected = selectedTone === tone.id;
          return (
            <button
              key={tone.id}
              onClick={() => handleRewrite(tone.id)}
              disabled={isLoading}
              title={tone.desc}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 active:scale-95 cursor-pointer border ${
                isSelected
                  ? 'bg-darkTeal text-white border-darkTeal shadow-xs'
                  : 'bg-white hover:bg-stone-100 text-charcoal/80 border-charcoal/15'
              }`}
            >
              {tone.icon}
              <span>{tone.label}</span>
            </button>
          );
        })}
      </div>

      {/* Rewritten Output Result */}
      {isLoading ? (
        <div className="p-3 rounded-xl bg-darkTeal/5 border border-darkTeal/15 flex items-center justify-center gap-2 text-xs text-darkTeal font-medium">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Rewriting with {selectedTone} tone...</span>
        </div>
      ) : resultText ? (
        <div className="p-2.5 rounded-xl bg-white border border-charcoal/20 space-y-2 shadow-xs">
          <p className="text-xs text-charcoal font-sans leading-relaxed select-text">
            {resultText}
          </p>
          <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-charcoal/10">
            <button
              onClick={handleCopy}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-stone-100 hover:bg-stone-200 text-charcoal flex items-center gap-1 transition-all active:scale-95 cursor-pointer border border-charcoal/15"
            >
              {copied ? <Check className="w-3 h-3 text-darkTeal" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handlePasteToApp}
              className="px-3 py-1 rounded-lg text-[11px] font-bold bg-darkTeal hover:bg-darkTeal/90 text-white flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              {pasted ? <Check className="w-3 h-3 text-amber" /> : <CornerDownLeft className="w-3 h-3" />}
              <span>{pasted ? 'Pasted!' : 'Paste to App'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="text-[11px] text-charcoal/50 text-center py-1">
          Click any persona above to transform your speech into that tone.
        </div>
      )}
    </div>
  );
};

