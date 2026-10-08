const COPY: Record<string, { title: string; zh: string; py: string; body: string }> = {
  dictionary: { title: 'Dictionary', zh: '词典', py: 'cídiǎn', body: 'Search and browse every word in your Notion dictionary. Coming in the next update.' },
  bookshelf: { title: 'Bookshelf', zh: '书架', py: 'shūjià', body: 'Your study books and lessons will live here.' },
  progress: { title: 'Progress', zh: '进度', py: 'jìndù', body: 'Words by status, your week and every topic at a glance. Coming soon.' },
};

export default function ComingSoon({ tab }: { tab: string }) {
  const c = COPY[tab];
  return (
    <main className="screen">
      <div className="scroll pad" style={{ gap: 24, paddingTop: 24 }}>
        <div>
          <h1 className="serif" style={{ margin: 0, fontSize: 34, lineHeight: 1 }}>{c.title}</h1>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 14 }}><span className="hz" style={{ fontWeight: 400 }}>{c.zh}</span> · {c.py}</p>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', padding: '0 24px' }}>
          <p className="hz" style={{ margin: 0, fontSize: 56 }}>{c.zh.slice(0, 1)}</p>
          <p className="hand accent tilt" style={{ margin: 0, fontSize: 20 }}>快了 · soon</p>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: '#3E3A35', maxWidth: 300 }}>{c.body}</p>
        </div>
      </div>
    </main>
  );
}
