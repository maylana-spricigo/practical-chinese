import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { go } from '../App';
import { Icon, ToggleTile } from '../components';
import { GameTopBar, PracticeDone, RoundSheet, roundLabel, useRound } from '../components/game';
import { ErrorState, Loading, Message } from '../components/states';
import { addActivity, addRound } from '../lib/history';
import { useGameOptions, type Round } from '../lib/settings';
import { speak } from '../lib/speak';
import { patchWord, useStore } from '../lib/store';
import { enqueue, useSync } from '../lib/sync';
import { localToday } from '../../shared/srs';
import { lessonList, pickPartners, shuffle, type Partner } from '../../shared/rounds';
import { PAIRS_SIZE } from '../../shared/types';
import KeyPrompt from './KeyPrompt';

// Word Partners (搭配 dāpèi): which words go together — 喝 → 茶, 坐 → 公共汽车.
// Pairs come from "Goes with" in the 词典 database.
const GAP = 12;
const MID = 54;

export default function Partners() {
  const { round, epoch, again, apply } = useRound('partners');
  const store = useStore('words');
  const ready = !!store.items;
  const [phase, setPhase] = useState<'loading' | 'error' | 'empty' | 'play' | 'done'>('loading');
  const [pairs, setPairs] = useState<Partner[]>([]);
  const [left, setLeft] = useState<number[]>([]);
  const [right, setRight] = useState<number[]>([]);
  const [selL, setSelL] = useState<number | null>(null);
  const [selR, setSelR] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [missed, setMissed] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<{ l: number; r: number } | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [opt, setOpt] = useGameOptions('partners', { pinyin: false, meaning: false });
  const sync = useSync();

  const start = (ids: number[]) => {
    setLeft(shuffle(ids)); setRight(shuffle(ids));
    setSelL(null); setSelR(null); setMatched(new Set()); setMissed(new Set()); setWrong(null); setMistakes(0);
    setPhase('play');
  };

  useEffect(() => {
    if (!ready) return;
    const r = pickPartners(store.items!, { topic: round.cat, lessons: round.lessons, level: round.level, count: PAIRS_SIZE[round.len] });
    setPairs(r.pairs);
    if (r.pairs.length < 2) { setPhase('empty'); return; }
    start(r.pairs.map((_, k) => k));
  }, [ready, epoch]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!ready && store.error) setPhase('error'); }, [ready, store.error]);

  const area = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 358, h: 454 });
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [phase]);
  const n = left.length || 1;
  const tileH = Math.max(48, Math.min(84, (box.h - GAP * (n - 1)) / n));
  const colW = (box.w - MID) / 2;
  const cy = (i: number) => i * (tileH + GAP) + tileH / 2;

  const check = (l: number, r: number) => {
    setSelL(null); setSelR(null);
    if (l === r) {
      const m = new Set(matched); m.add(l);
      setMatched(m);
      const a = pairs[l].a;
      speak(a.hz + pairs[l].b.hz);
      enqueue({ type: 'practice', kind: 'word', id: a.id, correct: !missed.has(l), today: localToday() });
      patchWord(a.id, missed.has(l) ? { timesForgot: a.timesForgot + 1 } : { timesKnown: a.timesKnown + 1 });
      addActivity();
      if (m.size === left.length) setTimeout(() => { setPhase('done'); addRound(); }, 700);
    } else {
      setMissed((s) => new Set(s).add(l));
      setMistakes((x) => x + 1);
      setWrong({ l, r });
      setTimeout(() => setWrong(null), 650);
    }
  };
  const pickL = (k: number) => {
    if (wrong || matched.has(k)) return;
    speak(pairs[k].a.hz);
    if (selR !== null) check(k, selR); else setSelL(selL === k ? null : k);
  };
  const pickR = (k: number) => {
    if (wrong || matched.has(k)) return;
    speak(pairs[k].b.hz);
    if (selL !== null) check(selL, k); else setSelR(selR === k ? null : k);
  };

  const tileStyle = (k: number, side: 'l' | 'r') => {
    const st = matched.has(k) ? 'm' : wrong && wrong[side] === k ? 'w' : (side === 'l' ? selL : selR) === k ? 's' : '';
    return {
      bg: st === 'm' ? 'var(--sage)' : st === 'w' ? 'var(--orange)' : st === 's' ? 'var(--ink)' : 'var(--paper)',
      fg: st === 's' ? 'var(--cream)' : 'var(--ink)', op: st === 'm' ? 0.85 : 1, pressed: st === 's',
    };
  };

  if (store.error?.status === 401) return <KeyPrompt onDone={() => void store.retry()} />;
  const firstTry = [...matched].filter((k) => !missed.has(k)).length;

  return (
    <main className="screen">
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 16px calc(20px + var(--safe-bottom))' }}>
        <GameTopBar title={phase === 'play' || phase === 'done' ? <>{matched.size} <span style={{ fontWeight: 500, color: 'var(--grey)' }}>of {left.length} pairs</span></> : 'Word Partners'}
          label={roundLabel(round)} progress={phase === 'loading' ? 'loading' : left.length ? matched.size / left.length : 0}
          onOptions={() => setSheet(true)} optionsDisabled={phase === 'loading'} />

        {phase === 'loading' && <Loading cards={false} line="finding partners" zh="搭配" sub="getting words from your dictionary" />}
        {phase === 'error' && <ErrorState error={store.error} onRetry={() => void store.retry()} />}
        {phase === 'empty' && (
          <Message role="status" art="搭" kicker="空空的 · nothing here" title="No word partners yet"
            body={`Open a word in the 词典 database in Notion (a verb like 喝) and fill “Goes with” with the words it combines with (茶, 水).${round.cat !== 'all' || round.level !== 'medium' ? ' Or try all topics at Medium.' : ''}`}>
            {(round.level !== 'medium' || round.cat !== 'all' || !!round.lessons?.length) && <button type="button" className="btn btn-dark" onClick={() => apply({ ...round, level: 'medium', cat: 'all', lessons: [] })}>Play everything · Medium <Icon.Arrow /></button>}
            <button type="button" className="btn" onClick={() => go('')}>Back home</button>
          </Message>
        )}

        {phase === 'play' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 2px', gap: 8 }}>
              <p className="hand accent" style={{ margin: 0, fontSize: 17 }}>tap a word, then its partner</p>
              <p className="muted" style={{ margin: 0, fontSize: 12, whiteSpace: 'nowrap' }}><span className="hz" style={{ fontWeight: 400 }}>搭配</span> · dāpèi</p>
            </div>
            <div ref={area} style={{ position: 'relative', flex: 1, minHeight: 0 }}>
              <svg width={box.w} height={box.h} viewBox={`0 0 ${box.w} ${box.h}`} fill="none" aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                {[...matched].map((k) => {
                  const yL = cy(left.indexOf(k)), yR = cy(right.indexOf(k)), x1 = colW, x2 = box.w - colW, mx = (x1 + x2) / 2;
                  return (
                    <g key={k}>
                      <path d={`M${x1} ${yL} C${mx} ${yL} ${mx} ${yR} ${x2} ${yR}`} stroke="#1C1A18" strokeWidth="2.5" strokeLinecap="round" />
                      <circle cx={x1} cy={yL} r="4" fill="#1C1A18" /><circle cx={x2} cy={yR} r="4" fill="#1C1A18" />
                    </g>
                  );
                })}
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between' }}>
                {([['l', left, pickL, 'a', 'Words'], ['r', right, pickR, 'b', 'Partners']] as const).map(([side, ids, pick, which, aria]) => (
                  <div key={side} role="group" aria-label={aria} style={{ width: colW, display: 'flex', flexDirection: 'column', gap: GAP }}>
                    {ids.map((k) => {
                      const t = tileStyle(k, side);
                      const w = pairs[k][which];
                      const sub = [opt.pinyin && w.py, opt.meaning && w.en].filter(Boolean).join(' · ');
                      return (
                        <button key={k} type="button" onClick={() => pick(k)} aria-pressed={t.pressed} disabled={matched.has(k)} aria-label={`${w.hz}, ${w.py}`}
                          style={{ height: tileH, flex: 'none', padding: '0 8px', borderRadius: 14, border: '2px solid var(--ink)', background: t.bg, color: t.fg, opacity: t.op, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, textAlign: 'center', transition: 'background .15s ease', overflow: 'hidden' }}>
                          <span lang="zh-Hans" className="hz" style={{ fontSize: w.hz.length > 3 ? 20 : 26, lineHeight: 1 }}>{w.hz}</span>
                          {sub && <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.8, lineHeight: 1.1 }}>{sub}</span>}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <p className="hand muted" style={{ margin: 0, textAlign: 'center', fontSize: 15 }}>a right pair is read aloud · 喝茶 hē chá</p>
          </>
        )}

        {phase === 'done' && (
          <PracticeDone kicker="太好了 · great partners!" a={{ label: 'First try', n: firstTry }} b={{ label: 'Mistakes', n: mistakes }}
            listTitle="Pairs to practise" items={[...missed].map((k) => ({ top: pairs[k].a.hz + pairs[k].b.hz, sub: `${pairs[k].a.py} ${pairs[k].b.py} · ${pairs[k].a.en} + ${pairs[k].b.en}` }))}
            emptyMsg="全对！ no mistakes" retryLabel={`Retry the ${missed.size} I missed`} onRetry={() => start([...missed])}
            onPlayAgain={again} onChangeRound={() => setSheet(true)} sync={sync} />
        )}
      </div>

      {sheet && (
        <RoundSheet lessons={store.items ? lessonList(store.items) : []} game="partners" title="Word Partners" zh="搭配" py="dāpèi" round={round} onClose={() => setSheet(false)} onApply={(r: Round) => { apply(r); setSheet(false); }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            <ToggleTile on={opt.pinyin} name="Pinyin" desc="under each word" onClick={() => setOpt({ pinyin: !opt.pinyin })} />
            <ToggleTile on={opt.meaning} name="Meaning" desc="English under each word" onClick={() => setOpt({ meaning: !opt.meaning })} />
          </div>
        </RoundSheet>
      )}
    </main>
  );
}
