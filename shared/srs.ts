// Spaced repetition rules shared by the API and the app.
// Mirrors the "Box" property in the 词典 Notion database.
//   Box 0 = New (never studied) · 1–3 = Learning · 4–5 = Known
//   I know it (only when the word is due): Box +1
//   Forgot: back to Box 1, see it again tomorrow
// Only Flashcards changes Box; other games only log practice.

export type Status = 'New' | 'Learning' | 'Known';

/** Days until the next review for each box. */
export const INTERVALS = [0, 1, 3, 7, 14, 30] as const;
export const MAX_BOX = 5;

export interface ReviewState {
  box: number | null;
  status: Status;
  nextReview: string | null; // YYYY-MM-DD
  timesKnown: number;
  timesForgot: number;
}

export interface ReviewResult {
  box: number;
  status: Status;
  nextReview: string;
  lastReviewed: string;
  timesKnown: number;
  timesForgot: number;
  /** Status before this review, for the "What changed" list. */
  from: Status;
  /** Whether the box actually moved (false when reviewed early). */
  counted: boolean;
}

export function statusForBox(box: number): Status {
  if (box <= 0) return 'New';
  if (box <= 3) return 'Learning';
  return 'Known';
}

/** Words created before the Box property existed only have a Status. */
export function effectiveBox(box: number | null | undefined, status: Status): number {
  if (typeof box === 'number' && Number.isFinite(box)) return Math.max(0, Math.min(MAX_BOX, Math.round(box)));
  if (status === 'Known') return 4;
  if (status === 'Learning') return 1;
  return 0;
}

/** Adds days to a YYYY-MM-DD date without timezone drift. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

export function isDue(state: Pick<ReviewState, 'box' | 'status' | 'nextReview'>, today: string): boolean {
  const b = effectiveBox(state.box, state.status);
  if (b === 0) return false; // new words are never "due"; they are introduced by difficulty
  return !state.nextReview || state.nextReview <= today;
}

export function review(state: ReviewState, knew: boolean, today: string): ReviewResult {
  const box = effectiveBox(state.box, state.status);
  const from = statusForBox(box);
  const due = box === 0 || !state.nextReview || state.nextReview <= today;
  let nextBox = box;
  let nextReview = state.nextReview ?? today;
  let counted = true;

  if (!knew) {
    nextBox = 1;
    nextReview = addDays(today, INTERVALS[1]);
  } else if (due) {
    nextBox = Math.min(MAX_BOX, box + 1);
    nextReview = addDays(today, INTERVALS[nextBox]);
  } else {
    counted = false; // reviewed early: logged, but the level stays
  }

  return {
    box: nextBox,
    status: statusForBox(nextBox),
    nextReview,
    lastReviewed: today,
    timesKnown: (state.timesKnown || 0) + (knew ? 1 : 0),
    timesForgot: (state.timesForgot || 0) + (knew ? 0 : 1),
    from,
    counted,
  };
}

/** Local calendar date (YYYY-MM-DD) on this device. */
export function localToday(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
