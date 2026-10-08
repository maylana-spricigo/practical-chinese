import type { ReactNode } from 'react';

export const Icon = {
  Back: () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M12.5 4 L6 10 L12.5 16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  Chevron: ({ size = 14 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7.5 4 L14 10 L7.5 16" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  Sliders: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7 H20 M4 17 H20" stroke="#1C1A18" strokeWidth="2.2" strokeLinecap="round" /><circle cx="9" cy="7" r="2.6" fill="#F8F3EA" stroke="#1C1A18" strokeWidth="2.2" /><circle cx="15" cy="17" r="2.6" fill="#EE6A2C" stroke="#1C1A18" strokeWidth="2.2" /></svg>,
  Speaker: ({ size = 22, color = '#1C1A18' }: { size?: number; color?: string }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 9.5 H7.5 L12 5.5 V18.5 L7.5 14.5 H4 Z" fill={color} /><path d="M15.5 9 C17 10.5 17 13.5 15.5 15 M18 6.5 C21 9.5 21 14.5 18 17.5" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>,
  Flip: ({ size = 26 }: { size?: number }) => <svg width={size} height={size * 0.85} viewBox="0 0 26 22" fill="none" aria-hidden="true"><path d="M4 12 C4 6 9 3 14 3 C18 3 21 5 22 8 M22 3 V8 H17" stroke="#D2541A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /><path d="M22 12 C22 17 17 19 12 19 C8 19 5 17.5 4 15" stroke="#D2541A" strokeWidth="2.2" strokeLinecap="round" /></svg>,
  Check: ({ size = 12, color = 'currentColor' }: { size?: number; color?: string }) => <svg width={size} height={size * 0.8} viewBox="0 0 20 16" fill="none" aria-hidden="true"><path d="M2 8.5 L7 13 L18 2.5" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  Arrow: ({ color = '#EE6A2C', left = false }: { color?: string; left?: boolean }) => <svg width="26" height="14" viewBox="0 0 26 14" fill="none" aria-hidden="true" style={left ? { transform: 'scaleX(-1)' } : undefined}><path d="M2 7 C9 6 16 7 23 7 M18 2 L23 7 L18 12" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
};

const TAB_ICONS: Record<string, ReactNode> = {
  practice: <><path d="M5 19 L15 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /><path d="M5 19 C4 21 6 22 8 20 L9 18 Z" fill="currentColor" /><path d="M14 13 C16 12 18 13 20 12 M17 7 L20 4 M19 9 L22 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>,
  dictionary: <><path d="M12 20 C9 18.5 6 18.5 3 19 L3 6 C6 5.5 9 5.5 12 7 Z M12 20 C15 18.5 18 18.5 21 19 L21 6 C18 5.5 15 5.5 12 7 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M15 10 L18 10 M15 13 L18 13 M6 10 L9 10 M7.5 8.5 L7.5 14 M6 14 L9 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></>,
  bookshelf: <><rect x="3" y="15" width="16" height="5" rx="1" stroke="currentColor" strokeWidth="2" /><rect x="5" y="9.5" width="14" height="5.5" rx="1" stroke="currentColor" strokeWidth="2" /><rect x="3.5" y="4" width="13" height="5.5" rx="1" stroke="currentColor" strokeWidth="2" /><path d="M21 20 L21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>,
  progress: <><path d="M3 20 L21 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M5 16 L10 11 L13 14 L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /><path d="M15 6.5 L19.5 6.5 L19.5 11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></>,
};
export const TABS = [
  { key: 'practice', label: 'Practice', route: '' },
  { key: 'dictionary', label: 'Dictionary', route: 'dictionary' },
  { key: 'bookshelf', label: 'Bookshelf', route: 'bookshelf' },
  { key: 'progress', label: 'Progress', route: 'progress' },
] as const;

export function TabBar({ active, go }: { active: string; go: (route: string) => void }) {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => (
        <button key={t.key} type="button" aria-current={active === t.key ? 'page' : undefined} onClick={() => go(t.route)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">{TAB_ICONS[t.key]}</svg>
          {t.label}
        </button>
      ))}
    </nav>
  );
}

export function SectionHead({ id, title, zh, py, right }: { id?: string; title: string; zh?: string; py?: string; right?: ReactNode }) {
  return (
    <div className="sec-head">
      <h2 id={id}>{title}</h2>
      {right ?? (zh ? <p><span className="hz" style={{ fontWeight: 400 }}>{zh}</span> · {py}</p> : null)}
    </div>
  );
}

export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label}>{children}</div>
    </div>
  );
}

export function ToggleTile({ on, name, desc, onClick }: { on: boolean; name: string; desc: string; onClick: () => void }) {
  return (
    <button type="button" className="choice" aria-pressed={on} onClick={onClick} style={{ padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, textAlign: 'left' }}>
      <span style={{ width: 20, height: 20, borderRadius: 6, border: '2px solid currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{on && <Icon.Check />}</span>
      <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.15 }}>{name}</span>
      <span style={{ fontSize: 12, lineHeight: 1.2, opacity: 0.8 }}>{desc}</span>
    </button>
  );
}

export function StatusPill({ status }: { status: 'New' | 'Learning' | 'Known' }) {
  const bg = status === 'New' ? 'var(--orange)' : status === 'Learning' ? 'var(--pink)' : 'var(--sage)';
  return <span className="pill" style={{ background: bg, color: 'var(--ink)', padding: '2px 8px', fontSize: 11 }}>{status}</span>;
}
