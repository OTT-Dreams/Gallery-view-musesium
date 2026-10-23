import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isConfigured } from "./_lib/env.js";
import {
  driveFetchMedia,
  driveGetJson,
  isBrowserSafeImage,
  resizeThumbnail,
  type DriveImage
} from "./_lib/drive.js";

const MAX_DIRECT_BYTES = 3_600_000;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function fail(res: VercelResponse, status: number, error: string): void {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json({ error });
}

async function fetchThumbnail(url: string, size: number): Promise<Response | null> {
  try {
    return await fetch(resizeThumbnail(url, size), {
      signal: AbortSignal.timeout(20000),
      cache: "no-store"
    });
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "GET" && req.method !== "HEAD") {
    fail(res, 405, "method_not_allowed");
    return;
  }

  if (!isConfigured()) {
    fail(res, 503, "not_configured");
    return;
  }

  const id = first(req.query.id).trim();
  const size = first(req.query.size) || "thumb";
  if (!/^[A-Za-z0-9_-]{5,200}$/.test(id) || (size !== "thumb" && size !== "full")) {
    fail(res, 400, "invalid_request");
    return;
  }

  const metaResponse = await driveGetJson<DriveImage>(
    `/files/${encodeURIComponent(
      id
    )}?fields=id,name,mimeType,size,thumbnailLink&supportsAllDrives=true`
  );

  if (!metaResponse.ok || !metaResponse.data) {
    fail(res, metaResponse.status === 404 ? 404 : 502, "drive_unavailable");
    return;
  }

  const meta = metaResponse.data;
  const wantsOriginal =
    size === "full" &&
    isBrowserSafeImage(meta.mimeType) &&
    Number(meta.size || 0) > 0 &&
    Number(meta.size || 0) <= MAX_DIRECT_BYTES;

  let upstream: Response | null = null;

  if (wantsOriginal) {
    upstream = await driveFetchMedia(id);
  }

  if (!upstream || !upstream.ok) {
    if (!meta.thumbnailLink) {
      fail(res, 404, "no_preview_available");
      return;
    }
    const thumbnailSize = size === "full" ? 2400 : 1024;
    upstream = await fetchThumbnail(meta.thumbnailLink, thumbnailSize);
  }

  if (!upstream || !upstream.ok) {
    fail(res, 502, "image_unavailable");
    return;
  }

  const buffer = Buffer.from(await upstream.arrayBuffer());
  if (buffer.length === 0 || buffer.length > 4_300_000) {
    fail(res, 502, "image_too_large");
    return;
  }

  const upstreamType = upstream.headers.get("content-type") || "";
  const contentType = upstreamType.startsWith("image/")
    ? upstreamType
    : wantsOriginal
      ? meta.mimeType
      : "image/jpeg";

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Length", String(buffer.length));
  res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  res.setHeader("Content-Disposition", "inline");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method === "HEAD") {
    res.status(200).end();
    return;
  }

  res.status(200).send(buffer);
}
