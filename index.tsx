import { useEffect, useMemo, useState } from 'react';

type Item = {
  id: string;
  title: string;
  caption: string;
  postDate: string | null;
  media: string[];
};

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<null | { index: number; slide: number }>(null);

  const params = useMemo(() => {
    const u = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    return {
      database_id: u.get('database_id') || '',
      status: u.get('status') || '',
      limit: u.get('limit') || '60'
    };
  }, []);

  const fetchFeed = async () => {
    if (!params.database_id) return;
    setLoading(true);
    const qs = new URLSearchParams(params as any).toString();
    const r = await fetch(`/api/feed?${qs}`);
    const json = await r.json();
    setItems(json.items || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchFeed();
    const iv = setInterval(fetchFeed, 60000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.database_id, params.status, params.limit]);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={{ fontWeight: 600 }}>IG Preview</div>
        <div style={{ opacity: 0.7, fontSize: 12 }}>
          {params.status ? `Filter: ${params.status}` : 'All posts'}
        </div>
      </header>

      {loading && <div style={styles.loading}>Loading…</div>}

      <div style={styles.grid}>
        {items.map((item, i) => {
          const thumb = item.media[0];
          const hasCarousel = item.media.length > 1;
          return (
            <button
              key={item.id}
              style={styles.tile}
              onClick={() => setActive({ index: i, slide: 0 })}
              aria-label={`Open ${item.title}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb} alt={item.title} style={styles.img} />
              {hasCarousel && <div style={styles.carouselBadge}>◧</div>}
            </button>
          );
        })}
      </div>

      {active && (
        <Lightbox
          items={items}
          startIndex={active.index}
          startSlide={active.slide}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}

function Lightbox({
  items, startIndex, startSlide, onClose
}: {
  items: Item[];
  startIndex: number;
  startSlide: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const [slide, setSlide] = useState(startSlide);
  const post = items[idx];

  const hasPrevPost = idx > 0;
  const hasNextPost = idx < items.length - 1;
  const hasPrevSlide = slide > 0;
  const hasNextSlide = slide < post.media.length - 1;

  const goPrev = () => {
    if (hasPrevSlide) setSlide(s => s - 1);
    else if (hasPrevPost) { setIdx(i => i - 1); setSlide(0); }
  };
  const goNext = () => {
    if (hasNextSlide) setSlide(s => s + 1);
    else if (hasNextPost) { setIdx(i => i + 1); setSlide(0); }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalMedia}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.media[slide]} alt={post.title} style={styles.modalImg} />
          <button style={{ ...styles.navBtn, left: 8 }} onClick={goPrev} aria-label="Previous">‹</button>
          <button style={{ ...styles.navBtn, right: 8 }} onClick={goNext} aria-label="Next">›</button>
          {post.media.length > 1 && (
            <div style={styles.dots}>
              {post.media.map((_, i) => (
                <span
                  key={i}
                  style={{ ...styles.dot, opacity: i === slide ? 1 : 0.4 }}
                  onClick={() => setSlide(i)}
                />
              ))}
            </div>
          )}
        </div>
        <div style={styles.meta}>
          <div style={{ fontWeight: 600 }}>{post.title}</div>
          {post.postDate && <div style={{ fontSize: 12, opacity: 0.7 }}>{new Date(post.postDate).toLocaleString()}</div>}
          {post.caption && <p style={{ marginTop: 8 }}>{post.caption}</p>}
        </div>
        <button style={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
      </div>
    </div>
  );
}

const styles: Record<string, any> = {
  page: { fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif', padding: 12 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  loading: { padding: 12, opacity: 0.7 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 },
  tile: { position: 'relative', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', aspectRatio: '1 / 1', overflow: 'hidden' },
  img: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  carouselBadge: { position: 'absolute', right: 6, top: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '2px 4px', fontSize: 12, borderRadius: 3 },
  modalBackdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 9999 },
  modal: { width: 'min(950px, 95vw)', background: '#fff', borderRadius: 8, overflow: 'hidden', position: 'relative', display: 'grid', gridTemplateColumns: '2fr 1fr' },
  modalMedia: { position: 'relative', background: '#000', minHeight: 300, aspectRatio: '1 / 1' },
  modalImg: { width: '100%', height: '100%', objectFit: 'contain', background: '#000' },
  meta: { padding: 16, overflowY: 'auto' },
  navBtn: { position: 'absolute', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', padding: '6px 10px', fontSize: 22, cursor: 'pointer', borderRadius: 4 },
  dots: { position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: '50%', background: '#fff', display: 'inline-block', cursor: 'pointer' },
  closeBtn: { position: 'absolute', right: 8, top: 8, border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 16, padding: '6px 10px', borderRadius: 4, cursor: 'pointer' }
};
