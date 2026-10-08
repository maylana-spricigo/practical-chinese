import type { VercelRequest, VercelResponse } from '@vercel/node';
import { notion, WORDS_DS } from './_lib';

// GET /api/health — setup check. Reports only whether things are configured, never secrets or words.
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const out: Record<string, unknown> = {
    notionToken: Boolean(process.env.NOTION_TOKEN),
    appKey: Boolean(process.env.APP_KEY),
    dataSource: WORDS_DS,
  };
  if (process.env.NOTION_TOKEN) {
    try {
      const r: any = await notion.dataSources.query({ data_source_id: WORDS_DS, page_size: 1 } as any);
      out.notion = 'ok';
      out.sampleFound = r.results.length > 0;
    } catch (e: any) {
      out.notion = 'error';
      out.notionCode = e?.code ?? null;
      out.notionMessage = e?.message ?? String(e);
    }
  }
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(out);
}
