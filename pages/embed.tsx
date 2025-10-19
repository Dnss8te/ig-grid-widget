// pages/embed.tsx
import { useEffect, useMemo, useRef, useState } from "react";

type Item = {
  id: string;
  title: string;
  caption?: string;
  status?: string | null;
  date?: string | null;
  images: string[];
};

function useQS() {
  return useMemo(
    () =>
      new URLSearchParams(typeof window !== "undefined" ? window.location.search : ""),
    []
  );
}

export default function Embed() {
  const qs = useQS();
  const databaseId = qs.get("database_id") || "";
  const status = qs.get("status") || ""; // try blank first; set Approved later if needed
  const cols = Math.max(1, Math.min(6, Number(qs.get("cols") || 3)));
  const gap = Math.max(0, Math.min(24, Number(qs.get("gap") || 10)));
  const radius = Math.max(0, Math.min(20, Number(qs.get("radius") || 8)));

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = async () => {
    if (!databaseId) {
      setError("Missing ?database_id=");
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);

    const url = new URL("/api/feed", window.location.origin);
    url.searchParams.set("database_id", databaseId);
    if (status) url.searchParams.set("status", status);

    try {
      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await res.json();
      // accept BOTH shapes: array OR { items: [...] }
      const list = Array.isArray(data) ? data : data?.items;
      setItems(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load feed.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [databaseId, status]);

  // auto-resize for Notion
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      const h = rootRef.current?.offsetHeight || 0;
      window.parent?.postMessage({ type: "embed-resize", height: h }, "*");
    });
    if (rootRef.current) ro.observe(rootRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={rootRef} style={{ background: "#fafafa", minHeight: "100vh" }}>
      {/* tiny debug strip – remove later */}
      <div style={{ fontSize: 12, color: "#666", padding: "6px 10px" }}>
        debug: db={databaseId.slice(0,6)}… items={items.length} status={(status||"")}
      </div>

      {error && (
        <div style={{ color: "#b00020", padding: "0 10px 8px" }}>⚠️ {error}</div>
      )}

      <main style={{ padding: 10 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap,
          }}
        >
          {items.map((it) => {
            const src = it.images?.[0];
            return (
              <article
                key={it.id}
                style={{
                  position: "relative",
                  aspectRatio: "1 / 1",
                  borderRadius: radius,
                  overflow: "hidden",
                  background: "#eee",
                }}
                title={it.title || ""}
              >
                {src ? (
                  <img
                    src={src}
                    alt={it.title || ""}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      display: "grid",
                      placeItems: "center",
                      height: "100%",
                      color: "#999",
                    }}
                  >
                    No image
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {!loading && items.length === 0 && databaseId && (
          <div style={{ marginTop: 12, color: "#666" }}>
            No posts found. Try removing filters or add images to your database.
          </div>
        )}
      </main>
    </div>
  );
}
