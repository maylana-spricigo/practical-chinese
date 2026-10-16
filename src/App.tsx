import { useEffect, useState } from 'react';
import { TabBar } from './components';
import Home from './screens/Home';
import Settings from './screens/Settings';
import Flashcards from './screens/Flashcards';
import ComingSoon from './screens/ComingSoon';
import Dictionary from './screens/Dictionary';
import Progress from './screens/Progress';
import Match from './screens/Match';
import Sentences from './screens/Sentences';
import Partners from './screens/Partners';

const route = () => location.hash.replace(/^#\/?/, '');
export const routeParams = () => new URLSearchParams(route().split('?')[1] || '');

export function go(r: string) {
  if (route() === r) return;
  location.hash = r ? `/${r}` : '';
}

let navs = 0;
if (typeof window !== 'undefined') window.addEventListener('hashchange', () => { navs++; });
/** Back to the screen you came from (or home if the app was opened right here). */
export function back() {
  if (navs > 0) history.back(); else go('');
}

export default function App() {
  const [r, setR] = useState(route);
  useEffect(() => {
    const on = () => setR(route());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const path = r.split('?')[0];
  if (path === 'match') return <div className="app"><Match /></div>;
  if (path === 'partners') return <div className="app"><Partners /></div>;
  if (path === 'build' || path === 'ask') return <div className="app"><Sentences key={path} game={path} /></div>;
  if (path === 'settings') return <div className="app"><Settings /></div>;
  if (path === 'flashcards' || path === 'review') return <div className="app"><Flashcards key={path} mode={path === 'review' ? 'review' : 'round'} /></div>;

  const tab = path === 'dictionary' || path === 'bookshelf' || path === 'progress' ? path : 'practice';
  return (
    <div className="app">
      {tab === 'practice' ? <Home /> : tab === 'dictionary' ? <Dictionary key={r} /> : tab === 'progress' ? <Progress /> : <ComingSoon tab={tab} />}
      <TabBar active={tab} go={go} />
    </div>
  );
}
