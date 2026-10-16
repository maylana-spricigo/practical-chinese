import { useMemo, useState } from 'react';
import { routeParams } from '../App';
import { Icon, Sheet } from '../components';
import { ErrorState, Loading } from '../components/states';
import { speak } from '../lib/speak';
import { patchWord, useStore } from '../lib/store';
import { enqueue } from '../lib/sync';
import { localToday, manualStatus, type Status } from '../../shared/srs';
import { TOPICS, type Word } from '../../shared/types';
import KeyPrompt from './KeyPrompt';

const STATUS_BG: Record<Status, string> = { New: 'var(--orange)', Learning: 'var(--pink)', Known: 'var(--sage)' };
const norm = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '');
const SORTS = [
  { id: 'newest', name: 'Newest first', desc: 'last added on top' },
  { id: 'oldest', name: 'Oldest first', desc: 'first added on top' },
  { id: 'pinyin', name: 'Pinyin A–Z', desc: 'ā, á, ǎ, à together' },
  { id: 'forgot', name: 'Most forgotten', desc: 'tricky words first' },
] as const;
type SortId = (typeof SORTS)[number]['id'];
const TOPIC_LIST = [...TOPICS].sort((a, b) => a.name.localeCompare(b.name));
const zhOf = (t: string) => TOPICS.find((x) => x.name === t)?.zh ?? '';
const added = (iso?: string) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export default function Dictionary() {
  const store = useStore('words');
  const words = store.items;
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState(() => routeParams().get('topic') || 'all');
  const [status, setStatus] = useState<'all' | Status>('all');
  const [sort, setSort] = useState<SortId>('newest');
  const [sheet, setSheet] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = (ws: Word[], t: string, st: 'all' | Status) => {
    const nq = norm(q.trim());
    return ws.filter((w) =>
      (t === 'all' || w.topics.includes(t)) &&
      (st === 'all' || w.status === st) &&
      (!nq || w.hz.includes(q.trim()) || norm(w.py).includes(nq) || w.en.toLowerCase().includes(q.trim().toLowerCase())));
  };

  const list = useMemo(() => {
    if (!words) return [];
    const ws = filtered(words, topic, status);
    const created = (w: Word) => w.created ?? '';
    if (sort === 'newest') ws.sort((a, b) => created(b).localeCompare(created(a)));
    else if (sort === 'oldest') ws.sort((a, b) => created(a).localeCompare(created(b)));
    else if (sort === 'pinyin') ws.sort((a, b) => norm(a.py).localeCompare(norm(b.py)) || a.py.localeCompare(b.py));
    else ws.sort((a, b) => b.timesForgot - a.timesForgot || created(b).localeCompare(created(a)));
    return ws;
  }, [words, q, topic, status, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  if (store.error?.status === 401) return <KeyPrompt onDone={() => void store.retry()} />;

  const known = words?.filter((w) => w.status === 'Known').length ?? 0;
  const open = words?.find((w) => w.id === openId) ?? null;
  const nFilters = (topic !== 'all' ? 1 : 0) + (status !== 'all' ? 1 : 0);
  const clearAll = () => { setTopic('all'); setStatus('all'); setSort('newest'); };
  const sortName = SORTS.find((s) => s.id === sort)!.name;

  const setWordStatus = (w: Word, s: Status) => {
    if (w.status === s) return;
    const today = localToday();
    enqueue({ type: 'status', id: w.id, status: s, today });
    patchWord(w.id, { status: s, ...manualStatus(s, today) });
  };

  return (
    <main className="screen">
      <div style={{ flex: 'none', padding: '24px 16px 12px', display: 'flex', flexDirection: 'column', gap: 12, borderBottom: '2px solid var(--ink)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
          <div>
            <h1 className="serif" style={{ margin: 0, fontSize: 34, lineHeight: 1 }}>Dictionary</h1>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 14 }}><span className="hz" style={{ fontWeight: 400 }}>词典</span> · cídiǎn</p>
          </div>
          {words && <p className="hand accent tilt" style={{ margin: '0 0 2px', fontSize: 17 }}>{words.length} words · {known} known</p>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ flex: 1, minWidth: 0, height: 48, border: '2px solid var(--ink)', borderRadius: 12, background: 'var(--paper)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px' }}>
            <Icon.Search />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search hanzi, pinyin or English" aria-label="Search words" style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 15 }} />
          </label>
          <button type="button" onClick={() => setSheet(true)} aria-label={`Sort and filter: ${sortName}${nFilters ? `, ${nFilters} filters` : ''}`} style={{ position: 'relative', flex: 'none', width: 48, height: 48, borderRadius: 12, border: '2px solid var(--ink)', background: nFilters ? 'var(--ink)' : 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon.Filter color={nFilters ? '#F3EDE3' : '#1C1A18'} />
            {nFilters > 0 && <span aria-hidden="true" style={{ position: 'absolute', top: -8, right: -8, minWidth: 22, height: 22, padding: '0 5px', borderRadius: 999, border: '2px solid var(--ink)', background: 'var(--orange)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{nFilters}</span>}
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, minHeight: 28 }}>
          <button type="button" onClick={() => setSheet(true)} className="pill" style={{ height: 28, background: 'transparent' }}>↕ {sortName}</button>
          {topic !== 'all' && <button type="button" onClick={() => setTopic('all')} aria-label={`Remove filter ${topic}`} className="pill" style={{ height: 28, background: 'var(--ink)', color: 'var(--cream)' }}><span className="hz">{zhOf(topic)}</span> {topic} <Icon.X size={8} /></button>}
          {status !== 'all' && <button type="button" onClick={() => setStatus('all')} aria-label={`Remove filter ${status}`} className="pill" style={{ height: 28, background: 'var(--ink)', color: 'var(--cream)' }}>{status} <Icon.X size={8} /></button>}
        </div>
      </div>

      {store.loading && <div style={{ flex: 1, display: 'flex', padding: 16 }}><Loading cards={false} line="opening your dictionary" sub="reading every word" zh="打开词典" /></div>}
      {!words && store.error && <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, gap: 10 }}><ErrorState error={store.error} onRetry={() => void store.retry()} /></div>}

      {words && (
        <div className="scroll" style={{ padding: '0 16px 16px' }}>
          {list.map((w) => (
            <button key={w.id} type="button" onClick={() => setOpenId(w.id)} aria-label={`${w.hz}, ${w.py}, ${w.en}, ${w.status}`}
              style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', border: 'none', borderBottom: '1.5px dashed rgba(28,26,24,0.35)', background: 'transparent', textAlign: 'left' }}>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span lang="zh-Hans" className="hz" style={{ fontSize: 26, lineHeight: 1.15, overflowWrap: 'anywhere' }}>{w.hz}</span>
                <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 8, rowGap: 2 }}>
                  <span className="accent" style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>{w.py}</span>
                  <span style={{ fontSize: 15, lineHeight: 1.25 }}>{w.en}</span>
                </span>
              </span>
              <span className="pill" style={{ flex: 'none', marginTop: 4, background: STATUS_BG[w.status], fontSize: 11, padding: '3px 9px' }}>{w.status}</span>
            </button>
          ))}
          {list.length === 0 && (
            <div style={{ padding: '48px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
              <p className="hz" style={{ margin: 0, fontSize: 40 }}>空</p>
              <p className="serif" style={{ margin: 0, fontSize: 22 }}>No words found</p>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>{words.length ? 'Try another spelling, or clear the filters.' : 'Add words to the 词典 database in Notion.'}</p>
              {words.length > 0 && <button type="button" className="btn" style={{ marginTop: 6, minHeight: 44, fontSize: 18 }} onClick={() => { clearAll(); setQ(''); }}>Clear filters</button>}
            </div>
          )}
        </div>
      )}

      {sheet && words && (
        <Sheet label="Sort and filter" onClose={() => setSheet(false)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="serif" style={{ margin: 0, fontSize: 24, lineHeight: 1 }}>Sort &amp; filter</h2>
            <button type="button" onClick={clearAll} style={{ minHeight: 36, padding: '0 4px', border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, textDecoration: 'underline' }}>Reset</button>
          </div>
          <section className="sec">
            <div className="sec-head"><h2 style={{ fontSize: 19 }}>Sort by</h2><p><span className="hz" style={{ fontWeight: 400 }}>排序</span> · páixù</p></div>
            <div role="radiogroup" aria-label="Sort by" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {SORTS.map((o) => (
                <button key={o.id} type="button" role="radio" className="choice" aria-checked={sort === o.id} onClick={() => setSort(o.id)} style={{ minHeight: 52, padding: '8px 12px', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 2, textAlign: 'left' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.1 }}>{o.name}</span>
                  <span style={{ fontSize: 12, lineHeight: 1.2, opacity: 0.8 }}>{o.desc}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="sec">
            <div className="sec-head"><h2 style={{ fontSize: 19 }}>Status</h2><p><span className="hz" style={{ fontWeight: 400 }}>状态</span> · zhuàngtài</p></div>
            <div role="radiogroup" aria-label="Status" className="seg" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
              {(['all', 'New', 'Learning', 'Known'] as const).map((s) => (
                <button key={s} type="button" role="radio" aria-checked={status === s} onClick={() => setStatus(s)} style={{ height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
                  {s !== 'all' && <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: '50%', border: '1.5px solid currentColor', background: STATUS_BG[s] }} />}
                  {s === 'all' ? 'All' : s}
                </button>
              ))}
            </div>
          </section>
          <section className="sec">
            <div className="sec-head"><h2 style={{ fontSize: 19 }}>Topic</h2><p>A–Z</p></div>
            <div role="group" aria-label="Topic" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[{ name: 'all', zh: '全部', label: 'All' }, ...TOPIC_LIST.map((t) => ({ ...t, label: t.name }))].map((t) => (
                <button key={t.name} type="button" className="pill choice" aria-pressed={topic === t.name} onClick={() => setTopic(t.name)} style={{ height: 36, fontSize: 13, borderRadius: 999, borderWidth: 1.5 }}>
                  <span className="hz" style={{ fontSize: 14 }}>{t.zh}</span>{t.label}
                </button>
              ))}
            </div>
          </section>
          <button type="button" className="btn btn-dark" onClick={() => setSheet(false)}>Show {list.length} {list.length === 1 ? 'word' : 'words'}</button>
        </Sheet>
      )}

      {open && (
        <div className="backdrop" onClick={(e) => { if (e.target === e.currentTarget) setOpenId(null); }}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Word details" style={{ height: '88%', maxHeight: '88%', padding: '16px 16px calc(24px + var(--safe-bottom))' }}>
            <div style={{ flex: 1, flexShrink: 0, background: 'var(--paper)', border: '2px solid var(--ink)', borderRadius: 24, padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="pill" style={{ background: STATUS_BG[open.status] }}>{open.status}</span>
                <button type="button" onClick={() => speak(open.hz)} aria-label="Play pronunciation" style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid var(--ink)', background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon.Speaker /></button>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px 14px', flexWrap: 'wrap' }}>
                <p lang="zh-Hans" className="hz" style={{ margin: 0, fontSize: open.hz.length > 5 ? 42 : open.hz.length > 3 ? 52 : 60, lineHeight: 1, overflowWrap: 'anywhere' }}>{open.hz}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 4 }}>
                  <p className="accent" style={{ margin: 0, fontSize: 24, fontWeight: 600, lineHeight: 1 }}>{open.py}</p>
                  <p className="serif" style={{ margin: 0, fontSize: 22, lineHeight: 1.1 }}>{open.en}</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {open.pos && <span className="pill">{open.pos}</span>}
                {open.mw && <span className="pill">measure word <span className="hz" style={{ fontWeight: 400 }}>{open.mw}</span></span>}
                {open.topics.map((t) => <span key={t} className="pill"><span className="hz" style={{ fontWeight: 400 }}>{zhOf(t)}</span> {t}</span>)}
              </div>
              {open.ex && (
                <>
                  <svg width="100%" height="8" viewBox="0 0 318 8" preserveAspectRatio="none" fill="none" aria-hidden="true"><path d="M2 5 C80 2 160 6 316 3" stroke="#1C1A18" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 6" /></svg>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p className="hand accent" style={{ margin: 0, fontSize: 17 }}>example</p>
                      <button type="button" onClick={() => speak(open.ex)} className="pill" style={{ minHeight: 36, background: 'transparent', fontSize: 13 }}><Icon.Speaker size={16} /> listen</button>
                    </div>
                    <p lang="zh-Hans" className="hz" style={{ margin: 0, fontSize: 22, lineHeight: 1.3 }}>{open.ex}</p>
                    {open.exPy && <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.3 }}>{open.exPy}</p>}
                    {open.exEn && <p style={{ margin: 0, fontSize: 15, lineHeight: 1.3 }}>{open.exEn}</p>}
                  </div>
                </>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <p className="serif" style={{ margin: 0, fontSize: 18 }}>Status</p>
                <p className="muted" style={{ margin: 0, fontSize: 12 }}>{open.created ? `added ${added(open.created)} · ` : ''}synced with Notion</p>
              </div>
              <div role="radiogroup" aria-label="Word status" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                {(['New', 'Learning', 'Known'] as const).map((s) => (
                  <button key={s} type="button" role="radio" className="choice" aria-checked={open.status === s} onClick={() => setWordStatus(open, s)} style={{ height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 14, fontWeight: 600 }}>
                    <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid currentColor', background: STATUS_BG[s] }} />{s}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" className="btn btn-dark" style={{ flexShrink: 0 }} onClick={() => setOpenId(null)}>Done</button>
          </div>
        </div>
      )}
    </main>
  );
}
