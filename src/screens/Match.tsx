import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { go } from '../App';
import { Icon, SectionHead, Sheet } from '../components';
import { GameTopBar, PracticeDone } from '../components/game';
import { ErrorState, Loading, Message } from '../components/states';
import { ApiError, fetchRound } from '../lib/api';
import { addActivity, addRound } from '../lib/history';
import { LEVELS, loadSettings, saveSettings, type StudySettings } from '../lib/settings';
import { speak } from '../lib/speak';
import { enqueue, useSync } from '../lib/sync';
import { read, write } from '../lib/storage';
import { localToday } from '../../shared/srs';
import { PAIRS_SIZE, TOPICS, type Word } from '../../shared/types';
import KeyPrompt from './KeyPrompt';

type Side = 'hz' | 'en' | 'py' | 'au';
const PAIRS = [
  { id: 'hz_mean', name: 'Hanzi · Meaning', desc: '茶 ↔ tea', short: 'Hanzi–Meaning', l: 'hz', r: 'en', instr: 'tap a character, then its meaning', cols: '汉字 · English' },
  { id: 'hz_py', name: 'Hanzi · Pinyin', desc: '茶 ↔ chá', short: 'Hanzi–Pinyin', l: 'hz', r: 'py', instr: 'tap a character, then its pinyin', cols: '汉字 · pīnyīn' },
  { id: 'py_mean', name: 'Pinyin · Meaning', desc: 'chá ↔ tea', short: 'Pinyin–Meaning', l: 'py', r: 'en', instr: 'tap the pinyin, then its meaning', cols: 'pīnyīn · English' },
  { id: 'audio_hz', name: 'Listen · Hanzi', desc: '🔈 ↔ 茶', short: 'Listen–Hanzi', l: 'au', r: 'hz', instr: 'tap to listen, then pick the character', cols: 'sound · 汉字' },
] as const;
type PairId = (typeof PAIRS)[number]['id'];

const shuffle = <T,>(a: T[]) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const GAP = 12;
const MID = 54;

export default function Match() {
  const [settings, setSettings] = useState<StudySettings>(loadSettings);
  const [phase, setPhase] = useState<'loading' | 'error' | 'empty' | 'play' | 'done'>('loading');
  const [error, setError] = useState<ApiError | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [left, setLeft] = useState<number[]>([]);
  const [right, setRight] = useState<number[]>([]);
  const [selL, setSelL] = useState<number | null>(null);
  const [selR, setSelR] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [missed, setMissed] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<{ l: number; r: number } | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [pairType, setPairType] = useState<PairId>(() => read<PairId>('pc.pairType', 'hz_mean'));
  const [sheet, setSheet] = useState(false);
  const [reload, setReload] = useState(0);
  const sync = useSync();
  const PT = PAIRS.find((p) => p.id === pairType) ?? PAIRS[0];

  const start = (ids: number[]) => {
    setLeft(shuffle(ids)); setRight(shuffle(ids));
    setSelL(null); setSelR(null); setMatched(new Set()); setMissed(new Set()); setWrong(null); setMistakes(0);
    setPhase('play');
  };

  useEffect(() => {
    let live = true;
    setPhase('loading');
    fetchRound({ mode: 'round', topic: settings.cat, level: settings.level, len: settings.len, count: PAIRS_SIZE[settings.len] })
      .then((r) => {
        if (!live) return;
        // Distinct meanings and pinyin so every pair has exactly one match.
        const seen = new Set<string>();
        const ws = r.words.filter((w) => w.en && w.py && !seen.has(w.en.toLowerCase() + '|' + w.hz) && seen.add(w.en.toLowerCase() + '|' + w.hz));
        setWords(ws);
        if (ws.length < 2) { setPhase('empty'); return; }
        start(ws.map((_, k) => k));
      })
      .catch((e) => { if (live) { setError(e); setPhase('error'); } });
    return () => { live = false; };
  }, [settings, reload]);

  // ---- layout: tiles fill the space, lines are drawn between their centers ----
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
  const tileH = Math.max(44, Math.min(84, (box.h - GAP * (n - 1)) / n));
  const colW = (box.w - MID) / 2;
  const cy = (i: number) => i * (tileH + GAP) + tileH / 2;

  const check = (l: number, r: number) => {
    setSelL(null); setSelR(null);
    if (l === r) {
      const m = new Set(matched); m.add(l);
      setMatched(m);
      enqueue({ type: 'practice', kind: 'word', id: words[l].id, correct: !missed.has(l), today: localToday() });
      addActivity();
      if (m.size === left.length) setTimeout(() => { setPhase('done'); addRound(); }, 600);
    } else {
      setMissed((s) => new Set(s).add(l));
      setMistakes((x) => x + 1);
      setWrong({ l, r });
      setTimeout(() => setWrong(null), 650);
    }
  };
  const pickL = (k: number) => {
    if (wrong || matched.has(k)) return;
    if (PT.l === 'hz' || PT.l === 'au') speak(words[k].hz);
    if (selR !== null) check(k, selR); else setSelL(selL === k ? null : k);
  };
  const pickR = (k: number) => {
    if (wrong || matched.has(k)) return;
    if (PT.r === 'hz') speak(words[k].hz);
    if (selL !== null) check(selL, k); else setSelR(selR === k ? null : k);
  };

  const tileStyle = (k: number, side: 'l' | 'r') => {
    const st = matched.has(k) ? 'm' : wrong && wrong[side] === k ? 'w' : (side === 'l' ? selL : selR) === k ? 's' : '';
    return {
      bg: st === 'm' ? 'var(--sage)' : st === 'w' ? 'var(--orange)' : st === 's' ? 'var(--ink)' : 'var(--paper)',
      fg: st === 's' ? 'var(--cream)' : 'var(--ink)', op: st === 'm' ? 0.85 : 1, pressed: st === 's',
    };
  };
  const face = (w: Word, side: Side) => {
    if (side === 'hz') return <span lang="zh-Hans" className="hz" style={{ fontSize: w.hz.length > 3 ? 20 : 28, lineHeight: 1 }}>{w.hz}</span>;
    if (side === 'py') return <span style={{ fontWeight: 600, fontSize: 18 }}>{w.py}</span>;
    if (side === 'en') return <span className="hand" style={{ fontSize: w.en.length > 16 ? 16 : 19, lineHeight: 1.1 }}>{w.en}</span>;
    return <Icon.Speaker size={28} color="currentColor" />;
  };

  if (phase === 'error' && error?.status === 401) return <KeyPrompt onDone={() => setReload((x) => x + 1)} />;
  const topic = TOPICS.find((t) => t.name === settings.cat);
  const label = `${topic?.name ?? 'All topics'} · ${PT.short}`;
  const firstTry = [...matched].filter((k) => !missed.has(k)).length;

  return (
    <main className="screen">
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 16px calc(20px + var(--safe-bottom))' }}>
        <GameTopBar title={phase === 'play' || phase === 'done' ? <>{matched.size} <span style={{ fontWeight: 500, color: 'var(--grey)' }}>of {left.length} pairs</span></> : 'Match the Pairs'}
          label={label} progress={phase === 'loading' ? 'loading' : left.length ? matched.size / left.length : 0}
          onOptions={() => setSheet(true)} optionsDisabled={phase !== 'play'} />

        {phase === 'loading' && <Loading cards={false} line="finding pairs" zh="配对" sub="getting words from your dictionary" />}
        {phase === 'error' && <ErrorState error={error} onRetry={() => setReload((x) => x + 1)} />}
        {phase === 'empty' && (
          <Message role="status" art="空" kicker="空空的 · nothing here" title="Not enough words to match"
            body={`Match needs at least two words with a meaning in ${topic?.name ?? 'your dictionary'} for ${LEVELS.find((l) => l.id === settings.level)?.name} rounds.`}>
            {(settings.level !== 'medium' || settings.cat !== 'all') && <button type="button" className="btn btn-dark" onClick={() => { const nx = { ...settings, level: 'medium' as const, cat: 'all' }; saveSettings(nx); setSettings(nx); }}>Play all topics · Medium <Icon.Arrow /></button>}
            <button type="button" className="btn" onClick={() => go('settings')}>Change settings</button>
          </Message>
        )}

        {phase === 'play' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 2px', gap: 8 }}>
              <p className="hand accent" style={{ margin: 0, fontSize: 17 }}>{PT.instr}</p>
              <p className="muted" style={{ margin: 0, fontSize: 12, whiteSpace: 'nowrap' }}>{PT.cols}</p>
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
                {([['l', left, pickL, PT.l, 'Characters'], ['r', right, pickR, PT.r, 'Meanings']] as const).map(([side, ids, pick, kind, aria]) => (
                  <div key={side} role="group" aria-label={aria} style={{ width: colW, display: 'flex', flexDirection: 'column', gap: GAP }}>
                    {ids.map((k, i) => {
                      const t = tileStyle(k, side);
                      const w = words[k];
                      return (
                        <button key={k} type="button" onClick={() => pick(k)} aria-pressed={t.pressed} disabled={matched.has(k)}
                          aria-label={kind === 'au' ? `Play sound ${i + 1}` : kind === 'hz' ? `${w.hz}, ${w.py}` : undefined}
                          style={{ height: tileH, flex: 'none', padding: '0 8px', borderRadius: 14, border: '2px solid var(--ink)', background: t.bg, color: t.fg, opacity: t.op, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', transition: 'background .15s ease', overflow: 'hidden' }}>
                          {face(w, kind as Side)}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <Count bg="var(--sage)" label="First try" zh="一次对" n={firstTry} />
              <Count bg="var(--orange)" label="Mistakes" zh="错误" n={mistakes} />
            </div>
          </>
        )}

        {phase === 'done' && (
          <PracticeDone kicker="太好了 · all matched!" a={{ label: 'First try', n: firstTry }} b={{ label: 'Mistakes', n: mistakes }}
            listTitle="Words to practise" items={[...missed].map((k) => ({ top: words[k].hz, sub: `${words[k].py} · ${words[k].en}` }))}
            emptyMsg="全对！ no mistakes" retryLabel={`Retry the ${missed.size} I missed`} onRetry={() => start([...missed])}
            onPlayAgain={() => setReload((x) => x + 1)} sync={sync} />
        )}
      </div>

      {sheet && (
        <Sheet label="Pair type" onClose={() => setSheet(false)}>
          <SectionHead title="Pair type" zh="配对方式" py="pèiduì fāngshì" />
          <div role="radiogroup" aria-label="Pair type" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {PAIRS.map((p) => (
              <button key={p.id} type="button" role="radio" className="choice" aria-checked={p.id === pairType}
                onClick={() => { if (p.id === pairType) return; setPairType(p.id); write('pc.pairType', p.id); start(words.map((_, k) => k)); }}
                style={{ minHeight: 64, padding: '10px 12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 4, textAlign: 'left' }}>
                <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.1 }}>{p.name}</span>
                <span style={{ fontSize: 12, lineHeight: 1.2, opacity: 0.8 }}>{p.desc}</span>
              </button>
            ))}
          </div>
          <p className="hand muted" style={{ margin: 0, fontSize: 15, textAlign: 'center' }}>changing the pair type starts a new round</p>
          <button type="button" className="btn btn-dark" onClick={() => setSheet(false)}>Done</button>
          <button type="button" onClick={() => go('settings')} style={{ minHeight: 44, border: 'none', background: 'transparent', fontSize: 13, color: 'var(--grey)' }}>
            Category, difficulty &amp; length live in <span style={{ fontWeight: 600, color: 'var(--ink)', textDecoration: 'underline' }}>Study settings</span>
          </button>
        </Sheet>
      )}
    </main>
  );
}

function Count({ bg, label, zh, n }: { bg: string; label: string; zh: string; n: number }) {
  return (
    <div style={{ minHeight: 56, borderRadius: 14, border: '2px solid var(--ink)', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px' }}>
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}><span className="hand" style={{ fontSize: 18 }}>{label}</span><span lang="zh-Hans" className="hz" style={{ fontSize: 13, fontWeight: 400 }}>{zh}</span></span>
      <span className="serif" style={{ fontSize: 26 }}>{n}</span>
    </div>
  );
}
