import { useState } from 'react';
import { setKey } from '../lib/api';

export default function KeyPrompt({ onDone }: { onDone: () => void }) {
  const [v, setV] = useState('');
  return (
    <main className="screen">
      <form className="scroll pad" style={{ gap: 18, justifyContent: 'center' }} onSubmit={(e) => { e.preventDefault(); if (v.trim()) { setKey(v); onDone(); } }}>
        <p className="hz" style={{ margin: 0, fontSize: 56, textAlign: 'center' }}>钥匙</p>
        <h1 className="serif" style={{ margin: 0, fontSize: 30, textAlign: 'center' }}>Unlock your dictionary</h1>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, textAlign: 'center', color: '#3E3A35' }}>Enter the app key you set as <b>APP_KEY</b> on Vercel. It stays on this phone.</p>
        <input type="password" autoComplete="current-password" value={v} onChange={(e) => setV(e.target.value)} aria-label="App key" placeholder="App key" style={{ height: 52, border: '2px solid var(--ink)', borderRadius: 12, background: 'var(--paper)', padding: '0 14px', fontSize: 16 }} />
        <button type="submit" className="btn btn-dark" disabled={!v.trim()}>Unlock</button>
      </form>
    </main>
  );
}
