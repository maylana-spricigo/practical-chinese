import { useEffect, useState } from 'react';
import { go } from '../App';
import { Icon, ToggleTile } from '../components';
import { GameTopBar, PracticeDone, RoundSheet, roundLabel, useRound } from '../components/game';
import { ErrorState, Loading, Message } from '../components/states';
import { addActivity, addRound } from '../lib/history';
import { tilesPinyin } from '../lib/py';
import { useGameOptions, type Round } from '../lib/settings';
import { speak } from '../lib/speak';
import { useStore } from '../lib/store';
import { enqueue, useSync } from '../lib/sync';
import { localToday } from '../../shared/srs';
import { pickSentences } from '../../shared/rounds';
import { SENTENCE_SIZE, type Sentence } from '../../shared/types';
import KeyPrompt from './KeyPrompt';

type Game = 'build' | 'ask';
interface Item { s: Sentence; tiles: { t: string; p: string; real: boolean }[]; order: number[]; end: string }

const shuffle = <T,>(a: T[]) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const PUNCT = /^[。，、！？.,!?；;：:\s…“”"'（）()]+$/;
const strip = (x: string) => x.replace(/[。，、！？.,!?；;：:\s…“”"'（）()]/g, '');

// Build follows the exam (连词成句): only the sentence's own words, no punctuation tiles.
// Ask can add the "Distractors" from Notion as extra tiles.
function makeItem(s: Sentence, game: Game): Item {
  const words = s.tokens.filter((t) => !PUNCT.test(t));
  const extras = game === 'ask' ? s.distractors.filter((t) => !PUNCT.test(t)) : [];
  const py = tilesPinyin(s.hz, [...words, ...extras]);
  const tiles = [...words.map((t, k) => ({ t, p: py[k], real: true })), ...extras.map((t, k) => ({ t, p: py[words.length + k], real: false }))];
  const last = s.tokens.length ? s.tokens[s.tokens.length - 1] : '';
  const end = PUNCT.test(last) ? last : (/[。！？?!.]$/.test(s.hz) ? s.hz.slice(-1) : '');
  let order = shuffle(tiles.map((_, k) => k));
  if (order.every((k, i) => k === i) && order.length > 1) order = [...order.slice(1), order[0]]; // never start solved
  return { s, tiles, order, end };
}

export default function Sentences({ game }: { game: Game }) {
  const { round, epoch, again, apply } = useRound(game);
  const store = useStore('sentences');
  const ready = !!store.items;
  const [phase, setPhase] = useState<'loading' | 'error' | 'empty' | 'play' | 'done'>('loading');
  const [items, setItems] = useState<Item[]>([]);
  const [queue, setQueue] = useState<number[]>([]);
  const [i, setI] = useState(0);
  const [placed, setPlaced] = useState<number[]>([]);
  const [result, setResult] = useState<null | 'right' | 'wrong'>(null);
  const [right, setRight] = useState(0);
  const [missed, setMissed] = useState<number[]>([]);
  const [logged, setLogged] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState(false);
  const [help, setHelpOpt] = useGameOptions(game, { focus: true, pinyin: false, extra: game === 'ask', audio: false });
  const sync = useSync();

  const start = (q: number[]) => { setQueue(q); setI(0); setPlaced([]); setResult(null); setRight(0); setMissed([]); setPhase('play'); };

  useEffect(() => {
    if (!ready) return;
    const r = pickSentences(store.items!, { game, topic: round.cat, level: round.level, count: SENTENCE_SIZE[round.len] });
    const its = r.sentences.map((x) => makeItem(x, game)).filter((x) => x.tiles.filter((t) => t.real).length > 1);
    setItems(its);
    setLogged(new Set());
    if (!its.length) { setPhase('empty'); return; }
    start(its.map((_, k) => k));
  }, [ready, epoch]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!ready && store.error) setPhase('error'); }, [ready, store.error]);

  const item = phase === 'play' ? items[queue[i]] : undefined;
  useEffect(() => { if (item && game === 'build' && help.audio) speak(item.s.hz); }, [item?.s.id, i]); // eslint-disable-line react-hooks/exhaustive-deps

  if (store.error?.status === 401) return <KeyPrompt onDone={() => void store.retry()} />;

  const isBuild = game === 'build';
  const label = roundLabel(round);
  const total = queue.length;
  const bank = item ? item.order.filter((k) => (help.extra && !isBuild) || item.tiles[k].real) : [];
  const placedBg = result === 'right' ? 'var(--sage)' : result === 'wrong' ? 'var(--orange)' : 'var(--ink)';
  const placedFg = result ? 'var(--ink)' : 'var(--cream)';

  const check = () => {
    if (!item || result || !placed.length) return;
    const answer = strip(placed.map((k) => item.tiles[k].t).join(''));
    const ok = answer === strip(item.s.tokens.join('')) || (item.s.alts ?? []).some((a) => strip(a) === answer);
    setResult(ok ? 'right' : 'wrong');
    if (ok) { setRight((x) => x + 1); speak(item.s.hz); } else setMissed((m) => [...m, queue[i]]);
    if (!logged.has(item.s.id)) {
      setLogged((l) => new Set(l).add(item.s.id));
      enqueue({ type: 'practice', kind: 'sentence', id: item.s.id, correct: ok, today: localToday() });
    }
    addActivity();
  };
  const next = () => {
    const ni = i + 1;
    setPlaced([]); setResult(null); setI(ni);
    if (ni >= total) { setPhase('done'); addRound(); }
  };

  const Tile = ({ k, inAnswer, pos }: { k: number; inAnswer?: boolean; pos?: number }) => {
    const t = item!.tiles[k];
    const used = !inAnswer && placed.includes(k);
    return (
      <button type="button" disabled={!!result || used}
        aria-label={inAnswer ? `Remove ${t.t}` : t.t}
        onClick={() => {
          if (result) return;
          if (inAnswer) setPlaced((p) => p.filter((_, j) => j !== pos));
          else setPlaced((p) => [...p, k]);
        }}
        style={{ minWidth: 52, height: 58, padding: '0 10px', borderRadius: 12, border: '2px solid var(--ink)', background: inAnswer ? placedBg : 'var(--paper)', color: inAnswer ? placedFg : 'var(--ink)', opacity: used ? 0.25 : 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <span lang="zh-Hans" className="hz" style={{ fontSize: 22, lineHeight: 1 }}>{t.t}</span>
        <span style={{ fontSize: 11, lineHeight: 1, minHeight: 11, color: inAnswer ? undefined : 'var(--grey)' }}>{help.pinyin ? t.p : ''}</span>
      </button>
    );
  };

  const focusSplit = (s: Sentence) => {
    const f = s.focus && s.hz.includes(s.focus) ? s.focus : '';
    if (!f) return [s.hz, '', ''];
    const at = s.hz.indexOf(f);
    return [s.hz.slice(0, at), f, s.hz.slice(at + f.length)];
  };

  return (
    <main className="screen">
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 16px calc(20px + var(--safe-bottom))', overflowY: 'auto' }}>
        <GameTopBar title={phase === 'play' || phase === 'done' ? <>{isBuild ? 'Sentence' : 'Question'} {Math.min(i + 1, total)} <span style={{ fontWeight: 500, color: 'var(--grey)' }}>of {total}</span></> : isBuild ? 'Build the Sentence' : 'Ask the Question'}
          label={label} progress={phase === 'loading' ? 'loading' : total ? Math.min(i, total) / total : 0}
          onOptions={() => setSheet(true)} optionsDisabled={phase === 'loading'} />

        {phase === 'loading' && <Loading cards={false} line={isBuild ? 'cutting up sentences' : 'thinking of questions'} zh="句子" sub="getting sentences from Notion" />}
        {phase === 'error' && <ErrorState error={store.error} what="sentences" onRetry={() => void store.retry()} />}
        {phase === 'empty' && (
          <Message role="status" art="句" kicker="空空的 · nothing here" title={isBuild ? 'No sentences yet' : 'No questions yet'}
            body={isBuild
              ? `Add sentences to the 句子 database in Notion${round.cat !== 'all' ? ` tagged ${round.cat}` : ''}. Fill “Tokens” with the words, separated by |.`
              : `Ask the Question needs questions in 句子 with an “Answers” link to the statement that answers them${round.cat !== 'all' ? `, tagged ${round.cat}` : ''}.`}>
            <button type="button" className="btn" onClick={() => setSheet(true)}>Change round</button>
            <button type="button" className="btn" onClick={() => go('')}>Back home</button>
          </Message>
        )}

        {phase === 'play' && item && (
          <>
            {isBuild ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '0 2px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <p className="serif" style={{ margin: 0, fontSize: 22, lineHeight: 1.1 }}>Put the words in order</p>
                  <p className="muted" style={{ margin: 0, fontSize: 13 }}><span className="hz" style={{ fontWeight: 400 }}>连词成句</span> · liáncí chéngjù · {item.tiles.filter((t) => t.real).length} words</p>
                </div>
                {help.audio && <button type="button" onClick={() => speak(item.s.hz)} className="pill" style={{ flex: 'none', minHeight: 40, background: 'var(--paper)', fontSize: 13, borderWidth: 2 }}><Icon.Speaker size={16} /> listen</button>}
              </div>
            ) : (
              <>
                <div style={{ background: 'var(--paper)', border: '2px solid var(--ink)', borderRadius: 20, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <p className="hand accent" style={{ margin: 0, fontSize: 16 }}>the answer is…</p>
                    {item.s.answer && <button type="button" onClick={() => speak(item.s.answer!.hz)} className="pill" style={{ minHeight: 36, background: 'transparent', fontSize: 13 }}><Icon.Speaker size={16} /> listen</button>}
                  </div>
                  {item.s.answer && (() => {
                    const [a, f, b] = focusSplit(item.s.answer);
                    return (
                      <p lang="zh-Hans" className="hz" style={{ margin: 0, fontSize: 30, lineHeight: 1.3 }}>
                        {a}<span style={help.focus && f ? { background: 'var(--pink)', borderBottom: '3px solid var(--orange)', padding: '0 2px' } : undefined}>{f}</span>{b}
                      </p>
                    );
                  })()}
                  <p style={{ margin: 0, fontSize: 14, color: '#3E3A35' }}>{item.s.answer?.en}</p>
                </div>
                <p className="hand" style={{ margin: 0, fontSize: 18 }}>Ask the question{help.focus && item.s.answer?.focus ? ' about the highlighted part' : ''} · <span className="muted">{item.s.en}</span></p>
              </>
            )}

            <div aria-label="Your sentence" style={{ minHeight: isBuild ? 150 : 132, border: '2px dashed var(--ink)', borderRadius: 18, padding: 12, display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start', gap: 8, background: 'rgba(248,243,234,0.5)' }}>
              {!placed.length && <p className="hand muted" style={{ margin: 'auto', fontSize: 17 }}>tap the tiles in order</p>}
              {placed.map((k, pos) => <Tile key={`${k}-${pos}`} k={k} inAnswer pos={pos} />)}
              {item.end && placed.length > 0 && placed.length === item.tiles.filter((t) => t.real).length && <span lang="zh-Hans" aria-hidden="true" className="hz" style={{ alignSelf: 'flex-end', fontSize: 24, lineHeight: 1.6 }}>{item.end}</span>}
            </div>

            <div aria-label="Tiles" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 'auto' }}>
              {bank.map((k) => <Tile key={k} k={k} />)}
            </div>

            {!result && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                <button type="button" className="btn" onClick={() => setPlaced([])}>Clear</button>
                <button type="button" className="btn btn-dark" disabled={!placed.length} onClick={check}>Check</button>
              </div>
            )}
            {result === 'right' && (
              <div role="status" style={{ background: 'var(--sage)', border: '2px solid var(--ink)', borderRadius: 18, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p className="hand" style={{ margin: 0, fontWeight: 700, fontSize: 19 }}>很好！ that’s right</p>
                  <button type="button" onClick={() => speak(item.s.hz)} aria-label="Play sentence" style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid var(--ink)', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon.Speaker size={20} /></button>
                </div>
                <p style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontSize: 14, fontWeight: 600 }}>{item.s.py}</span><span style={{ fontSize: 14 }}>{item.s.en}</span></p>
                <button type="button" className="btn btn-dark" onClick={next}>Next →</button>
              </div>
            )}
            {result === 'wrong' && (
              <div role="status" style={{ background: 'var(--orange)', border: '2px solid var(--ink)', borderRadius: 18, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p className="hand" style={{ margin: 0, fontWeight: 700, fontSize: 19 }}>差一点 · not quite</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Correct {isBuild ? 'sentence' : 'question'}</p>
                <p lang="zh-Hans" className="hz" style={{ margin: 0, fontSize: 22, lineHeight: 1.2 }}>{item.s.hz}</p>
                <p style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontSize: 14, fontWeight: 600 }}>{item.s.py}</span><span style={{ fontSize: 14 }}>{item.s.en}</span></p>
                <button type="button" className="btn btn-dark" onClick={next}>Next →</button>
              </div>
            )}
          </>
        )}

        {phase === 'done' && (
          <PracticeDone kicker={isBuild ? '太棒了 · well built!' : '太棒了 · great questions!'}
            a={{ label: 'Correct', n: right }} b={{ label: 'To review', n: missed.length }}
            listTitle={isBuild ? 'Sentences to practise' : 'Questions to practise'}
            items={missed.map((k) => ({ top: items[k].s.hz, sub: [items[k].s.py, items[k].s.en].filter(Boolean).join(' · ') }))}
            emptyMsg="全对！ every one right" retryLabel={`Retry the ${missed.length} I missed`} onRetry={() => start(missed)}
            onPlayAgain={again} onChangeRound={() => setSheet(true)} sync={sync} />
        )}
      </div>

      {sheet && (
        <RoundSheet game={game} title={isBuild ? 'Build the Sentence' : 'Ask the Question'} zh={isBuild ? '连词成句' : '提问'} py={isBuild ? 'liáncí chéngjù' : 'tíwèn'}
          round={round} onClose={() => setSheet(false)} onApply={(r: Round) => { apply(r); setSheet(false); }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isBuild ? 2 : 3}, minmax(0, 1fr))`, gap: 8 }}>
            {!isBuild && <ToggleTile on={help.focus} name="Highlight" desc="the part to ask about" onClick={() => setHelpOpt({ focus: !help.focus })} />}
            <ToggleTile on={help.pinyin} name="Pinyin" desc="under each tile" onClick={() => setHelpOpt({ pinyin: !help.pinyin })} />
            {!isBuild && <ToggleTile on={help.extra} name="Extra tiles" desc="words that don’t fit" onClick={() => { setHelpOpt({ extra: !help.extra }); if (item) setPlaced((p) => p.filter((k) => item.tiles[k].real)); }} />}
            {isBuild && <ToggleTile on={help.audio} name="Listen first" desc="hear the sentence" onClick={() => setHelpOpt({ audio: !help.audio })} />}
          </div>
        </RoundSheet>
      )}
    </main>
  );
}
