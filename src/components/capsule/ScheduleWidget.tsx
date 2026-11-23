import React, { useState, useEffect } from 'react';
import { Calendar, Link2, ExternalLink, Trash2, Clock } from 'lucide-react';

interface Commitment {
  id: string;
  title: string;
  platform: 'Google Meet' | 'Zoom' | 'Focus Slot';
  url: string;
  durationMins: number;
  timeStr: string;
}

export const ScheduleWidget: React.FC = () => {
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [urlInput, setUrlInput] = useState<string>('');
  const [slotPreviewTime, setSlotPreviewTime] = useState<string>('');

  const [commitments, setCommitments] = useState<Commitment[]>(() => {
    try {
      const stored = localStorage.getItem('voxquest_saved_commitments');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Load commitments failed:', e);
    }
    // Dynamic initial commitment based on actual current system time + 30 mins
    const futureTime = new Date(Date.now() + 30 * 60000).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
    return [
      {
        id: 'slot-auto',
        title: 'Platform Architecture Sync',
        platform: 'Google Meet',
        url: 'https://meet.google.com/new',
        durationMins: 30,
        timeStr: `Starts at ${futureTime}`,
      },
    ];
  });

  useEffect(() => {
    const target = new Date(Date.now() + selectedDuration * 60000);
    setSlotPreviewTime(target.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
  }, [selectedDuration]);

  const handleSave = () => {
    if (!urlInput.trim()) return;
    const url = urlInput.trim();
    const isZoom = url.toLowerCase().includes('zoom');
    const futureTime = new Date(Date.now() + selectedDuration * 60000).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
    const newCommitment: Commitment = {
      id: Date.now().toString(),
      title: isZoom ? 'Zoom Meeting' : 'Google Meet Sync',
      platform: isZoom ? 'Zoom' : 'Google Meet',
      url,
      durationMins: selectedDuration,
      timeStr: `Next ${selectedDuration}m • ${futureTime}`,
    };
    const updated = [newCommitment, ...commitments];
    setCommitments(updated);
    setUrlInput('');
    try {
      localStorage.setItem('voxquest_saved_commitments', JSON.stringify(updated));
    } catch (e) {
      console.warn('Save commitments failed:', e);
    }
  };

  const handleDelete = (id: string) => {
    const updated = commitments.filter((c) => c.id !== id);
    setCommitments(updated);
    try {
      localStorage.setItem('voxquest_saved_commitments', JSON.stringify(updated));
    } catch (e) {
      console.warn('Save commitments failed:', e);
    }
  };

  const handleOpenLink = (url: string) => {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      data-tauri-no-drag
      className="bg-white dark:bg-darkTealSurface rounded-2xl p-3.5 border border-charcoal/15 dark:border-darkTealBorder shadow-sm space-y-2.5"
    >
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-bold text-darkTeal dark:text-cream">
          <Calendar className="w-3.5 h-3.5 text-terracotta" />
          <span>Schedule & Commitments</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-charcoal/60 dark:text-sage font-medium">
          <Clock className="w-3 h-3 text-charcoal/40 dark:text-sage/60" />
          <span>Slot: {slotPreviewTime}</span>
        </div>
      </div>

      {/* Time duration chips */}
      <div className="grid grid-cols-4 gap-1.5">
        {[15, 30, 45, 60].map((dur) => (
          <button
            key={dur}
            onClick={() => setSelectedDuration(dur)}
            className={`py-1 rounded-lg text-[11px] font-bold transition-all text-center cursor-pointer border ${
              selectedDuration === dur
                ? 'bg-darkTeal dark:bg-darkTealAccent text-white shadow-xs border-darkTeal dark:border-mint/50 font-extrabold'
                : 'bg-[#F6F6F2] dark:bg-darkTealElevated text-charcoal dark:text-cream hover:bg-[#EBEBE4] dark:hover:bg-darkTealCanvas border-charcoal/15 dark:border-darkTealBorder'
            }`}
          >
            {dur}m
          </button>
        ))}
      </div>

      {/* Meeting URL input with Save action */}
      <div className="flex items-center gap-1.5 bg-[#F6F6F2] dark:bg-darkTealCanvas rounded-xl px-2.5 py-1.5 border border-charcoal/20 dark:border-darkTealBorder">
        <Link2 className="w-3.5 h-3.5 text-charcoal/40 dark:text-sage/60 shrink-0" />
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="Paste Google Meet or Zoom URL..."
          className="w-full text-xs bg-transparent dark:bg-transparent focus:outline-none placeholder:text-charcoal/40 dark:placeholder:text-sage/50 text-charcoal dark:text-cream font-medium"
        />
        <button
          onClick={handleSave}
          disabled={!urlInput.trim()}
          className="shrink-0 px-2.5 py-1 rounded-md bg-darkTeal dark:bg-darkTealAccent text-cream text-[10px] font-bold hover:bg-darkTeal/90 dark:hover:bg-darkTealAccent/90 disabled:opacity-40 transition-all active:scale-95 shadow-xs cursor-pointer"
        >
          Save
        </button>
      </div>

      {/* Active commitments */}
      {commitments.length > 0 && (
        <div className="space-y-1.5 pt-0.5 max-h-[110px] overflow-y-auto no-scrollbar">
          {commitments.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-[#F8F8F5] dark:bg-darkTealSurface border border-charcoal/15 dark:border-darkTealBorder text-xs hover:border-darkTeal/30 dark:hover:border-mint/40 transition-all"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-terracotta shrink-0" />
                <div className="truncate">
                  <div className="font-semibold text-charcoal dark:text-cream truncate">{c.title}</div>
                  <div className="text-[10px] text-charcoal/60 dark:text-sage flex items-center gap-1">
                    <span>{c.platform}</span>
                    <span>•</span>
                    <span>{c.timeStr}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  onClick={() => handleOpenLink(c.url)}
                  className="p-1 rounded-md text-darkTeal hover:bg-darkTeal/10 transition-colors cursor-pointer"
                  title="Open Meeting Link"
                  aria-label="Open Meeting Link"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-1 rounded-md text-charcoal/40 hover:text-terracotta hover:bg-terracotta/10 transition-colors cursor-pointer"
                  title="Remove Commitment"
                  aria-label="Remove Commitment"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
