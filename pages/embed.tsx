// pages/embed.tsx
import { useEffect, useMemo, useRef, useState } from "react";

type Item = {
  id: string;
  title: string;
  caption?: string;
  status?: string;
  date?: string | null;
  images: string[];
};

function useQuery() {
  return useMemo(
    () =>
      new URLSearchParams(
        typeof window !== "undefined" ? window.location.search : ""
      ),
    []
  );
}

export default function Embed() {
  const qs = useQuery();

  // Required
  const databaseId = qs.get("database_id") || "";

  // Optional UI params
  const initialStatus = qs.get("status") || ""; // e.g. Approved
  const columns = Math.max(1, Math.min(6, Number(qs.get("cols") || 3)));
  const gap = Math.max(0, Math.min(32, Number(qs.get("gap") || 12)));
  const radius = Math.max(0, Math.min(24, Number(qs.get("radius") || 8)));
  const limit = Math.max(1, Math.min(60, Number(qs.get("limit") || 12)));
  const theme = (qs.get("theme") || "light").toLowerCase();

  const [status, setStatus] = useState(initialStatus);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = async () => {
    if (!databaseId) {
      setError("Missing ?database_id= in the URL.");
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);

    const url = new URL("/api/feed", window.location.origin);
    url.searchParams.set("database_id", databaseId);
    if (status) url.searchParams.set("status", status);
    url.searchParams.set("limit", String(limit));

    try {
      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await res.json();
      // accept both shapes: array OR { items: [...] }
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
  }, [databaseId, status, limit]);

  // auto-resize for Notion iframe
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      const h = rootRef.current?.offsetHeight || 0;
      window.parent?.postMessage({ type: "embed-resize", height: h }, "*");
    });
    if (rootRef.current) ro.observe(rootRef.current);
    return () => ro.disconnect();
  }, []);

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gap,
  };

  return (
    <div
      ref={rootRef}
      style={{
        minHeight: "100vh",
        background: theme === "dark" ? "#0f0f0f" : "#fafafa",
        color: theme === "dark" ? "#eee" : "#111",
      }}
    >
      {/* Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: 12 }}>
        <strong>IG Preview</strong>
        <div style={{ display: "flex", gap: 8 }}>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            title="Filter by Status (optional)"
            style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd" }}
          >
            <option value="">All</option>
            <option value="Approved">Approved</option>
            <option value="Draft">Draft</option>
            <option value="Scheduled">Scheduled</option>
          </select>
          <button
            onClick={fetchFeed}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ color: "#b91c1c", padding: "0 12px 8px" }}>{error}</div>
      )}

      {/* Grid */}
      <main style={{ padding: 12 }}>
        <div style={gridStyle}>
          {items.map((it) => {
            const many = it.images?.length > 1;
            const first = it.images?.[0];

            return (
              <article
                key={it.id}
                title={it.title || ""}
                style={{
                  position: "relative",
                  aspectRatio: "1 / 1",
                  borderRadius: radius,
                  overflow: "hidden",
                  background: "#eee",
                }}
              >
                {many ? (
                  <div
                    style={{
                      display: "flex",
                      overflowX: "auto",
                      scrollSnapType: "x mandatory",
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    {it.images.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt={it.title || ""}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          flexShrink: 0,
                          scrollSnapAlign: "start",
                        }}
                      />
                    ))}
                  </div>
                ) : first ? (
                  <img
                    src={first}
                    alt={it.title || ""}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ display: "grid", placeItems: "center", height: "100%", color: "#999" }}>
                    No image
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {!loading && items.length === 0 && databaseId && (
          <div style={{ marginTop: 16, color: "#666" }}>
            No posts found. Try removing filters or add images to your database.
          </div>
        )}
      </main>
    </div>
  );
}
