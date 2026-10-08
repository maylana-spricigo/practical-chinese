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
const sent = (id: string, hz: string, type: string, tokens: string, answers: string[] = []) => ({
  object: 'page', id,
  properties: {
    Sentence: { type: 'title', title: [{ plain_text: hz }] },
    Type: { type: 'select', select: { name: type } },
    Tokens: { type: 'rich_text', rich_text: [{ plain_text: tokens }] },
    Distractors: { type: 'rich_text', rich_text: [{ plain_text: '吗|哪儿' }] },
    Focus: { type: 'rich_text', rich_text: [{ plain_text: '茶' }] },
    Status: { type: 'select', select: { name: 'New' } },
    Answers: { type: 'relation', relation: answers.map((x) => ({ id: x })) },
    'Times known': { type: 'number', number: 1 },
  },
});
const SENTS = [sent('q1', '你喝什么？', 'Question', '你|喝|什么|？', ['s1']), sent('s1', '我喝茶。', 'Statement', '我|喝|茶|。')];
const ALL: any[] = [...PAGES, ...SENTS];

vi.mock('@notionhq/client', () => ({
  Client: class {
    dataSources = { query: async (args: any) => { calls.query.push(args); const isS = args.data_source_id === 'dfdb2e9d-be12-4e1f-bd33-49d59bee93a5'; let r: any[] = isS ? SENTS : PAGES; if (isS && JSON.stringify(args.filter || {}).includes('Question')) r = SENTS.filter((x) => x.properties.Type.select.name === 'Question'); return { results: r, has_more: false, next_cursor: null }; } };
    pages = {
      retrieve: async ({ page_id }: any) => ALL.find((p) => p.id === page_id),
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
    expect(res.body).toEqual({ total: 2, due: 1, byStatus: { New: 1, Learning: 1, Known: 0 }, byTopic: [{ topic: 'Food', total: 2, New: 1, Learning: 1, Known: 0 }] });
  });

  it('ask returns questions with their answer statement', async () => {
    const { default: sentences } = await import('../api/sentences');
    const res = mockRes();
    await sentences({ query: { game: 'ask', count: '5' }, headers: { 'x-app-key': 'k' } } as any, res);
    expect(res.code).toBe(200);
    expect(res.body.sentences).toHaveLength(1);
    expect(res.body.sentences[0]).toMatchObject({ hz: '你喝什么？', tokens: ['你', '喝', '什么', '？'], distractors: ['吗', '哪儿'] });
    expect(res.body.sentences[0].answer).toMatchObject({ hz: '我喝茶。', focus: '茶' });
  });

  it('practice only bumps counters and last reviewed', async () => {
    const { default: practice } = await import('../api/practice');
    const res = mockRes();
    await practice({ method: 'POST', headers: { 'x-app-key': 'k' }, query: {}, body: { kind: 'sentence', id: 's1', correct: true, today: '2026-10-08' } } as any, res);
    expect(calls.update[0]).toEqual({ page_id: 's1', properties: { 'Times known': { number: 2 }, 'Last reviewed': { date: { start: '2026-10-08' } } } });
  });

  it('manual status keeps box and next review consistent', async () => {
    const { default: status } = await import('../api/status');
    const res = mockRes();
    await status({ method: 'POST', headers: { 'x-app-key': 'k' }, query: {}, body: { id: 'b', status: 'Known', today: '2026-10-08' } } as any, res);
    expect(calls.update[0].properties).toEqual({ Status: { select: { name: 'Known' } }, Box: { number: 4 }, 'Next review': { date: { start: '2026-10-22' } } });
  });
});
