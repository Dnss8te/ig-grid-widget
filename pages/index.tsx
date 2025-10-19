// pages/index.tsx
import { useEffect, useMemo, useState } from 'react'

type FeedItem = {
  id: string
  title: string
  caption: string
  date: string | null
  status: string | null
  images: string[]
}

export default function Home() {
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<{ index: number; slide: number } | null>(null)

  // ── UI params via URL: ?cols=3&gap=8&radius=10&shadow=1&hover=caption&header=Your%20Widget
  const ui = useMemo(() => {
    const qs = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    const cols = Math.max(1, Math.min(6, parseInt(qs.get('cols') || '3', 10)))
    const gap = Math.max(0, Math.min(24, parseInt(qs.get('gap') || '6', 10)))
    const radius = Math.max(0, Math.min(24, parseInt(qs.get('radius') || '8', 10)))
    const shadow = qs.get('shadow') === '1'
    const hover = qs.get('hover') || 'caption' // 'caption' | 'none'
    const header = qs.get('header') ?? 'IG Preview'
    const limit = qs.get('limit') || '60'
    const database_id = qs.get('database_id') || ''
    const status = qs.get('status') || ''
    return { cols, gap, radius, shadow, hover, header, limit, database_id, status, qs }
  }, [])

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/feed?${ui.qs.toString()}`, { cache: 'no-store' })
    const data = await res.json()
    setItems(data.items || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 60000) // refresh signed URLs every 60s
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.database_id, ui.status, ui.limit])

  return (
    <div style={styles.page}>
      {ui.header !== '0' && (
        <header style={styles.header}>
          <div style={{ fontWeight: 600 }}>{decodeURIComponent(ui.header)}</div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>
            {ui.status ? `Filter: ${ui.status}` : 'All posts'}
          </div>
          <button onClick={load} disabled={loading} style={styles.refreshBtn}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </header>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${ui.cols}, 1fr)`,
          gap: ui.gap,
        }}
      >
        {items.map((item, i) => {
          const thumb = item.images[0]
          const isCarousel = item.images.length > 1
          return (
            <button
              key={item.id}
              onClick={() => setActive({ index: i, slide: 0 })}
              style={{
                ...styles.tile,
                borderRadius: ui.radius,
                boxShadow: ui.shadow ? '0 1px 6px rgba(0,0,0,.12)' : 'none',
              }}
              aria-label={`Open ${item.title}`}
              title={item.title}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb} alt={item.title} style={styles.img} />
              {isCarousel && <div style={styles.carouselBadge}>◧</div>}
              {ui.hover === 'caption' && item.caption && (
                <div style={styles.hoverCap}>
                  <div style={styles.hoverCapInner}>{item.caption}</div>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {active && (
        <Lightbox
          items={items}
          index={active.index}
          slide={active.slide}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  )
}

function Lightbox({
  items, index, slide, onClose
}: { items: FeedItem[]; index: number; slide: number; onClose: () => void }) {
  const [idx, setIdx] = useState(index)
  const [sl, setSl] = useState(slide)
  const post = items[idx]
  const hasPrevPost = idx > 0
  const hasNextPost = idx < items.length - 1
  const hasPrevSlide = sl > 0
  const hasNextSlide = sl < post.images.length - 1

  function prev() {
    if (hasPrevSlide) setSl(s => s - 1)
    else if (hasPrevPost) { setIdx(i => i - 1); setSl(0) }
  }
  function next() {
    if (hasNextSlide) setSl(s => s + 1)
    else if (hasNextPost) { setIdx(i => i + 1); setSl(0) }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div style={styles.modalBackdrop} onClick={onClose} aria-modal>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalMedia}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.images[sl]} alt={post.title} style={styles.modalImg} />
          <button style={{ ...styles.navBtn, left: 8 }} onClick={prev} aria-label="Prev">‹</button>
          <button style={{ ...styles.navBtn, right: 8 }} onClick={next} aria-label="Next">›</button>
          {post.images.length > 1 && (
            <div style={styles.dots}>
              {post.images.map((_, i) => (
                <span
                  key={i}
                  style={{ ...styles.dot, opacity: i === sl ? 1 : 0.35 }}
                  onClick={() => setSl(i)}
                />
              ))}
            </div>
          )}
        </div>
        <div style={styles.meta}>
          <div style={{ fontWeight: 600 }}>{post.title}</div>
          {post.date && <div style={{ fontSize: 12, opacity: 0.7 }}>{new Date(post.date).toLocaleString()}</div>}
          {post.caption && <p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{post.caption}</p>}
        </div>
        <button style={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
      </div>
    </div>
  )
}

const styles: Record<string, any> = {
  page: { fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif', padding: 12 },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 },
  refreshBtn: { marginLeft: 'auto', border: '1px solid #ddd', background: '#fff', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' },
  tile: { position: 'relative', padding: 0, border: 'none', background: '#fff', cursor: 'pointer', aspectRatio: '1 / 1', overflow: 'hidden' },
  img: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  carouselBadge: { position: 'absolute', right: 6, top: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '2px 4px', fontSize: 12, borderRadius: 3 },
  hoverCap: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 8, background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.55) 100%)', color: '#fff' },
  hoverCapInner: { fontSize: 12, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },

  modalBackdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 9999 },
  modal: { width: 'min(950px, 95vw)', background: '#fff', borderRadius: 8, overflow: 'hidden', position: 'relative', display: 'grid', gridTemplateColumns: '2fr 1fr' },
  modalMedia: { position: 'relative', background: '#000', minHeight: 300, aspectRatio: '1 / 1' },
  modalImg: { width: '100%', height: '100%', objectFit: 'contain', background: '#000' },
  meta: { padding: 16, overflowY: 'auto' },
  navBtn: { position: 'absolute', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', padding: '6px 10px', fontSize: 22, cursor: 'pointer', borderRadius: 4 },
  dots: { position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: '50%', background: '#fff', display: 'inline-block', cursor: 'pointer' },
  closeBtn: { position: 'absolute', right: 8, top: 8, border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 16, padding: '6px 10px', borderRadius: 4, cursor: 'pointer' }
}
