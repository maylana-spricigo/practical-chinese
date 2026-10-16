import { useState } from 'react';
import { back } from '../App';
import { Icon, SectionHead, Sheet } from '../components';
import { LENGTHS, LEVELS, loadSettings, saveSettings, type StudySettings } from '../lib/settings';
import { TOPICS } from '../../shared/types';

const ALL = { name: 'all', label: 'All topics', zh: '全部' };

export default function Settings() {
  const [s, setS] = useState<StudySettings>(loadSettings);
  const [allOpen, setAllOpen] = useState(false);
  const set = (patch: Partial<StudySettings>) => setS((x) => ({ ...x, ...patch }));

  const top = TOPICS.slice(0, 8);
  const picked = TOPICS.find((t) => t.name === s.cat);
  const visible = picked && !top.includes(picked) ? [...top.slice(0, 7), picked] : top;

  const tile = (name: string, label: string, zh: string) => (
    <button key={name} type="button" className="choice" aria-pressed={s.cat === name} onClick={() => set({ cat: name })}
      style={{ minWidth: 0, height: 58, borderRadius: 12, padding: '0 2px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      <span className="hz" style={{ fontSize: 18, lineHeight: 1 }}>{zh}</span>
      <span style={{ fontSize: 11.5, fontWeight: 600, lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{label}</span>
    </button>
  );

  return (
    <main className="screen">
      <div className="scroll pad" style={{ gap: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: -12 }}>
          <button type="button" className="icon-btn" aria-label="Back without saving" onClick={back}><Icon.Back /></button>
          <p className="hand accent tilt" style={{ margin: 0, fontSize: 17 }}>defaults for every game</p>
        </div>

        <header style={{ background: 'var(--sage)', border: '2px solid var(--ink)', borderRadius: 22, padding: '20px 18px 20px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h1 className="serif" style={{ margin: 0, fontSize: 32, lineHeight: 1 }}>Study settings</h1>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}><span className="hz" style={{ fontWeight: 400 }}>学习设置</span> · xuéxí shèzhì</p>
          </div>
          <svg width="80" height="67" viewBox="0 0 96 80" fill="none" aria-hidden="true" style={{ flex: 'none' }}>
            <rect x="8" y="8" width="72" height="64" rx="10" fill="#F8F3EA" stroke="#1C1A18" strokeWidth="2.4" />
            <path d="M20 26 H68 M20 40 H68 M20 54 H68" stroke="#1C1A18" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="34" cy="26" r="6" fill="#EE6A2C" stroke="#1C1A18" strokeWidth="2.4" />
            <circle cx="56" cy="40" r="6" fill="#F2BAC0" stroke="#1C1A18" strokeWidth="2.4" />
            <circle cx="28" cy="54" r="6" fill="#1C1A18" stroke="#1C1A18" strokeWidth="2.4" />
          </svg>
        </header>

        <section className="sec" aria-labelledby="cat-h">
          <SectionHead id="cat-h" title="Category" right={
            <button type="button" onClick={() => setAllOpen(true)} className="pill" style={{ minHeight: 36, background: 'transparent', fontSize: 13 }}>All 16 topics <Icon.Chevron /></button>
          } />
          <div role="group" aria-labelledby="cat-h" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {tile(ALL.name, ALL.label, ALL.zh)}
            {visible.map((t) => tile(t.name, t.name, t.zh))}
          </div>
        </section>

        <section className="sec" aria-labelledby="lvl-h">
          <SectionHead id="lvl-h" title="Difficulty" zh="难度" py="nándù" />
          <div role="radiogroup" aria-labelledby="lvl-h" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {LEVELS.map((l) => (
              <button key={l.id} type="button" role="radio" className="choice" aria-checked={s.level === l.id} onClick={() => set({ level: l.id })}
                style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, textAlign: 'left' }}>
                <span className="serif" style={{ fontSize: 19, lineHeight: 1 }}>{l.name}</span>
                <span style={{ fontSize: 13, lineHeight: 1.25, whiteSpace: 'nowrap' }}>{l.desc}</span>
                <span style={{ display: 'flex', width: '100%', height: 9, border: '1.5px solid currentColor', borderRadius: 6, overflow: 'hidden', background: 'var(--orange)' }}>
                  <span style={{ width: l.known, background: 'var(--sage)', borderRight: l.known === '50%' ? '1.5px solid #1C1A18' : 'none' }} />
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="sec" aria-labelledby="len-h">
          <SectionHead id="len-h" title="Round length" zh="长度" py="chángdù" />
          <div role="radiogroup" aria-labelledby="len-h" className="seg" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            {LENGTHS.map((n) => (
              <button key={n.id} type="button" role="radio" aria-checked={s.len === n.id} onClick={() => set({ len: n.id })}
                style={{ height: 52, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1 }}>{n.name}</span>
                <span style={{ fontSize: 12, lineHeight: 1, opacity: 0.8 }}>{n.time}</span>
              </button>
            ))}
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>{LENGTHS.find((n) => n.id === s.len)?.note}</p>
        </section>

        <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.4, background: 'var(--paper)', border: '1.5px dashed var(--ink)', borderRadius: 12, padding: '10px 12px' }}>
          Each game starts from these and then remembers its own choices. Help options (pinyin, extra tiles, audio) live inside each game — tap the sliders button at the top while playing.
        </p>

        <button type="button" className="btn btn-dark" style={{ marginTop: 'auto' }} onClick={() => { saveSettings(s); back(); }}>
          Save settings <Icon.Check size={20} color="#EE6A2C" />
        </button>
      </div>

      {allOpen && (
        <Sheet label="All topics" onClose={() => setAllOpen(false)}>
          <SectionHead title="All topics" zh="全部主题" py="quánbù zhǔtí" />
          <button type="button" className="choice" aria-pressed={s.cat === 'all'} onClick={() => set({ cat: 'all' })} style={{ height: 52, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span className="hz" style={{ fontSize: 18 }}>全部</span><span style={{ fontSize: 14, fontWeight: 600 }}>All topics</span>
          </button>
          <div role="group" aria-label="Topics" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
            {TOPICS.map((t) => tile(t.name, t.name, t.zh))}
          </div>
          <button type="button" className="btn btn-dark" onClick={() => setAllOpen(false)}>Done</button>
        </Sheet>
      )}
    </main>
  );
}
