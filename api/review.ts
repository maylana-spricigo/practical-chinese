import type { VercelRequest, VercelResponse } from '@vercel/node';
import { review } from '../shared/srs';
import type { ReviewRequest } from '../shared/types';
import { authorize, fail, isDate, notion, toWord } from './_lib';

// POST /api/review { id, knew, today } — Flashcards only. Applies the spaced-repetition rule
// to one word and writes Box, Status, Next review, Last reviewed and the counters to Notion.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!authorize(req, res)) return;
  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as ReviewRequest;
  if (!body || typeof body.id !== 'string' || typeof body.knew !== 'boolean' || !isDate(body.today)) {
    return res.status(400).json({ error: 'bad_request' });
  }
  try {
    const page: any = await notion.pages.retrieve({ page_id: body.id });
    const word = toWord(page);
    const r = review(word, body.knew, body.today);
    await notion.pages.update({
      page_id: body.id,
      properties: {
        Box: { number: r.box },
        Status: { select: { name: r.status } },
        'Next review': { date: { start: r.nextReview } },
        'Last reviewed': { date: { start: r.lastReviewed } },
        'Times known': { number: r.timesKnown },
        'Times forgot': { number: r.timesForgot },
      } as any,
    });
    res.status(200).json({ id: body.id, ...r });
  } catch (err) {
    fail(res, err);
  }
}
