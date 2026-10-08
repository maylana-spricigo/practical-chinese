import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isDue } from '../shared/srs';
import type { Stats } from '../shared/types';
import { authorize, fail, isDate, queryAll } from './_lib';

// GET /api/stats?today=YYYY-MM-DD — counts for the Today card.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!authorize(req, res)) return;
  const today = isDate(req.query.today) ? (req.query.today as string) : new Date().toISOString().slice(0, 10);
  try {
    const words = await queryAll();
    const stats: Stats = { total: words.length, due: 0, byStatus: { New: 0, Learning: 0, Known: 0 } };
    for (const w of words) {
      stats.byStatus[w.status]++;
      if (isDue(w, today)) stats.due++;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(stats);
  } catch (err) {
    fail(res, err);
  }
}
