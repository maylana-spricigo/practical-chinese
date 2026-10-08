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

const route = () => location.hash.replace(/^#\/?/, '');
export const routeParams = () => new URLSearchParams(route().split('?')[1] || '');

export function go(r: string) {
  if (route() === r) return;
  location.hash = r ? `/${r}` : '';
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
  if (path === 'build' || path === 'ask') return <div className="app"><Sentences key={path} game={path} /></div>;
  if (r === 'settings') return <div className="app"><Settings /></div>;
  if (r === 'flashcards' || r === 'review') return <div className="app"><Flashcards key={r} mode={r === 'review' ? 'review' : 'round'} /></div>;

  const tab = path === 'dictionary' || path === 'bookshelf' || path === 'progress' ? path : 'practice';
  return (
    <div className="app">
      {tab === 'practice' ? <Home /> : tab === 'dictionary' ? <Dictionary key={r} /> : tab === 'progress' ? <Progress /> : <ComingSoon tab={tab} />}
      <TabBar active={tab} go={go} />
    </div>
  );
}
