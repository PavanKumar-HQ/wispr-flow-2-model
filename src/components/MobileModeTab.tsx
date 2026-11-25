import React, { useState } from 'react';
import {
  Smartphone,
  Layers,
  Keyboard,
  Volume2,
  Sliders,
  CheckCircle2,
  Terminal,
  Copy,
  Check,
  Zap,
  Send,
  Radio
} from 'lucide-react';

export const MobileModeTab: React.FC = () => {
  const [triggerMode, setTriggerMode] = useState<'bubble' | 'ime' | 'hardware' | 'tile'>('bubble');
  const [isSimulatedRecording, setIsSimulatedRecording] = useState(false);
  const [simulatedApp, setSimulatedApp] = useState<'whatsapp' | 'slack' | 'notes'>('whatsapp');
  const [simulatedInputText, setSimulatedInputText] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const sampleSpokenTexts = [
    'Hey team, I reviewed the PR and the Android AccessibilityService trigger works perfectly with zero lag.',
    'Quick note: Remember to sync with the mobile design team about the floating edge bubble dock margins.',
    'Can we reschedule our sprint review to 4 PM? Currently wrapping up the on-device whisper quantization.',
  ];

  const handleSimulateBubbleClick = () => {
    if (isSimulatedRecording) {
      // Finish recording and type text
      setIsSimulatedRecording(false);
      const chosenText = sampleSpokenTexts[Math.floor(Math.random() * sampleSpokenTexts.length)];
      setSimulatedInputText(chosenText);
    } else {
      setIsSimulatedRecording(true);
      setSimulatedInputText('');
      setTimeout(() => {
        setIsSimulatedRecording(false);
        const chosenText = sampleSpokenTexts[Math.floor(Math.random() * sampleSpokenTexts.length)];
        setSimulatedInputText(chosenText);
      }, 2200);
    }
  };

  const copyAndroidCode = () => {
    navigator.clipboard.writeText(KOTLIN_ACCESSIBILITY_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 font-sans select-none animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-darkTealSurface border border-charcoal/15 dark:border-darkTealBorder shadow-xs">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber/20 dark:bg-amber/30 text-charcoal dark:text-amber font-mono text-[10px] font-bold border border-amber/40">
            <Smartphone className="w-3.5 h-3.5 text-amber" />
            <span>MOBILE &amp; ANDROID ARCHITECTURE</span>
          </div>
          <h2 className="text-xl font-bold text-darkTeal dark:text-cream tracking-tight">
            Mobile Trigger Strategy &amp; Android Companion
          </h2>
          <p className="text-xs text-charcoal/70 dark:text-sage leading-relaxed max-w-2xl">
            Laptops have physical keyboard keys (like <kbd className="font-mono bg-stone-100 dark:bg-black/30 px-1 py-0.5 rounded">Fn</kbd> or <kbd className="font-mono bg-stone-100 dark:bg-black/30 px-1 py-0.5 rounded">Cmd+Shift+Space</kbd>). On mobile, VoxQuest uses <strong>3 zero-friction trigger mechanisms</strong>: Floating Omnipresent Bubble, Custom Voice IME, and Hardware Key Remapping.
          </p>
        </div>

        {/* Trigger Mode Selector */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="text-[10px] font-mono uppercase text-charcoal/60 dark:text-sage">
            Current Architecture
          </span>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-darkTeal dark:bg-[#0D6E67] text-white font-mono text-xs font-bold shadow-xs">
            <Zap className="w-3.5 h-3.5 text-amber" />
            <span>Production Ready</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Trigger Methods & Live Phone Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Mobile Trigger Mechanisms Explanation & Config (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-darkTealSurface border border-charcoal/15 dark:border-darkTealBorder shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-charcoal dark:text-cream">
                Select Mobile Trigger Implementation
              </h3>
              <span className="text-[10px] font-mono text-charcoal/60 dark:text-sage">
                Tap to simulate on phone
              </span>
            </div>

            {/* Strategy Selection Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Floating Edge Bubble */}
              <div
                onClick={() => setTriggerMode('bubble')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  triggerMode === 'bubble'
                    ? 'bg-amber/10 dark:bg-amber/15 border-amber shadow-xs ring-1 ring-amber/30'
                    : 'bg-stone-50 dark:bg-darkTealElevated border-charcoal/10 dark:border-darkTealBorder hover:border-charcoal/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber" />
                    <span className="text-xs font-bold text-charcoal dark:text-cream">
                      1. Floating Edge Bubble
                    </span>
                  </div>
                  {triggerMode === 'bubble' && <CheckCircle2 className="w-3.5 h-3.5 text-amber" />}
                </div>
                <p className="text-[11px] text-charcoal/70 dark:text-sage leading-relaxed">
                  Persistent draggable pill using Android <code>SYSTEM_ALERT_WINDOW</code>. Docks to screen edge; tap or hold to dictate anywhere.
                </p>
                <div className="mt-2 text-[9px] font-mono font-bold text-darkTeal dark:text-amber">
                  Recommended &middot; Global Injection
                </div>
              </div>

              {/* Option 2: Custom Voice Keyboard (IME) */}
              <div
                onClick={() => setTriggerMode('ime')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  triggerMode === 'ime'
                    ? 'bg-amber/10 dark:bg-amber/15 border-amber shadow-xs ring-1 ring-amber/30'
                    : 'bg-stone-50 dark:bg-darkTealElevated border-charcoal/10 dark:border-darkTealBorder hover:border-charcoal/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Keyboard className="w-4 h-4 text-darkTeal dark:text-cream" />
                    <span className="text-xs font-bold text-charcoal dark:text-cream">
                      2. Voice Keyboard (IME)
                    </span>
                  </div>
                  {triggerMode === 'ime' && <CheckCircle2 className="w-3.5 h-3.5 text-amber" />}
                </div>
                <p className="text-[11px] text-charcoal/70 dark:text-sage leading-relaxed">
                  Native Android <code>InputMethodService</code>. Adds a 1-tap voice bar directly above the on-screen keyboard.
                </p>
                <div className="mt-2 text-[9px] font-mono font-bold text-darkTeal dark:text-sage">
                  Zero Overlay Permission Required
                </div>
              </div>

              {/* Option 3: Hardware Key Remap */}
              <div
                onClick={() => setTriggerMode('hardware')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  triggerMode === 'hardware'
                    ? 'bg-amber/10 dark:bg-amber/15 border-amber shadow-xs ring-1 ring-amber/30'
                    : 'bg-stone-50 dark:bg-darkTealElevated border-charcoal/10 dark:border-darkTealBorder hover:border-charcoal/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-darkTeal dark:text-amber" />
                    <span className="text-xs font-bold text-charcoal dark:text-cream">
                      3. Hardware Key Remap
                    </span>
                  </div>
                  {triggerMode === 'hardware' && <CheckCircle2 className="w-3.5 h-3.5 text-amber" />}
                </div>
                <p className="text-[11px] text-charcoal/70 dark:text-sage leading-relaxed">
                  Double-press Volume Down or Long-press Power button via Accessibility hook. Dictate without looking at the screen.
                </p>
                <div className="mt-2 text-[9px] font-mono font-bold text-charcoal/60 dark:text-sage">
                  True Tactile Experience
                </div>
              </div>

              {/* Option 4: Quick Settings Shade Tile */}
              <div
                onClick={() => setTriggerMode('tile')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  triggerMode === 'tile'
                    ? 'bg-amber/10 dark:bg-amber/15 border-amber shadow-xs ring-1 ring-amber/30'
                    : 'bg-stone-50 dark:bg-darkTealElevated border-charcoal/10 dark:border-darkTealBorder hover:border-charcoal/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span className="text-xs font-bold text-charcoal dark:text-cream">
                      4. Quick Settings Tile
                    </span>
                  </div>
                  {triggerMode === 'tile' && <CheckCircle2 className="w-3.5 h-3.5 text-amber" />}
                </div>
                <p className="text-[11px] text-charcoal/70 dark:text-sage leading-relaxed">
                  Tile located in the Android notification shade. Swipe down from top and tap &ldquo;VoxQuest&rdquo; to start recording immediately.
                </p>
                <div className="mt-2 text-[9px] font-mono font-bold text-sky-700 dark:text-sky-300">
                  Native Android 7.0+ Tile API
                </div>
              </div>
            </div>
          </div>

          {/* Android Implementation Code Box */}
          <div className="p-5 rounded-2xl bg-white dark:bg-darkTealSurface border border-charcoal/15 dark:border-darkTealBorder shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-darkTeal dark:text-amber" />
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-charcoal dark:text-cream">
                  Android Native Code &middot; Global Text Injection
                </h3>
              </div>
              <button
                onClick={copyAndroidCode}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-darkTealElevated hover:bg-stone-200 text-[11px] font-mono font-bold text-charcoal dark:text-cream transition-all"
              >
                {copiedCode ? <Check className="w-3 h-3 text-amber" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode ? 'Copied' : 'Copy Kotlin'}</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-stone-900 text-stone-200 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[190px] scrollbar-thin">
              <pre>{KOTLIN_ACCESSIBILITY_CODE}</pre>
            </div>
            <p className="text-[11px] text-charcoal/60 dark:text-sage">
              This service injects spoken and formatted text directly into the focused input field of WhatsApp, Slack, Gmail, or Telegram without clipboard hijacking.
            </p>
          </div>
        </div>

        {/* Right Column: Live Phone Mockup Simulator (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-[320px] h-[580px] bg-stone-900 rounded-[40px] p-3 shadow-2xl border-4 border-stone-800 relative flex flex-col justify-between">
            {/* Phone Speaker Notch */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-black rounded-full flex items-center justify-center gap-1.5 z-30">
              <div className="w-2 h-2 rounded-full bg-stone-800" />
              <div className="w-8 h-1 rounded-full bg-stone-800" />
            </div>

            {/* Phone Screen Container */}
            <div className="w-full h-full bg-stone-100 dark:bg-stone-950 rounded-[30px] overflow-hidden flex flex-col relative pt-7">
              {/* App Bar */}
              <div className="p-2.5 bg-darkTeal text-white flex items-center justify-between text-xs font-medium z-10 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-amber/20 flex items-center justify-center font-bold text-[10px] text-amber">
                    VQ
                  </div>
                  <span className="font-bold capitalize">{simulatedApp}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSimulatedApp('whatsapp')}
                    className={`px-1.5 py-0.5 rounded text-[9px] ${
                      simulatedApp === 'whatsapp' ? 'bg-white/20 font-bold' : 'opacity-60'
                    }`}
                  >
                    WA
                  </button>
                  <button
                    onClick={() => setSimulatedApp('slack')}
                    className={`px-1.5 py-0.5 rounded text-[9px] ${
                      simulatedApp === 'slack' ? 'bg-white/20 font-bold' : 'opacity-60'
                    }`}
                  >
                    Slack
                  </button>
                </div>
              </div>

              {/* Chat Canvas */}
              <div className="flex-1 p-3 space-y-2.5 overflow-y-auto text-xs">
                <div className="p-2 rounded-xl bg-white dark:bg-darkTealElevated border border-charcoal/10 dark:border-darkTealBorder max-w-[85%] text-charcoal dark:text-cream text-[11px] shadow-2xs">
                  Hi! How is the mobile voice dictation trigger working?
                </div>

                {simulatedInputText && (
                  <div className="p-2 rounded-xl bg-amber/15 dark:bg-amber/20 border border-amber/30 max-w-[85%] ml-auto text-charcoal dark:text-cream text-[11px] shadow-2xs">
                    {simulatedInputText}
                  </div>
                )}
              </div>

              {/* Floating Omnipresent Bubble (Trigger Option 1) */}
              {triggerMode === 'bubble' && (
                <div
                  onClick={handleSimulateBubbleClick}
                  className={`absolute right-2 top-48 z-20 w-11 h-11 rounded-full cursor-pointer flex items-center justify-center shadow-lg transition-all active:scale-90 ${
                    isSimulatedRecording
                      ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-400/50'
                      : 'bg-darkTeal text-amber hover:scale-105 border-2 border-white'
                  }`}
                  title="Click to dictate on mobile"
                >
                  {isSimulatedRecording ? (
                    <Radio className="w-5 h-5 animate-spin" />
                  ) : (
                    <Zap className="w-5 h-5 fill-amber" />
                  )}
                </div>
              )}

              {/* Live Status indicator when dictating */}
              {isSimulatedRecording && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-stone-900/90 text-white text-[10px] font-mono px-3 py-1 rounded-full border border-amber/40 shadow-lg flex items-center gap-1.5 z-20 animate-bounce">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>Listening (Hold &amp; Speak)...</span>
                </div>
              )}

              {/* Simulated Bottom Message Input Bar */}
              <div className="p-2 bg-white dark:bg-darkTealElevated border-t border-charcoal/10 dark:border-darkTealBorder flex items-center gap-1.5 z-10">
                <div className="flex-1 px-2.5 py-1.5 rounded-full bg-stone-100 dark:bg-black/40 text-[11px] text-charcoal dark:text-cream border border-charcoal/10 truncate">
                  {simulatedInputText ? simulatedInputText : 'Type a message...'}
                </div>
                <button
                  onClick={handleSimulateBubbleClick}
                  className="w-7 h-7 rounded-full bg-darkTeal text-white flex items-center justify-center shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Simulated Custom Voice Keyboard (Trigger Option 2) */}
              {triggerMode === 'ime' && (
                <div className="bg-stone-200 dark:bg-stone-900 border-t border-charcoal/20 p-2 space-y-1.5 z-10">
                  {/* Dedicated VoxQuest Voice Bar */}
                  <div
                    onClick={handleSimulateBubbleClick}
                    className={`p-1.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      isSimulatedRecording
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-amber text-charcoal font-bold'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 fill-charcoal" />
                    <span className="text-[10px] font-mono">
                      {isSimulatedRecording ? 'Listening (Tap to Stop)' : 'VoxQuest One-Touch Voice Bar'}
                    </span>
                  </div>
                  {/* Keyboard key hints */}
                  <div className="grid grid-cols-10 gap-1 text-[8px] font-mono text-center text-charcoal/60 dark:text-sage">
                    {['Q','W','E','R','T','Y','U','I','O','P'].map((k) => (
                      <div key={k} className="p-1 bg-white dark:bg-black/40 rounded">
                        {k}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="text-[11px] font-mono text-charcoal/60 dark:text-sage text-center mt-3">
            Interactive Android Sandbox &middot; Click the floating bubble to test dictation
          </p>
        </div>
      </div>
    </div>
  );
};

const KOTLIN_ACCESSIBILITY_CODE = `// VoxAccessibilityService.kt
package ai.voxquest.service

import android.accessibilityservice.AccessibilityService
import android.os.Bundle
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class VoxAccessibilityService : AccessibilityService() {

    fun injectSpokenTextGlobally(formattedText: String) {
        val root = rootInActiveWindow ?: return
        val focusedNode = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT) ?: return

        if (focusedNode.isEditable) {
            val args = Bundle().apply {
                putCharSequence(
                    AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                    formattedText
                )
            }
            focusedNode.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {}
    override fun onInterrupt() {}
}`;
