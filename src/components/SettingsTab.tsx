import React from 'react';
import { Keyboard, Mic, Sliders, Shield, Target } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsTabProps {
  settings: AppSettings;
  devices: string[];
  onUpdate: (newSettings: AppSettings) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  devices,
  onUpdate,
}) => {
  const handleChange = (key: keyof AppSettings, value: unknown) => {
    onUpdate({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-vq-tealDark">Engine & Dictation Settings</h2>
        <p className="text-xs text-vq-charcoal/70">
          Configure persistent multi-window recording, deterministic formatting, and safety policies.
        </p>
      </div>

      <div className="grid gap-5">
        {/* Destination Policy */}
        <div className="p-4 rounded-lg border-2 border-vq-border bg-vq-surface space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-vq-tealDark font-mono flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" /> Destination Resolution Policy
          </h3>

          <div className="space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="insertion_policy"
                value="original_destination"
                checked={settings.insertion_policy === 'original_destination'}
                onChange={() => handleChange('insertion_policy', 'original_destination')}
                className="mt-0.5 text-vq-tealDark focus:ring-vq-tealDark"
              />
              <div>
                <span className="text-xs font-bold text-vq-charcoal">
                  Original Destination (Safe Default)
                </span>
                <p className="text-[11px] text-vq-charcoal/70">
                  Dictation is anchored to the field where you started. If you switch applications or navigate during recording, text is preserved for manual recovery rather than injected into the wrong place.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="insertion_policy"
                value="active_at_stop"
                checked={settings.insertion_policy === 'active_at_stop'}
                onChange={() => handleChange('insertion_policy', 'active_at_stop')}
                className="mt-0.5 text-vq-tealDark focus:ring-vq-tealDark"
              />
              <div>
                <span className="text-xs font-bold text-vq-charcoal">
                  Active Field When Dictation Stops (Wispr-style compatibility)
                </span>
                <p className="text-[11px] text-vq-charcoal/70">
                  Injects text into whichever eligible editable field is in the foreground when you finish speaking, provided it is not a password or secure field.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Shortcut and Language */}
        <div className="p-4 rounded-lg border-2 border-vq-border bg-vq-surface space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-vq-tealDark font-mono flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5" /> Activation & Language
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-vq-charcoal">Global Shortcut</label>
              <input
                type="text"
                value={settings.shortcut}
                onChange={(e) => handleChange('shortcut', e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono rounded border border-vq-border bg-vq-surfaceLight focus:outline-none focus:ring-2 focus:ring-vq-tealDark"
              />
              <span className="text-[10px] text-vq-charcoal/60">Toggle to start, speak naturally, toggle to insert</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-vq-charcoal">Spoken Language</label>
              <select
                value={settings.language}
                onChange={(e) => handleChange('language', e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-sans rounded border border-vq-border bg-vq-surfaceLight focus:outline-none focus:ring-2 focus:ring-vq-tealDark"
              >
                <option value="auto">Auto-detect Language</option>
                <option value="en">English</option>
                <option value="hi">Hindi (हिंदी)</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="ja">Japanese</option>
              </select>
              <span className="text-[10px] text-vq-charcoal/60">Multilingual model covers 99+ languages</span>
            </div>
          </div>
        </div>

        {/* Audio Input Device */}
        <div className="p-4 rounded-lg border-2 border-vq-border bg-vq-surface space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-vq-tealDark font-mono flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5" /> Microphone Input
          </h3>
          <div className="space-y-1">
            <label className="text-xs font-bold text-vq-charcoal">Hardware Input Device</label>
            <select
              className="w-full px-3 py-1.5 text-xs font-mono rounded border border-vq-border bg-vq-surfaceLight focus:outline-none focus:ring-2 focus:ring-vq-tealDark"
            >
              <option value="default">System Default Input</option>
              {devices.map((d, i) => (
                <option key={i} value={d}>{d}</option>
              ))}
            </select>
            <span className="text-[10px] text-vq-charcoal/60">Continuous capture via native cpal audio stream</span>
          </div>
        </div>

        {/* Deterministic Formatting Options */}
        <div className="p-4 rounded-lg border-2 border-vq-border bg-vq-surface space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-vq-tealDark font-mono flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" /> Faithful Formatting Rules
          </h3>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.spoken_punctuation}
                onChange={(e) => handleChange('spoken_punctuation', e.target.checked)}
                className="w-4 h-4 rounded border-vq-border text-vq-tealDark focus:ring-vq-tealDark"
              />
              <span className="text-xs font-medium text-vq-charcoal">
                Spoken Punctuation (e.g. "period", "comma", "newline", "question mark")
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auto_capitalization}
                onChange={(e) => handleChange('auto_capitalization', e.target.checked)}
                className="w-4 h-4 rounded border-vq-border text-vq-tealDark focus:ring-vq-tealDark"
              />
              <span className="text-xs font-medium text-vq-charcoal">
                Automatic sentence boundary capitalization
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.conservative_filler_removal}
                onChange={(e) => handleChange('conservative_filler_removal', e.target.checked)}
                className="w-4 h-4 rounded border-vq-border text-vq-tealDark focus:ring-vq-tealDark"
              />
              <span className="text-xs font-medium text-vq-charcoal">
                Conservative filler-word removal (removes "um", "uh", "er" while preserving user words)
              </span>
            </label>
          </div>
        </div>

        {/* Privacy & Storage */}
        <div className="p-4 rounded-lg border-2 border-vq-border bg-vq-surface space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-vq-tealDark font-mono flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Sovereignty & Privacy
          </h3>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.retain_history}
                onChange={(e) => handleChange('retain_history', e.target.checked)}
                className="w-4 h-4 rounded border-vq-border text-vq-tealDark focus:ring-vq-tealDark"
              />
              <span className="text-xs font-medium text-vq-charcoal">
                Retain dictation transcripts in local SQLite history database
              </span>
            </label>

            <div className="p-2.5 rounded bg-vq-cream/60 border border-vq-border text-[11px] text-vq-charcoal/70 leading-relaxed">
              <strong>Offline Promise:</strong> Raw microphone audio is held in memory during speech and immediately discarded after local transcription. Audio is never stored to disk and never sent across any network.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
