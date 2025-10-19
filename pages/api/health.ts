// pages/api/health.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const rawId = String(req.query.database_id || "");
  const normalized = rawId.replace(/-/g, "");
  const allowRaw = process.env.ALLOWED_DATABASE_IDS || "";
  const allowAny = allowRaw.trim() === "*";
  const allowList = allowRaw.split(",").map(s => s.trim().replace(/-/g, "")).filter(Boolean);

  res.status(200).json({
    ok: true,
    domain: req.headers.host,
    db: { raw: rawId, normalized },
    env: {
      hasToken: Boolean(process.env.NOTION_TOKEN), // don't leak the token
      allowedAny: allowAny,
      allowedList,
      allowedRaw: allowRaw, // shows if there are stray spaces/newlines
    },
  });
}
