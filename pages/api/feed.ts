// pages/api/feed.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { Client } from '@notionhq/client'

const notion = new Client({ auth: process.env.NOTION_TOKEN })

// Property names (must match your Notion DB)
const TITLE_PROP = 'Post Title'
const CAPTION_PROP = 'Caption'
const STATUS_PROP = 'Status'
const DATE_PROP = 'Post Date'

// Try these media columns in order until one exists
const MEDIA_PROP_CANDIDATES = [
  'Media (URLs or leave blank)',
  'Media (URL or leave blank)',
  'Media',
  'Media URLs',
  'Media URL',
  'Files',
  'Images',
]

const REVALIDATE_SECONDS = 60 // refresh signed Notion file URLs every 60s

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')

  try {
    // --- Inputs & normalization ---
    const rawId = String(req.query.database_id || '')
    const database_id = rawId.replace(/-/g, '')
    const statusFilter = String(req.query.status || '').trim()
    const limit = Math.min(parseInt(String(req.query.limit || '30'), 10) || 30, 100)

    // --- Allow-list (supports wildcard "*") ---
    const allowRaw = process.env.ALLOWED_DATABASE_IDS || ''
    const allowAny = allowRaw.trim() === '*'
    const allow = allowRaw
      .split(',')
      .map((s) => s.trim().replace(/-/g, ''))
      .filter(Boolean)

    if (!allowAny && allow.length && !allow.includes(database_id)) {
      return res.status(403).json({ error: 'This database_id is not allowed.' })
    }

    // --- Build filter (Status operator first, fallback to Select) ---
    const makeFilter = (useStatusOp: boolean) =>
      statusFilter
        ? {
            and: [
              {
                property: STATUS_PROP,
                // TS doesn't like this computed key; we'll cast later.
                [useStatusOp ? 'status' : 'select']: { equals: statusFilter },
              },
            ],
          }
        : undefined

    // --- Query with graceful fallback ---
    // Cast the query call as `any` to avoid TS filter typing issues.
    let query: any
    try {
      query = await (notion.databases.query as any)({
        database_id,
        page_size: limit,
        filter: makeFilter(true) as any, // status operator
        sorts: [{ property: DATE_PROP, direction: 'descending' as const }],
      })
    } catch {
      query = await (notion.databases.query as any)({
        database_id,
        page_size: limit,
        filter: makeFilter(false) as any, // select operator
        sorts: [{ property: DATE_PROP, direction: 'descending' as const }],
      })
    }

    // --- Choose media property name for this DB (first match on first row) ---
    const pickMediaPropName = (page: any): string => {
      const props = page?.properties || {}
      for (const name of MEDIA_PROP_CANDIDATES) {
        if (props[name]) return name
      }
      return MEDIA_PROP_CANDIDATES[0]
    }
    const mediaPropName = pickMediaPropName(query.results?.[0])

    // --- Shape the response ---
    const items = (query.results as any[])
      .map((page: any) => {
        const p = page.properties

        const title =
          p[TITLE_PROP]?.title?.map((t: any) => t.plain_text).join('') ||
          p['Name']?.title?.map((t: any) => t.plain_text).join('') ||
          'Untitled'

        const caption =
          p[CAPTION_PROP]?.rich_text?.map((t: any) => t.plain_text).join('') || ''

        const status =
          p[STATUS_PROP]?.status?.name ??
          p[STATUS_PROP]?.select?.name ??
          null

        const date = p[DATE_PROP]?.date?.start || null

        // Accept BOTH Notion uploads and external URLs from Files & media
        const images: string[] = []
        const filesProp = p[mediaPropName]
        if (filesProp?.type === 'files' && Array.isArray(filesProp.files)) {
          for (const f of filesProp.files) {
            if (f.type === 'external' && f.external?.url) images.push(f.external.url)
            if (f.type === 'file' && f.file?.url) images.push(f.file.url) // signed, time-limited
          }
        }

        return { id: page.id, title, caption, status, date, images }
      })
      .filter((it) => Array.isArray(it.images) && it.images.length > 0)

    return res
      .status(200)
      .setHeader('CDN-Cache-Control', `max-age=0, s-maxage=${REVALIDATE_SECONDS}`)
      .json({ items })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Unknown error' })
  }
}
