import React from 'react';
import { Mic, Square, Loader2, CheckCircle2, AlertCircle, Copy } from 'lucide-react';
import { Mascot } from './Mascot';
import { DictationStatus } from '../types';

interface FloatingPillProps {
  status: DictationStatus;
  isRecording: boolean;
  onToggle: () => void;
  onCopyLast: () => void;
}

export const FloatingPill: React.FC<FloatingPillProps> = ({
  status,
  isRecording,
  onToggle,
  onCopyLast,
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-200">
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-full border-2 border-vq-charcoal bg-vq-surface shadow-tactile ${
        isRecording ? 'ring-4 ring-vq-terracotta/40 animate-pulse' : ''
      }`}>
        <Mascot size={28} className={isRecording ? 'animate-bounce' : ''} />

        <div className="flex flex-col min-w-[200px] max-w-[320px]">
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase font-mono">
            {isRecording ? (
              <span className="flex items-center gap-1 text-vq-terracotta">
                <span className="w-2 h-2 rounded-full bg-vq-terracotta animate-ping" />
                Listening Live
              </span>
            ) : status.state === 'transcribing' ? (
              <span className="flex items-center gap-1 text-vq-tealDark">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Transcribing locally...
              </span>
            ) : status.state === 'success' ? (
              <span className="flex items-center gap-1 text-vq-tealDark">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Ready & Inserted
              </span>
            ) : status.state === 'warning' ? (
              <span className="flex items-center gap-1 text-vq-amber">
                <AlertCircle className="w-3.5 h-3.5" />
                Preserved in History
              </span>
            ) : (
              <span className="text-vq-charcoal/70">VoxQuest Sovereign Engine</span>
            )}
          </div>

          <p className="text-xs truncate font-medium text-vq-charcoal/90">
            {status.last_transcript || status.message || "Press shortcut or click to dictate"}
          </p>
        </div>

        <div className="flex items-center gap-1.5 pl-2 border-l border-vq-border">
          <button
            onClick={onToggle}
            className={`p-2 rounded-full border border-vq-charcoal transition-all ${
              isRecording
                ? 'bg-vq-terracotta text-vq-cream hover:bg-vq-terracotta/90 shadow-tactile-sm'
                : 'bg-vq-tealDark text-vq-cream hover:bg-vq-tealDeep shadow-tactile-sm'
            }`}
            title={isRecording ? "Stop dictation" : "Start dictation"}
          >
            {isRecording ? <Square className="w-3.5 h-3.5 fill-current" /> : <Mic className="w-3.5 h-3.5" />}
          </button>

          {status.last_transcript && (
            <button
              onClick={onCopyLast}
              className="p-2 rounded-full border border-vq-charcoal bg-vq-surface hover:bg-vq-surfaceLight text-vq-charcoal shadow-tactile-sm"
              title="Copy last dictated transcript"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
