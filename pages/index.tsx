// pages/index.tsx
import { useEffect, useMemo, useRef, useState } from 'react'

type FeedItem = {
  id: string
  title: string
  caption: string
  status: string | null
  date: string | null
  images: string[]
}

function useQuery() {
  // Safe in SSR: returns empty params on server
  return useMemo(
    () => new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search),
    []
  )
}

export default function Widget() {
  const qs = useQuery()
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI params (front-end only)
  const theme = (qs.get('theme') || 'light').toLowerCase()
  const accent = qs.get('accent') || '#3897f0' // IG-ish blue
  const viewInitial = (qs.get('view') || 'grid') as 'grid' | 'reels'
  const cols = Math.max(1, Math.min(6, Number(qs.get('cols') || 3)))
  const gap = Math.max(0, Math.min(24, Number(qs.get('gap') || 4)))

  // API params (proxied to /api/feed)
  const database_id = qs.get('database_id') || ''
  const status = qs.get('status') || ''
  const limit = qs.get('limit') || ''

  const [view, setView] = useState<'grid' | 'reels'>(viewInitial)

  // Fetch from your API
  useEffect(() => {
    const params = new URLSearchParams()
    if (database_id) params.set('database_id', database_id)
    if (status) params.set('status', status)
    if (limit) params.set('limit', limit)

    setLoading(true)
    fetch(`/api/feed?${params.toString()}`, { cache: 'no-store' })
      .then(async (r) => (r.ok ? r.json() : Promise.reject((await r.json())?.error || 'Error')))
      .then((data: FeedItem[]) => {
        setItems(data)
        setError(null)
      })
      .catch((e) => setError(String(e || 'Unknown error')))
      .finally(() => setLoading(false))
  }, [database_id, status, limit])

  // Auto-resize for Notion embed (avoid scrollbars)
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      const h = rootRef.current?.offsetHeight || 0
      window.parent?.postMessage({ type: 'embed-resize', height: h }, '*')
    })
    if (rootRef.current) ro.observe(rootRef.current)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={rootRef} className={`wrap ${theme}`}>
      <header className="topbar">
        <div className="brand">
          <span className="dot" />
          <strong>IG Preview</strong>
        </div>
        <nav className="tabs" role="tablist" aria-label="Feed view">
          <button
            className={view === 'grid' ? 'active' : ''}
            onClick={() => setView('grid')}
            role="tab"
            aria-selected={view === 'grid'}
          >
            Grid
          </button>
          <button
            className={view === 'reels' ? 'active' : ''}
            onClick={() => setView('reels')}
            role="tab"
            aria-selected={view === 'reels'}
          >
            Reels
          </button>
        </nav>
      </header>

      {loading && <p className="hint">Loading…</p>}
      {error && <p className="hint error">⚠️ {error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="hint">No items yet. Add rows to your Notion database.</p>
      )}

      {!loading && !error && items.length > 0 && (
        view === 'grid' ? (
          <GridView items={items} cols={cols} gap={gap} />
        ) : (
          <ReelsView items={items} />
        )
      )}

      <footer className="ft">
        <a href="#" onClick={(e) => e.preventDefault()}>Made with ♥</a>
      </footer>

      <style jsx>{`
        :root { --accent: ${accent}; }
        .wrap { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial; line-height: 1.35; }
        .wrap.light { background: #fff; color: #111; }
        .wrap.dark { background: #0f0f0f; color: #eee; }
        .topbar { display:flex; justify-content:space-between; align-items:center; padding:10px 8px; position:sticky; top:0; }
        .brand { display:flex; gap:8px; align-items:center; font-weight:600; }
        .dot { width:10px; height:10px; border-radius:999px; background: var(--accent); display:inline-block; }
        .tabs button { appearance:none; border:0; background:transparent; padding:6px 10px; margin-left:2px; border-radius:8px; font-weight:600; cursor:pointer; }
        .tabs button.active { background: var(--accent); color:#fff; }
        .hint { opacity:.85; padding:12px; }
        .hint.error { color:#b00020; }
        .ft { padding: 10px 8px 16px; opacity:.6; font-size:12px; }
      `}</style>
    </div>
  )
}

/* ---------- GRID (photos + carousels) ---------- */
function GridView({ items, cols, gap }: { items: FeedItem[]; cols: number; gap: number }) {
  return (
    <>
      <div className="grid">
        {items.map((item) => (
          <Card key={item.id} item={item} />
        ))}
      </div>
      <style jsx>{`
        .grid {
          display: grid;
          grid-template-columns: repeat(${cols}, 1fr);
          gap: ${gap}px;
          padding: ${gap}px;
        }
        @media (max-width: 640px) {
          .grid { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>
    </>
  )
}

/* ---------- REELS (video-only grid) ---------- */
function ReelsView({ items }: { items: FeedItem[] }) {
  const reels = items.filter((i) => isLikelyVideo(i.images?.[0]))
  return (
    <>
      <div className="reels">
        {reels.map((item) => (
          <Reel key={item.id} item={item} />
        ))}
      </div>
      <style jsx>{`
        .reels {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
          padding: 4px;
        }
        @media (max-width: 640px) {
          .reels { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </>
  )
}

/* ---------- Helpers ---------- */
function isLikelyVideo(url?: string) {
  if (!url) return false
  const u = url.split('?')[0].toLowerCase()
  return u.endsWith('.mp4') || u.endsWith('.mov') || u.endsWith('.webm')
}

/* ---------- Cards & Carousel ---------- */
function Card({ item }: { item: FeedItem }) {
  const hasMany = (item.images?.length || 0) > 1
  return (
    <article className="card" aria-label={item.title}>
      <div className={`media ${hasMany ? 'carousel' : ''}`}>
        {hasMany ? (
          <Carousel urls={item.images} />
        ) : isLikelyVideo(item.images?.[0]) ? (
          <video src={item.images[0]} playsInline muted loop preload="metadata" />
        ) : (
          <img src={item.images?.[0]} alt={item.title || 'post'} loading="lazy" />
        )}
        {hasMany && <span className="badge">◄►</span>}
      </div>
      <style jsx>{`
        .card { aspect-ratio: 1 / 1; position: relative; overflow: hidden; border-radius: 8px; }
        .media, .media :global(img), .media :global(video) { width:100%; height:100%; object-fit:cover; display:block; }
        .carousel { scroll-snap-type: x mandatory; overflow-x: auto; white-space: nowrap; }
        .badge { position:absolute; top:8px; right:8px; background:rgba(0,0,0,.55); color:#fff; font-size:11px; padding:2px 6px; border-radius:999px; }
      `}</style>
    </article>
  )
}

function Reel({ item }: { item: FeedItem }) {
  const src = item.images?.[0]
  return (
    <article className="reel">
      {isLikelyVideo(src) ? (
        <video src={src} playsInline muted loop preload="metadata" />
      ) : (
        <img src={src} alt={item.title || 'reel'} loading="lazy" />
      )}
      <span className="play">▶</span>
      <style jsx>{`
        .reel { aspect-ratio: 1 / 1; position: relative; overflow: hidden; border-radius: 8px; }
        .reel :global(img), .reel :global(video) { width:100%; height:100%; object-fit:cover; display:block; }
        .play { position:absolute; bottom:8px; left:8px; background:rgba(0,0,0,.55); color:#fff; font-size:12px; padding:2px 6px; border-radius:6px; }
      `}</style>
    </article>
  )
}

/* Minimal, dependency-free carousel using scroll-snap + dots + arrows */
function Carousel({ urls }: { urls: string[] }) {
  const sc = useRef<HTMLDivElement>(null)
  const [idx, setIdx] = useState(0)

  const snapTo = (i: number) => {
    if (!sc.current) return
    const el = sc.current.children[i] as HTMLElement
    if (el) el.scrollIntoView({ inline: 'start', behavior: 'smooth' })
  }

  useEffect(() => {
    const el = sc.current
    if (!el) return
    const onScroll = () => {
      const w = el.clientWidth
      const i = Math.round(el.scrollLeft / Math.max(1, w))
      setIdx(i)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // Keyboard support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') snapTo(Math.max(0, idx - 1))
      if (e.key === 'ArrowRight') snapTo(Math.min(urls.length - 1, idx + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx, urls.length])

  return (
    <div className="wrap">
      <div className="scroller" ref={sc}>
        {urls.map((u, i) =>
          isLikelyVideo(u) ? (
            <video key={i} src={u} playsInline muted loop preload="metadata" />
          ) : (
            <img key={i} src={u} alt={`slide ${i + 1}`} loading="lazy" />
          )
        )}
      </div>

      <div className="dots" role="tablist" aria-label="Carousel dots">
        {urls.map((_, i) => (
          <button
            key={i}
            className={i === idx ? 'on' : ''}
            onClick={() => snapTo(i)}
            role="tab"
            aria-selected={i === idx}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      <button className="nav left" onClick={() => snapTo(Math.max(0, idx - 1))} aria-label="Previous">
        ‹
      </button>
      <button className="nav right" onClick={() => snapTo(Math.min(urls.length - 1, idx + 1))} aria-label="Next">
        ›
      </button>

      <style jsx>{`
        .wrap { position:relative; width:100%; height:100%; }
        .scroller { width:100%; height:100%; display:flex; overflow-x:auto; scroll-snap-type:x mandatory; }
        .scroller :global(img), .scroller :global(video) {
          width:100%; height:100%; flex:0 0 100%; object-fit:cover; scroll-snap-align:start;
        }
        .dots { position:absolute; bottom:6px; left:0; right:0; display:flex; justify-content:center; gap:6px; }
        .dots button { width:6px; height:6px; border-radius:999px; border:0; background:rgba(255,255,255,.5); }
        .dots button.on { background: var(--accent); }
        .nav { position:absolute; top:50%; transform:translateY(-50%); background:rgba(0,0,0,.45); color:#fff; border:0; width:28px; height:28px; border-radius:50%; cursor:pointer; }
        .nav.left { left:6px; } .nav.right { right:6px; }
      `}</style>
    </div>
  )
}
