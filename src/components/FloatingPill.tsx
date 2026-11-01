import React from 'react';
import { Mic, Square, Loader2, CheckCircle2, AlertCircle, Copy, XCircle, RotateCcw } from 'lucide-react';
import { Mascot } from './Mascot';
import { SessionSnapshot } from '../types';

interface FloatingPillProps {
  status: SessionSnapshot;
  onToggle: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
  onCopyLast: () => void;
  compact?: boolean;
}

export const FloatingPill: React.FC<FloatingPillProps> = ({
  status,
  onToggle,
  onCancel,
  onRetry,
  onCopyLast,
  compact = false,
}) => {
  const isRecording = status.state === 'recording';
  const isTranscribing = status.state === 'transcribing' || status.state === 'inserting';
  const isRecovery = status.state === 'recovery_required';
  const isCompleted = status.state === 'completed';
  const isFailed = status.state === 'failed';

  return (
    <div className={compact ? "transition-all duration-200 select-none" : "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-200 select-none"}>
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-full border-2 border-vq-charcoal bg-vq-surface shadow-tactile ${
        isRecording ? 'ring-4 ring-vq-terracotta/40 animate-pulse' : ''
      }`}>
        <Mascot size={28} className={isRecording ? 'animate-bounce' : ''} />

        <div className="flex flex-col min-w-[210px] max-w-[340px]">
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase font-mono">
            {isRecording ? (
              <span className="flex items-center gap-1 text-vq-terracotta">
                <span className="w-2 h-2 rounded-full bg-vq-terracotta animate-ping" />
                Listening Across Windows
              </span>
            ) : isTranscribing ? (
              <span className="flex items-center gap-1 text-vq-tealDark">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Processing Locally (Whisper)
              </span>
            ) : isCompleted ? (
              <span className="flex items-center gap-1 text-vq-tealDark">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Inserted Safely
              </span>
            ) : isRecovery ? (
              <span className="flex items-center gap-1 text-vq-amber">
                <AlertCircle className="w-3.5 h-3.5" />
                Recovery Available
              </span>
            ) : isFailed ? (
              <span className="flex items-center gap-1 text-vq-terracotta">
                <AlertCircle className="w-3.5 h-3.5" />
                Engine Notice
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
          {/* Main Record/Stop Toggle */}
          <button
            onClick={onToggle}
            className={`p-2 rounded-full border border-vq-charcoal transition-all ${
              isRecording
                ? 'bg-vq-terracotta text-vq-cream hover:bg-vq-terracotta/90 shadow-tactile-sm'
                : 'bg-vq-tealDark text-vq-cream hover:bg-vq-tealDeep shadow-tactile-sm'
            }`}
            title={isRecording ? "Stop dictation (Process audio)" : "Start dictation"}
          >
            {isRecording ? <Square className="w-3.5 h-3.5 fill-current" /> : <Mic className="w-3.5 h-3.5" />}
          </button>

          {/* Cancel button during active recording */}
          {isRecording && onCancel && (
            <button
              onClick={onCancel}
              className="p-2 rounded-full border border-vq-charcoal bg-vq-surface hover:bg-red-50 text-vq-terracotta shadow-tactile-sm"
              title="Cancel recording (discard audio)"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Retry insertion button if recovery is required */}
          {isRecovery && onRetry && (
            <button
              onClick={onRetry}
              className="p-2 rounded-full border border-vq-charcoal bg-vq-amber/20 hover:bg-vq-amber/30 text-vq-charcoal shadow-tactile-sm"
              title="Retry insertion into currently focused field"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Copy transcript button */}
          {status.last_transcript && (
            <button
              onClick={onCopyLast}
              className="p-2 rounded-full border border-vq-charcoal bg-vq-surface hover:bg-vq-surfaceLight text-vq-charcoal shadow-tactile-sm"
              title="Copy transcript to clipboard"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
