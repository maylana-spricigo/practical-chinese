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

// Answers per day (all games), for the Progress week chart.
const ACT = 'pc.activity';
export function addActivity(n = 1) {
  const a = read<Record<string, number>>(ACT, {});
  const k = localToday();
  a[k] = (a[k] || 0) + n;
  const keys = Object.keys(a).sort();
  for (const old of keys.slice(0, Math.max(0, keys.length - 120))) delete a[old];
  write(ACT, a);
}
export function activity(): Record<string, number> { return read<Record<string, number>>(ACT, {}); }

const ROUNDS = 'pc.rounds';
export function addRound() { write(ROUNDS, read<number>(ROUNDS, 0) + 1); markStudiedToday(); }
export function roundsPlayed(): number { return read<number>(ROUNDS, 0); }

export function weekActivity(today = new Date()) {
  const a = activity();
  return thisWeek(today).map((d, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - ((today.getDay() + 6) % 7) + i);
    return { ...d, count: a[localToday(date)] || 0 };
  });
}
