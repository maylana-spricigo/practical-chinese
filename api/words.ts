import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isDue } from '../shared/srs';
import type { Word, WordsResponse } from '../shared/types';
import { authorize, fail, isDate, queryAll, shuffle } from './_lib';

// GET /api/words?mode=round|review|all&topic=Food&level=easy|medium|hard&count=10&today=YYYY-MM-DD
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!authorize(req, res)) return;
  const q = req.query as Record<string, string>;
  const mode = q.mode || 'round';
  const today = isDate(q.today) ? q.today : new Date().toISOString().slice(0, 10);
  const count = Math.max(1, Math.min(50, Number(q.count) || 10));
  const topic = q.topic && q.topic !== 'all' ? q.topic : null;

  try {
    if (mode === 'all') {
      const words = await queryAll(undefined, [{ property: 'Hanzi', direction: 'ascending' }]);
      return send(res, { words, available: words.length });
    }

    const topicFilter = topic ? [{ property: 'Topic', multi_select: { contains: topic } }] : [];

    if (mode === 'review') {
      const words = await queryAll({
        and: [
          ...topicFilter,
          { property: 'Status', select: { does_not_equal: 'New' } },
          { or: [{ property: 'Next review', date: { on_or_before: today } }, { property: 'Next review', date: { is_empty: true } }] },
        ],
      }, [{ property: 'Next review', direction: 'ascending' }]);
      const due = words.filter((w) => isDue(w, today));
      return send(res, { words: shuffle(due.slice(0, count)), available: due.length });
    }

    // round: Easy = words you've studied, Hard = new words, Medium = half and half
    const level = q.level === 'easy' || q.level === 'hard' ? q.level : 'medium';
    const all = await queryAll(topicFilter.length ? { and: topicFilter } : undefined);
    const seen = all.filter((w) => w.status !== 'New');
    const fresh = all.filter((w) => w.status === 'New');
    // Studied words that are due come first, then the rest at random.
    const seenOrdered = [...shuffle(seen.filter((w) => isDue(w, today))), ...shuffle(seen.filter((w) => !isDue(w, today)))];
    const freshOrdered = shuffle(fresh);

    let pick: Word[];
    if (level === 'easy') pick = seenOrdered.slice(0, count);
    else if (level === 'hard') pick = freshOrdered.slice(0, count);
    else {
      const half = Math.ceil(count / 2);
      const a = seenOrdered.slice(0, half);
      const b = freshOrdered.slice(0, count - a.length);
      pick = [...a, ...b];
      if (pick.length < count) pick = [...pick, ...seenOrdered.slice(a.length, a.length + count - pick.length)];
    }
    const available = level === 'easy' ? seen.length : level === 'hard' ? fresh.length : all.length;
    return send(res, { words: shuffle(pick), available });
  } catch (err) {
    return fail(res, err);
  }
}

function send(res: VercelResponse, body: WordsResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(body);
}
