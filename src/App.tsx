import { useEffect, useState } from 'react';
import { TabBar } from './components';
import Home from './screens/Home';
import Settings from './screens/Settings';
import Flashcards from './screens/Flashcards';
import ComingSoon from './screens/ComingSoon';

const route = () => location.hash.replace(/^#\/?/, '');

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

  if (r === 'settings') return <div className="app"><Settings /></div>;
  if (r === 'flashcards' || r === 'review') return <div className="app"><Flashcards key={r} mode={r === 'review' ? 'review' : 'round'} /></div>;

  const tab = r === 'dictionary' || r === 'bookshelf' || r === 'progress' ? r : 'practice';
  return (
    <div className="app">
      {tab === 'practice' ? <Home /> : <ComingSoon tab={tab} />}
      <TabBar active={tab} go={go} />
    </div>
  );
}
