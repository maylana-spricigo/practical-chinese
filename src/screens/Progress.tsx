import { useEffect, useState } from 'react';
import { go } from '../App';
import { SectionHead } from '../components';
import { ErrorState, Loading } from '../components/states';
import { ApiError, fetchStats } from '../lib/api';
import { roundsPlayed, streak, weekActivity } from '../lib/history';
import { TOPICS, type FullStats } from '../../shared/types';
import KeyPrompt from './KeyPrompt';

const pct = (a: number, b: number) => (b ? `${(a / b) * 100}%` : '0%');

export default function Progress() {
  const [stats, setStats] = useState<FullStats | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    setError(null);
    fetchStats().then((s) => live && setStats(s)).catch((e) => live && setError(e));
    return () => { live = false; };
  }, [reload]);

  if (error?.status === 401) return <KeyPrompt onDone={() => setReload((n) => n + 1)} />;

  const week = weekActivity();
  const max = Math.max(1, ...week.map((d) => d.count));

  return (
    <main className="screen">
      <div className="scroll" style={{ padding: '24px 16px 24px', gap: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
          <div>
            <h1 className="serif" style={{ margin: 0, fontSize: 34, lineHeight: 1 }}>Progress</h1>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 14 }}><span className="hz" style={{ fontWeight: 400 }}>进度</span> · jìndù</p>
          </div>
          <p className="hand accent tilt" style={{ margin: '0 0 2px', fontSize: 17 }}>一步一步 · step by step</p>
        </div>

        {!stats && !error && <div style={{ display: 'flex', height: 420 }}><Loading cards={false} line="counting your words" sub="reading your dictionary" zh="数一数" /></div>}
        {error && <div style={{ display: 'flex', flexDirection: 'column', minHeight: 480, gap: 10 }}><ErrorState error={error} what="progress" onRetry={() => setReload((n) => n + 1)} /></div>}

        {stats && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              <Tile n={streak()} label="day streak" bg="var(--pink)" />
              <Tile n={roundsPlayed()} label="rounds played" bg="var(--paper)" />
              <Tile n={stats.byStatus.Known} label="words known" bg="var(--sage)" />
            </div>

            <button type="button" disabled={!stats.due} onClick={() => go('review')} style={{ background: 'var(--orange)', border: '2px solid var(--ink)', borderRadius: 18, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span className="serif" style={{ fontSize: 20, lineHeight: 1.1 }}>{stats.due ? `${stats.due} ${stats.due === 1 ? 'word' : 'words'} due today` : 'Nothing due today'}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{stats.due ? 'Words you forgot or haven’t seen in a while' : 'Everything you’ve studied is scheduled for later'}</span>
              </span>
              {stats.due > 0 && <span style={{ flex: 'none', minHeight: 44, padding: '0 14px', borderRadius: 10, background: 'var(--ink)', color: 'var(--cream)', display: 'flex', alignItems: 'center', fontFamily: 'var(--hand)', fontSize: 18 }}>Review →</span>}
            </button>

            <section className="sec" aria-labelledby="st-h" style={{ gap: 12 }}>
              <SectionHead id="st-h" title="Your words" right={<p>{stats.total} in your dictionary</p>} />
              <div role="img" aria-label={`${stats.byStatus.Known} known, ${stats.byStatus.Learning} learning, ${stats.byStatus.New} new`} style={{ height: 22, border: '2px solid var(--ink)', borderRadius: 8, overflow: 'hidden', display: 'flex', background: 'var(--paper)' }}>
                <span style={{ width: pct(stats.byStatus.Known, stats.total), background: 'var(--sage)' }} />
                <span style={{ width: pct(stats.byStatus.Learning, stats.total), background: 'var(--pink)', borderLeft: stats.byStatus.Known ? '2px solid var(--ink)' : 'none' }} />
                <span style={{ width: pct(stats.byStatus.New, stats.total), background: 'var(--orange)', borderLeft: stats.byStatus.Known + stats.byStatus.Learning ? '2px solid var(--ink)' : 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                {([['Known', 'var(--sage)'], ['Learning', 'var(--pink)'], ['New', 'var(--orange)']] as const).map(([k, c]) => (
                  <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}><span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid var(--ink)', background: c }} />{k}</span>
                    <span className="serif" style={{ fontSize: 24, lineHeight: 1 }}>{stats.byStatus[k]} <span className="muted" style={{ fontFamily: 'var(--sans)', fontWeight: 500, fontSize: 12 }}>{stats.total ? Math.round((stats.byStatus[k] / stats.total) * 100) : 0}%</span></span>
                  </div>
                ))}
              </div>
            </section>

            <section className="sec" aria-labelledby="wk-h" style={{ gap: 12 }}>
              <SectionHead id="wk-h" title="This week" right={<p>answers on this phone</p>} />
              <div role="img" aria-label={week.map((d) => `${d.label} ${d.count}`).join(', ')} style={{ background: 'var(--paper)', border: '2px solid var(--ink)', borderRadius: 16, padding: '14px 12px 10px', display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 8, alignItems: 'end', height: 150 }}>
                {week.map((d, i) => (
                  <div key={i} style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                    <span className="muted" style={{ fontSize: 11, fontWeight: 600 }}>{d.isToday && !d.count ? 'today' : d.count || ''}</span>
                    <span style={{ width: '100%', maxWidth: 28, height: d.count ? Math.max(6, Math.round((d.count / max) * 80)) : 6, border: '2px solid var(--ink)', borderRadius: '6px 6px 2px 2px', background: d.count ? 'var(--ink)' : 'transparent' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: d.isToday ? 'var(--orange-text)' : 'var(--ink)' }}>{d.label}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="sec" aria-labelledby="tp-h">
              <SectionHead id="tp-h" title="By topic" right={<p>known / total</p>} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {stats.byTopic.map((t) => (
                  <button key={t.topic} type="button" onClick={() => go(`dictionary?topic=${encodeURIComponent(t.topic)}`)} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 0', border: 'none', background: 'transparent', textAlign: 'left' }}>
                    <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', width: '100%' }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}><span className="hz" style={{ fontSize: 16 }}>{TOPICS.find((x) => x.name === t.topic)?.zh}</span> {t.topic}</span>
                      <span className="muted" style={{ fontSize: 13 }}>{t.Known} / {t.total}</span>
                    </span>
                    <span aria-hidden="true" style={{ width: '100%', height: 12, border: '1.5px solid var(--ink)', borderRadius: 6, overflow: 'hidden', display: 'flex', background: 'var(--paper)' }}>
                      <span style={{ width: pct(t.Known, t.total), background: 'var(--sage)' }} />
                      <span style={{ width: pct(t.Learning, t.total), background: 'var(--pink)' }} />
                      <span style={{ width: pct(t.New, t.total), background: 'var(--orange)' }} />
                    </span>
                  </button>
                ))}
                {stats.byTopic.length === 0 && <p className="muted" style={{ margin: 0, fontSize: 14 }}>Tag your words with a Topic in Notion to see them here.</p>}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Tile({ n, label, bg }: { n: number; label: string; bg: string }) {
  return (
    <div style={{ background: bg, border: '2px solid var(--ink)', borderRadius: 16, padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className="serif" style={{ fontSize: 32, lineHeight: 1 }}>{n}</span>
      <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{label}</span>
    </div>
  );
}
