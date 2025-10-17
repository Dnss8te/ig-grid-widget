import type { NextApiRequest, NextApiResponse } from 'next';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

function ensureAllowed(database_id: string) {
  const allowlist = (process.env.ALLOWED_DATABASE_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (allowlist.length && !allowlist.includes(database_id)) {
    throw new Error('This database_id is not allowed by the server.');
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { database_id, status, limit = '60' } = req.query as Record<string, string>;
    if (!database_id) return res.status(400).json({ error: 'database_id is required' });

    ensureAllowed(database_id);

    const filters: any[] = [];
    if (status) filters.push({ property: 'Status', select: { equals: status } });

    const query: any = {
      database_id,
      sorts: [{ property: 'Post Date', direction: 'descending' }],
      page_size: Math.min(Number(limit) || 60, 100),
    };
    if (filters.length) query.filter = { and: filters };

    const resp = await notion.databases.query(query);

    const items = resp.results.map((page: any) => {
      const props = page.properties || {};
      const title =
        (props['Post Title']?.title?.[0]?.plain_text) ||
        (props['Name']?.title?.[0]?.plain_text) ||
        'Untitled';

      const caption =
        (props['Caption']?.rich_text || [])
          .map((t: any) => t.plain_text)
          .join('') || '';

      const postDate = props['Post Date']?.date?.start || null;
      const files = props['Media']?.files || [];
      const media = files
        .map((f: any) => f.external?.url || f.file?.url)
        .filter(Boolean);

      return { id: page.id, title, caption, postDate, media };
    }).filter((i: any) => i.media.length > 0);

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ items });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}
