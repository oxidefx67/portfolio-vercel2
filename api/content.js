import { put, list, del } from "@vercel/blob";

const authed = (req) =>
  process.env.ADMIN_PASSWORD && req.headers["x-admin-password"] === process.env.ADMIN_PASSWORD;

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      res.setHeader("Cache-Control", "public, s-maxage=20, stale-while-revalidate=120");
      const { blobs } = await list({ prefix: "content/" });
      if (!blobs.length) return res.status(200).json({});
      blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      const r = await fetch(blobs[0].url);
      return res.status(200).json(await r.json());
    }
    res.setHeader("Cache-Control", "no-store");
    if (req.method === "POST") {
      if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: "ADMIN_PASSWORD is not set" });
      if (!authed(req)) return res.status(401).json({ error: "Wrong password" });
      const body = req.body || {};
      if (body.verify) return res.status(200).json({ ok: true });
      const { blobs } = await list({ prefix: "content/" });
      await put("content/content.json", JSON.stringify(body), {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: true,
      });
      if (blobs.length) await del(blobs.map((b) => b.url));
      return res.status(200).json({ ok: true });
    }
    return res.status(405).end();
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
