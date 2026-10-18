import { useState, type ReactNode } from 'react';
import { go } from '../App';
import { Icon, Sheet } from '../components';
import { DEMO } from '../lib/api';
import { LEVELS, loadRound, loadSettings, saveRound, type Round } from '../lib/settings';
import type { useSync } from '../lib/sync';
import { GAME_COUNTS, GAME_UNIT, TOPICS, type Game } from '../../shared/types';

/** The round a game plays (remembered per game) and a counter that starts a new round when it changes. */
export function useRound(game: Game) {
  const [round, setRound] = useState<Round>(() => loadRound(game));
  const [epoch, setEpoch] = useState(0);
  return {
    round, epoch,
    again: () => setEpoch((n) => n + 1),
    apply: (r: Round) => { saveRound(game, r); setRound(r); setEpoch((n) => n + 1); },
  };
}

export const roundLabel = (r: Round, extra?: string) =>
  [r.lessons?.length ? r.lessons.join(' + ') + (r.cat === 'all' ? '' : ` · ${r.cat}`) : r.cat === 'all' ? 'All topics' : r.cat, extra ?? LEVELS.find((l) => l.id === r.level)?.name].filter(Boolean).join(' · ');

const sameSet = (a: string[] = [], b: string[] = []) => a.length === b.length && a.every((x) => b.includes(x));

const TOPIC_CHIPS = [{ name: 'all', zh: '全部', label: 'All topics' }, ...[...TOPICS].sort((a, b) => a.name.localeCompare(b.name)).map((t) => ({ ...t, label: t.name }))];

/** Round settings sheet used by every game: this game's round + the in-game options passed as children. */
export function RoundSheet({ game, title, zh, py, round, lessons, onApply, onClose, children }: {
  game: Game; title: string; zh: string; py: string; round: Round; onApply: (r: Round) => void; onClose: () => void; children?: ReactNode;
  /** Lessons to choose from (word games only). */
  lessons?: string[];
}) {
  const [d, setD] = useState<Round>(round);
  const changed = d.cat !== round.cat || d.level !== round.level || d.len !== round.len || !sameSet(d.lessons, round.lessons);
  const picked = d.lessons ?? [];
  const toggleLesson = (l: string) => setD({ ...d, lessons: picked.includes(l) ? picked.filter((x) => x !== l) : [...picked, l] });
  const counts = GAME_COUNTS[game];
  const label = { fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' as const, color: 'var(--grey)', margin: 0 };
  const sub = (z: string, p: string) => <span style={{ fontWeight: 500, color: 'var(--grey)' }}><span className="hz" style={{ fontWeight: 400 }}>{z}</span> · {p}</span>;
  return (
    <Sheet label={`${title} options`} onClose={onClose}>
      <div className="sec-head"><h2>{title}</h2><p><span className="hz" style={{ fontWeight: 400 }}>{zh}</span> · {py}</p></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 14, borderBottom: '1.5px dashed var(--ink)' }}>
        <p style={label}>This game’s round</p>
        {lessons && lessons.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span>Lessons {sub('课', 'kè')}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--grey)' }}>{picked.length ? `${picked.length} picked` : 'pick one or more'}</span>
            </p>
            <div role="group" aria-label="Lessons" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button type="button" className="pill choice" aria-pressed={!picked.length} onClick={() => setD({ ...d, lessons: [] })} style={{ height: 36, fontSize: 13, borderRadius: 999 }}>All lessons</button>
              {lessons.map((l) => (
                <button key={l} type="button" className="pill choice" aria-pressed={picked.includes(l)} onClick={() => toggleLesson(l)} style={{ height: 36, minWidth: 44, justifyContent: 'center', fontSize: 13, borderRadius: 999 }}>{l}</button>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Topic {sub('类别', 'lèibié')}</p>
          <div className="scroll" role="group" aria-label="Topic" style={{ flexDirection: 'row', gap: 6, overflowX: 'auto', overflowY: 'hidden', margin: '0 -16px', padding: '2px 16px' }}>
            {TOPIC_CHIPS.map((t) => (
              <button key={t.name} type="button" className="pill choice" aria-pressed={d.cat === t.name} onClick={() => setD({ ...d, cat: t.name })} style={{ height: 36, fontSize: 13, borderRadius: 999 }}>
                <span className="hz" style={{ fontSize: 14 }}>{t.zh}</span>{t.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Difficulty {sub('难度', 'nándù')}</p>
          <div role="radiogroup" aria-label="Difficulty" className="seg" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            {LEVELS.map((l) => (
              <button key={l.id} type="button" role="radio" aria-checked={d.level === l.id} onClick={() => setD({ ...d, level: l.id })} style={{ height: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1 }}>{l.name}</span>
                <span style={{ fontSize: 11, lineHeight: 1, opacity: 0.8 }}>{l.desc.toLowerCase()}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Round length {sub('长度', 'chángdù')}</p>
          <div role="radiogroup" aria-label="Round length" className="seg" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            {(['short', 'medium', 'long'] as const).map((id) => (
              <button key={id} type="button" role="radio" aria-checked={d.len === id} onClick={() => setD({ ...d, len: id })} style={{ height: 48, fontSize: 14, fontWeight: 600 }}>
                {counts[id]} {GAME_UNIT[game]}
              </button>
            ))}
          </div>
        </div>
        {changed && <p className="hand accent" style={{ margin: 0, fontSize: 15 }}>changing these starts a new round</p>}
      </div>
      {children && <><p style={label}>During the game</p>{children}</>}
      <button type="button" className="btn btn-dark" onClick={() => (changed ? onApply(d) : onClose())}>{changed ? 'Start new round' : 'Done'}</button>
      <button type="button" onClick={() => setD({ ...loadSettings(), lessons: [] })} style={{ minHeight: 44, border: 'none', background: 'transparent', fontSize: 13, color: 'var(--grey)' }}>
        Reset to <span style={{ fontWeight: 600, color: 'var(--ink)', textDecoration: 'underline' }}>Study settings</span> defaults
      </button>
    </Sheet>
  );
}

export function GameTopBar({ title, label, progress, onOptions, optionsDisabled }: {
  title: ReactNode; label: string; progress: number | 'loading'; onOptions?: () => void; optionsDisabled?: boolean;
}) {
  const loading = progress === 'loading';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button type="button" className="icon-btn" aria-label="Back to home" onClick={() => go('')}><Icon.Back /></button>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <p className="serif" style={{ margin: 0, fontSize: 18, lineHeight: 1, whiteSpace: 'nowrap' }}>{title}</p>
          <p className="muted" style={{ margin: 0, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</p>
        </div>
        <div role="progressbar" aria-label="Round progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={loading ? undefined : Math.round(progress * 100)} style={{ height: 10, border: '2px solid var(--ink)', borderRadius: 6, overflow: 'hidden', background: 'var(--paper)', display: 'flex' }}>
          <span className={loading ? 'pulse' : ''} style={{ width: loading ? '100%' : `${progress * 100}%`, background: loading ? 'var(--sand)' : 'var(--ink)', transition: 'width .3s ease' }} />
        </div>
      </div>
      {onOptions && <button type="button" className="icon-btn" aria-label="Round options" disabled={optionsDisabled} onClick={onOptions}><Icon.Sliders /></button>}
    </div>
  );
}

export function SyncLabel({ sync }: { sync: ReturnType<typeof useSync> }) {
  const label = DEMO ? 'demo · not saved' : sync.status === 'failed' ? 'not synced yet' : sync.status === 'auth' ? 'check app key' : sync.pending ? 'saving…' : 'saved to Notion';
  const ok = label === 'saved to Notion';
  return (
    <p role="status" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: ok ? '#CFE0C4' : 'var(--pink)' }}>
      {ok && <Icon.Check color="#CFE0C4" />}{label}
      {(sync.status === 'failed' || sync.status === 'auth') && !DEMO && <button type="button" onClick={sync.retry} style={{ marginLeft: 6, border: '1.5px solid var(--pink)', borderRadius: 999, background: 'transparent', color: 'var(--pink)', fontSize: 11, fontWeight: 700, padding: '2px 8px' }}>retry</button>}
    </p>
  );
}

export function PracticeDone({ kicker, a, b, listTitle, items, emptyMsg, retryLabel, onRetry, onPlayAgain, onChangeRound, sync }: {
  kicker: string; a: { label: string; n: number }; b: { label: string; n: number }; listTitle: string;
  items: { top: string; sub: string }[]; emptyMsg: string; retryLabel?: string; onRetry?: () => void; onPlayAgain: () => void; onChangeRound: () => void; sync: ReturnType<typeof useSync>;
}) {
  return (
    <div style={{ flex: 1, minHeight: 0, background: 'var(--green)', color: 'var(--cream)', border: '2px solid var(--ink)', borderRadius: 24, padding: '22px 18px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <p className="hand tilt" style={{ margin: 0, fontSize: 18, color: 'var(--pink)' }}>{kicker}</p>
        <SyncLabel sync={sync} />
      </div>
      <h2 className="serif" style={{ margin: 0, fontSize: 34, lineHeight: 1 }}>Round complete</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
        {[{ ...a, bg: 'var(--sage)' }, { ...b, bg: 'var(--orange)' }].map((s) => (
          <div key={s.label} style={{ background: s.bg, color: 'var(--ink)', border: '2px solid var(--ink)', borderRadius: 14, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{s.label}</span>
            <span className="serif" style={{ fontSize: 30, lineHeight: 1 }}>{s.n}</span>
          </div>
        ))}
      </div>
      <section aria-label={listTitle} style={{ flex: 1, minHeight: 0, background: 'var(--cream)', color: 'var(--ink)', border: '2px solid var(--ink)', borderRadius: 16, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <p className="serif" style={{ margin: 0, fontSize: 18 }}>{listTitle}</p>
          <p className="hand accent" style={{ margin: 0, fontSize: 15 }}>{items.length ? `${items.length} to go over` : 'perfect round'}</p>
        </div>
        {items.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '7px 0', borderTop: '1.5px dashed rgba(28,26,24,0.3)' }}>
            <span lang="zh-Hans" className="hz" style={{ fontSize: 18, lineHeight: 1.2 }}>{m.top}</span>
            <span style={{ fontSize: 13, color: '#3E3A35' }}>{m.sub}</span>
          </div>
        ))}
        {!items.length && <p className="hand" style={{ margin: 'auto 0', padding: '12px 0', textAlign: 'center', fontSize: 18 }}>{emptyMsg}</p>}
        <p className="muted" style={{ margin: 'auto 0 0', paddingTop: 6, fontSize: 12 }}>Logged as practice · word levels only change in Flashcards</p>
      </section>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.length > 0 && onRetry && <button type="button" className="btn btn-light" onClick={onRetry}>{retryLabel}</button>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <button type="button" className="btn btn-ghost-light" onClick={onPlayAgain}>Play again</button>
          <button type="button" className="btn btn-ghost-light" onClick={onChangeRound}>Change round</button>
        </div>
      </div>
    </div>
  );
}


