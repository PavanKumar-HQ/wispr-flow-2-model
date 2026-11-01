import React from 'react';
import { Download, Check, Sparkles, HardDrive, Cpu } from 'lucide-react';
import { ModelInfo } from '../types';

interface ModelManagerProps {
  models: ModelInfo[];
  downloadProgress: { [id: string]: { percent: number; downloaded: number; total: number } };
  activeModelId: string;
  onDownload: (id: string) => void;
  onSelectActive: (id: string) => void;
  onSmokeTest: (id: string) => void;
  smokeTestLog?: string | null;
}

export const ModelManagerTab: React.FC<ModelManagerProps> = ({
  models,
  downloadProgress,
  activeModelId,
  onDownload,
  onSelectActive,
  onSmokeTest,
  smokeTestLog,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-vq-tealDark font-sans">Speech Recognition Model Manager</h2>
        <p className="text-xs text-vq-charcoal/70">
          All models run 100% locally via native <code className="px-1 py-0.5 bg-vq-surface rounded border border-vq-border font-mono">whisper.cpp</code>. 
          Zero audio leaves your device. Checksums verified via SHA-256 before activation.
        </p>
      </div>

      <div className="grid gap-4">
        {models.map((m) => {
          const isCurrent = m.id === activeModelId;
          const prog = downloadProgress[m.id];
          const isDownloading = prog && prog.percent < 100;
          const mbSize = (m.size_bytes / (1024 * 1024)).toFixed(1);

          return (
            <div
              key={m.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                isCurrent 
                  ? 'border-vq-tealDark bg-vq-surface shadow-tactile' 
                  : 'border-vq-border bg-vq-surface/50 hover:bg-vq-surface'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-vq-charcoal">{m.name}</span>
                    {m.recommended && (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold bg-vq-amber/20 text-vq-charcoal px-2 py-0.5 rounded border border-vq-amber/50">
                        <Sparkles className="w-2.5 h-2.5 text-vq-amber" /> Recommended
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-[10px] font-mono font-bold bg-vq-tealDark text-vq-cream px-2 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-vq-charcoal/80">{m.description}</p>

                  <div className="flex items-center gap-4 pt-1 text-[11px] font-mono text-vq-charcoal/70">
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" /> {mbSize} MB
                    </span>
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3 h-3" /> ~{m.ram_estimate_mb} MB RAM
                    </span>
                    <span className="truncate max-w-[200px]" title={`SHA256: ${m.sha256}`}>
                      Hash: {m.sha256.substring(0, 10)}...
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  {m.is_downloaded ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSmokeTest(m.id)}
                        className="px-2.5 py-1 text-xs font-mono rounded border border-vq-border hover:bg-vq-surfaceLight text-vq-charcoal shadow-tactile-sm"
                        title="Run real audio smoke test"
                      >
                        Smoke Test
                      </button>
                      <button
                        onClick={() => onSelectActive(m.id)}
                        disabled={isCurrent}
                        className={`px-3 py-1 text-xs font-bold font-sans rounded border border-vq-charcoal transition-all ${
                          isCurrent
                            ? 'bg-vq-sage text-vq-tealDark cursor-default'
                            : 'bg-vq-tealDark text-vq-cream hover:bg-vq-tealDeep shadow-tactile-sm'
                        }`}
                      >
                        {isCurrent ? 'Selected' : 'Use Model'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onDownload(m.id)}
                      disabled={isDownloading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded border border-vq-charcoal bg-vq-amber text-vq-charcoal hover:bg-vq-amber/90 shadow-tactile-sm disabled:opacity-50"
                    >
                      <Download className="w-3 h-3" />
                      {isDownloading ? `Downloading (${prog.percent}%)` : `Download (${mbSize} MB)`}
                    </button>
                  )}
                </div>
              </div>

              {isDownloading && (
                <div className="mt-3 space-y-1">
                  <div className="w-full bg-vq-cream rounded-full h-2 border border-vq-border overflow-hidden">
                    <div 
                      className="bg-vq-amber h-full transition-all duration-200"
                      style={{ width: `${prog.percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-vq-charcoal/60">
                    <span>Atomic install in progress</span>
                    <span>{prog.percent}%</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {smokeTestLog && (
        <div className="p-3 rounded-lg border-2 border-vq-tealDark bg-vq-surfaceLight space-y-1">
          <div className="text-xs font-bold text-vq-tealDark flex items-center gap-1 font-mono">
            <Check className="w-3.5 h-3.5" /> Engine Smoke Verification Passed:
          </div>
          <pre className="text-xs font-mono text-vq-charcoal overflow-x-auto whitespace-pre-wrap">
            {smokeTestLog}
          </pre>
        </div>
      )}
    </div>
  );
};
