import { describe, expect, it } from 'vitest';
import { addDays, effectiveBox, isDue, review } from './srs';

const base = { timesKnown: 0, timesForgot: 0 };

describe('srs', () => {
  it('adds days across months', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('maps legacy status to a box', () => {
    expect(effectiveBox(null, 'New')).toBe(0);
    expect(effectiveBox(null, 'Learning')).toBe(1);
    expect(effectiveBox(null, 'Known')).toBe(4);
    expect(effectiveBox(9, 'New')).toBe(5);
  });

  it('a new word I know moves to box 1, back tomorrow', () => {
    const r = review({ ...base, box: 0, status: 'New', nextReview: null }, true, '2026-10-08');
    expect(r).toMatchObject({ box: 1, status: 'Learning', nextReview: '2026-10-09', from: 'New', timesKnown: 1, counted: true });
  });

  it('a due word I know moves up and spaces out', () => {
    const r = review({ ...base, box: 3, status: 'Learning', nextReview: '2026-10-08' }, true, '2026-10-08');
    expect(r).toMatchObject({ box: 4, status: 'Known', nextReview: '2026-10-22', from: 'Learning' });
  });

  it('caps at box 5 with 30 days', () => {
    const r = review({ ...base, box: 5, status: 'Known', nextReview: '2026-10-01' }, true, '2026-10-08');
    expect(r).toMatchObject({ box: 5, nextReview: '2026-11-07' });
  });

  it('reviewing early does not move the box', () => {
    const r = review({ ...base, box: 2, status: 'Learning', nextReview: '2026-10-20' }, true, '2026-10-08');
    expect(r).toMatchObject({ box: 2, nextReview: '2026-10-20', counted: false, timesKnown: 1, lastReviewed: '2026-10-08' });
  });

  it('forgetting resets to box 1 tomorrow, even early', () => {
    const r = review({ ...base, box: 4, status: 'Known', nextReview: '2026-11-01', timesForgot: 2 }, false, '2026-10-08');
    expect(r).toMatchObject({ box: 1, status: 'Learning', nextReview: '2026-10-09', timesForgot: 3, from: 'Known' });
  });

  it('new words are never due', () => {
    expect(isDue({ box: 0, status: 'New', nextReview: null }, '2026-10-08')).toBe(false);
    expect(isDue({ box: 2, status: 'Learning', nextReview: '2026-10-08' }, '2026-10-08')).toBe(true);
    expect(isDue({ box: 2, status: 'Learning', nextReview: '2026-10-09' }, '2026-10-08')).toBe(false);
  });
});
