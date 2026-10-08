import type { ReactNode } from 'react';
import { go } from '../App';
import { Icon } from '../components';
import { DEMO } from '../lib/api';
import type { useSync } from '../lib/sync';

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

export function PracticeDone({ kicker, a, b, listTitle, items, emptyMsg, retryLabel, onRetry, onPlayAgain, sync }: {
  kicker: string; a: { label: string; n: number }; b: { label: string; n: number }; listTitle: string;
  items: { top: string; sub: string }[]; emptyMsg: string; retryLabel?: string; onRetry?: () => void; onPlayAgain: () => void; sync: ReturnType<typeof useSync>;
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
          <button type="button" className="btn btn-ghost-light" onClick={() => go('settings')}>Settings</button>
        </div>
      </div>
    </div>
  );
}

export function useRoundLabel(topicName: string | undefined, levelName: string | undefined, extra?: string) {
  return [topicName ?? 'All topics', extra ?? levelName].filter(Boolean).join(' · ');
}
