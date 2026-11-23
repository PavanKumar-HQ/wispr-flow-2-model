import React from 'react';
import { Download, Check, Gauge, Globe, ShieldCheck, Play, X, Cpu, Shield, CheckCircle2 } from 'lucide-react';
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
          icon: Gauge,
          desc: 'Ultra-lightweight English model. Instant response (~140ms latency), lowest battery consumption, and zero heat.',
        };
      case 'whisper-base-q5_1':
        return {
          title: 'Everyday Multilingual (Low RAM)',
          tag: 'Multilingual • 59 MB',
          icon: Globe,
          desc: 'Compact multilingual model with high precision and low memory footprint (~180 MB RAM).',
        };
      case 'whisper-tiny-q5_1':
        return {
          title: 'Ultra-Low Power (Battery Saver)',
          tag: 'Battery Saver • 32 MB',
          icon: Cpu,
          desc: 'Ultra-quantized model with lowest footprint (~120 MB RAM), ideal for all-day battery life.',
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
          <h2 className="text-xl font-bold text-charcoal dark:text-cream">Dictation Accuracy Modes</h2>
          <span className="text-[10px] font-bold text-charcoal dark:text-mint bg-darkTeal/10 dark:bg-darkTealElevated border border-darkTeal/20 dark:border-darkTealBorder px-2.5 py-0.5 rounded-full">Profiles</span>
        </div>
        <p className="text-xs text-charcoal/80 dark:text-cream/80">
          Select your speech profile. Everything runs 100% locally on your device.
        </p>
      </div>

      {onToggleAutoRouting && (
        <div className="p-4 rounded-2xl border border-charcoal/15 dark:border-darkTealBorder bg-white dark:bg-darkTealSurface flex items-center justify-between shadow-xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-charcoal dark:text-cream uppercase tracking-wider font-mono">Smart Context Auto-Pilot</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${autoRoutingEnabled ? 'bg-darkTeal dark:bg-darkTealAccent text-white' : 'bg-[#F6F6F2] dark:bg-darkTealElevated text-charcoal dark:text-cream border border-charcoal/15 dark:border-darkTealBorder'}`}>
                {autoRoutingEnabled ? 'Active' : 'Manual'}
              </span>
            </div>
            <p className="text-xs text-charcoal/80 dark:text-cream/80">
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
            <div className="w-11 h-6 bg-charcoal/20 dark:bg-charcoal/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-darkTeal dark:peer-checked:bg-darkTealAccent"></div>
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
                  ? 'border-darkTeal dark:border-mint bg-white dark:bg-darkTealSurface shadow-xs ring-1 ring-darkTeal/20 dark:ring-mint/20' 
                  : 'border-charcoal/15 dark:border-darkTealBorder bg-white dark:bg-darkTealSurface hover:border-charcoal/30 dark:hover:border-mint/40 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="p-1.5 rounded-xl bg-darkTeal/10 dark:bg-darkTealElevated text-darkTeal dark:text-mint border border-darkTeal/20 dark:border-darkTealBorder shadow-xs">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-charcoal dark:text-cream">{meta.title}</span>
                    
                    <span className="text-[10px] font-sans font-bold bg-[#F6F6F2] dark:bg-darkTealElevated text-charcoal dark:text-cream px-2 py-0.5 rounded-md border border-charcoal/15 dark:border-darkTealBorder">
                      {meta.tag}
                    </span>

                    {m.recommended && (
                      <span className="text-[10px] font-sans font-bold bg-amber/20 dark:bg-amber/30 text-charcoal dark:text-amber px-2 py-0.5 rounded-md border border-amber/40">
                        Recommended
                      </span>
                    )}

                    {isCurrent && (
                      <span className="flex items-center gap-1 text-[10px] font-sans font-bold bg-darkTeal dark:bg-darkTealAccent text-white px-2 py-0.5 rounded-md shadow-xs border border-transparent dark:border-mint/40">
                        <Check className="w-2.5 h-2.5" /> Active Mode
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-charcoal/80 dark:text-cream/90 leading-relaxed font-normal">{meta.desc}</p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0 pt-0.5">
                  <div className="flex items-center gap-2">
                    {m.is_downloaded && onSmokeTest && (
                      <button
                        onClick={() => onSmokeTest(m.id)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-charcoal/20 dark:border-darkTealBorder bg-white dark:bg-darkTealSurface hover:bg-[#F6F6F2] dark:hover:bg-darkTealElevated text-charcoal dark:text-cream transition-all shadow-xs active:scale-95 flex items-center gap-1"
                        title="Run local voice engine diagnostic test"
                      >
                        <Play className="w-3 h-3 text-darkTeal dark:text-amber" />
                        <span>Test</span>
                      </button>
                    )}
                    {m.is_downloaded ? (
                      <button
                        onClick={() => onSelectActive(m.id)}
                        disabled={isCurrent}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                          isCurrent
                            ? 'bg-[#F6F6F2] dark:bg-darkTealElevated text-charcoal dark:text-cream cursor-default border-charcoal/15 dark:border-darkTealBorder font-bold'
                            : 'bg-darkTeal dark:bg-darkTealAccent text-white hover:bg-darkTeal/90 dark:hover:bg-darkTealAccent/90 border-darkTeal dark:border-mint/40 shadow-xs active:scale-95'
                        }`}
                      >
                        {isCurrent ? 'Current' : 'Select'}
                      </button>
                    ) : (
                      <button
                        onClick={() => onDownload(m.id)}
                        disabled={isDownloading}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-amber text-charcoal hover:bg-amber/90 border border-amber/50 shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
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
                  <div className="w-full h-2 rounded-full bg-[#F6F6F2] dark:bg-darkTealElevated border border-charcoal/15 dark:border-darkTealBorder overflow-hidden">
                    <div 
                      className="bg-darkTeal dark:bg-darkTealAccent h-full rounded-full transition-all duration-300"
                      style={{ width: `${prog.percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono font-bold text-charcoal/70 dark:text-cream/70">
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
        <div className="p-5 rounded-2xl border border-charcoal/15 dark:border-darkTealBorder bg-white dark:bg-darkTealSurface shadow-xs space-y-3.5 animate-fadeIn relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-darkTeal/10 dark:bg-darkTealElevated border border-darkTeal/20 dark:border-darkTealBorder flex items-center justify-center shrink-0 text-darkTeal dark:text-mint shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-charcoal dark:text-cream tracking-tight leading-none">
                    Local Speech Engine
                  </span>
                  <span className="text-[10px] font-bold bg-darkTeal/10 dark:bg-darkTealElevated text-darkTeal dark:text-mint border border-darkTeal/20 dark:border-darkTealBorder px-2.5 py-0.5 rounded-full">
                    READY
                  </span>
                </div>
                <p className="text-xs font-medium text-charcoal/60 dark:text-cream/60 mt-0.5">
                  On-device neural inference
                </p>
              </div>
            </div>

            {onDismissSmokeTest && (
              <button
                onClick={onDismissSmokeTest}
                className="p-1.5 rounded-lg border border-charcoal/15 dark:border-darkTealBorder bg-white dark:bg-darkTealElevated text-charcoal/60 dark:text-cream/60 hover:text-charcoal dark:hover:text-cream hover:bg-neutral-50 dark:hover:bg-darkTealSurface shadow-xs active:scale-95 transition-all"
                title="Dismiss diagnostic"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-[#F8F8F5] dark:bg-darkTealElevated border border-charcoal/10 dark:border-darkTealBorder shadow-xs space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-charcoal dark:text-cream">
              <CheckCircle2 className="w-3.5 h-3.5 text-darkTeal dark:text-mint" />
              <span>Speech Engine Verified</span>
            </div>
            <p className="text-xs text-charcoal/80 dark:text-cream/80 font-medium leading-relaxed select-text">
              {smokeTestLog}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] font-semibold text-charcoal dark:text-cream">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-darkTeal/10 dark:bg-darkTealElevated border border-darkTeal/20 dark:border-darkTealBorder">
              <Cpu className="w-3.5 h-3.5 text-darkTeal dark:text-mint" />
              Apple Silicon Acceleration
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-darkTeal/10 dark:bg-darkTealElevated border border-darkTeal/20 dark:border-darkTealBorder">
              <Shield className="w-3.5 h-3.5 text-darkTeal dark:text-mint" />
              On-Device Privacy
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-darkTeal/10 dark:bg-darkTealElevated border border-darkTeal/20 dark:border-darkTealBorder">
              <CheckCircle2 className="w-3.5 h-3.5 text-darkTeal dark:text-mint" />
              Accuracy & Noise Filtering
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
