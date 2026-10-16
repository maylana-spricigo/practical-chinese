import { go } from '../App';
import { Icon } from '../components';
import { ART } from '../illustrations';
import { DEMO } from '../lib/api';
import { streak } from '../lib/history';
import { useStore } from '../lib/store';
import KeyPrompt from './KeyPrompt';

const GAMES = [
  { route: 'match', art: 'match', title: 'Match the Pairs', zh: '配对', py: 'pèiduì', desc: 'hanzi ↔ meaning' },
  { route: 'partners', art: 'partners', title: 'Word Partners', zh: '搭配', py: 'dāpèi', desc: 'which words go together' },
  { route: 'build', art: 'build', title: 'Build the Sentence', zh: '连词成句', py: 'liáncí chéngjù', desc: 'put the words in order' },
  { route: 'ask', art: 'ask', title: 'Ask the Question', zh: '提问', py: 'tíwèn', desc: 'ask about the answer' },
];

export default function Home() {
  const store = useStore('words'); // warms the local copy so games open instantly
  useStore('sentences');
  if (store.error?.status === 401) return <KeyPrompt onDone={() => void store.retry()} />;
  const days = streak();

  return (
    <main className="screen">
      <div className="scroll" style={{ padding: '18px 16px 20px', gap: 18 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <span aria-hidden="true" style={{ flex: 'none', lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: ART.appIcon }} />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <h1 className="serif" style={{ margin: 0, fontSize: 22, lineHeight: 1 }}>Practical Chinese</h1>
              <p className="hand accent" style={{ margin: '2px 0 0', fontSize: 14, lineHeight: 1 }}>{DEMO ? 'demo mode · sample words' : 'one word at a time.'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
            <button type="button" onClick={() => go('progress')} aria-label={`${days}-day streak, open Progress`} style={{ height: 36, padding: '0 10px 0 8px', borderRadius: 999, border: '2px solid var(--ink)', background: 'var(--paper)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 700 }}>
              <Icon.Fire on={days > 0} />{days}
            </button>
            <button type="button" className="icon-btn" style={{ width: 40, height: 40 }} aria-label="Study settings" onClick={() => go('settings')}><Icon.Gear /></button>
          </div>
        </header>

        {/* Flashcards: the main game */}
        <section aria-labelledby="fc-h" style={{ background: 'var(--green)', color: 'var(--cream)', border: '2px solid var(--ink)', borderRadius: 26, padding: '24px 18px 16px', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <h2 id="fc-h" className="serif" style={{ margin: 0, fontSize: 32, lineHeight: 1 }}>Flashcards</h2>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#E6DFD3' }}><span lang="zh-Hans" className="hz" style={{ fontWeight: 400 }}>单词卡</span> · dāncí kǎ</p>
            </div>
            <button type="button" onClick={() => go('flashcards?setup')} aria-label="Set up Flashcards" style={{ flex: 'none', width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'rgba(243,237,227,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.85 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7 H20 M4 17 H20" stroke="#F3EDE3" strokeWidth="2" strokeLinecap="round" /><circle cx="9" cy="7" r="2.6" fill="#264434" stroke="#F3EDE3" strokeWidth="2" /><circle cx="15" cy="17" r="2.6" fill="#264434" stroke="#F3EDE3" strokeWidth="2" /></svg>
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
            <p className="hand" style={{ margin: '0 0 6px', flex: 1, minWidth: 0, fontSize: 18, lineHeight: 1.25, color: '#C5D3B6' }}>review what’s due,<br />then meet new words.</p>
            <span aria-hidden="true" style={{ flex: 'none', lineHeight: 0, margin: '-8px -10px -4px 0' }} dangerouslySetInnerHTML={{ __html: ART.hero }} />
          </div>
          <button type="button" onClick={() => go('flashcards')} className="btn" style={{ minHeight: 56, borderRadius: 14, background: 'var(--cream)', color: 'var(--ink)', justifyContent: 'space-between' }}>
            Start <Icon.Arrow color="#1C1A18" />
          </button>
        </section>

        <section aria-labelledby="more-h" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 id="more-h" className="serif" style={{ margin: '0 2px', fontSize: 22, lineHeight: 1 }}>More practice <span style={{ fontFamily: 'var(--sans)', fontWeight: 500, fontSize: 13, color: 'var(--grey)' }}><span className="hz" style={{ fontWeight: 400 }}>练习</span> · liànxí</span></h2>
          {GAMES.map((g) => (
            <button key={g.route} type="button" onClick={() => go(g.route)} aria-label={`Play ${g.title}`} style={{ height: 96, background: 'var(--paper)', border: '2px solid var(--ink)', borderRadius: 20, padding: '8px 14px 8px 8px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
              <span aria-hidden="true" style={{ flex: 'none', width: 120, height: 76, borderRadius: 14, border: '2px solid var(--ink)', background: ART[g.art + 'Bg'], display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: ART[g.art] }} />
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span className="serif" style={{ fontSize: 19, lineHeight: 1.05 }}>{g.title}</span>
                <span className="muted" style={{ fontSize: 12, fontWeight: 500 }}><span lang="zh-Hans" className="hz" style={{ fontSize: 13, fontWeight: 400, color: '#3E3A35' }}>{g.zh}</span> · {g.py}</span>
                <span className="hand accent" style={{ fontSize: 14, lineHeight: 1.1 }}>{g.desc}</span>
              </span>
              <Icon.Arrow color="#1C1A18" />
            </button>
          ))}
        </section>
      </div>
    </main>
  );
}
