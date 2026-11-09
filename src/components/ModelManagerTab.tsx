import React from 'react';
import { Download, Check, Zap, Globe, ShieldCheck, Play, X, Cpu, Shield, CheckCircle2 } from 'lucide-react';
import { ModelInfo } from '../types';

interface ModelManagerProps {
  models: ModelInfo[];
  downloadProgress: { [id: string]: { percent: number; downloaded: number; total: number } };
  activeModelId: string;
  onDownload: (id: string) => void;
  onSelectActive: (id: string) => void;
  onSmokeTest?: (id: string) => void;
  onDismissSmokeTest?: () => void;
  smokeTestLog?: string | null;
  autoRoutingEnabled?: boolean;
  onToggleAutoRouting?: (enabled: boolean) => void;
}

export const ModelManagerTab: React.FC<ModelManagerProps> = ({
  models,
  downloadProgress,
  activeModelId,
  onDownload,
  onSelectActive,
  onSmokeTest,
  onDismissSmokeTest,
  smokeTestLog,
  autoRoutingEnabled = true,
  onToggleAutoRouting,
}) => {
  // Purpose-driven speech profile presentation (Zero internal model names in UI)
  const getProfileMeta = (id: string) => {
    switch (id) {
      case 'whisper-base-en-q5_1':
        return {
          title: 'Instant English (Lightweight)',
          tag: 'English • 57 MB • Instant',
          icon: Zap,
          desc: 'Ultra-lightweight English model. Instant response (~140ms latency), lowest battery consumption, and zero MacBook heat.',
        };
      case 'whisper-base-q5_1':
        return {
          title: 'Everyday Multilingual (Low RAM)',
          tag: 'Multilingual • 59 MB',
          icon: Globe,
          desc: 'Compact Q5_1 multilingual model. High transcription precision with minimal memory overhead (~180 MB RAM).',
        };
      case 'whisper-tiny-q5_1':
        return {
          title: 'Ultra-Low Power (Battery Saver)',
          tag: 'Battery Saver • 32 MB',
          icon: Zap,
          desc: 'Ultra-quantized Q5_1 model. Lowest battery and RAM footprint (~120 MB RAM), ideal for maximum battery life.',
        };
      default:
        return {
          title: 'General Speech Profile',
          tag: 'Offline Speech',
          icon: Globe,
          desc: 'High precision offline speech recognition running natively on your device.',
        };
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-vq-tealDark">Dictation Accuracy Modes</h2>
          <span className="text-[10px] font-bold text-darkTeal bg-darkTeal/10 border border-darkTeal/20 px-2.5 py-0.5 rounded-full">Profiles</span>
        </div>
        <p className="text-xs text-vq-charcoal/70">
          Choose the speech profile that fits your daily workflow. Everything runs 100% on your device with complete privacy.
        </p>
      </div>

      {onToggleAutoRouting && (
        <div className="p-4 rounded-2xl border border-darkTeal/20 bg-darkTeal/5 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-darkTeal uppercase tracking-wider font-mono">Smart Context Auto-Pilot</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${autoRoutingEnabled ? 'bg-darkTeal text-white' : 'bg-charcoal/20 text-charcoal'}`}>
                {autoRoutingEnabled ? 'Active' : 'Manual'}
              </span>
            </div>
            <p className="text-xs text-charcoal/80">
              Dynamically switches to <strong>Developer Precision</strong> in IDEs & Terminal, and <strong>General Speed</strong> in Slack & Notes.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoRoutingEnabled}
              onChange={(e) => onToggleAutoRouting(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-charcoal/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-darkTeal"></div>
          </label>
        </div>
      )}

      <div className="grid gap-4">
        {models.map((m) => {
          const isCurrent = m.id === activeModelId;
          const prog = downloadProgress[m.id];
          const isDownloading = prog && prog.percent < 100;
          const meta = getProfileMeta(m.id);
          const Icon = meta.icon;

          return (
            <div
              key={m.id}
              className={`p-5 rounded-2xl border transition-all ${
                isCurrent 
                  ? 'border-darkTeal/40 bg-white shadow-sm ring-1 ring-darkTeal/20' 
                  : 'border-charcoal/15 bg-white hover:border-charcoal/30 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="p-1.5 rounded-xl bg-darkTeal/10 text-darkTeal border border-darkTeal/20 shadow-xs">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-vq-charcoal">{meta.title}</span>
                    
                    <span className="text-[10px] font-sans font-bold bg-vq-sage/40 text-vq-tealDark px-2 py-0.5 rounded-md border border-vq-border">
                      {meta.tag}
                    </span>

                    {m.recommended && (
                      <span className="text-[10px] font-sans font-bold bg-amber/20 text-charcoal px-2 py-0.5 rounded-md border border-amber/40">
                        Recommended
                      </span>
                    )}

                    {isCurrent && (
                      <span className="flex items-center gap-1 text-[10px] font-sans font-bold bg-darkTeal text-white px-2 py-0.5 rounded-md shadow-xs">
                        <Check className="w-2.5 h-2.5" /> Active Mode
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-vq-charcoal/75 leading-relaxed">{meta.desc}</p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0 pt-0.5">
                  <div className="flex items-center gap-2">
                    {m.is_downloaded && onSmokeTest && (
                      <button
                        onClick={() => onSmokeTest(m.id)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-charcoal/20 bg-white hover:bg-neutral-50 text-charcoal transition-all shadow-xs active:scale-95 flex items-center gap-1"
                        title="Run local voice engine diagnostic test"
                      >
                        <Play className="w-3 h-3 text-darkTeal" />
                        <span>Test</span>
                      </button>
                    )}
                    {m.is_downloaded ? (
                      <button
                        onClick={() => onSelectActive(m.id)}
                        disabled={isCurrent}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                          isCurrent
                            ? 'bg-darkTeal/10 text-darkTeal cursor-default border-darkTeal/20'
                            : 'bg-darkTeal text-white hover:bg-deepTeal border-darkTeal shadow-xs active:scale-95'
                        }`}
                      >
                        {isCurrent ? 'Current' : 'Select'}
                      </button>
                    ) : (
                      <button
                        onClick={() => onDownload(m.id)}
                        disabled={isDownloading}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-amber text-charcoal hover:bg-amber/90 border border-amber/50 shadow-xs active:scale-95 disabled:opacity-50"
                      >
                        <Download className="w-3 h-3" />
                        {isDownloading ? `Downloading (${prog.percent}%)` : 'Enable Profile'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {isDownloading && (
                <div className="mt-3 space-y-1">
                  <div className="w-full h-2 rounded-full bg-cream border border-charcoal/15 overflow-hidden">
                    <div 
                      className="bg-darkTeal h-full rounded-full transition-all duration-300"
                      style={{ width: `${prog.percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono font-bold text-charcoal/70">
                    <span>Downloading voice engine files</span>
                    <span>{prog.percent}%</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {smokeTestLog && (
        <div className="p-5 rounded-2xl border border-darkTeal/20 bg-white shadow-sm space-y-3.5 animate-fadeIn relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-darkTeal/10 border border-darkTeal/20 flex items-center justify-center shrink-0 text-darkTeal shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-darkTeal tracking-tight leading-none">
                    100% Offline
                  </span>
                  <span className="text-[10px] font-bold bg-darkTeal/10 text-darkTeal border border-darkTeal/20 px-2 py-0.5 rounded-full">
                    READY
                  </span>
                </div>
                <p className="text-xs font-medium text-charcoal/60 mt-0.5">
                  Zero Cloud • On-Device Engine
                </p>
              </div>
            </div>

            {onDismissSmokeTest && (
              <button
                onClick={onDismissSmokeTest}
                className="p-1.5 rounded-lg border border-charcoal/15 bg-white text-charcoal/60 hover:text-charcoal hover:bg-neutral-50 shadow-xs active:scale-95 transition-all"
                title="Dismiss diagnostic"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-50 border border-charcoal/10 shadow-xs space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-darkTeal">
              <CheckCircle2 className="w-3.5 h-3.5 text-darkTeal" />
              <span>Speech Engine Verified</span>
            </div>
            <p className="text-xs text-charcoal/80 font-medium leading-relaxed select-text">
              {smokeTestLog}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] font-semibold text-darkTeal">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-darkTeal/5 border border-darkTeal/15">
              <Cpu className="w-3.5 h-3.5 text-darkTeal" />
              Apple Silicon Acceleration
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-darkTeal/5 border border-darkTeal/15">
              <Shield className="w-3.5 h-3.5 text-darkTeal" />
              On-Device Privacy
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-darkTeal/5 border border-darkTeal/15">
              <CheckCircle2 className="w-3.5 h-3.5 text-darkTeal" />
              Accuracy & Noise Filtering
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
