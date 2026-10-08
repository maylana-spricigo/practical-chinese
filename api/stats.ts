import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isDue } from '../shared/srs';
import type { FullStats, TopicStat } from '../shared/types';
import { authorize, fail, isDate, queryAll } from './_lib';

// GET /api/stats?today=YYYY-MM-DD — numbers for Today and Progress.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!authorize(req, res)) return;
  const today = isDate(req.query.today) ? (req.query.today as string) : new Date().toISOString().slice(0, 10);
  try {
    const words = await queryAll();
    const stats: FullStats = { total: words.length, due: 0, byStatus: { New: 0, Learning: 0, Known: 0 }, byTopic: [] };
    const topics = new Map<string, TopicStat>();
    for (const w of words) {
      stats.byStatus[w.status]++;
      if (isDue(w, today)) stats.due++;
      for (const t of w.topics) {
        const ts = topics.get(t) ?? { topic: t, total: 0, New: 0, Learning: 0, Known: 0 };
        ts.total++; ts[w.status]++;
        topics.set(t, ts);
      }
    }
    stats.byTopic = [...topics.values()].sort((a, b) => b.total - a.total);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(stats);
  } catch (err) {
    fail(res, err);
  }
}
