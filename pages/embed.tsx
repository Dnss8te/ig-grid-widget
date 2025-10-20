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
  const initialStatus = qs.get("status") || "";
  const initialView = (qs.get("view") || "posts").toLowerCase(); // posts | reels | feed

  const [status, setStatus] = useState(initialStatus);
  const [view, setView] = useState<"posts" | "reels" | "feed">(
    initialView === "reels" ? "reels" : initialView === "feed" ? "feed" : "posts"
  );
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cols = Math.max(1, Math.min(6, Number(qs.get("cols") || 3)));
  const gap = Math.max(0, Math.min(24, Number(qs.get("gap") || 10)));
  const radius = Math.max(0, Math.min(24, Number(qs.get("radius") || 10)));
  const theme = (qs.get("theme") || "light").toLowerCase();

  const fetchFeed = async () => {
    if (!databaseId) { setError("Missing ?database_id="); setItems([]); return; }
    setLoading(true); setError(null);

    const u = new URL("/api/feed", window.location.origin);
    u.searchParams.set("database_id", databaseId);
    if (status) u.searchParams.set("status", status);
    u.searchParams.set("cacheBust", String(Date.now()));

    try {
      const res = await fetch(u.toString(), { cache: "no-store" });
      const json = await res.json();
      const list = Array.isArray(json) ? json : json?.items;
      setItems(Array.isArray(list) ? (list as Item[]) : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load feed.");
      setItems([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchFeed(); /* eslint-disable-line */ }, [databaseId, status]);

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

  const isDark = theme === "dark";
  const bg = isDark ? "#0f0f0f" : "#fafafa";
  const card = isDark ? "#181818" : "#fff";
  const border = isDark ? "#2a2a2a" : "#e5e5e5";
  const fg = isDark ? "#eee" : "#111";

  const Tab = ({ id, label }: { id: "posts" | "reels" | "feed"; label: string }) => (
    <button
      onClick={() => setView(id)}
      style={{
        padding: "6px 10px",
        borderRadius: 8,
        border: `1px solid ${border}`,
        background: view === id ? fg : card,
        color: view === id ? (isDark ? "#111" : "#fff") : fg,
        cursor: "pointer"
      }}
    >
      {label}
    </button>
  );

  return (
    <div ref={rootRef} style={{ background: bg, color: fg, minHeight: "100vh", font: "14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      {/* header */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 12px", borderBottom: `1px solid ${border}` }}>
        <strong>IG Preview</strong>
        <div style={{ display: "flex", gap: 6, marginLeft: 8 }}>
          <Tab id="posts" label="POSTS" />
          <Tab id="reels" label="REELS" />
          <Tab id="feed" label="FEED" />
        </div>
        <label style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, opacity: .8 }}>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: "6px 8px", borderRadius: 8, border: `1px solid ${border}`, background: card, color: fg }}>
            <option value="">All</option>
            <option value="Approved">Approved</option>
            <option value="Draft">Draft</option>
            <option value="Scheduled">Scheduled</option>
          </select>
        </label>
        <button onClick={fetchFeed} disabled={loading} style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${border}`, background: card, color: fg, cursor: "pointer" }}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* grid (used for all tabs for now) */}
      <main style={{ padding: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap }}>
          {items.map((it) => {
            const src = it.images?.[0];
            return (
              <article key={it.id} title={it.title || ""} style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: radius, overflow: "hidden", background: card, border: `1px solid ${border}` }}>
                {src ? (
                  <img src={src} alt={it.title || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ display: "grid", placeItems: "center", height: "100%", color: "#999" }}>No media</div>
                )}
              </article>
            );
          })}
        </div>

        {!loading && items.length === 0 && databaseId && (
          <div style={{ marginTop: 14, color: isDark ? "#aaa" : "#666" }}>
            No posts found. Try removing filters or add images/videos to your database.
          </div>
        )}
      </main>
    </div>
  );
}
