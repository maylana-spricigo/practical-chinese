import { beforeEach, describe, expect, it, vi } from 'vitest';

// Fake Notion: two pages, records the calls the API makes.
const calls: { query: any[]; update: any[] } = { query: [], update: [] };
const page = (id: string, hz: string, status: string, box: number | null, next: string | null) => ({
  object: 'page', id,
  properties: {
    Hanzi: { type: 'title', title: [{ plain_text: hz }] },
    Pinyin: { type: 'rich_text', rich_text: [{ plain_text: 'py' }] },
    Translation: { type: 'rich_text', rich_text: [{ plain_text: 'en' }] },
    Status: { type: 'select', select: { name: status } },
    Box: { type: 'number', number: box },
    'Next review': { type: 'date', date: next ? { start: next } : null },
    'Times known': { type: 'number', number: 2 },
    'Times forgot': { type: 'number', number: null },
    Topic: { type: 'multi_select', multi_select: [{ name: 'Food' }] },
  },
});
const PAGES = [page('a', '茶', 'Learning', 3, '2026-10-01'), page('b', '饺子', 'New', null, null)];

vi.mock('@notionhq/client', () => ({
  Client: class {
    dataSources = { query: async (args: any) => { calls.query.push(args); return { results: PAGES, has_more: false, next_cursor: null }; } };
    pages = {
      retrieve: async ({ page_id }: any) => PAGES.find((p) => p.id === page_id),
      update: async (args: any) => { calls.update.push(args); return {}; },
    };
  },
}));

process.env.NOTION_TOKEN = 'test';
process.env.APP_KEY = 'k';

function mockRes() {
  const r: any = { code: 200, body: null, headers: {} };
  r.status = (c: number) => { r.code = c; return r; };
  r.json = (b: any) => { r.body = b; return r; };
  r.setHeader = (k: string, v: string) => { r.headers[k] = v; };
  return r;
}

beforeEach(() => { calls.query = []; calls.update = []; });

describe('api', () => {
  it('rejects requests without the app key', async () => {
    const { default: words } = await import('../api/words');
    const res = mockRes();
    await words({ query: {}, headers: {} } as any, res);
    expect(res.code).toBe(401);
  });

  it('builds a medium round from studied + new words', async () => {
    const { default: words } = await import('../api/words');
    const res = mockRes();
    await words({ query: { mode: 'round', level: 'medium', topic: 'Food', count: '10', today: '2026-10-08' }, headers: { 'x-app-key': 'k' } } as any, res);
    expect(res.code).toBe(200);
    expect(res.body.words.map((w: any) => w.hz).sort()).toEqual(['茶', '饺子']);
    expect(calls.query[0].filter).toEqual({ and: [{ property: 'Topic', multi_select: { contains: 'Food' } }] });
    expect(calls.query[0].data_source_id).toBe('3de10ad0-4071-8097-b653-000bbec9ec4a');
  });

  it('review mode only returns due studied words', async () => {
    const { default: words } = await import('../api/words');
    const res = mockRes();
    await words({ query: { mode: 'review', count: '10', today: '2026-10-08' }, headers: { 'x-app-key': 'k' } } as any, res);
    expect(res.body.words.map((w: any) => w.hz)).toEqual(['茶']);
  });

  it('writes the spaced-repetition result to Notion', async () => {
    const { default: review } = await import('../api/review');
    const res = mockRes();
    await review({ method: 'POST', headers: { 'x-app-key': 'k' }, query: {}, body: { id: 'a', knew: true, today: '2026-10-08' } } as any, res);
    expect(res.code).toBe(200);
    expect(calls.update[0]).toEqual({
      page_id: 'a',
      properties: {
        Box: { number: 4 },
        Status: { select: { name: 'Known' } },
        'Next review': { date: { start: '2026-10-22' } },
        'Last reviewed': { date: { start: '2026-10-08' } },
        'Times known': { number: 3 },
        'Times forgot': { number: 0 },
      },
    });
  });

  it('stats counts statuses and due words', async () => {
    const { default: stats } = await import('../api/stats');
    const res = mockRes();
    await stats({ query: { today: '2026-10-08' }, headers: { 'x-app-key': 'k' } } as any, res);
    expect(res.body).toEqual({ total: 2, due: 1, byStatus: { New: 1, Learning: 1, Known: 0 } });
  });
});
