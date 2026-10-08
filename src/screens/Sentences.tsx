import { useEffect, useMemo, useState } from 'react';
import { go } from '../App';
import { Icon, SectionHead, Sheet, ToggleTile } from '../components';
import { GameTopBar, PracticeDone } from '../components/game';
import { ErrorState, Loading, Message } from '../components/states';
import { ApiError, fetchSentences } from '../lib/api';
import { addActivity, addRound } from '../lib/history';
import { tilePinyin } from '../lib/py';
import { LEVELS, loadSettings } from '../lib/settings';
import { speak } from '../lib/speak';
import { enqueue, useSync } from '../lib/sync';
import { localToday } from '../../shared/srs';
import { SENTENCE_SIZE, TOPICS, type Sentence } from '../../shared/types';
import KeyPrompt from './KeyPrompt';

type Game = 'build' | 'ask';
interface Item { s: Sentence; tiles: { t: string; p: string; real: boolean }[]; order: number[] }

const shuffle = <T,>(a: T[]) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const strip = (x: string) => x.replace(/[。，、！？.,!?\s]/g, '');

function makeItem(s: Sentence): Item {
  const tiles = [...s.tokens.map((t) => ({ t, p: tilePinyin(t), real: true })), ...s.distractors.map((t) => ({ t, p: tilePinyin(t), real: false }))];
  let order = shuffle(tiles.map((_, k) => k));
  if (order.every((k, i) => k === i) && order.length > 1) order = [...order.slice(1), order[0]]; // never start solved
  return { s, tiles, order };
}

export default function Sentences({ game }: { game: Game }) {
  const settings = useMemo(loadSettings, []);
  const [phase, setPhase] = useState<'loading' | 'error' | 'empty' | 'play' | 'done'>('loading');
  const [error, setError] = useState<ApiError | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [queue, setQueue] = useState<number[]>([]);
  const [i, setI] = useState(0);
  const [placed, setPlaced] = useState<number[]>([]);
  const [result, setResult] = useState<null | 'right' | 'wrong'>(null);
  const [right, setRight] = useState(0);
  const [missed, setMissed] = useState<number[]>([]);
  const [logged, setLogged] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState(false);
  const [help, setHelp] = useState({ focus: true, pinyin: settings.help.pinyin, extra: settings.help.extra, audio: settings.help.audio });
  const [reload, setReload] = useState(0);
  const sync = useSync();

  const start = (q: number[]) => { setQueue(q); setI(0); setPlaced([]); setResult(null); setRight(0); setMissed([]); setPhase('play'); };

  useEffect(() => {
    let live = true;
    setPhase('loading');
    fetchSentences({ game, topic: settings.cat, level: settings.level, count: SENTENCE_SIZE[settings.len] })
      .then((r) => {
        if (!live) return;
        const its = r.sentences.map(makeItem);
        setItems(its);
        setLogged(new Set());
        if (!its.length) { setPhase('empty'); return; }
        start(its.map((_, k) => k));
      })
      .catch((e) => { if (live) { setError(e); setPhase('error'); } });
    return () => { live = false; };
  }, [game, settings, reload]);

  const item = phase === 'play' ? items[queue[i]] : undefined;
  useEffect(() => { if (item && game === 'build' && help.audio) speak(item.s.hz); }, [item?.s.id, i]); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'error' && error?.status === 401) return <KeyPrompt onDone={() => setReload((x) => x + 1)} />;

  const isBuild = game === 'build';
  const topic = TOPICS.find((t) => t.name === settings.cat);
  const label = `${topic?.name ?? 'All topics'} · ${LEVELS.find((l) => l.id === settings.level)?.name}`;
  const total = queue.length;
  const bank = item ? item.order.filter((k) => help.extra || item.tiles[k].real) : [];
  const placedBg = result === 'right' ? 'var(--sage)' : result === 'wrong' ? 'var(--orange)' : 'var(--ink)';
  const placedFg = result ? 'var(--ink)' : 'var(--cream)';

  const check = () => {
    if (!item || result || !placed.length) return;
    const ok = strip(placed.map((k) => item.tiles[k].t).join('')) === strip(item.s.tokens.join(''));
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
          onOptions={() => setSheet(true)} optionsDisabled={phase !== 'play'} />

        {phase === 'loading' && <Loading cards={false} line={isBuild ? 'cutting up sentences' : 'thinking of questions'} zh="句子" sub="getting sentences from Notion" />}
        {phase === 'error' && <ErrorState error={error} what="sentences" onRetry={() => setReload((x) => x + 1)} />}
        {phase === 'empty' && (
          <Message role="status" art="句" kicker="空空的 · nothing here" title={isBuild ? 'No sentences yet' : 'No questions yet'}
            body={isBuild
              ? `Add sentences to the 句子 database in Notion${topic ? ` tagged ${topic.name}` : ''}. Fill “Tokens” with the tiles, separated by |.`
              : `Ask the Question needs questions in 句子 with an “Answers” link to the statement that answers them${topic ? `, tagged ${topic.name}` : ''}.`}>
            <button type="button" className="btn" onClick={() => go('settings')}>Change settings</button>
            <button type="button" className="btn" onClick={() => go('')}>Back home</button>
          </Message>
        )}

        {phase === 'play' && item && (
          <>
            {isBuild ? (
              <div style={{ background: 'var(--paper)', border: '2px solid var(--ink)', borderRadius: 20, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <p className="hand accent" style={{ margin: 0, fontSize: 16 }}>say it in Chinese</p>
                  {help.audio && <button type="button" onClick={() => speak(item.s.hz)} className="pill" style={{ minHeight: 36, background: 'transparent', fontSize: 13 }}><Icon.Speaker size={16} /> listen</button>}
                </div>
                <p className="serif" style={{ margin: 0, fontSize: 26, lineHeight: 1.15 }}>{item.s.en}</p>
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

            <div aria-label="Your sentence" style={{ minHeight: 132, border: '2px dashed var(--ink)', borderRadius: 18, padding: 12, display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start', gap: 8, background: 'rgba(248,243,234,0.5)' }}>
              {!placed.length && <p className="hand muted" style={{ margin: 'auto', fontSize: 17 }}>tap the tiles in order</p>}
              {placed.map((k, pos) => <Tile key={`${k}-${pos}`} k={k} inAnswer pos={pos} />)}
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
                <p style={{ margin: 0, fontSize: 14 }}>{item.s.py}</p>
                <button type="button" className="btn btn-dark" onClick={next}>Next →</button>
              </div>
            )}
            {result === 'wrong' && (
              <div role="status" style={{ background: 'var(--orange)', border: '2px solid var(--ink)', borderRadius: 18, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p className="hand" style={{ margin: 0, fontWeight: 700, fontSize: 19 }}>差一点 · not quite</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Correct {isBuild ? 'sentence' : 'question'}</p>
                <p lang="zh-Hans" className="hz" style={{ margin: 0, fontSize: 22, lineHeight: 1.2 }}>{item.s.hz}</p>
                <p style={{ margin: 0, fontSize: 14 }}>{item.s.py}</p>
                <button type="button" className="btn btn-dark" onClick={next}>Next →</button>
              </div>
            )}
          </>
        )}

        {phase === 'done' && (
          <PracticeDone kicker={isBuild ? '太棒了 · well built!' : '太棒了 · great questions!'}
            a={{ label: 'Correct', n: right }} b={{ label: 'To review', n: missed.length }}
            listTitle={isBuild ? 'Sentences to practise' : 'Questions to practise'}
            items={missed.map((k) => ({ top: items[k].s.hz, sub: items[k].s.en }))}
            emptyMsg="全对！ every one right" retryLabel={`Retry the ${missed.length} I missed`} onRetry={() => start(missed)}
            onPlayAgain={() => setReload((x) => x + 1)} sync={sync} />
        )}
      </div>

      {sheet && (
        <Sheet label="Round options" onClose={() => setSheet(false)}>
          <SectionHead title="Round options" zh="提示" py="tíshì" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {!isBuild && <ToggleTile on={help.focus} name="Highlight" desc="the part to ask about" onClick={() => setHelp((h) => ({ ...h, focus: !h.focus }))} />}
            <ToggleTile on={help.pinyin} name="Pinyin" desc="under each tile" onClick={() => setHelp((h) => ({ ...h, pinyin: !h.pinyin }))} />
            <ToggleTile on={help.extra} name="Extra tiles" desc="words that don’t fit" onClick={() => { setHelp((h) => ({ ...h, extra: !h.extra })); if (item) setPlaced((p) => p.filter((k) => item.tiles[k].real)); }} />
            {isBuild && <ToggleTile on={help.audio} name="Listen first" desc="hear the sentence" onClick={() => setHelp((h) => ({ ...h, audio: !h.audio }))} />}
          </div>
          <button type="button" className="btn btn-dark" onClick={() => setSheet(false)}>Done</button>
          <button type="button" onClick={() => go('settings')} style={{ minHeight: 44, border: 'none', background: 'transparent', fontSize: 13, color: 'var(--grey)' }}>
            Category, difficulty &amp; length live in <span style={{ fontWeight: 600, color: 'var(--ink)', textDecoration: 'underline' }}>Study settings</span>
          </button>
        </Sheet>
      )}
    </main>
  );
}
