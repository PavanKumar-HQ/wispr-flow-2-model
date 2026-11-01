import React from 'react';
import { Copy, Trash2, Clock, Check, AlertCircle } from 'lucide-react';
import { HistoryRecord } from '../types';

interface HistoryTabProps {
  history: HistoryRecord[];
  onCopy: (text: string) => void;
  onDelete: (id: number) => void;
  onClearAll: () => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  history,
  onCopy,
  onDelete,
  onClearAll,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-vq-tealDark">Transcription History & Recovery</h2>
          <p className="text-xs text-vq-charcoal/70">
            Durable local SQLite storage. All uninserted transcripts due to application switches are safely kept here.
          </p>
        </div>
        {history.length > 0 && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded border border-vq-terracotta text-vq-terracotta hover:bg-vq-terracotta hover:text-white transition-all shadow-tactile-sm"
          >
            <Trash2 className="w-3 h-3" /> Clear History
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed border-vq-border rounded-lg bg-vq-surface/30">
          <Clock className="w-8 h-8 text-vq-charcoal/40 mx-auto mb-2" />
          <p className="text-sm font-medium text-vq-charcoal/60">No transcripts recorded yet.</p>
          <p className="text-xs text-vq-charcoal/40">Dictations and preserved recovery text will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
          {history.map((item) => {
            const date = new Date(item.timestamp_ms);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const isInserted = item.status === 'inserted';

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-lg border-2 bg-vq-surface transition-all ${
                  isInserted ? 'border-vq-border' : 'border-vq-amber shadow-tactile-amber'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-vq-charcoal/70 mb-2">
                  <div className="flex items-center gap-2">
                    <span>{timeStr}</span>
                    <span>•</span>
                    <span>{item.duration_seconds.toFixed(1)}s</span>
                    {item.target_app && (
                      <>
                        <span>•</span>
                        <span className="bg-vq-sage/30 px-1.5 py-0.5 rounded border border-vq-border font-medium">
                          {item.target_app}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isInserted ? (
                      <span className="flex items-center gap-1 text-vq-tealDark font-medium">
                        <Check className="w-3 h-3" /> Inserted
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-vq-terracotta font-medium">
                        <AlertCircle className="w-3 h-3" /> Preserved Recovery
                      </span>
                    )}
                    <button
                      onClick={() => onCopy(item.formatted_text)}
                      className="p-1 rounded hover:bg-vq-surfaceLight text-vq-charcoal"
                      title="Copy formatted text"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="p-1 rounded hover:bg-vq-terracotta/20 text-vq-terracotta"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-vq-charcoal font-normal leading-relaxed whitespace-pre-wrap select-text">
                  {item.formatted_text}
                </p>

                {item.original_text !== item.formatted_text && (
                  <p className="mt-1.5 text-xs text-vq-charcoal/50 italic font-mono truncate">
                    Raw: "{item.original_text}"
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

