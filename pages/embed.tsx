import { useEffect, useMemo, useRef, useState } from "react";

type Item = {
  id: string;
  title: string;
  caption?: string | null;
  status?: string | null;
  date?: string | null;
  images: string[];
};

function useQS() {
  return useMemo(
    () => new URLSearchParams(typeof window !== "undefined" ? window.location.search : ""),
    []
  );
}

export default function Embed() {
  const qs = useQS();
  const databaseId = qs.get("database_id") || "";
  const theme = (qs.get("theme") || "light").toLowerCase();
  const cols = Math.max(1, Math.min(6, Number(qs.get("cols") || 3)));
  const gap = 10;
  const radius = 10;

  const [status, setStatus] = useState<string>("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statuses = ["", "Approved", "Draft", "Scheduled"];
  const nextStatus = () => {
    const current = statuses.indexOf(status);
    const next = (current + 1) % statuses.length;
    setStatus(statuses[next]);
  };

  const fetchFeed = async () => {
    if (!databaseId) {
      setError("Missing ?database_id=");
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);

    const u = new URL("/api/feed", window.location.origin);
    u.searchParams.set("database_id", databaseId);
    if (status) u.searchParams.set("status", status);
    u.searchParams.set("cacheBust", String(Date.now()));

    try {
      const res = await fetch(u.toString(), { cache: "no-store" });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.items;
      setItems(Array.isArray(list) ? (list as Item[]) : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load feed.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [databaseId, status]);

  // Auto-resize for Notion
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      const h = rootRef.current?.offsetHeight || 0;
      window.parent?.postMessage({ type: "embed-resize", height: h }, "*");
    });
    if (rootRef.current) ro.observe(rootRef.current);
    return () => ro.disconnect();
  }, []);

  const isDark = theme === "dark";
  const bg = isDark ? "#0f0f0f" : "#fafafa";
  const card = isDark ? "#181818" : "#fff";
  const border = isDark ? "#2a2a2a" : "#e5e5e5";
  const fg = isDark ? "#eee" : "#111";

  return (
    <div
      ref={rootRef}
      style={{
        background: bg,
        color: fg,
        minHeight: "100vh",
        font: "14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 12px",
          borderBottom: `1px solid ${border}`,
        }}
      >
        <strong style={{ fontSize: "15px" }}>Preview</strong>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={nextStatus}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: `1px solid ${border}`,
              background: card,
              color: fg,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {status === "" ? "All" : status}
          </button>

          <button
            onClick={fetchFeed}
            disabled={loading}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: `1px solid ${border}`,
              background: card,
              color: fg,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Grid */}
      <main style={{ padding: 12 }}>
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
                title={it.title || ""}
                style={{
                  position: "relative",
                  aspectRatio: "1 / 1",
                  borderRadius: radius,
                  overflow: "hidden",
                  background: card,
                  border: `1px solid ${border}`,
                }}
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
                    No media
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {!loading && items.length === 0 && databaseId && (
          <div style={{ marginTop: 14, color: isDark ? "#aaa" : "#666" }}>
            No posts found. Try another Status or add media to your database.
          </div>
        )}

        {!databaseId && (
          <div style={{ marginTop: 14, color: isDark ? "#aaa" : "#666" }}>
            Add <code>?database_id=YOUR_DB_ID</code> to the URL.
          </div>
        )}

        {error && (
          <div style={{ marginTop: 14, color: "#b00020" }}>
            ⚠️ {error}
          </div>
        )}
      </main>
    </div>
  );
}
