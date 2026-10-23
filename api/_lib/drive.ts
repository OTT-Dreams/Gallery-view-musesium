import { getGoogleConfig } from "./env.js";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const MAX_ARTWORKS = 1000;

export type DriveImage = {
  id: string;
  name: string;
  mimeType: string;
  description?: string;
  size?: string;
  thumbnailLink?: string;
  imageMediaMetadata?: {
    width?: number;
    height?: number;
    rotation?: number;
  };
  modifiedTime?: string;
};

export type Artwork = {
  id: string;
  title: string;
  artist?: string;
  description: string;
  width: number;
  height: number;
  thumbUrl: string;
  fullUrl: string;
  order: number;
};

export type CollectionPayload = {
  artworks: Artwork[];
  total: number;
  displayed: number;
};

type DriveListResponse = {
  files?: DriveImage[];
  nextPageToken?: string;
  error?: { message?: string };
};

function withKey(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}key=${encodeURIComponent(getGoogleConfig().apiKey)}`;
}

export async function driveGetJson<T>(
  path: string,
  timeoutMs = 15000
): Promise<{ ok: boolean; status: number; data: T | null }> {
  try {
    const response = await fetch(withKey(`${DRIVE_API}${path}`), {
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store"
    });
    const data = (await response.json().catch(() => null)) as T | null;
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

export async function driveFetchMedia(
  fileId: string,
  timeoutMs = 25000
): Promise<Response | null> {
  try {
    return await fetch(
      withKey(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`),
      {
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store"
      }
    );
  } catch {
    return null;
  }
}

function titleFromFilename(filename: string): string {
  const withoutExtension = filename.replace(/\.[^.]+$/, "");
  const cleaned = withoutExtension
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^\s*\d{1,3}\s*[.)-]\s*/, "")
    .trim();
  return cleaned || "Untitled";
}

function parseDescription(raw: string | undefined): { artist?: string; description: string } {
  if (!raw?.trim()) {
    return { description: "From the private collection." };
  }

  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  let artist: string | undefined;
  const remaining: string[] = [];

  for (const line of lines) {
    const match = line.match(/^\s*(?:artist|by)\s*[:\-—]\s*(.+?)\s*$/i);
    if (match && !artist) {
      artist = match[1];
    } else {
      remaining.push(line);
    }
  }

  const description = remaining.join("\n").trim();
  return {
    artist,
    description: description || "From the private collection."
  };
}

function imageDimensions(file: DriveImage): { width: number; height: number } {
  const width = file.imageMediaMetadata?.width;
  const height = file.imageMediaMetadata?.height;
  const rotation = file.imageMediaMetadata?.rotation || 0;
  if (width && height) {
    return rotation === 90 || rotation === 270
      ? { width: height, height: width }
      : { width, height };
  }
  return { width: 4, height: 3 };
}

function toArtwork(file: DriveImage, index: number): Artwork {
  const { artist, description } = parseDescription(file.description);
  const dimensions = imageDimensions(file);
  const encodedId = encodeURIComponent(file.id);
  return {
    id: file.id,
    title: titleFromFilename(file.name),
    artist,
    description,
    width: dimensions.width,
    height: dimensions.height,
    thumbUrl: `/api/media?id=${encodedId}&size=thumb`,
    fullUrl: `/api/media?id=${encodedId}&size=full`,
    order: index
  };
}

let collectionCache:
  | { key: string; expiresAt: number; payload: CollectionPayload }
  | null = null;

export async function listArtworks(): Promise<CollectionPayload> {
  const folderId = getGoogleConfig().folderId;
  const cacheKey = folderId;
  if (collectionCache && collectionCache.key === cacheKey && collectionCache.expiresAt > Date.now()) {
    return collectionCache.payload;
  }

  const files: DriveImage[] = [];
  let pageToken: string | undefined;
  let page = 0;

  while (page < 12 && files.length < MAX_ARTWORKS) {
    const params = new URLSearchParams({
      q: `'${folderId.replace(/'/g, "\\'")}' in parents and trashed = false and mimeType contains 'image/'`,
      fields:
        "nextPageToken,files(id,name,mimeType,description,size,thumbnailLink,imageMediaMetadata(width,height,rotation),modifiedTime)",
      pageSize: "100",
      orderBy: "name_natural",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true"
    });
    if (pageToken) params.set("pageToken", pageToken);

    const response = await driveGetJson<DriveListResponse>(`/files?${params.toString()}`);
    if (!response.ok || !response.data) {
      throw new Error("drive_list_failed");
    }

    files.push(...(response.data.files || []));
    pageToken = response.data.nextPageToken;
    page += 1;
    if (!pageToken) break;
  }

  const selected = files.slice(0, MAX_ARTWORKS);
  const payload: CollectionPayload = {
    artworks: selected.map(toArtwork),
    total: files.length,
    displayed: selected.length
  };

  collectionCache = {
    key: cacheKey,
    expiresAt: Date.now() + 45_000,
    payload
  };

  return payload;
}

export function resizeThumbnail(url: string, size: number): string {
  const normalized = url.trim();
  if (/=s\d+$/i.test(normalized)) {
    return normalized.replace(/=s\d+$/i, `=s${size}`);
  }
  if (/=w\d+-h\d+$/i.test(normalized)) {
    return normalized.replace(/=w\d+-h\d+$/i, `=s${size}`);
  }
  return normalized;
}

export function isBrowserSafeImage(mimeType: string): boolean {
  return /^image\/(jpeg|jpg|png|webp|gif|avif)$/i.test(mimeType);
}
