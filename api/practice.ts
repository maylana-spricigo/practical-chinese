import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { PracticeRequest } from '../shared/types';
import { authorize, body, fail, isDate, notion } from './_lib';

// POST /api/practice { kind: 'word'|'sentence', id, correct, today }
// Match, Build and Ask log practice: Times known / Times forgot and Last reviewed.
// They never change Box, Status or Next review (only Flashcards does).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!authorize(req, res)) return;
  const b = body<PracticeRequest>(req);
  if (!b || typeof b.id !== 'string' || typeof b.correct !== 'boolean' || !isDate(b.today)) return res.status(400).json({ error: 'bad_request' });
  try {
    const page: any = await notion.pages.retrieve({ page_id: b.id });
    const n = (k: string) => (page.properties?.[k]?.type === 'number' ? page.properties[k].number ?? 0 : 0);
    await notion.pages.update({
      page_id: b.id,
      properties: {
        [b.correct ? 'Times known' : 'Times forgot']: { number: n(b.correct ? 'Times known' : 'Times forgot') + 1 },
        'Last reviewed': { date: { start: b.today } },
      } as any,
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    fail(res, err);
  }
}
