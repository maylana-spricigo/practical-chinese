import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { go, routeParams } from '../App';
import { Icon, ToggleTile } from '../components';
import { DEMO } from '../lib/api';
import { addActivity, addRound } from '../lib/history';
import { useGameOptions, type Round } from '../lib/settings';
import { speak } from '../lib/speak';
import { patchWord, useStore } from '../lib/store';
import { enqueue, useSync } from '../lib/sync';
import { INTERVALS, localToday, review, type Status } from '../../shared/srs';
import { pickWords } from '../../shared/rounds';
import { ROUND_SIZE, type Word } from '../../shared/types';
import KeyPrompt from './KeyPrompt';
import { ErrorState, Loading, Message } from '../components/states';
import { RoundSheet, roundLabel, useRound } from '../components/game';

type Phase = 'loading' | 'error' | 'empty' | 'play' | 'done';
interface Change { id: string; k: number; from: Status; to: Status; knew: boolean; days: number; counted: boolean; practice?: boolean }

type Mode = 'recognize' | 'recall';

export default function Flashcards({ mode }: { mode: 'round' | 'review' }) {
  const { round, epoch, again, apply } = useRound('flashcards');
  const store = useStore('words');
  const [phase, setPhase] = useState<Phase>('loading');
  const [words, setWords] = useState<Word[]>([]);
  const [order, setOrder] = useState<number[]>([]);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [changes, setChanges] = useState<Change[]>([]);
  const [missed, setMissed] = useState<number[]>([]);
  const [sheet, setSheet] = useState(() => routeParams().has('setup'));
  const [opt, setOpt] = useGameOptions('flashcards', { pinyin: false, audio: false, mode: 'recognize' as Mode });
  const recall = opt.mode === 'recall';
  const sync = useSync();
  const ready = !!store.items;

  // ---- build a round from the local copy of your dictionary ----
  useEffect(() => {
    if (!ready) return;
    const r = pickWords(store.items!, { topic: round.cat, level: round.level, count: ROUND_SIZE[round.len], today: localToday(), mode });
    setWords(r.words);
    setOrder(r.words.map((_, k) => k));
    setI(0); setFlipped(false); setChanges([]); setMissed([]);
    setPhase(r.words.length ? 'play' : 'empty');
  }, [ready, epoch, mode, opt.mode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!ready && store.error) setPhase('error'); }, [ready, store.error]);

  const current = phase === 'play' ? words[order[i]] : undefined;

  useEffect(() => { if (current && opt.audio) speak(current.hz); }, [current?.id, i, opt.audio]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- answer ----
  const [dx, setDx] = useState(0);
  const [anim, setAnim] = useState(false);
  const [noTrans, setNoTrans] = useState(false);
  const busy = useRef(false);

  const decide = useCallback((knew: boolean) => {
    if (busy.current || phase !== 'play') return;
    busy.current = true;
    const k = order[i];
    const w = words[k];
    const today = localToday();
    addActivity();
    if (recall) {
      // Recall is practice only: the word's level doesn't move.
      enqueue({ type: 'practice', kind: 'word', id: w.id, correct: knew, today });
      patchWord(w.id, knew ? { timesKnown: w.timesKnown + 1 } : { timesForgot: w.timesForgot + 1 });
      setChanges((cs) => [...cs.filter((c) => c.id !== w.id), { id: w.id, k, from: w.status, to: w.status, knew, days: 0, counted: false, practice: true }]);
    } else {
      const r = review(w, knew, today);
      enqueue({ id: w.id, knew, today });
      const patch = { box: r.box, status: r.status, nextReview: r.nextReview, timesKnown: r.timesKnown, timesForgot: r.timesForgot };
      patchWord(w.id, patch);
      setWords((ws) => ws.map((x, j) => (j === k ? { ...x, ...patch } : x)));
      setChanges((cs) => [...cs.filter((c) => c.id !== w.id), { id: w.id, k, from: cs.find((c) => c.id === w.id)?.from ?? r.from, to: r.status, knew, days: INTERVALS[r.box], counted: r.counted }]);
    }
    if (!knew) setMissed((m) => (m.includes(k) ? m : [...m, k]));
    setAnim(true);
    setDx(knew ? 560 : -560);
    setTimeout(() => {
      const ni = i + 1;
      setNoTrans(true); setDx(0); setFlipped(false); setAnim(false);
      setI(ni);
      if (ni >= order.length) { setPhase('done'); addRound(); }
      requestAnimationFrame(() => requestAnimationFrame(() => setNoTrans(false)));
      busy.current = false;
    }, 260);
  }, [phase, order, i, words, recall]);

  // ---- swipe ----
  const drag = useRef<{ x: number; moved: boolean } | null>(null);
  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (anim || (e.target as HTMLElement).closest('button')) return;
    drag.current = { x: e.clientX, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const d = e.clientX - drag.current.x;
    if (Math.abs(d) > 6) drag.current.moved = true;
    setDx(d);
  };
  const onCancel = () => { drag.current = null; setDx(0); }; // the browser took the gesture (e.g. scrolling the back of the card)
  const onUp = () => {
    const d = drag.current; drag.current = null;
    if (!d) return;
    if (!d.moved) { setDx(0); setFlipped((f) => !f); return; }
    if (dx > 100) decide(true); else if (dx < -100) decide(false); else setDx(0);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'play' || sheet) return;
      if (e.key === 'ArrowRight') decide(true);
      else if (e.key === 'ArrowLeft') decide(false);
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped((f) => !f); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, sheet, decide]);

  const startOver = (ids: number[]) => { setOrder(ids); setI(0); setFlipped(false); setMissed([]); setChanges([]); setPhase('play'); };

  // ---- header ----
  const label = mode === 'review' ? 'Due today' : roundLabel(round);
  const total = order.length;
  const done = phase === 'done';
  const pct = total ? `${(Math.min(i, total) / total) * 100}%` : '0%';

  if (store.error?.status === 401) return <KeyPrompt onDone={() => void store.retry()} />;

  const known = changes.filter((c) => c.knew).length;
  const forgot = changes.length - known;

  return (
    <main className="screen" lang="en">
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 16px calc(20px + var(--safe-bottom))' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" className="icon-btn" aria-label="Back to home" onClick={() => go('')}><Icon.Back /></button>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <p className="serif" style={{ margin: 0, fontSize: 18, lineHeight: 1 }}>
                {phase === 'play' || done ? <>Card {Math.min(i + 1, total)} <span style={{ fontWeight: 500, color: 'var(--grey)' }}>of {total}</span></> : 'Flashcards'}
              </p>
              <p className="muted" style={{ margin: 0, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</p>
            </div>
            <div role="progressbar" aria-label="Round progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.min(i, total)} style={{ height: 10, border: '2px solid var(--ink)', borderRadius: 6, overflow: 'hidden', background: 'var(--paper)', display: 'flex' }}>
              <span className={phase === 'loading' ? 'pulse' : ''} style={{ width: phase === 'loading' ? '100%' : pct, background: phase === 'loading' ? 'var(--sand)' : 'var(--ink)', transition: 'width .3s ease' }} />
            </div>
          </div>
          <button type="button" className="icon-btn" aria-label="Round options" disabled={phase === 'loading'} onClick={() => setSheet(true)}><Icon.Sliders /></button>
        </div>

        {phase !== 'done' && phase !== 'loading' && phase !== 'error' && (
          <div role="radiogroup" aria-label="Mode" className="seg" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', flex: 'none' }}>
            {([['recognize', '认', 'Recognize', 'hanzi → meaning'], ['recall', '想', 'Recall', 'meaning → hanzi']] as const).map(([id, zh, name, desc]) => (
              <button key={id} type="button" role="radio" aria-checked={opt.mode === id} onClick={() => opt.mode !== id && setOpt({ mode: id })} style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span lang="zh-Hans" className="hz" style={{ fontSize: 18, lineHeight: 1 }}>{zh}</span>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.05 }}><span style={{ fontSize: 14, fontWeight: 600 }}>{name}</span><span style={{ fontSize: 11, opacity: 0.8 }}>{desc}</span></span>
              </button>
            ))}
          </div>
        )}
        {phase === 'loading' && <Loading />}
        {phase === 'error' && <ErrorState error={store.error} onRetry={() => void store.retry()} />}
        {phase === 'empty' && <Empty mode={mode} round={round} onFix={(patch) => apply({ ...round, ...patch })} onChange={() => setSheet(true)} />}

        {phase === 'play' && current && (
          <>
            <div style={{ position: 'relative', flex: 1, minHeight: 320, maxHeight: 500 }}>
              <div aria-hidden="true" style={{ position: 'absolute', inset: '14px 10px -6px 10px', background: 'var(--sage)', border: '2px solid var(--ink)', borderRadius: 24, transform: 'rotate(3deg)' }} />
              <div aria-hidden="true" style={{ position: 'absolute', inset: '8px 6px -2px 6px', background: 'var(--pink)', border: '2px solid var(--ink)', borderRadius: 24, transform: 'rotate(-2.5deg)' }} />
              <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancel}
                style={{ position: 'absolute', inset: 0, background: 'var(--paper)', border: '2px solid var(--ink)', borderRadius: 24, padding: '18px 20px', display: 'flex', flexDirection: 'column', touchAction: 'none', userSelect: 'none', cursor: 'grab', transform: `translateX(${dx}px) rotate(${dx / 20}deg)`, transition: drag.current || noTrans ? 'none' : 'transform .26s ease' }}>
                <Stamp side="left" op={Math.max(0, Math.min(1, dx / 90))} />
                <Stamp side="right" op={Math.max(0, Math.min(1, -dx / 90))} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="pill" style={{ background: current.status === 'New' ? 'var(--pink)' : 'var(--sand)' }}>{current.status === 'New' ? 'New word' : 'Review'}</span>
                  <button type="button" onClick={() => speak(current.hz)} aria-label="Play pronunciation" style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid var(--ink)', background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon.Speaker /></button>
                </div>

                {!flipped ? (
                  <>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, textAlign: 'center' }}>
                      {recall ? (
                        <>
                          <p className="serif" style={{ margin: 0, fontSize: current.en.length > 14 ? 38 : 52, lineHeight: 1.05 }}>{current.en}</p>
                          <p className="hand muted" style={{ margin: 0, fontSize: 17 }}>how do you say it?</p>
                        </>
                      ) : (
                        <>
                          <p lang="zh-Hans" className="hz" style={{ margin: 0, fontSize: current.hz.length > 3 ? 72 : current.hz.length > 1 ? 104 : 140, lineHeight: 1 }}>{current.hz}</p>
                          {opt.pinyin && <p className="accent" style={{ margin: 0, fontSize: 26, fontWeight: 600, lineHeight: 1 }}>{current.py}</p>}
                        </>
                      )}
                    </div>
                    <button type="button" onClick={() => setFlipped(true)} className="hand muted" style={{ alignSelf: 'center', minHeight: 44, padding: '0 14px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 8, fontSize: 18 }}>
                      <Icon.Flip /> tap to flip &amp; see details
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', touchAction: 'pan-y', display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
                        <p lang="zh-Hans" className="hz" style={{ margin: 0, fontSize: 60, lineHeight: 1 }}>{current.hz}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 4 }}>
                          <p className="accent" style={{ margin: 0, fontSize: 24, fontWeight: 600, lineHeight: 1 }}>{current.py}</p>
                          <p className="serif" style={{ margin: 0, fontSize: 22, lineHeight: 1.1 }}>{current.en}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {current.pos && <span className="pill">{current.pos}</span>}
                        {current.mw && <span className="pill">measure word <span className="hz" lang="zh-Hans" style={{ fontWeight: 400 }}>{current.mw}</span></span>}
                      </div>
                      {current.ex && (
                        <>
                          <svg width="100%" height="8" viewBox="0 0 318 8" preserveAspectRatio="none" fill="none" aria-hidden="true"><path d="M2 5 C80 2 160 6 316 3" stroke="#1C1A18" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 6" /></svg>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <p className="hand accent" style={{ margin: 0, fontSize: 17 }}>example</p>
                              <button type="button" onClick={() => speak(current.ex)} className="pill" style={{ minHeight: 36, background: 'transparent', fontSize: 13 }}><Icon.Speaker size={16} /> listen</button>
                            </div>
                            <p lang="zh-Hans" className="hz" style={{ margin: 0, fontSize: 22, lineHeight: 1.3 }}>{current.ex}</p>
                            {current.exPy && <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.3 }}>{current.exPy}</p>}
                            {current.exEn && <p style={{ margin: 0, fontSize: 15, lineHeight: 1.3 }}>{current.exEn}</p>}
                          </div>
                        </>
                      )}
                    </div>
                    <button type="button" onClick={() => setFlipped(false)} className="hand muted" style={{ alignSelf: 'center', minHeight: 44, padding: '0 14px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 8, fontSize: 17 }}>
                      <Icon.Flip size={22} /> flip back
                    </button>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p className="hand muted" style={{ margin: 0, textAlign: 'center', fontSize: 16 }}>drag the card — or tap below</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                <AnswerButton knew={false} count={forgot} onClick={() => decide(false)} />
                <AnswerButton knew count={known} onClick={() => decide(true)} />
              </div>
            </div>
          </>
        )}

        {done && (
          <Done words={words} order={order} changes={changes} recall={recall} missedCount={missed.length} sync={sync}
            onReviewMissed={() => startOver(missed)} onPlayAgain={again} onChangeRound={() => setSheet(true)} />
        )}
      </div>

      {sheet && (
        <RoundSheet game="flashcards" title="Flashcards" zh="单词卡" py="dāncí kǎ" round={round} onClose={() => setSheet(false)} onApply={(r: Round) => { apply(r); setSheet(false); }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            <ToggleTile on={opt.pinyin} name="Pinyin" desc="on the front" onClick={() => setOpt({ pinyin: !opt.pinyin })} />
            <ToggleTile on={opt.audio} name="Auto-play" desc="hear each card" onClick={() => setOpt({ audio: !opt.audio })} />
          </div>
        </RoundSheet>
      )}
    </main>
  );
}

function Stamp({ side, op }: { side: 'left' | 'right'; op: number }) {
  const know = side === 'left';
  return (
    <div aria-hidden="true" className="hand" style={{ position: 'absolute', top: 70, [side]: 18, padding: '6px 12px', border: '3px solid var(--ink)', borderRadius: 10, background: know ? 'var(--sage)' : 'var(--orange)', transform: `rotate(${know ? -12 : 12}deg)`, opacity: op, fontWeight: 700, fontSize: 22, pointerEvents: 'none' }}>
      {know ? 'I know it!' : 'Forgot'} <span className="hz">{know ? '会了' : '忘了'}</span>
    </div>
  );
}

function AnswerButton({ knew, count, onClick }: { knew: boolean; count: number; onClick: () => void }) {
  const badge = <span aria-label={knew ? 'known so far' : 'forgotten so far'} style={{ minWidth: 28, height: 28, borderRadius: 999, background: 'var(--ink)', color: 'var(--cream)', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{count}</span>;
  const text = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {!knew && <Icon.Arrow color="#1C1A18" left />}
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: knew ? 'flex-end' : 'flex-start', lineHeight: 1.1 }}>
        <span className="hand" style={{ fontSize: 19 }}>{knew ? 'I know it' : 'Forgot'}</span>
        <span lang="zh-Hans" className="hz" style={{ fontSize: 13, fontWeight: 400 }}>{knew ? '会了' : '忘了'}</span>
      </span>
      {knew && <Icon.Arrow color="#1C1A18" />}
    </span>
  );
  return (
    <button type="button" onClick={onClick} style={{ minHeight: 60, borderRadius: 14, border: '2px solid var(--ink)', background: knew ? 'var(--sage)' : 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px' }}>
      {knew ? <>{badge}{text}</> : <>{text}{badge}</>}
    </button>
  );
}

function Done({ words, order, changes, recall, missedCount, sync, onReviewMissed, onPlayAgain, onChangeRound }: {
  words: Word[]; order: number[]; changes: Change[]; recall: boolean; missedCount: number; sync: ReturnType<typeof useSync>;
  onReviewMissed: () => void; onPlayAgain: () => void; onChangeRound: () => void;
}) {
  // Every word of the round, in the order it appeared.
  const byK = new Map(changes.map((c) => [c.k, c]));
  const rows = order.map((k) => ({ w: words[k], c: byK.get(k) })).filter((r) => r.c && r.w);
  const n = rows.length;
  const known = rows.filter((r) => r.c!.knew).length;
  const headline = n && known === n ? '全对！ perfect round' : known * 2 >= n ? '不错 · good round' : '加油 · tough one — let’s go over these';
  const syncLabel = DEMO ? 'demo · not saved' : sync.status === 'saving' || sync.pending ? (sync.status === 'failed' ? 'not synced yet' : 'saving…') : sync.status === 'auth' ? 'check app key' : 'saved to Notion';
  const syncOk = syncLabel === 'saved to Notion';
  const when = (c: Change) => recall ? 'practice' : !c.knew ? 'back tomorrow' : c.from !== c.to ? `${c.from} → ${c.to}` : !c.counted ? 'not due yet' : c.days === 1 ? 'back tomorrow' : `back in ${c.days} days`;

  return (
    <div style={{ flex: 1, minHeight: 0, background: 'var(--green)', color: 'var(--cream)', border: '2px solid var(--ink)', borderRadius: 24, padding: '20px 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <p className="hand tilt" style={{ margin: 0, fontSize: 18, color: 'var(--pink)' }}>{headline}</p>
        <p role="status" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: syncOk ? '#CFE0C4' : 'var(--pink)', whiteSpace: 'nowrap' }}>
          {syncOk && <Icon.Check color="#CFE0C4" />}{syncLabel}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h2 className="serif" style={{ margin: 0, fontSize: 32, lineHeight: 1, whiteSpace: 'nowrap' }}>{known} <span style={{ fontWeight: 500, fontSize: 20 }}>of {n} remembered</span></h2>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#CFE0C4' }}>{recall ? '想 Recall · practice only' : '认 Recognize · levels updated'}</span>
      </div>
      <div aria-hidden="true" style={{ height: 12, border: '2px solid var(--ink)', borderRadius: 7, overflow: 'hidden', display: 'flex', background: 'var(--orange)' }}>
        <span style={{ width: `${n ? (known / n) * 100 : 0}%`, background: 'var(--sage)', borderRight: known && known < n ? '2px solid var(--ink)' : 'none' }} />
      </div>

      {(sync.status === 'failed' || sync.status === 'auth') && !DEMO && (
        <div role="alert" style={{ background: 'var(--pink)', color: 'var(--ink)', border: '2px solid var(--ink)', borderRadius: 14, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ flex: 1, fontSize: 13, lineHeight: 1.3 }}><b>Not synced yet.</b> Saved on this phone — {sync.pending} {sync.pending === 1 ? 'answer' : 'answers'} will go to Notion when you’re back online.</span>
          <button type="button" onClick={sync.retry} style={{ flex: 'none', minHeight: 40, padding: '0 12px', borderRadius: 10, border: '2px solid var(--ink)', background: 'var(--ink)', color: 'var(--cream)', fontFamily: 'var(--hand)', fontSize: 17 }}>Retry</button>
        </div>
      )}

      <section aria-label="Words in this round" style={{ flex: 1, minHeight: 0, background: 'var(--cream)', color: 'var(--ink)', border: '2px solid var(--ink)', borderRadius: 16, padding: '10px 12px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 6 }}>
          <p className="serif" style={{ margin: 0, fontSize: 18 }}>This round</p>
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>in the order you saw them</p>
        </div>
        {rows.map(({ w, c }) => (
          <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: '1.5px dashed rgba(28,26,24,0.3)' }}>
            <span aria-label={c!.knew ? 'remembered' : 'not remembered'} style={{ flex: 'none', width: 26, height: 26, borderRadius: '50%', border: '2px solid var(--ink)', background: c!.knew ? 'var(--sage)' : 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {c!.knew ? <Icon.Check color="#1C1A18" /> : <Icon.X />}
            </span>
            <span lang="zh-Hans" className="hz" style={{ flex: 'none', minWidth: 44, fontSize: 22, lineHeight: 1 }}>{w.hz}</span>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1, lineHeight: 1.15 }}>
              <span className="accent" style={{ fontSize: 13, fontWeight: 600 }}>{w.py}</span>
              <span style={{ fontSize: 13, color: '#3E3A35', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.en}</span>
            </span>
            <span style={{ flex: 'none', maxWidth: 84, fontSize: 11, fontWeight: 600, textAlign: 'right', color: c!.knew ? '#3E3A35' : 'var(--orange-text)' }}>{when(c!)}</span>
          </div>
        ))}
      </section>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {missedCount > 0 && <button type="button" className="btn btn-light" onClick={onReviewMissed}>Review the {missedCount} I didn’t remember</button>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <button type="button" className="btn btn-ghost-light" onClick={onPlayAgain}>Play again</button>
          <button type="button" className="btn btn-ghost-light" onClick={onChangeRound}>Change round</button>
        </div>
      </div>
    </div>
  );
}

function Stat({ bg, label, n }: { bg: string; label: string; n: number }) {
  return (
    <div style={{ background: bg, color: 'var(--ink)', border: '2px solid var(--ink)', borderRadius: 14, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
      <span className="serif" style={{ fontSize: 30, lineHeight: 1 }}>{n}</span>
    </div>
  );
}

// ---- empty state ----

function Empty({ mode, round, onFix, onChange }: { mode: 'round' | 'review'; round: Round; onFix: (p: Partial<Round>) => void; onChange: () => void }) {
  if (mode === 'review') {
    return (
      <Message role="status" art="好" kicker="全部复习完 · all caught up" title="Nothing due today" body="Every word you’ve studied is scheduled for later. Play a normal round to learn something new.">
        <button type="button" className="btn btn-dark" onClick={() => go('flashcards')}>Play a round <Icon.Arrow /></button>
        <button type="button" className="btn" onClick={() => go('')}>Back home</button>
      </Message>
    );
  }
  const where = round.cat === 'all' ? 'your dictionary' : round.cat;
  let body: string, fix: Partial<Round>, fixLabel: string;
  if (round.level === 'hard') { body = `There are no new words in ${where} right now. Hard rounds only use words you haven’t studied yet.`; fix = { level: 'medium' }; fixLabel = 'Play Medium instead'; }
  else if (round.level === 'easy') { body = `You haven’t studied any words in ${where} yet. Easy rounds only use words you’ve already seen.`; fix = { level: 'medium' }; fixLabel = 'Play Medium instead'; }
  else { body = `There aren’t any words in ${where} yet. Add some in Notion, or mix every topic.`; fix = { cat: 'all' }; fixLabel = 'Play all topics'; }
  if (round.level !== 'medium' || round.cat !== 'all') {
    return (
      <Message role="status" art="空" kicker="空空的 · nothing here" title="No words for this round" body={body}>
        <button type="button" className="btn btn-dark" onClick={() => onFix(fix)}>{fixLabel} <Icon.Arrow /></button>
        <button type="button" className="btn" onClick={onChange}>Change round</button>
      </Message>
    );
  }
  return (
    <Message role="status" art="空" kicker="空空的 · nothing here" title="Your dictionary is empty" body="Add words to the 词典 database in Notion and they’ll show up here.">
      <button type="button" className="btn" onClick={() => go('')}>Back home</button>
    </Message>
  );
}
