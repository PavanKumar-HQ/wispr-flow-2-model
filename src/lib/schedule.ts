export interface Commitment {
  id: string;
  title: string;
  platform: 'Google Meet' | 'Zoom' | 'Focus Slot';
  url: string;
  durationMins: number;
  timeStr: string;
  dayKey?: string;
  startMinutes?: number;
}

export function getLocalDayKey(dayOffset = 0): string {
  const d = new Date();
  if (dayOffset !== 0) {
    d.setDate(d.getDate() + dayOffset);
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseTimeToMinutes(raw: string): number | null {
  const match = raw.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[3]?.toLowerCase();
  if (ampm === 'pm' && h < 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function formatMinutesToHHMM(totalMinutes: number): string {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getCommitmentWindow(c: Commitment): { dayKey: string; start: number; end: number } | null {
  const dayKey =
    c.dayKey ||
    (c.timeStr.toLowerCase().includes('tomorrow') ? getLocalDayKey(1) : getLocalDayKey(0));
  const start = c.startMinutes ?? parseTimeToMinutes(c.timeStr);
  if (start === null) return null;
  const dur = Math.max(1, c.durationMins || 30);
  return { dayKey, start, end: start + dur };
}

export function findScheduleConflicts(
  candidate: Commitment,
  existing: Commitment[]
): Commitment[] {
  const candWin = getCommitmentWindow(candidate);
  if (!candWin) return [];
  return existing.filter((item) => {
    if (item.id === candidate.id) return false;
    const itemWin = getCommitmentWindow(item);
    if (!itemWin || itemWin.dayKey !== candWin.dayKey) return false;
    return candWin.start < itemWin.end && itemWin.start < candWin.end;
  });
}
