import { localToday } from '../../shared/srs';
import { read, write } from './storage';

// Days with at least one finished round, kept on this phone for the streak.
const KEY = 'pc.days';

export function markStudiedToday() {
  const days = new Set(read<string[]>(KEY, []));
  days.add(localToday());
  write(KEY, [...days].sort().slice(-400));
}

export function studiedDays(): Set<string> {
  return new Set(read<string[]>(KEY, []));
}

export function streak(today = new Date()): number {
  const days = studiedDays();
  const d = new Date(today);
  if (!days.has(localToday(d))) d.setDate(d.getDate() - 1); // today not done yet still keeps yesterday's streak
  let n = 0;
  while (days.has(localToday(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/** Monday-first week with a flag per day. */
export function thisWeek(today = new Date()) {
  const days = studiedDays();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = localToday(d);
    return { label: l, done: days.has(key), isToday: key === localToday(today), future: d > today };
  });
}
