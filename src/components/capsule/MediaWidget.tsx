import React, { useState } from 'react';
import {
  Play,
  SkipForward,
  SkipBack,
  VolumeX,
  Volume2,
  Search,
  Music,
} from 'lucide-react';
import { safeInvoke } from '../../lib/ipc';

type MusicService = 'spotify' | 'apple_music' | 'youtube_music' | 'youtube';

interface FocusChannel {
  id: string;
  name: string;
  subtitle: string;
  query: string;
  tag: string;
  iconBg: string;
}

const CURATED_CHANNELS: FocusChannel[] = [
  {
    id: 'lofi-girl',
    name: 'Lofi Girl Coding Radio',
    subtitle: 'Beats to relax & code to',
    query: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    tag: 'LIVE',
    iconBg: 'bg-amber/15 text-amber-800',
  },
  {
    id: 'raag-focus',
    name: 'Indian Classical Raag',
    subtitle: 'Meditative Sitar & Flute',
    query: 'indian classical sitar flute deep focus',
    tag: 'FOCUS',
    iconBg: 'bg-emerald-50 text-emerald-700',
  },
  {
    id: 'chillhop',
    name: 'Chillhop Beats',
    subtitle: 'Soft instrumental lo-fi jazz',
    query: 'chillhop beats to code to',
    tag: 'LO-FI',
    iconBg: 'bg-orange-50 text-orange-700',
  },
  {
    id: 'synthwave',
    name: 'Synthwave Coding',
    subtitle: 'Retro electronic beats',
    query: 'synthwave coding focus music',
    tag: 'BEATS',
    iconBg: 'bg-purple-50 text-purple-700',
  },
  {
    id: 'rain',
    name: 'Heavy Rain & Thunder',
    subtitle: 'Ambient focus soundscape',
    query: 'rain sounds for studying focus noise blocker',
    tag: 'NATURE',
    iconBg: 'bg-sky-50 text-sky-700',
  },
  {
    id: 'hans-zimmer',
    name: 'Interstellar & Zimmer Piano',
    subtitle: 'Cinematic flow soundscapes',
    query: 'interstellar hans zimmer piano study focus',
    tag: 'CINEMA',
    iconBg: 'bg-rose-50 text-rose-700',
  },
];

export const MediaWidget: React.FC = () => {
  const [selectedService, setSelectedService] = useState<MusicService>(() => {
    try {
      return (localStorage.getItem('voxquest_preferred_music_service') as MusicService) || 'spotify';
    } catch {
      return 'spotify';
    }
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const handleSelectService = (service: MusicService) => {
    setSelectedService(service);
    try {
      localStorage.setItem('voxquest_preferred_music_service', service);
    } catch {}
  };

  const handlePlayQuery = async (query: string, label: string) => {
    try {
      const serviceName = selectedService === 'spotify' ? 'Spotify' : selectedService === 'apple_music' ? 'Apple Music' : selectedService === 'youtube_music' ? 'YouTube Music' : 'YouTube';
      setFeedback(`Playing "${label}" on ${serviceName}...`);
      await safeInvoke('play_music_cmd', { query, service: selectedService });
      setTimeout(() => setFeedback(null), 3000);
    } catch (e) {
      console.error('Play error:', e);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const term = searchQuery.trim();
    handlePlayQuery(term, term);
    setSearchQuery('');
  };

  const handleMediaControl = async (action: 'playpause' | 'next' | 'previous' | 'mute') => {
    try {
      if (action === 'mute') setIsMuted(!isMuted);
      const res = await safeInvoke<string>('media_control_cmd', { action });
      if (res) {
        setFeedback(res);
        setTimeout(() => setFeedback(null), 2000);
      }
    } catch (e) {
      console.error('Media control error:', e);
    }
  };

  return (
    <div
      data-tauri-no-drag
      className="bg-white dark:bg-darkTealSurface rounded-2xl p-4 border border-charcoal/15 dark:border-darkTealBorder shadow-sm space-y-3.5 font-sans select-none text-charcoal dark:text-cream"
    >
      {/* Feedback banner */}
      {feedback && (
        <div className="p-2 rounded-xl bg-darkTeal text-white text-xs font-bold text-center animate-fadeIn shadow-2xs">
          {feedback}
        </div>
      )}

      {/* Header Bar: Music Controller & Service Picker */}
      <div className="space-y-2 pb-2 border-b border-charcoal/10 dark:border-darkTealBorder">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-darkTeal text-white shrink-0 shadow-xs">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-charcoal dark:text-cream">Music & Flow Audio</div>
              <div className="text-[10px] text-charcoal/50 dark:text-sage/70">Universal playback & stream controller</div>
            </div>
          </div>

          {/* Quick Floating Playback Controls (Play/Pause, Next, Prev, Mute) */}
          <div className="flex items-center gap-1 bg-stone-100 dark:bg-darkTealCanvas p-1 rounded-xl border border-charcoal/15 dark:border-darkTealBorder shadow-2xs">
            <button
              type="button"
              onClick={() => handleMediaControl('previous')}
              className="p-1 rounded-lg text-charcoal/70 dark:text-cream hover:text-charcoal hover:bg-white dark:hover:bg-darkTealElevated active:scale-90 transition-all cursor-pointer"
              title="Previous Track"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleMediaControl('playpause')}
              className="p-1 px-1.5 rounded-lg bg-darkTeal dark:bg-[#0D6E67] text-white hover:bg-darkTeal/90 active:scale-90 transition-all shadow-2xs cursor-pointer"
              title="Play / Pause"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
            <button
              type="button"
              onClick={() => handleMediaControl('next')}
              className="p-1 rounded-lg text-charcoal/70 dark:text-cream hover:text-charcoal hover:bg-white dark:hover:bg-darkTealElevated active:scale-90 transition-all cursor-pointer"
              title="Next Track"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleMediaControl('mute')}
              className={`p-1 rounded-lg transition-all cursor-pointer ${
                isMuted
                  ? 'bg-terracotta text-white'
                  : 'text-charcoal/70 dark:text-cream hover:text-charcoal hover:bg-white dark:hover:bg-darkTealElevated'
              }`}
              title="Toggle System Mute"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Destination Service Selector Tabs: Spotify, Apple Music, YouTube Music, YouTube */}
        <div className="grid grid-cols-4 gap-1 pt-1">
          {[
            { id: 'spotify' as const, label: 'Spotify', color: 'bg-emerald-600' },
            { id: 'apple_music' as const, label: 'Apple Music', color: 'bg-rose-600' },
            { id: 'youtube_music' as const, label: 'YT Music', color: 'bg-red-600' },
            { id: 'youtube' as const, label: 'YouTube', color: 'bg-red-700' },
          ].map((srv) => (
            <button
              key={srv.id}
              type="button"
              onClick={() => handleSelectService(srv.id)}
              className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all border text-center cursor-pointer ${
                selectedService === srv.id
                  ? `${srv.color} text-white border-transparent shadow-xs`
                  : 'bg-stone-50 hover:bg-stone-100 text-charcoal/70 border-charcoal/15'
              }`}
            >
              {srv.label}
            </button>
          ))}
        </div>
      </div>

      {/* Instant Search & Direct Link Player */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search song, artist, playlist or paste link into ${selectedService === 'spotify' ? 'Spotify' : selectedService === 'apple_music' ? 'Apple Music' : 'YouTube'}...`}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-charcoal/20 bg-stone-50 focus:outline-none focus:border-darkTeal font-medium"
          />
          <Search className="w-3.5 h-3.5 text-charcoal/40 absolute left-2.5 top-2.5" />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-darkTeal hover:bg-darkTeal/90 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer shrink-0"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Play</span>
        </button>
      </form>

      {/* Curated Coding & Focus Channels */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-charcoal/50 flex items-center justify-between">
          <span>Curated Flow Stations</span>
          <span className="text-[9px] text-charcoal/40">1-click play</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CURATED_CHANNELS.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => handlePlayQuery(ch.query, ch.name)}
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#F6F6F2] dark:bg-darkTealElevated hover:bg-[#EBEBE4] dark:hover:bg-darkTealCanvas border border-charcoal/15 dark:border-darkTealBorder transition-all text-left active:scale-95 cursor-pointer group"
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[8px] font-black uppercase px-1 py-0.2 rounded font-mono shrink-0 ${ch.iconBg}`}>
                    {ch.tag}
                  </span>
                  <span className="text-xs font-bold text-charcoal dark:text-cream leading-tight">{ch.name}</span>
                </div>
                <div className="text-[10px] text-charcoal/70 dark:text-sage leading-tight mt-0.5">{ch.subtitle}</div>
              </div>

              <div className="w-6 h-6 rounded-lg bg-white dark:bg-darkTealSurface group-hover:bg-darkTeal dark:group-hover:bg-darkTealAccent group-hover:text-white text-darkTeal dark:text-cream border border-charcoal/10 dark:border-darkTealBorder flex items-center justify-center shrink-0 transition-colors shadow-2xs">
                <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="text-[10px] text-charcoal/60 dark:text-sage text-center font-medium pt-1 border-t border-charcoal/10 dark:border-darkTealBorder">
        Speak: <span className="font-mono text-darkTeal dark:text-mint font-bold">"play &lt;song&gt; on {selectedService === 'spotify' ? 'Spotify' : selectedService === 'apple_music' ? 'Apple Music' : 'YouTube'}"</span> while dictating.
      </div>
    </div>
  );
};
