import type { VercelRequest, VercelResponse } from '@vercel/node';
import { manualStatus } from '../shared/srs';
import type { StatusRequest } from '../shared/types';
import { authorize, body, fail, isDate, notion } from './_lib';

// POST /api/status { id, status, today } — set a word's status by hand from the Dictionary.
// Keeps Box and Next review consistent with the spaced-repetition rule.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!authorize(req, res)) return;
  const b = body<StatusRequest>(req);
  if (!b || typeof b.id !== 'string' || !['New', 'Learning', 'Known'].includes(b.status) || !isDate(b.today)) return res.status(400).json({ error: 'bad_request' });
  try {
    const m = manualStatus(b.status, b.today);
    await notion.pages.update({
      page_id: b.id,
      properties: {
        Status: { select: { name: b.status } },
        Box: { number: m.box },
        'Next review': { date: m.nextReview ? { start: m.nextReview } : null },
      } as any,
    });
    res.status(200).json({ ok: true, ...m });
  } catch (err) {
    fail(res, err);
  }
}
