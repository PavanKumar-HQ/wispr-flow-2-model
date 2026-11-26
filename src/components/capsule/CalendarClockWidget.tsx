import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Trash2, Tag, Clock, Plus, Check, Bell, BellOff } from 'lucide-react';
import { safeInvoke } from '../../lib/ipc';

interface MarkedDateItem {
  dateStr: string; // YYYY-MM-DD
  label: string;
  createdAt: number;
  timeStr?: string; // HH:mm (e.g. "09:00")
  reminderEnabled?: boolean;
  lastNotifiedDate?: string;
}

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const CalendarClockWidget: React.FC = () => {
  // 12-Hour vs 24-Hour Format
  const [is24Hour, setIs24Hour] = useState<boolean>(() => {
    try {
      return localStorage.getItem('voxquest_clock_is_24h') === 'true';
    } catch {
      return false;
    }
  });

  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [currentSecondsStr, setCurrentSecondsStr] = useState<string>('');
  const [currentDateStr, setCurrentDateStr] = useState<string>('');

  // Calendar state
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => toLocalDateStr(new Date()));

  const [markedDates, setMarkedDates] = useState<MarkedDateItem[]>(() => {
    try {
      const stored = localStorage.getItem('voxquest_marked_calendar_dates');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to load marked dates:', e);
    }
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    return [
      {
        dateStr: tmrw.toISOString().slice(0, 10),
        label: 'Sprint Review & Demo',
        createdAt: Date.now(),
        timeStr: '09:00',
        reminderEnabled: true,
      },
    ];
  });

  const [newNoteText, setNewNoteText] = useState<string>('');
  const [newReminderTime, setNewReminderTime] = useState<string>('09:00');
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(true);

  // Automatically keep note input and reminder settings synchronized with selected date
  useEffect(() => {
    const existing = markedDates.find((item) => item.dateStr === selectedDateStr);
    setNewNoteText(existing?.label || '');
    setNewReminderTime(existing?.timeStr || '09:00');
    setReminderEnabled(existing?.reminderEnabled !== false);
  }, [selectedDateStr, markedDates]);

  // Sync when voice commands or background reminder checker update localStorage
  useEffect(() => {
    const reload = () => {
      try {
        const stored = localStorage.getItem('voxquest_marked_calendar_dates');
        if (stored) setMarkedDates(JSON.parse(stored));
      } catch {}
    };
    window.addEventListener('voxquest-utility-updated', reload);
    return () => window.removeEventListener('voxquest-utility-updated', reload);
  }, []);

  // Automated background reminder check for tasks (runs every 10s while open)
  useEffect(() => {
    const checkReminders = async () => {
      const today = new Date();
      const todayStr = toLocalDateStr(today);
      const currentHours = String(today.getHours()).padStart(2, '0');
      const currentMins = String(today.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHours}:${currentMins}`;

      let changed = false;
      const updated = markedDates.map((item) => {
        // If marked for today, has label, and reminder is enabled
        if (item.dateStr === todayStr && item.reminderEnabled !== false && item.label.trim()) {
          // If already notified today, skip
          if (item.lastNotifiedDate === todayStr) return item;

          const targetTime = item.timeStr || '09:00';
          if (currentTime >= targetTime) {
            // Trigger native macOS notification banner with sound
            safeInvoke('send_system_notification_cmd', {
              title: '📅 VoxQuest Task Reminder',
              message: `Task Due Today: ${item.label}`,
            });

            // Also trigger standard Webview Notification if permitted
            if (typeof window !== 'undefined' && 'Notification' in window) {
              if (Notification.permission === 'granted') {
                try {
                  new Notification('📅 VoxQuest Task Reminder', {
                    body: `Task Due Today: ${item.label}`,
                  });
                } catch {}
              } else if (Notification.permission !== 'denied') {
                Notification.requestPermission();
              }
            }

            changed = true;
            return { ...item, lastNotifiedDate: todayStr };
          }
        }
        return item;
      });

      if (changed) {
        setMarkedDates(updated);
        try {
          localStorage.setItem('voxquest_marked_calendar_dates', JSON.stringify(updated));
        } catch (e) {
          console.warn('Save marked dates failed:', e);
        }
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
  }, [markedDates]);

  // Live ticking clock in clean original format
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const rawHours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');

      if (is24Hour) {
        // 24-Hour standard format: HH:mm:ss
        const hours = String(rawHours).padStart(2, '0');
        setCurrentTimeStr(`${hours}:${minutes}`);
        setCurrentSecondsStr(`:${seconds}`);
      } else {
        // 12-Hour standard format: h:mm:ss AM/PM
        const ampm = rawHours >= 12 ? 'PM' : 'AM';
        const hours = rawHours % 12 || 12;
        setCurrentTimeStr(`${hours}:${minutes}`);
        setCurrentSecondsStr(`:${seconds} ${ampm}`);
      }

      setCurrentDateStr(
        new Intl.DateTimeFormat(undefined, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }).format(now)
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [is24Hour]);

  const toggleTimeFormat = () => {
    const next = !is24Hour;
    setIs24Hour(next);
    try {
      localStorage.setItem('voxquest_clock_is_24h', String(next));
    } catch (e) {
      console.warn('Save time format failed:', e);
    }
  };

  const handlePrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleTodayClick = () => {
    const today = new Date();
    setViewDate(today);
    setSelectedDateStr(today.toISOString().slice(0, 10));
  };

  const handleToggleDateMark = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    const existingIndex = markedDates.findIndex((item) => item.dateStr === dateStr);
    let updated: MarkedDateItem[];
    if (existingIndex >= 0) {
      updated = markedDates.filter((item) => item.dateStr !== dateStr);
    } else {
      updated = [
        ...markedDates,
        {
          dateStr,
          label: newNoteText.trim() || 'Marked Milestone',
          createdAt: Date.now(),
          timeStr: newReminderTime || '09:00',
          reminderEnabled: true,
        },
      ];
    }
    setMarkedDates(updated);
    try {
      localStorage.setItem('voxquest_marked_calendar_dates', JSON.stringify(updated));
    } catch (e) {
      console.warn('Save marked dates failed:', e);
    }
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDateStr) return;
    const label = newNoteText.trim() || 'Marked Milestone';
    const existingIndex = markedDates.findIndex((item) => item.dateStr === selectedDateStr);
    let updated: MarkedDateItem[];
    if (existingIndex >= 0) {
      updated = markedDates.map((item) =>
        item.dateStr === selectedDateStr
          ? { ...item, label, timeStr: newReminderTime, reminderEnabled }
          : item
      );
    } else {
      updated = [
        ...markedDates,
        {
          dateStr: selectedDateStr,
          label,
          createdAt: Date.now(),
          timeStr: newReminderTime,
          reminderEnabled,
        },
      ];
    }
    setMarkedDates(updated);
    try {
      localStorage.setItem('voxquest_marked_calendar_dates', JSON.stringify(updated));
    } catch (e) {
      console.warn('Save marked dates failed:', e);
    }
  };

  const handleDeleteMarked = (dateStr: string) => {
    const updated = markedDates.filter((item) => item.dateStr !== dateStr);
    setMarkedDates(updated);
    try {
      localStorage.setItem('voxquest_marked_calendar_dates', JSON.stringify(updated));
    } catch (e) {
      console.warn('Delete marked date failed:', e);
    }
  };

  // Calendar calculations
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const currentMonthLabel = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const todayIso = new Date().toISOString().slice(0, 10);

  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({ dayNumber: d, iso });
  }

  const selectedMarkedItem = markedDates.find((item) => item.dateStr === selectedDateStr);

  return (
    <div data-tauri-no-drag className="space-y-3 font-sans select-none text-charcoal">
      {/* Clean Original Format Clock Card */}
      <div className="bg-white dark:bg-darkTealSurface rounded-2xl p-4 border border-charcoal/15 dark:border-darkTealBorder shadow-xs flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-baseline gap-1.5 font-mono">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-darkTeal dark:text-cream">
              {currentTimeStr}
            </span>
            <span className="text-xs font-bold font-mono text-terracotta">
              {currentSecondsStr}
            </span>
          </div>
          <div className="text-xs font-medium text-charcoal/70 dark:text-sage">
            {currentDateStr}
          </div>
        </div>

        {/* 12h / 24h Clean Toggle Button (Zero railway logo) */}
        <button
          type="button"
          onClick={toggleTimeFormat}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer border ${
            is24Hour
              ? 'bg-darkTeal dark:bg-darkTealAccent text-white border-darkTeal dark:border-mint/40'
              : 'bg-stone-50 dark:bg-darkTealSurface hover:bg-stone-100 dark:hover:bg-darkTealElevated text-charcoal/80 dark:text-cream border-charcoal/20 dark:border-darkTealBorder'
          }`}
          title="Toggle between 12-hour and 24-hour format"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{is24Hour ? '24-Hour' : '12-Hour'}</span>
        </button>
      </div>

      {/* Interactive Calendar Card */}
      <div className="bg-white dark:bg-darkTealSurface rounded-2xl p-3.5 border border-charcoal/15 dark:border-darkTealBorder shadow-xs space-y-3">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="w-4 h-4 text-darkTeal dark:text-cream" />
            <span className="text-xs font-bold text-darkTeal dark:text-cream">{currentMonthLabel}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleTodayClick}
              className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-stone-100 dark:bg-darkTealSurface hover:bg-stone-200 dark:hover:bg-darkTealElevated text-charcoal/80 dark:text-cream transition-all cursor-pointer border border-transparent dark:border-darkTealBorder"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-darkTealElevated text-charcoal/70 dark:text-cream transition-all cursor-pointer"
              aria-label="Previous Month"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-darkTealElevated text-charcoal/70 dark:text-cream transition-all cursor-pointer"
              aria-label="Next Month"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="space-y-1">
          {/* Day of Week Header */}
          <div className="grid grid-cols-7 text-center text-[10px] font-bold text-charcoal/80 dark:text-sage uppercase">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map((cell, idx) => {
              if (!cell) {
                return <div key={`empty-${idx}`} className="h-7" />;
              }
              const isToday = cell.iso === todayIso;
              const isSelected = cell.iso === selectedDateStr;
              const isMarked = markedDates.some((m) => m.dateStr === cell.iso);

              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => setSelectedDateStr(cell.iso)}
                  className={`h-7 rounded-lg text-xs font-bold transition-all relative flex flex-col items-center justify-center cursor-pointer ${
                    isSelected
                      ? 'bg-darkTeal dark:bg-darkTealAccent text-white shadow-xs font-extrabold ring-2 ring-darkTeal/40'
                      : isMarked
                      ? 'bg-terracotta/20 dark:bg-terracotta/30 text-terracotta dark:text-[#FF8A65] font-extrabold border border-terracotta/40'
                      : isToday
                      ? 'bg-stone-100 dark:bg-darkTealElevated text-darkTeal dark:text-cream border border-darkTeal/40'
                      : 'hover:bg-stone-100 dark:hover:bg-darkTealElevated text-charcoal dark:text-cream font-bold'
                  }`}
                  title={`${cell.iso}${isMarked ? ' (Marked Milestone)' : ''}`}
                >
                  <span>{cell.dayNumber}</span>
                  {isMarked && (
                    <span className={`w-1.5 h-1.5 rounded-full absolute bottom-0.5 ${isSelected ? 'bg-amber' : 'bg-terracotta'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Action Header & Note Field (Clear UI Pattern) */}
        <div className="pt-2.5 border-t border-charcoal/10 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-100 border border-charcoal/15 font-mono text-xs font-bold text-darkTeal">
              <CalendarIcon className="w-3.5 h-3.5 text-darkTeal shrink-0" />
              <span>{selectedDateStr}</span>
            </div>

            <button
              type="button"
              onClick={() => handleToggleDateMark(selectedDateStr)}
              className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer border ${
                selectedMarkedItem
                  ? 'bg-terracotta text-white border-terracotta hover:bg-terracotta/90'
                  : 'bg-stone-50 hover:bg-stone-100 text-charcoal/80 border-charcoal/20'
              }`}
              title={selectedMarkedItem ? 'Unmark this date' : 'Mark this date'}
            >
              {selectedMarkedItem ? (
                <>
                  <Check className="w-3 h-3 text-white" />
                  <span>Marked</span>
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3 text-darkTeal" />
                  <span>Mark Date</span>
                </>
              )}
            </button>
          </div>

          {/* Note & Task Input Bar with Reminder Settings */}
          <form onSubmit={handleSaveNote} className="space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1 min-w-0">
                <Tag className="w-3.5 h-3.5 text-charcoal/40 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Task or reminder (e.g. Call Client, Sprint Review)..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl border border-charcoal/20 bg-stone-50 focus:outline-none focus:border-darkTeal font-medium"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-darkTeal hover:bg-darkTeal/90 text-white rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0"
                title="Save task note"
              >
                Save
              </button>
            </div>

            {/* Notification Reminder Time Settings with Flexible AM/PM Selector */}
            <div className="pt-1 border-t border-charcoal/10 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-darkTeal shrink-0" />
                  <span className="text-[11px] text-charcoal/80 font-bold">Reminder Time:</span>
                </div>

                <button
                  type="button"
                  onClick={() => setReminderEnabled(!reminderEnabled)}
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                    reminderEnabled
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-stone-50 text-charcoal/50 border-charcoal/20'
                  }`}
                  title={reminderEnabled ? 'Reminder notifications are active' : 'Reminder notifications are off'}
                >
                  {reminderEnabled ? (
                    <>
                      <Bell className="w-3 h-3 text-emerald-600" />
                      <span>Active</span>
                    </>
                  ) : (
                    <>
                      <BellOff className="w-3 h-3 text-charcoal/40" />
                      <span>Off</span>
                    </>
                  )}
                </button>
              </div>

              {/* Flexible Custom Time Selector: Hour, Minute, and Dedicated AM/PM Toggle */}
              {(() => {
                const [hStr, mStr] = (newReminderTime || '09:00').split(':');
                const rawH = parseInt(hStr || '9', 10);
                const currentAmPm = rawH >= 12 ? 'PM' : 'AM';
                const currentH12 = rawH % 12 || 12;
                const currentM = mStr || '00';

                const updateTime12 = (newH12: number, newMin: string, newAmPm: 'AM' | 'PM') => {
                  let h24 = newH12;
                  if (newAmPm === 'PM' && h24 < 12) h24 += 12;
                  if (newAmPm === 'AM' && h24 === 12) h24 = 0;
                  setNewReminderTime(`${String(h24).padStart(2, '0')}:${newMin}`);
                };

                return (
                  <div className="flex items-center justify-between gap-2 py-1 border-b border-charcoal/10">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={currentH12}
                        onChange={(e) => {
                          const v = Math.max(1, Math.min(12, parseInt(e.target.value || '1', 10) || 1));
                          updateTime12(v, currentM, currentAmPm);
                        }}
                        aria-label="Hour"
                        className="w-8 text-center bg-transparent text-xs font-mono font-bold text-darkTeal focus:outline-none border-b border-transparent focus:border-darkTeal"
                      />
                      <span className="text-charcoal/40 font-bold">:</span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={parseInt(currentM, 10) || 0}
                        onChange={(e) => {
                          const v = Math.max(0, Math.min(59, parseInt(e.target.value || '0', 10) || 0));
                          updateTime12(currentH12, String(v).padStart(2, '0'), currentAmPm);
                        }}
                        aria-label="Minute"
                        className="w-8 text-center bg-transparent text-xs font-mono font-bold text-darkTeal focus:outline-none border-b border-transparent focus:border-darkTeal"
                      />
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => updateTime12(currentH12, currentM, 'AM')}
                        className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                          currentAmPm === 'AM'
                            ? 'text-darkTeal underline decoration-2 underline-offset-4'
                            : 'text-charcoal/45 hover:text-charcoal'
                        }`}
                      >
                        AM
                      </button>
                      <span className="text-charcoal/20">/</span>
                      <button
                        type="button"
                        onClick={() => updateTime12(currentH12, currentM, 'PM')}
                        className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                          currentAmPm === 'PM'
                            ? 'text-darkTeal underline decoration-2 underline-offset-4'
                            : 'text-charcoal/45 hover:text-charcoal'
                        }`}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </form>
        </div>
      </div>

      {/* Marked Dates List */}
      {markedDates.length > 0 && (
        <div className="bg-white dark:bg-darkTealSurface rounded-2xl p-3 border border-charcoal/15 dark:border-darkTealBorder shadow-xs space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-charcoal/50 dark:text-sage flex items-center justify-between">
            <span>Marked Deadlines & Events ({markedDates.length})</span>
            <span className="text-[9px] text-charcoal/40 dark:text-sage/70">Synced live</span>
          </div>

          <div className="space-y-1.5 max-h-32 overflow-y-auto no-scrollbar">
            {markedDates.map((item) => (
              <div
                key={item.dateStr}
                className="flex items-center justify-between p-2 rounded-xl bg-stone-50 dark:bg-darkTealSurface hover:bg-stone-100/80 dark:hover:bg-darkTealElevated border border-charcoal/10 dark:border-darkTealBorder text-xs transition-all"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-terracotta shrink-0" />
                  <span className="font-mono font-bold text-darkTeal dark:text-[#34A89E] text-[11px] shrink-0">
                    {item.dateStr}
                  </span>
                  <span className="text-charcoal/80 dark:text-cream text-[11px] font-medium truncate max-w-[130px]">
                    {item.label}
                  </span>
                  {item.timeStr && (
                    <span className="text-[9px] font-mono font-bold text-darkTeal/80 dark:text-mint bg-stone-200/70 dark:bg-darkTealSurface px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0" title={`Reminder alert at ${item.timeStr}`}>
                      <Bell className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                      {item.timeStr}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteMarked(item.dateStr)}
                  className="text-charcoal/40 dark:text-sage/60 hover:text-terracotta dark:hover:text-[#FF8A65] transition-colors p-1 cursor-pointer"
                  title="Remove marked date"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
