import { isDue, localToday, review } from '../../shared/srs';
import type { Length, Level, Stats, Word, WordsResponse } from '../../shared/types';
import { ROUND_SIZE } from '../../shared/types';
import { DEMO_WORDS } from './demo';
import { read, write } from './storage';

export const DEMO = import.meta.env.VITE_DEMO === '1' || new URLSearchParams(location.search).has('demo');

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function getKey(): string { return read<string>('pc.key', ''); }
export function setKey(k: string) { write('pc.key', k.trim()); }

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', 'x-app-key': getKey(), ...(init?.headers || {}) },
    });
  } catch {
    throw new ApiError(0, 'offline');
  }
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = j.message || j.error || msg; } catch { /* not json */ }
    throw new ApiError(res.status, msg);
  }
  return res.json() as Promise<T>;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let demoState: Word[] = read<Word[] | null>('pc.demo', null) || DEMO_WORDS;

export async function fetchRound(opts: { mode: 'round' | 'review'; topic: string; level: Level; len: Length }): Promise<WordsResponse> {
  const today = localToday();
  const count = ROUND_SIZE[opts.len];
  if (DEMO) {
    await wait(500);
    let pool = demoState.filter((w) => opts.topic === 'all' || w.topics.includes(opts.topic));
    if (opts.mode === 'review') pool = pool.filter((w) => isDue(w, today));
    else if (opts.level === 'easy') pool = pool.filter((w) => w.status !== 'New');
    else if (opts.level === 'hard') pool = pool.filter((w) => w.status === 'New');
    return { words: pool.slice(0, count), available: pool.length };
  }
  const q = new URLSearchParams({ mode: opts.mode, topic: opts.topic, level: opts.level, count: String(count), today });
  return call<WordsResponse>(`/api/words?${q}`);
}

export async function fetchStats(): Promise<Stats> {
  const today = localToday();
  if (DEMO) {
    await wait(300);
    const s: Stats = { total: demoState.length, due: 0, byStatus: { New: 0, Learning: 0, Known: 0 } };
    demoState.forEach((w) => { s.byStatus[w.status]++; if (isDue(w, today)) s.due++; });
    return s;
  }
  return call<Stats>(`/api/stats?today=${today}`);
}

export async function postReview(item: { id: string; knew: boolean; today: string }) {
  if (DEMO) {
    await wait(250);
    demoState = demoState.map((w) => (w.id === item.id ? { ...w, ...review(w, item.knew, item.today) } : w));
    write('pc.demo', demoState);
    return;
  }
  await call('/api/review', { method: 'POST', body: JSON.stringify(item) });
}
