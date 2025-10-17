# Notion → Instagram Feed Preview Widget

A lightweight, embeddable IG-style preview that reads posts from your Notion database.

## Quick Start (Vercel)

1. **Create Notion Integration**
   - https://www.notion.so/my-integrations → New Integration → copy token.
   - In your database: `•••` → **Add connections** → select your integration.

2. **Find Database ID**
   - Open your database as a page and copy the 32‑char ID from the URL.

3. **Deploy**
   - Push this folder to a Git repo (GitHub) or upload to Vercel as a project.
   - In Vercel Project → Settings → Environment Variables, add:
     - `NOTION_TOKEN` = your integration token (starts with `secret_`)
     - `ALLOWED_DATABASE_IDS` = comma-separated list of allowed DB IDs

4. **Open**
   - Go to: `https://<your-app>.vercel.app/?database_id=<DB_ID>&status=Approved`

## Notes
- All Notion calls are server-side for security.
- `Media` property must be **Files & media** with 1+ images per row.
- Sorting uses `Post Date` descending by default.
