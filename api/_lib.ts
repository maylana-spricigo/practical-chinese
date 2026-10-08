import { Client } from '@notionhq/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Status } from '../shared/srs';
import type { Sentence, Word } from '../shared/types';

export const notion = new Client({ auth: process.env.NOTION_TOKEN });
export const WORDS_DS = process.env.NOTION_WORDS_DATA_SOURCE || '3de10ad0-4071-8097-b653-000bbec9ec4a';
export const SENTENCES_DS = process.env.NOTION_SENTENCES_DATA_SOURCE || 'dfdb2e9d-be12-4e1f-bd33-49d59bee93a5';

/** Optional shared secret so only you can read/write your dictionary. */
export function authorize(req: VercelRequest, res: VercelResponse): boolean {
  const key = process.env.APP_KEY;
  if (!process.env.NOTION_TOKEN) {
    res.status(500).json({ error: 'NOTION_TOKEN is not set on the server' });
    return false;
  }
  if (key && req.headers['x-app-key'] !== key) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }
  return true;
}

export function isDate(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

type Props = Record<string, any>;

const text = (p: any): string => {
  if (!p) return '';
  const arr = p.type === 'title' ? p.title : p.type === 'rich_text' ? p.rich_text : null;
  return Array.isArray(arr) ? arr.map((t: any) => t.plain_text).join('').trim() : '';
};
const select = (p: any): string => (p && p.type === 'select' && p.select ? p.select.name : '');
const multi = (p: any): string[] => (p && p.type === 'multi_select' ? p.multi_select.map((o: any) => o.name) : []);
const num = (p: any): number | null => (p && p.type === 'number' && typeof p.number === 'number' ? p.number : null);
const rel = (p: any): string[] => (p && p.type === 'relation' ? p.relation.map((r: any) => r.id) : []);
const split = (t: string): string[] => t.split('|').map((x) => x.trim()).filter(Boolean);
const date = (p: any): string | null => (p && p.type === 'date' && p.date ? String(p.date.start).slice(0, 10) : null);

export function toWord(page: { id: string; properties: Props }): Word {
  const p = page.properties;
  const status = (select(p['Status']) || 'New') as Status;
  return {
    id: page.id,
    hz: text(p['Hanzi']),
    py: text(p['Pinyin']),
    en: text(p['Translation']),
    pos: select(p['Part of Speech']),
    mw: text(p['Measure word']),
    ex: text(p['Example']),
    exPy: text(p['Example pinyin']),
    exEn: text(p['Example translation']),
    topics: multi(p['Topic']),
    status: ['New', 'Learning', 'Known'].includes(status) ? status : 'New',
    box: num(p['Box']),
    nextReview: date(p['Next review']),
    timesKnown: num(p['Times known']) ?? 0,
    timesForgot: num(p['Times forgot']) ?? 0,
  };
}

export function toSentence(page: { id: string; properties: Props }): Sentence {
  const p = page.properties;
  const status = (select(p['Status']) || 'New') as Sentence['status'];
  const hz = text(p['Sentence']);
  const tokens = split(text(p['Tokens']));
  return {
    id: page.id,
    hz,
    py: text(p['Pinyin']),
    en: text(p['Translation']),
    type: select(p['Type']) === 'Question' ? 'Question' : 'Statement',
    tokens: tokens.length ? tokens : Array.from(hz),
    distractors: split(text(p['Distractors'])),
    focus: text(p['Focus']),
    grammar: text(p['Grammar point']),
    topics: multi(p['Topic']),
    status: ['New', 'Learning', 'Known'].includes(status) ? status : 'New',
    answerIds: rel(p['Answers']),
  };
}

export async function querySentences(filter?: any, cap = 1000): Promise<Sentence[]> {
  const pages = await queryPages(SENTENCES_DS, filter, undefined, cap);
  return pages.map(toSentence).filter((s) => s.hz);
}

async function queryPages(ds: string, filter?: any, sorts?: any[], cap = 1000): Promise<any[]> {
  const out: any[] = [];
  let cursor: string | undefined;
  do {
    const r: any = await notion.dataSources.query({
      data_source_id: ds,
      ...(filter ? { filter } : {}),
      ...(sorts ? { sorts } : {}),
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    } as any);
    for (const page of r.results) if (page.object === 'page' && 'properties' in page) out.push(page);
    cursor = r.has_more ? r.next_cursor ?? undefined : undefined;
  } while (cursor && out.length < cap);
  return out;
}

/** Reads every page that matches a filter (Notion returns 100 per call). */
export async function queryAll(filter?: any, sorts?: any[], cap = 1000): Promise<Word[]> {
  const out: Word[] = [];
  let cursor: string | undefined;
  do {
    const r: any = await notion.dataSources.query({
      data_source_id: WORDS_DS,
      ...(filter ? { filter } : {}),
      ...(sorts ? { sorts } : {}),
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    } as any);
    for (const page of r.results) if (page.object === 'page' && 'properties' in page) out.push(toWord(page));
    cursor = r.has_more ? r.next_cursor ?? undefined : undefined;
  } while (cursor && out.length < cap);
  return out.filter((w) => w.hz);
}

export function shuffle<T>(a: T[]): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export function body<T>(req: VercelRequest): T {
  return (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as T;
}

export function fail(res: VercelResponse, err: unknown) {
  const e = err as any;
  const status = e?.status === 429 ? 429 : 502;
  res.status(status).json({ error: e?.code || 'notion_error', message: e?.message || String(err) });
}
