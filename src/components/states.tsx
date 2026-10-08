import type { ReactNode } from 'react';
import { go } from '../App';
import type { ApiError } from '../lib/api';

export function Loading({ line = 'shuffling your cards', sub = 'getting words from your dictionary', zh = '从词典取词', cards = true }: { line?: string; sub?: string; zh?: string; cards?: boolean }) {
  return (
    <div role="status" aria-live="polite" style={{ position: 'relative', flex: 1, minHeight: 360, maxHeight: 520 }}>
      {cards && <div aria-hidden="true" style={{ position: 'absolute', inset: '14px 10px -6px 10px', background: 'var(--sage)', border: '2px solid var(--ink)', borderRadius: 24, transform: 'rotate(3deg)' }} />}
      {cards && <div aria-hidden="true" style={{ position: 'absolute', inset: '8px 6px -2px 6px', background: 'var(--pink)', border: '2px solid var(--ink)', borderRadius: 24, transform: 'rotate(-2.5deg)' }} />}
      <div style={{ position: 'absolute', inset: 0, background: cards ? 'var(--paper)' : 'transparent', border: cards ? '2px solid var(--ink)' : 'none', borderRadius: 24, padding: '18px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
        <svg className="wobble" width="110" height="110" viewBox="0 0 120 120" fill="none" aria-hidden="true">
          <path d="M60 8 L60 78" stroke="#1C1A18" strokeWidth="7" strokeLinecap="round" /><path d="M60 10 L60 76" stroke="#C99A5B" strokeWidth="3" strokeLinecap="round" />
          <path d="M52 76 C50 92 54 104 60 112 C66 104 70 92 68 76 Z" fill="#1C1A18" />
          <path d="M22 30 L30 38 M16 52 L28 52 M98 30 L90 38 M104 52 L92 52" stroke="#EE6A2C" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
          <p className="hand" style={{ margin: 0, fontSize: 22 }}>{line}<span className="dot">.</span><span className="dot" style={{ animationDelay: '.2s' }}>.</span><span className="dot" style={{ animationDelay: '.4s' }}>.</span></p>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}><span className="hz" style={{ fontWeight: 400 }}>{zh}</span> · {sub}</p>
        </div>
      </div>
    </div>
  );
}

export function Message({ role, kicker, title, body, art, children }: { role: 'status' | 'alert'; kicker: string; title: string; body: string; art: string; children?: ReactNode }) {
  return (
    <>
      <div role={role} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center', padding: '0 12px' }}>
        <p className="hz" aria-hidden="true" style={{ margin: 0, fontSize: 72, lineHeight: 1, transform: 'rotate(-4deg)', background: 'var(--pink)', border: '2px solid var(--ink)', borderRadius: 16, padding: '10px 18px' }}>{art}</p>
        <p className="hand accent tilt" style={{ margin: 0, fontSize: 18 }}>{kicker}</p>
        <h1 className="serif" style={{ margin: 0, fontSize: 30, lineHeight: 1.05 }}>{title}</h1>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: '#3E3A35', maxWidth: 300 }}>{body}</p>
      </div>
      {children && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>}
    </>
  );
}

export function ErrorState({ error, onRetry, what = 'words' }: { error: ApiError | null; onRetry: () => void; what?: string }) {
  const offline = !error || error.status === 0;
  return (
    <Message role="alert" art="词" kicker="哎呀 · oops" title={`Couldn’t load your ${what}`}
      body={offline ? 'We couldn’t reach your Notion dictionary. Check your connection and try again — nothing you’ve learned is lost.' : `Notion said: ${error.message}. Try again in a moment.`}>
      <button type="button" className="btn btn-dark" onClick={onRetry}>Try again</button>
      <button type="button" className="btn" onClick={() => go('')}>Back home</button>
    </Message>
  );
}
