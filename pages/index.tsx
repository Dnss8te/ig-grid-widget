// pages/index.tsx
import { useEffect, useState } from 'react'

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
  const [active, setActive] = useState<FeedItem | null>(null)

  const qs =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/feed?${qs.toString()}`, { cache: 'no-store' })
    const data = await res.json()
    setItems(data.items || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 60000) // refresh signed URLs
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>IG Preview</h3>
        <button onClick={load} disabled={loading} style={{ padding: '6px 10px', cursor: 'pointer' }}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 6,
        }}
      >
        {items.map((it) => (
          <div
            key={it.id}
            onClick={() => setActive(it)}
            style={{
              position: 'relative',
              width: '100%',
              paddingBottom: '100%', // square
              overflow: 'hidden',
              borderRadius: 6,
              cursor: 'pointer',
              background: '#f2f2f2',
            }}
            title={it.title}
          >
            {/* first image */}
            {it.images[0] && (
              <img
                src={it.images[0]}
                alt={it.title}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
            {/* carousel badge */}
            {it.images.length > 1 && (
              <div
                style={{
                  position: 'absolute',
                  right: 6,
                  top: 6,
                  padding: '2px 6px',
                  fontSize: 12,
                  background: 'rgba(0,0,0,.6)',
                  color: '#fff',
                  borderRadius: 12,
                }}
              >
                {it.images.length} →
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal carousel */}
      {active && (
        <div
          onClick={() => setActive(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#000',
              maxWidth: 900,
              width: '100%',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', overflowX: 'auto' }}>
              {active.images.map((src, i) => (
                <img key={i} src={src} alt="" style={{ width: 300, height: 300, objectFit: 'cover' }} />
              ))}
            </div>
            <div style={{ padding: 12, background: '#fff', color: '#111' }}>
              <strong>{active.title}</strong>
              <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{active.caption}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
