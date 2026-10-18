// Builds game rounds from the full word / sentence lists, so the app can do it
// on the phone from its local copy (no server round trip per game).
import { isDue, type Status } from './srs';
import type { FullStats, Level, Sentence, TopicStat, Word } from './types';

export function shuffle<T>(a: T[]): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

const inTopic = (topics: string[], topic: string) => topic === 'all' || topics.includes(topic);
/** No lessons picked = every lesson. */
const inLessons = (w: Word, lessons?: string[]) => !lessons?.length || (w.lessons ?? []).some((l) => lessons.includes(l));

/** Lessons used in your dictionary, in course order (I1, I2 … S6, S7 …). */
export function lessonList(all: Word[]): string[] {
  const set = new Set<string>();
  all.forEach((w) => w.lessons?.forEach((l) => set.add(l)));
  return [...set].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}

/** Flashcards / Match: Easy = studied words, Hard = new words, Medium = half and half. Due words come first. */
export function pickWords(all: Word[], o: { topic: string; lessons?: string[]; level: Level; count: number; today: string; mode?: 'round' | 'review' }): { words: Word[]; available: number } {
  const pool = all.filter((w) => w.hz && inTopic(w.topics, o.topic) && inLessons(w, o.lessons));
  if (o.mode === 'review') {
    const due = pool.filter((w) => isDue(w, o.today)).sort((a, b) => (a.nextReview ?? '').localeCompare(b.nextReview ?? ''));
    return { words: shuffle(due.slice(0, o.count)), available: due.length };
  }
  const seen = pool.filter((w) => w.status !== 'New');
  const fresh = pool.filter((w) => w.status === 'New');
  const seenOrdered = [...shuffle(seen.filter((w) => isDue(w, o.today))), ...shuffle(seen.filter((w) => !isDue(w, o.today)))];
  const freshOrdered = shuffle(fresh);
  let pick: Word[];
  if (o.level === 'easy') pick = seenOrdered.slice(0, o.count);
  else if (o.level === 'hard') pick = freshOrdered.slice(0, o.count);
  else {
    const half = Math.ceil(o.count / 2);
    const a = seenOrdered.slice(0, half);
    const b = freshOrdered.slice(0, o.count - a.length);
    pick = [...a, ...b];
    if (pick.length < o.count) pick = [...pick, ...seenOrdered.slice(a.length, a.length + o.count - pick.length)];
  }
  const available = o.level === 'easy' ? seen.length : o.level === 'hard' ? fresh.length : pool.length;
  return { words: shuffle(pick), available };
}

export interface Partner { a: Word; b: Word }

/** Word Partners: pairs from "Goes with". Every word appears once and no tile fits two pairs in the same round. */
export function pickPartners(all: Word[], o: { topic: string; lessons?: string[]; level: Level; count: number }): { pairs: Partner[]; available: number } {
  const byId = new Map(all.map((w) => [w.id, w]));
  const links = new Set<string>();
  const cands: Partner[] = [];
  for (const a of all) {
    for (const id of a.partners ?? []) {
      const b = byId.get(id);
      if (!b || !a.hz || !b.hz || a.id === b.id) continue;
      links.add(a.id + '>' + b.id);
      if (!(inTopic(a.topics, o.topic) || inTopic(b.topics, o.topic))) continue;
      if (!(inLessons(a, o.lessons) || inLessons(b, o.lessons))) continue;
      const st = a.status === 'New' && b.status === 'New' ? 'New' : 'seen';
      if (o.level === 'easy' && st === 'New') continue;
      if (o.level === 'hard' && st !== 'New') continue;
      cands.push({ a, b });
    }
  }
  const fits = (x: Word, y: Word) => links.has(x.id + '>' + y.id) || links.has(y.id + '>' + x.id);
  const pick: Partner[] = [];
  const used = new Set<string>();
  for (const c of shuffle(cands)) {
    if (pick.length >= o.count) break;
    if (used.has(c.a.id) || used.has(c.b.id) || used.has('hz:' + c.a.hz) || used.has('hz:' + c.b.hz)) continue;
    if (pick.some((p) => fits(p.a, c.b) || fits(c.a, p.b))) continue; // would make a second right answer
    pick.push(c);
    used.add(c.a.id); used.add(c.b.id); used.add('hz:' + c.a.hz); used.add('hz:' + c.b.hz);
  }
  return { pairs: pick, available: cands.length };
}

/** Build: any sentence with at least two tiles. Ask: questions with the statement that answers them. */
export function pickSentences(all: Sentence[], o: { game: 'build' | 'ask'; topic: string; level: Level; count: number }): { sentences: Sentence[]; available: number } {
  const byId = new Map(all.map((s) => [s.id, s]));
  let pool = all.filter((s) => s.hz && inTopic(s.topics, o.topic));
  if (o.game === 'ask') {
    pool = pool.filter((s) => s.type === 'Question' && s.answerIds.some((id) => byId.has(id)))
      .map((s) => ({ ...s, answer: byId.get(s.answerIds.find((id) => byId.has(id))!) }));
  }
  pool = pool.filter((s) => s.tokens.length > 1);
  if (o.level === 'easy') pool = pool.filter((s) => s.status !== 'New');
  else if (o.level === 'hard') pool = pool.filter((s) => s.status === 'New');
  return { sentences: shuffle(pool).slice(0, o.count), available: pool.length };
}

export function computeStats(words: Word[], today: string): FullStats {
  const stats: FullStats = { total: words.length, due: 0, byStatus: { New: 0, Learning: 0, Known: 0 }, byTopic: [] };
  const topics = new Map<string, TopicStat>();
  for (const w of words) {
    stats.byStatus[w.status as Status]++;
    if (isDue(w, today)) stats.due++;
    for (const t of w.topics) {
      const ts = topics.get(t) ?? { topic: t, total: 0, New: 0, Learning: 0, Known: 0 };
      ts.total++; ts[w.status]++;
      topics.set(t, ts);
    }
  }
  stats.byTopic = [...topics.values()].sort((a, b) => b.total - a.total);
  return stats;
}
