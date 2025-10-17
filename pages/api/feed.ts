// pages/api/feed.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { Client } from '@notionhq/client'

const notion = new Client({ auth: process.env.NOTION_TOKEN })

// Property names (must match Notion)
const TITLE_PROP = 'Post Title'
const CAPTION_PROP = 'Caption'
const STATUS_PROP = 'Status'
const DATE_PROP = 'Post Date'
const MEDIA_PROP = 'Media (URLs or leave blank)'

const REVALIDATE_SECONDS = 60 // refresh signed Notion file URLs every 60s

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')

  try {
    const database_id = String(req.query.database_id || '')
    const statusFilter = String(req.query.status || '').trim()
    const limit = Math.min(parseInt(String(req.query.limit || '30'), 10) || 30, 100)

    // optional safety allowlist
    const allow = (process.env.ALLOWED_DATABASE_IDS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
    if (allow.length && !allow.includes(database_id)) {
      return res.status(403).json({ error: 'This database_id is not allowed.' })
    }

    const filter: any = statusFilter
      ? { and: [{ property: STATUS_PROP, select: { equals: statusFilter } }] }
      : undefined

    const query = await notion.databases.query({
      database_id,
      page_size: limit,
      filter,
      sorts: [{ property: DATE_PROP, direction: 'descending' }],
    })

    const items = query.results
      .map((page: any) => {
        const p = page.properties

        const title =
          p[TITLE_PROP]?.title?.map((t: any) => t.plain_text).join('') || 'Untitled'

        const caption =
          p[CAPTION_PROP]?.rich_text?.map((t: any) => t.plain_text).join('') || ''

        const date = p[DATE_PROP]?.date?.start || null
        const status = p[STATUS_PROP]?.select?.name || null

        // Accept BOTH Notion uploads and external URLs from Files & media
        const images: string[] = []
        const filesProp = p[MEDIA_PROP]
        if (filesProp?.type === 'files' && Array.isArray(filesProp.files)) {
          for (const f of filesProp.files) {
            if (f.type === 'external') images.push(f.external.url)
            if (f.type === 'file') images.push(f.file.url) // signed, time-limited
          }
        }

        return { id: page.id, title, caption, status, date, images }
      })
      .filter((it: any) => it.images && it.images.length > 0)

    return res
      .status(200)
      .setHeader('CDN-Cache-Control', `max-age=0, s-maxage=${REVALIDATE_SECONDS}`)
      .json({ items })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Unknown error' })
  }
}
