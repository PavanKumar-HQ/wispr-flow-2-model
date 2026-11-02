import React, { useState } from 'react';
import { Keyboard, Mic, Sliders, Shield, Target, CheckCircle2, AlertTriangle, ExternalLink, RotateCcw, BookOpen } from 'lucide-react';
import { AppSettings } from '../types';
import { safeInvoke } from '../lib/ipc';

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
  const [accessChecked, setAccessChecked] = useState<boolean | null>(null);
  const [isRecordingShortcut, setIsRecordingShortcut] = useState<boolean>(false);

  const handleRequestAccess = async () => {
    try {
      const trusted = await safeInvoke<boolean>('request_accessibility_permission');
      setAccessChecked(Boolean(trusted));
    } catch (err) {
      console.warn('Access check failed:', err);
    }
  };

  const handleChange = (key: keyof AppSettings, value: unknown) => {
    onUpdate({ ...settings, [key]: value });
  };

  const handleShortcutKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      setIsRecordingShortcut(false);
      return;
    }

    const parts: string[] = [];
    if (e.metaKey || e.ctrlKey) parts.push('CommandOrControl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');

    let key = e.key;
    if (key === ' ' || key === 'Spacebar') key = 'Space';
    else if (key.length === 1) key = key.toUpperCase();

    // Ignore solitary modifier presses
    if (['Meta', 'Control', 'Shift', 'Alt'].includes(e.key)) {
      return;
    }

    parts.push(key);
    const newShortcut = parts.join('+');
    handleChange('shortcut', newShortcut);
    setIsRecordingShortcut(false);
  };

  const formatShortcutBadges = (s: string) => {
    if (!s) return ['⌘', '⇧', 'Space'];
    return s
      .replace(/CommandOrControl/gi, '⌘')
      .replace(/Command/gi, '⌘')
      .replace(/Control/gi, '⌃')
      .replace(/Shift/gi, '⇧')
      .replace(/Alt|Option/gi, '⌥')
      .split('+')
      .map((p) => p.trim())
      .filter(Boolean);
  };

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-darkTeal">App & Voice Settings</h2>
          <span className="text-[10px] font-bold text-darkTeal bg-darkTeal/10 border border-darkTeal/20 px-2.5 py-0.5 rounded-full">Config</span>
        </div>
        <p className="text-xs text-charcoal/70">
          Customize your voice shortcut, language, and smart formatting preferences.
        </p>
      </div>

      <div className="grid gap-5">
        {/* System Permission Card */}
        <div className="p-5 rounded-2xl border border-charcoal/15 bg-white shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-darkTeal font-mono flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> macOS Text Insertion Permission
            </h3>
            {accessChecked === true && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-darkTeal bg-darkTeal/10 border border-darkTeal/20 px-2.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-darkTeal" /> Granted
              </span>
            )}
            {accessChecked === false && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-charcoal bg-amber/20 border border-amber/40 px-2.5 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3 text-charcoal" /> Action Required
              </span>
            )}
          </div>
          <p className="text-xs text-charcoal/80 leading-relaxed">
            For VoxQuest to automatically paste transcribed speech directly into external apps (like WhatsApp, Chrome, Notes, Slack), macOS requires Accessibility permission.
          </p>
          <button
            onClick={handleRequestAccess}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-darkTeal hover:bg-deepTeal text-white border border-darkTeal shadow-xs active:scale-95 transition-all"
          >
            <span>Check & Enable Accessibility Permission</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Destination Policy */}
        <div className="p-5 rounded-2xl border border-charcoal/15 bg-white shadow-sm space-y-3.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-darkTeal font-mono flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" /> Where to Insert Text
          </h3>

          <div className="space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="insertion_policy"
                value="original_destination"
                checked={settings.insertion_policy === 'original_destination'}
                onChange={() => handleChange('insertion_policy', 'original_destination')}
                className="mt-0.5 text-darkTeal focus:ring-darkTeal"
              />
              <div>
                <span className="text-xs font-bold text-charcoal">
                  Original App (Recommended)
                </span>
                <p className="text-[11px] text-charcoal/70">
                  Always inserts text into the exact window you were working in when you started speaking. If you switch windows while speaking, text is saved safely to history instead of pasting in the wrong place.
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
                className="mt-0.5 text-darkTeal focus:ring-darkTeal"
              />
              <div>
                <span className="text-xs font-bold text-charcoal">
                  Current Window When You Finish
                </span>
                <p className="text-[11px] text-charcoal/70">
                  Pastes into whichever text box is focused when you release your shortcut or finish speaking.
                </p>
              </div>
            </label>

            {/* Destination Edit Sync Toggle */}
            <div className="pt-2 border-t border-charcoal/10">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enable_destination_sync ?? true}
                  onChange={(e) => handleChange('enable_destination_sync', e.target.checked)}
                  className="mt-0.5 text-darkTeal focus:ring-darkTeal rounded"
                />
                <div>
                  <span className="text-xs font-bold text-charcoal">
                    Sync subsequent edits made in destination apps
                  </span>
                  <p className="text-[11px] text-charcoal/70">
                    When you edit text directly in TextEdit, Notes, or your browser after pasting, VoxQuest automatically synchronizes your changes back to history and learns vocabulary corrections.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Shortcut and Language */}
        <div className="p-5 rounded-2xl border border-charcoal/15 bg-white shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-darkTeal font-mono flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5" /> Voice Shortcut & Language
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-charcoal">Global Shortcut</label>
                {settings.shortcut !== 'CommandOrControl+Shift+Space' && (
                  <button
                    onClick={() => handleChange('shortcut', 'CommandOrControl+Shift+Space')}
                    className="text-[10px] text-charcoal/80 hover:text-darkTeal flex items-center gap-1 font-semibold px-2 py-0.5 rounded-lg border border-charcoal/20 bg-white hover:bg-neutral-50 shadow-xs transition-all active:scale-95"
                    title="Reset to default ⌘ ⇧ Space"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Reset Default</span>
                  </button>
                )}
              </div>

              {isRecordingShortcut ? (
                <div className="relative">
                  <input
                    type="text"
                    autoFocus
                    readOnly
                    placeholder="Press keys on your keyboard... (Esc to cancel)"
                    onKeyDown={handleShortcutKeyDown}
                    onBlur={() => setIsRecordingShortcut(false)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border-2 border-terracotta bg-white text-terracotta focus:outline-none animate-pulse shadow-xs font-bold"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-terracotta">
                    Listening...
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRecordingShortcut(true)}
                    className="flex-1 flex items-center justify-between px-3 py-2 rounded-xl border border-charcoal/20 bg-neutral-50 hover:border-darkTeal transition-all text-xs font-mono shadow-xs active:scale-95 group"
                  >
                    <div className="flex items-center gap-1.5">
                      {formatShortcutBadges(settings.shortcut).map((b, i) => (
                        <kbd key={i} className="px-2 py-0.5 rounded-md bg-white border border-charcoal/20 font-bold text-charcoal text-[11px] shadow-xs">
                          {b}
                        </kbd>
                      ))}
                    </div>
                    <span className="text-[10px] text-charcoal/60 group-hover:text-darkTeal font-sans font-semibold">
                      Click to Rebind
                    </span>
                  </button>
                </div>
              )}
              <span className="text-[10px] text-charcoal/60 block">Hold or tap anywhere on macOS to speak into any text box</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-charcoal">Language</label>
              <select
                value={settings.language}
                onChange={(e) => handleChange('language', e.target.value)}
                className="w-full px-3 py-2 text-xs font-sans rounded-xl border border-charcoal/20 bg-neutral-50 text-charcoal focus:outline-none focus:ring-2 focus:ring-darkTeal/20 focus:border-darkTeal shadow-xs"
              >
                <option value="auto">Auto-detect Language</option>
                <option value="en">English</option>
                <option value="hi">Hindi (हिंदी)</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="ja">Japanese</option>
              </select>
              <span className="text-[10px] text-charcoal/60 block">Supports 99+ languages automatically</span>
            </div>
          </div>

          <div className="pt-3 border-t border-charcoal/10">
            <label className="text-xs font-bold text-charcoal">Trigger Mode</label>
            <div className="flex items-center gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="interaction_mode"
                  value="toggle"
                  checked={settings.interaction_mode !== 'push_to_talk'}
                  onChange={() => handleChange('interaction_mode', 'toggle')}
                  className="text-darkTeal focus:ring-darkTeal"
                />
                <span className="text-xs font-medium text-charcoal">Hands-Free (Click or press to start, press to paste)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="interaction_mode"
                  value="push_to_talk"
                  checked={settings.interaction_mode === 'push_to_talk'}
                  onChange={() => handleChange('interaction_mode', 'push_to_talk')}
                  className="text-darkTeal focus:ring-darkTeal"
                />
                <span className="text-xs font-medium text-charcoal">Push-to-Talk (Hold while speaking, release to paste)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Audio Input Device */}
        <div className="p-5 rounded-2xl border border-charcoal/15 bg-white shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-darkTeal font-mono flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5" /> Microphone
          </h3>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-charcoal">Selected Microphone</label>
            <select
              value={settings.selected_microphone || 'default'}
              onChange={(e) => handleChange('selected_microphone', e.target.value)}
              className="w-full px-3 py-2 text-xs font-sans rounded-xl border border-charcoal/20 bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-darkTeal/20 focus:border-darkTeal text-charcoal shadow-xs"
            >
              <option value="default">System Default (Intelligent Auto-Select)</option>
              {devices.map((d, i) => {
                const isBuiltin = d.toLowerCase().includes('macbook') || d.toLowerCase().includes('built-in') || d.toLowerCase().includes('internal');
                return (
                  <option key={i} value={d}>
                    {d} {isBuiltin ? '(Recommended — Built-in)' : ''}
                  </option>
                );
              })}
            </select>
            <span className="text-[10px] text-charcoal/60 block">High-fidelity voice capture for dictation</span>
          </div>
        </div>

        {/* Smart Formatting Options */}
        <div className="p-5 rounded-2xl border border-charcoal/15 bg-white shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-darkTeal font-mono flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" /> Smart Formatting
          </h3>

          <div className="space-y-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.spoken_punctuation}
                onChange={(e) => handleChange('spoken_punctuation', e.target.checked)}
                className="w-4 h-4 rounded text-darkTeal focus:ring-darkTeal"
              />
              <span className="text-xs font-medium text-charcoal">
                Spoken punctuation (saying "period", "comma", "question mark", "new line")
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auto_capitalization}
                onChange={(e) => handleChange('auto_capitalization', e.target.checked)}
                className="w-4 h-4 rounded text-darkTeal focus:ring-darkTeal"
              />
              <span className="text-xs font-medium text-charcoal">
                Automatic sentence capitalization
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.conservative_filler_removal}
                onChange={(e) => handleChange('conservative_filler_removal', e.target.checked)}
                className="w-4 h-4 rounded text-darkTeal focus:ring-darkTeal"
              />
              <span className="text-xs font-medium text-charcoal">
                Clean up hesitation sounds (removes "um", "uh", "er" while preserving your words)
              </span>
            </label>
          </div>
        </div>

        {/* Personal Vocabulary & Self-Learning */}
        <div className="p-5 rounded-2xl border border-charcoal/15 bg-white shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-darkTeal font-mono flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> Personal Vocabulary & Learning
          </h3>

          <div className="space-y-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enable_personal_dictionary ?? true}
                onChange={(e) => handleChange('enable_personal_dictionary', e.target.checked)}
                className="w-4 h-4 rounded text-darkTeal focus:ring-darkTeal"
              />
              <span className="text-xs font-medium text-charcoal">
                Enable personal dictionary (biases recognition and replaces custom terms)
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enable_correction_learning ?? true}
                onChange={(e) => handleChange('enable_correction_learning', e.target.checked)}
                className="w-4 h-4 rounded text-darkTeal focus:ring-darkTeal"
              />
              <span className="text-xs font-medium text-charcoal">
                Learn from corrections (extracts proper nouns and technical terms when you edit)
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auto_approve_corrections ?? false}
                onChange={(e) => handleChange('auto_approve_corrections', e.target.checked)}
                className="w-4 h-4 rounded text-darkTeal focus:ring-darkTeal"
              />
              <span className="text-xs font-medium text-charcoal">
                Auto-approve unambiguous corrections (when unchecked, requires manual confirmation in Dictionary)
              </span>
            </label>
          </div>
        </div>

        {/* Privacy & Storage */}
        <div className="p-5 rounded-2xl border border-charcoal/15 bg-white shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-darkTeal font-mono flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Privacy & Local Storage
          </h3>

          <div className="space-y-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.retain_history}
                onChange={(e) => handleChange('retain_history', e.target.checked)}
                className="w-4 h-4 rounded text-darkTeal focus:ring-darkTeal"
              />
              <span className="text-xs font-medium text-charcoal">
                Save dictation history on this Mac
              </span>
            </label>

            <div className="p-3.5 rounded-xl bg-neutral-50 border border-charcoal/10 text-[11px] text-charcoal/80 leading-relaxed shadow-xs">
              <strong className="text-darkTeal">100% Private:</strong> Your speech is processed entirely on your Mac and discarded from memory immediately after transcription. Your voice is never recorded to disk and never leaves your computer.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
