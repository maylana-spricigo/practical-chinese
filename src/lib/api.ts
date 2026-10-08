import { isDue, localToday, manualStatus, review, type Status } from '../../shared/srs';
import type { FullStats, Length, Level, PracticeRequest, Sentence, SentencesResponse, StatusRequest, TopicStat, Word, WordsResponse } from '../../shared/types';
import { ROUND_SIZE } from '../../shared/types';
import { DEMO_SENTENCES, DEMO_WORDS } from './demo';
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

export async function fetchRound(opts: { mode: 'round' | 'review'; topic: string; level: Level; len: Length; count?: number }): Promise<WordsResponse> {
  const today = localToday();
  const count = opts.count ?? ROUND_SIZE[opts.len];
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

export async function fetchStats(): Promise<FullStats> {
  const today = localToday();
  if (DEMO) {
    await wait(300);
    const s: FullStats = { total: demoState.length, due: 0, byStatus: { New: 0, Learning: 0, Known: 0 }, byTopic: [] };
    const t = new Map<string, TopicStat>();
    demoState.forEach((w) => {
      s.byStatus[w.status]++;
      if (isDue(w, today)) s.due++;
      w.topics.forEach((name) => { const x = t.get(name) ?? { topic: name, total: 0, New: 0, Learning: 0, Known: 0 }; x.total++; x[w.status]++; t.set(name, x); });
    });
    s.byTopic = [...t.values()].sort((a, b) => b.total - a.total);
    return s;
  }
  return call<FullStats>(`/api/stats?today=${today}`);
}

export async function fetchAllWords(): Promise<Word[]> {
  if (DEMO) { await wait(400); return [...demoState].sort((a, b) => a.py.localeCompare(b.py)); }
  return (await call<WordsResponse>(`/api/words?mode=all&today=${localToday()}`)).words;
}

export async function fetchSentences(opts: { game: 'build' | 'ask'; topic: string; level: Level; count: number }): Promise<SentencesResponse> {
  if (DEMO) {
    await wait(500);
    let pool = DEMO_SENTENCES.filter((x) => opts.topic === 'all' || x.topics.includes(opts.topic));
    if (opts.game === 'ask') pool = pool.filter((x) => x.type === 'Question').map((x) => ({ ...x, answer: DEMO_SENTENCES.find((y) => y.id === x.answerIds[0]) }));
    return { sentences: pool.slice(0, opts.count), available: pool.length };
  }
  const q = new URLSearchParams({ game: opts.game, topic: opts.topic, level: opts.level, count: String(opts.count) });
  return call<SentencesResponse>(`/api/sentences?${q}`);
}

export async function postPractice(item: PracticeRequest) {
  if (DEMO) { await wait(150); return; }
  await call('/api/practice', { method: 'POST', body: JSON.stringify(item) });
}

export async function postStatus(item: StatusRequest) {
  if (DEMO) {
    await wait(150);
    const m = manualStatus(item.status as Status, item.today);
    demoState = demoState.map((w) => (w.id === item.id ? { ...w, status: item.status, box: m.box, nextReview: m.nextReview } : w));
    write('pc.demo', demoState);
    return;
  }
  await call('/api/status', { method: 'POST', body: JSON.stringify(item) });
}

export type { Sentence };

export async function postReview(item: { id: string; knew: boolean; today: string }) {
  if (DEMO) {
    await wait(250);
    demoState = demoState.map((w) => (w.id === item.id ? { ...w, ...review(w, item.knew, item.today) } : w));
    write('pc.demo', demoState);
    return;
  }
  await call('/api/review', { method: 'POST', body: JSON.stringify(item) });
}
