import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Sentence, SentencesResponse } from '../shared/types';
import { authorize, fail, notion, querySentences, shuffle, toSentence } from './_lib';

// GET /api/sentences?game=build|ask&topic=Food&level=easy|medium|hard&count=5
//  build: any sentence with tiles. ask: questions, each with the statement that answers it.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!authorize(req, res)) return;
  const q = req.query as Record<string, string>;
  const game = q.game === 'ask' ? 'ask' : 'build';
  const count = Math.max(1, Math.min(30, Number(q.count) || 5));
  const topic = q.topic && q.topic !== 'all' ? q.topic : null;
  const and: any[] = [];
  if (topic) and.push({ property: 'Topic', multi_select: { contains: topic } });
  if (game === 'ask') and.push({ property: 'Type', select: { equals: 'Question' } });

  try {
    let all = await querySentences(and.length ? { and } : undefined);
    if (game === 'ask') all = all.filter((s) => s.answerIds.length > 0);
    const pool = byLevel(all, q.level);
    const pick = shuffle(pool).slice(0, count);

    if (game === 'ask') {
      // Fetch each question's answer (statements may live in another topic).
      const ids = [...new Set(pick.map((s) => s.answerIds[0]))];
      const pages = await Promise.all(ids.map((id) => notion.pages.retrieve({ page_id: id }).catch(() => null)));
      const byId = new Map<string, Sentence>();
      pages.forEach((p: any) => { if (p && 'properties' in p) byId.set(p.id, toSentence(p)); });
      for (const s of pick) s.answer = byId.get(s.answerIds[0]);
    }
    const sentences = pick.filter((s) => s.tokens.length > 1 && (game === 'build' || s.answer));
    const body: SentencesResponse = { sentences, available: pool.length };
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(body);
  } catch (err) {
    fail(res, err);
  }
}

function byLevel(all: Sentence[], level?: string): Sentence[] {
  const seen = all.filter((s) => s.status !== 'New');
  const fresh = all.filter((s) => s.status === 'New');
  if (level === 'easy') return seen;
  if (level === 'hard') return fresh;
  // Medium (and fallbacks): everything, so short sentence lists still make a round.
  return all;
}
