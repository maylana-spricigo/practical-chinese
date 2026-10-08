import { useEffect, useState } from 'react';
import { go } from '../App';
import { Icon } from '../components';
import { ART } from '../illustrations';
import { ApiError, DEMO, fetchStats } from '../lib/api';
import { streak, thisWeek } from '../lib/history';
import { LENGTHS, LEVELS, useSettings } from '../lib/settings';
import { useSync } from '../lib/sync';
import { TOPICS, type Stats } from '../../shared/types';
import KeyPrompt from './KeyPrompt';

export default function Home() {
  const [settings] = useSettings();
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState<ApiError | null>(null);
  const [reload, setReload] = useState(0);
  const sync = useSync();

  useEffect(() => {
    let live = true;
    setErr(null);
    fetchStats().then((s) => live && setStats(s)).catch((e) => live && setErr(e));
    return () => { live = false; };
  }, [reload, sync.pending === 0]);

  if (err?.status === 401) return <KeyPrompt onDone={() => setReload((n) => n + 1)} />;

  const topic = TOPICS.find((t) => t.name === settings.cat);
  const helpBits = [settings.help.pinyin && 'Pinyin', settings.help.extra && 'Extra tiles', settings.help.audio && 'Auto-play'].filter(Boolean);
  const week = thisWeek();
  const days = streak();
  const due = stats?.due ?? 0;

  return (
    <main className="screen">
      <div className="scroll" style={{ padding: '28px 16px 28px', gap: 28 }}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 4px 0' }}>
          <h1 className="serif" style={{ margin: 0, fontSize: 46, lineHeight: 0.98, letterSpacing: '-0.5px' }}>Practical<br />Chinese</h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <p className="hand accent" style={{ margin: 0, fontSize: 22 }}>one word at a time.</p>
            <svg width="210" height="10" viewBox="0 0 210 10" fill="none" aria-hidden="true"><path d="M2 7 C50 2 110 3 208 5" stroke="#EE6A2C" strokeWidth="2.5" strokeLinecap="round" /></svg>
          </div>
          {DEMO && <span className="pill" style={{ alignSelf: 'flex-start', background: 'var(--pink)' }}>demo mode · sample words</span>}
        </header>

        {/* Today */}
        <section aria-labelledby="today-h" style={{ background: 'var(--green)', color: 'var(--cream)', border: '2px solid var(--ink)', borderRadius: 22, padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <p className="hand" style={{ margin: 0, fontSize: 17, color: 'var(--pink)' }}>today · <span className="hz" style={{ fontWeight: 400 }}>今天</span></p>
              <h2 id="today-h" style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span className={`serif ${stats ? '' : 'pulse'}`} style={{ fontSize: 52, lineHeight: 0.9 }}>{stats ? due : err ? '–' : '··'}</span>
                <span style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 20, lineHeight: 1.1 }}>{due === 1 ? 'word' : 'words'}<br />to review</span>
              </h2>
            </div>
            <span className="pill" style={{ background: 'var(--cream)', color: 'var(--ink)', border: '2px solid var(--ink)', fontSize: 13, padding: '6px 12px 6px 8px' }}>
              <svg width="18" height="20" viewBox="0 0 18 20" fill="none" aria-hidden="true"><path d="M9 1 C10 5 15 7 15 12.5 C15 16.5 12.5 19 9 19 C5.5 19 3 16.5 3 13 C3 10 5 8.5 6 6.5 C7 9 8 9.5 8.5 9.5 C8.5 6.5 8 4 9 1 Z" fill={days ? '#EE6A2C' : '#E6DFD3'} stroke="#1C1A18" strokeWidth="1.8" strokeLinejoin="round" /></svg>
              {days}-day streak
            </span>
          </div>
          <div aria-label={`This week: studied ${week.filter((d) => d.done).length} days`} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
            {week.map((d, i) => (
              <span key={i} aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 30, height: 30, borderRadius: '50%', border: `2px solid ${d.isToday ? '#EE6A2C' : d.done ? '#1C1A18' : 'rgba(243,237,227,0.45)'}`, background: d.done ? 'var(--sage)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {d.done && <Icon.Check size={14} color="#1C1A18" />}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: d.isToday ? 'var(--pink)' : '#E6DFD3' }}>{d.label}</span>
              </span>
            ))}
          </div>
          {err ? (
            <>
              <p role="alert" style={{ margin: 0, fontSize: 13, lineHeight: 1.35, color: 'var(--pink)' }}>Couldn’t reach Notion: {err.message || 'no connection'}</p>
              <button type="button" className="btn btn-light" onClick={() => setReload((n) => n + 1)}>Try again</button>
            </>
          ) : (
            <button type="button" className="btn btn-light" disabled={!stats || due === 0} onClick={() => go('review')}>
              {stats && due === 0 ? 'All caught up 好' : <>Review now <Icon.Arrow color="#D2541A" /></>}
            </button>
          )}
        </section>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 4px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h2 className="serif" style={{ margin: 0, fontSize: 30, lineHeight: 1 }}>Exercises</h2>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}><span className="hz" style={{ fontWeight: 400 }}>练习</span> · liànxí</p>
          </div>
          <p className="hand accent" style={{ margin: '0 0 4px', fontSize: 17, transform: 'rotate(-4deg)' }}>pick a game ↓</p>
        </div>

        {/* Study settings */}
        <button type="button" onClick={() => go('settings')} aria-label="Edit your study settings" style={{ marginTop: -12, background: 'var(--paper)', border: '2px solid var(--ink)', borderRadius: 18, padding: '14px 14px 14px 16px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <span className="serif" style={{ fontSize: 18, lineHeight: 1 }}>Your study settings</span>
              <span className="muted" style={{ fontSize: 12 }}><span className="hz" style={{ fontWeight: 400 }}>设置</span> · shèzhì</span>
            </span>
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <span className="pill" style={{ fontSize: 13 }}><span className="hz">{topic?.zh ?? '全部'}</span> {topic?.name ?? 'All topics'}</span>
              <span className="pill" style={{ fontSize: 13 }}>{LEVELS.find((l) => l.id === settings.level)?.name}</span>
              <span className="pill" style={{ fontSize: 13 }}>{LENGTHS.find((l) => l.id === settings.len)?.name}</span>
              <span className="pill" style={{ fontSize: 13 }}>{helpBits.length ? helpBits.join(' · ') : 'No help'}</span>
            </span>
          </span>
          <span aria-hidden="true" className="icon-btn" style={{ background: 'var(--cream)' }}><Icon.Sliders /></span>
        </button>

        <section aria-label="Games" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <GameCard art="flashcards" bg="var(--orange)" title="Flashcards" zh="单词卡" py="dāncí kǎ" desc="Flip, recall and review the words you’re learning." onPlay={() => go('flashcards')} />
          <GameCard art="match" bg="var(--pink)" title="Match the Pairs" zh="配对" py="pèiduì" desc="Connect each character to its meaning." />
          <GameCard art="build" bg="var(--paper)" title="Build the Sentence" zh="连词成句" py="liáncí chéngjù" desc="Put the words in the right order." />
          <GameCard art="ask" bg="var(--green)" dark title="Ask the Question" zh="提问" py="tíwèn" desc="Read the answer, then build the question." />
        </section>
      </div>
    </main>
  );
}

function GameCard({ art, bg, dark, title, zh, py, desc, onPlay }: { art: string; bg: string; dark?: boolean; title: string; zh: string; py: string; desc: string; onPlay?: () => void }) {
  return (
    <article style={{ background: bg, color: dark ? 'var(--cream)' : 'var(--ink)', border: '2px solid var(--ink)', borderRadius: 24, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <span aria-hidden="true" style={{ display: 'block', lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: ART[art] }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h3 className="serif" style={{ margin: 0, fontSize: 28, lineHeight: 1 }}>{title}</h3>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: dark ? '#E6DFD3' : undefined }}><span className="hz" style={{ fontWeight: 400 }}>{zh}</span> · {py}</p>
          <p style={{ margin: '4px 0 0', fontSize: 14, lineHeight: 1.35, maxWidth: 190, color: dark ? '#E6DFD3' : undefined }}>{desc}</p>
        </div>
        {onPlay ? (
          <button type="button" onClick={onPlay} style={{ minHeight: 44, padding: '0 18px', borderRadius: 10, border: '2px solid var(--ink)', background: dark ? 'var(--cream)' : 'var(--ink)', color: dark ? 'var(--ink)' : 'var(--cream)', fontFamily: 'var(--hand)', fontSize: 18, whiteSpace: 'nowrap' }}>Play →</button>
        ) : (
          <span className="pill" style={{ borderColor: dark ? 'var(--cream)' : 'var(--ink)', fontFamily: 'var(--hand)', fontSize: 15, fontWeight: 400 }}>soon</span>
        )}
      </div>
    </article>
  );
}
