import { useEffect, useMemo, useState } from 'react';
import { routeParams } from '../App';
import { Icon, Sheet, StatusPill } from '../components';
import { ErrorState, Loading } from '../components/states';
import { ApiError, fetchAllWords } from '../lib/api';
import { speak } from '../lib/speak';
import { enqueue } from '../lib/sync';
import { localToday, type Status } from '../../shared/srs';
import { TOPICS, type Word } from '../../shared/types';
import KeyPrompt from './KeyPrompt';

const STATUS_BG: Record<Status, string> = { New: 'var(--orange)', Learning: 'var(--pink)', Known: 'var(--sage)' };
const norm = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '');

export default function Dictionary() {
  const [words, setWords] = useState<Word[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [reload, setReload] = useState(0);
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState(() => routeParams().get('topic') || 'all');
  const [status, setStatus] = useState<'all' | Status>('all');
  const [open, setOpen] = useState<Word | null>(null);

  useEffect(() => {
    let live = true;
    setError(null);
    fetchAllWords().then((w) => live && setWords(w)).catch((e) => live && setError(e));
    return () => { live = false; };
  }, [reload]);

  const list = useMemo(() => {
    if (!words) return [];
    const nq = norm(q.trim());
    return words.filter((w) =>
      (topic === 'all' || w.topics.includes(topic)) &&
      (status === 'all' || w.status === status) &&
      (!nq || w.hz.includes(q.trim()) || norm(w.py).includes(nq) || w.en.toLowerCase().includes(q.trim().toLowerCase())));
  }, [words, q, topic, status]);

  if (error?.status === 401) return <KeyPrompt onDone={() => setReload((n) => n + 1)} />;

  const known = words?.filter((w) => w.status === 'Known').length ?? 0;
  const setWordStatus = (w: Word, s: Status) => {
    if (w.status === s) return;
    enqueue({ type: 'status', id: w.id, status: s, today: localToday() });
    const next = { ...w, status: s };
    setWords((ws) => ws?.map((x) => (x.id === w.id ? next : x)) ?? null);
    setOpen(next);
  };

  return (
    <main className="screen">
      <div style={{ flex: 'none', padding: '24px 16px 12px', display: 'flex', flexDirection: 'column', gap: 14, borderBottom: '2px solid var(--ink)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
          <div>
            <h1 className="serif" style={{ margin: 0, fontSize: 34, lineHeight: 1 }}>Dictionary</h1>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 14 }}><span className="hz" style={{ fontWeight: 400 }}>词典</span> · cídiǎn</p>
          </div>
          {words && <p className="hand accent tilt" style={{ margin: '0 0 2px', fontSize: 17 }}>{words.length} words · {known} known</p>}
        </div>
        <label style={{ height: 48, border: '2px solid var(--ink)', borderRadius: 12, background: 'var(--paper)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="#1C1A18" strokeWidth="2.2" /><path d="M15.5 15.5 L21 21" stroke="#1C1A18" strokeWidth="2.6" strokeLinecap="round" /></svg>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search hanzi, pinyin or English" aria-label="Search words" style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 16 }} />
        </label>
        <div className="scroll" role="group" aria-label="Topic" style={{ flexDirection: 'row', gap: 6, overflowX: 'auto', overflowY: 'hidden', margin: '0 -16px', padding: '0 16px' }}>
          {[{ name: 'all', zh: '全部', label: 'All' }, ...TOPICS.map((t) => ({ ...t, label: t.name }))].map((t) => (
            <button key={t.name} type="button" className="pill choice" aria-pressed={topic === t.name} onClick={() => setTopic(t.name)} style={{ height: 36, fontSize: 13, borderRadius: 999, borderWidth: 1.5 }}>
              <span className="hz" style={{ fontSize: 14 }}>{t.zh}</span>{t.label}
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label="Status" className="seg" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
          {(['all', 'New', 'Learning', 'Known'] as const).map((s) => (
            <button key={s} type="button" role="radio" aria-checked={status === s} onClick={() => setStatus(s)} style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
              {s !== 'all' && <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: '50%', border: '1.5px solid currentColor', background: STATUS_BG[s] }} />}
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {!words && !error && <div style={{ flex: 1, display: 'flex', padding: 16 }}><Loading cards={false} line="opening your dictionary" sub="reading every word" zh="打开词典" /></div>}
      {error && <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, gap: 10 }}><ErrorState error={error} onRetry={() => setReload((n) => n + 1)} /></div>}

      {words && (
        <div className="scroll" style={{ padding: '4px 16px 16px' }}>
          {list.map((w) => (
            <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1.5px dashed rgba(28,26,24,0.35)' }}>
              <button type="button" onClick={() => setOpen(w)} aria-label={`${w.hz}, ${w.py}, ${w.en}, ${w.status}`} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, border: 'none', background: 'transparent', padding: 0, textAlign: 'left' }}>
                <span lang="zh-Hans" className="hz" style={{ flex: 'none', width: 72, fontSize: 26, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.hz}</span>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span className="accent" style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.1 }}>{w.py}</span>
                  <span style={{ fontSize: 15, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.en}</span>
                </span>
                <StatusPill status={w.status} />
              </button>
              <button type="button" onClick={() => speak(w.hz)} aria-label={`Play ${w.py}`} style={{ flex: 'none', width: 44, height: 44, borderRadius: '50%', border: '2px solid var(--ink)', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon.Speaker size={18} /></button>
            </div>
          ))}
          {list.length === 0 && (
            <div style={{ padding: '48px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
              <p className="hz" style={{ margin: 0, fontSize: 40 }}>空</p>
              <p className="serif" style={{ margin: 0, fontSize: 22 }}>No words found</p>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>{words.length ? 'Try another spelling, topic or status.' : 'Add words to the 词典 database in Notion.'}</p>
            </div>
          )}
        </div>
      )}

      {open && (
        <Sheet label="Word details" onClose={() => setOpen(null)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
              <p lang="zh-Hans" className="hz" style={{ margin: 0, fontSize: 64, lineHeight: 1 }}>{open.hz}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 4 }}>
                <p className="accent" style={{ margin: 0, fontSize: 22, fontWeight: 600, lineHeight: 1 }}>{open.py}</p>
                <p className="serif" style={{ margin: 0, fontSize: 21, lineHeight: 1.1 }}>{open.en}</p>
              </div>
            </div>
            <button type="button" onClick={() => speak(open.hz)} aria-label="Play pronunciation" style={{ flex: 'none', width: 48, height: 48, borderRadius: '50%', border: '2px solid var(--ink)', background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon.Speaker /></button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {open.pos && <span className="pill">{open.pos}</span>}
            {open.mw && <span className="pill">measure word <span className="hz" style={{ fontWeight: 400 }}>{open.mw}</span></span>}
            {open.topics.map((t) => <span key={t} className="pill"><span className="hz" style={{ fontWeight: 400 }}>{TOPICS.find((x) => x.name === t)?.zh}</span> {t}</span>)}
          </div>
          {open.ex && (
            <div style={{ background: 'var(--paper)', border: '2px solid var(--ink)', borderRadius: 16, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p className="hand accent" style={{ margin: 0, fontSize: 16 }}>example</p>
                <button type="button" onClick={() => speak(open.ex)} className="pill" style={{ minHeight: 34, background: 'transparent', fontSize: 12 }}><Icon.Speaker size={14} /> listen</button>
              </div>
              <p lang="zh-Hans" className="hz" style={{ margin: 0, fontSize: 20, lineHeight: 1.3 }}>{open.ex}</p>
              {open.exPy && <p className="muted" style={{ margin: 0, fontSize: 13 }}>{open.exPy}</p>}
              {open.exEn && <p style={{ margin: 0, fontSize: 14, color: '#3E3A35' }}>{open.exEn}</p>}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p className="muted" style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Status · synced with Notion</p>
            <div role="radiogroup" aria-label="Word status" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              {(['New', 'Learning', 'Known'] as const).map((s) => (
                <button key={s} type="button" role="radio" className="choice" aria-checked={open.status === s} onClick={() => setWordStatus(open, s)} style={{ height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 14, fontWeight: 600 }}>
                  <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid currentColor', background: STATUS_BG[s] }} />{s}
                </button>
              ))}
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>Changing it by hand also resets when the word comes back in Flashcards.</p>
          </div>
          <button type="button" className="btn btn-dark" onClick={() => setOpen(null)}>Done</button>
        </Sheet>
      )}
    </main>
  );
}
