import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isConfigured } from "./_lib/env.js";
import { listArtworks } from "./_lib/drive.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  if (!isConfigured()) {
    res.status(503).json({
      error: "not_configured",
      message: "The gallery has not been connected to Google Drive yet."
    });
    return;
  }

  try {
    const collection = await listArtworks();
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    res.status(200).json(collection);
  } catch {
    res.status(502).json({
      error: "drive_unavailable",
      message: "The collection could not be loaded from Google Drive."
    });
  }
}
