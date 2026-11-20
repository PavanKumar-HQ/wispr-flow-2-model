import React, { useState } from 'react';
import {
  Clock,
  Timer,
  Rocket,
  Music,
  ClipboardList,
  Wand2,
  FileText,
  Settings,
  X
} from 'lucide-react';
import { CalendarClockWidget } from './CalendarClockWidget';
import { FocusTimerWidget } from './FocusTimerWidget';
import { AppLauncherWidget } from './AppLauncherWidget';
import { MediaWidget } from './MediaWidget';
import { ClipboardHistoryWidget } from './ClipboardHistoryWidget';
import { ToneRewriterWidget } from './ToneRewriterWidget';
import { VoiceSnippetsWidget } from './VoiceSnippetsWidget';
import { safeInvoke } from '../../lib/ipc';

interface CapsuleTrayProps {
  lastTranscript?: string | null;
  onCopy?: (text: string) => void;
  onCollapse: () => void;
  onOpenSettings?: () => void;
  expandDirection?: 'down' | 'up';
}

type CarouselSlide = 'rewrite' | 'snippets' | 'clock' | 'focus' | 'launcher' | 'media' | 'clipboard';

interface SlideConfig {
  id: CarouselSlide;
  title: string;
  shortLabel: string;
  icon: React.ReactNode;
}

const SLIDES: SlideConfig[] = [
  {
    id: 'rewrite',
    title: 'Tone & Persona Shifter',
    shortLabel: 'Rewrite',
    icon: <Wand2 className="w-3.5 h-3.5" />,
  },
  {
    id: 'snippets',
    title: 'Voice Snippets & Expander',
    shortLabel: 'Snippets',
    icon: <FileText className="w-3.5 h-3.5" />,
  },
  {
    id: 'clock',
    title: 'Time & Calendar',
    shortLabel: 'Clock',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  {
    id: 'focus',
    title: 'Focus & Stopwatch',
    shortLabel: 'Focus',
    icon: <Timer className="w-3.5 h-3.5" />,
  },
  {
    id: 'launcher',
    title: 'Quick App Launcher',
    shortLabel: 'Apps',
    icon: <Rocket className="w-3.5 h-3.5" />,
  },
  {
    id: 'media',
    title: 'Ambient Music & Audio',
    shortLabel: 'Music',
    icon: <Music className="w-3.5 h-3.5" />,
  },
  {
    id: 'clipboard',
    title: 'Clipboard History',
    shortLabel: 'Clips',
    icon: <ClipboardList className="w-3.5 h-3.5" />,
  },
];

export const CapsuleTray: React.FC<CapsuleTrayProps> = ({
  lastTranscript,
  onCopy,
  onCollapse,
  onOpenSettings,
  expandDirection: _expandDirection = 'down',
}) => {
  const [activeSlide, setActiveSlide] = useState<CarouselSlide>(() => {
    try {
      const saved = localStorage.getItem('voxquest_active_hub_slide');
      if (saved && SLIDES.some((s) => s.id === saved)) {
        return saved as CarouselSlide;
      }
    } catch {
      // Fallback
    }
    return 'clock';
  });

  const handleSelectSlide = (id: CarouselSlide) => {
    setActiveSlide(id);
    try {
      localStorage.setItem('voxquest_active_hub_slide', id);
    } catch {
      // Fallback
    }
  };

  const handleOpenSettingsTab = async () => {
    if (onOpenSettings) {
      onOpenSettings();
    } else {
      try {
        await safeInvoke('show_main_window');
      } catch (e) {
        console.warn('Show main window failed:', e);
      }
    }
  };

  return (
    <div
      data-tauri-no-drag
      className="w-full max-w-[440px] max-h-[660px] overflow-y-auto no-scrollbar rounded-3xl border border-charcoal/15 bg-[#F6F6F2] shadow-2xl p-3.5 space-y-3 font-sans select-auto transition-all text-charcoal"
    >
      {/* Sleek Navigation Header */}
      <div className="flex items-center justify-between pb-2 border-b border-charcoal/10 gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
          {SLIDES.map((slide) => {
            const isActive = slide.id === activeSlide;
            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => handleSelectSlide(slide.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer active:scale-95 shrink-0 ${
                  isActive
                    ? 'bg-darkTeal text-white shadow-xs'
                    : 'bg-white hover:bg-stone-100 text-charcoal/70 border border-charcoal/10'
                }`}
              >
                {slide.icon}
                <span>{slide.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Direct Close */}
        <button
          type="button"
          onClick={onCollapse}
          className="p-1 rounded-lg hover:bg-stone-200 text-charcoal/60 hover:text-terracotta transition-all cursor-pointer active:scale-90 border border-charcoal/15 bg-white shadow-2xs shrink-0"
          title="Close Hub"
          aria-label="Close Hub"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Slide Carousel Content Stage */}
      <div className="animate-fadeIn">
        {activeSlide === 'rewrite' && (
          <ToneRewriterWidget lastTranscript={lastTranscript} onCopy={onCopy} />
        )}
        {activeSlide === 'snippets' && <VoiceSnippetsWidget />}
        {activeSlide === 'clock' && <CalendarClockWidget />}
        {activeSlide === 'focus' && <FocusTimerWidget />}
        {activeSlide === 'launcher' && <AppLauncherWidget />}
        {activeSlide === 'media' && <MediaWidget />}
        {activeSlide === 'clipboard' && (
          <ClipboardHistoryWidget lastTranscript={lastTranscript} onCopy={onCopy} />
        )}
      </div>

      {/* Clean Tray Footer with Carousel Dots */}
      <div className="flex items-center justify-between pt-2 border-t border-charcoal/10 text-xs">
        {/* Carousel Dots */}
        <div className="flex items-center gap-1.5 pl-1">
          {SLIDES.map((slide) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => handleSelectSlide(slide.id)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                slide.id === activeSlide
                  ? 'w-5 bg-darkTeal'
                  : 'w-1.5 bg-charcoal/20 hover:bg-charcoal/40'
              }`}
              title={slide.title}
            />
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleOpenSettingsTab}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-stone-100 text-charcoal/80 hover:text-darkTeal border border-charcoal/15 text-[11px] font-bold transition-all active:scale-95 shadow-2xs cursor-pointer"
            title="Open VoxQuest Full Dashboard"
          >
            <Settings className="w-3 h-3" />
            <span>Settings</span>
          </button>

          <button
            type="button"
            onClick={onCollapse}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-darkTeal hover:bg-darkTeal/90 text-white text-[11px] font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            title="Close Hub"
          >
            <X className="w-3.5 h-3.5 text-amber" />
            <span>Close Hub</span>
          </button>
        </div>
      </div>
    </div>
  );
};
