import { igdl } from "btch-downloader";
import type {
  ContentType,
  MediaItem,
  MediaResult,
  MediaType,
} from "@/lib/types";

export type { ContentType, MediaItem, MediaType };
export type InstagramResult = MediaResult;

interface IgdlResultItem {
  url?: string;
  thumbnail?: string;
}

interface IgdlResponse {
  status?: boolean;
  message?: string;
  url?: string;
  thumbnail?: string;
  result?: IgdlResultItem[];
}

interface ParsedUrl {
  contentType: ContentType;
  username?: string;
  storyId?: string;
  canonicalUrl: string;
}

const INSTAGRAM_PATTERNS = [
  /https?:\/\/(www\.)?instagram\.com\/p\/[\w-]+/i,
  /https?:\/\/(www\.)?instagram\.com\/reel\/[\w-]+/i,
  /https?:\/\/(www\.)?instagram\.com\/reels\/[\w-]+/i,
  /https?:\/\/(www\.)?instagram\.com\/tv\/[\w-]+/i,
  /https?:\/\/(www\.)?instagram\.com\/stories\/[\w.-]+/i,
];

export function isValidInstagramUrl(input: string): boolean {
  return INSTAGRAM_PATTERNS.some((pattern) => pattern.test(input.trim()));
}

export function parseInstagramUrl(input: string): ParsedUrl | null {
  const trimmed = input.trim();
  if (!trimmed || !isValidInstagramUrl(trimmed)) return null;

  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const parts = url.pathname.split("/").filter(Boolean);

  if (parts[0] === "stories" && parts.length >= 2) {
    return {
      contentType: "story",
      username: parts[1],
      storyId: parts[2],
      canonicalUrl: trimmed.split("?")[0],
    };
  }

  if (parts[0] === "reel" || parts[0] === "reels") {
    return {
      contentType: "reel",
      canonicalUrl: `https://www.instagram.com/reel/${parts[1]}/`,
    };
  }

  if (parts[0] === "p" || parts[0] === "tv") {
    return {
      contentType: "post",
      canonicalUrl: `https://www.instagram.com/p/${parts[1]}/`,
    };
  }

  return null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = Buffer.from(payload, "base64url").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function resolveMediaUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const token = parsed.searchParams.get("token");
    if (token) {
      const payload = decodeJwtPayload(token);
      const inner = payload?.url;
      if (typeof inner === "string" && inner.startsWith("http")) {
        return inner;
      }
    }
  } catch {
    /* use original url */
  }
  return url;
}

function isThumbnailOnlyUrl(url: string): boolean {
  return url.toLowerCase().includes("rapidcdn.app/thumb");
}

function detectMediaType(url: string): MediaType {
  const resolved = resolveMediaUrl(url).toLowerCase();

  if (
    resolved.includes(".mp4") ||
    /\/o\d+\/v\//.test(resolved) ||
    resolved.includes("rapidcdn.app/v2")
  ) {
    return "video";
  }

  return "image";
}

function getMediaFingerprint(url: string): string {
  const resolved = resolveMediaUrl(url);
  try {
    const parsed = new URL(resolved);
    const path = parsed.pathname;

    const mp4Match = path.match(/\/([^/]+\.mp4)/i);
    if (mp4Match) return `video:${mp4Match[1]}`;

    const imageMatch = path.match(/\/([^/]+\.(jpg|jpeg|png|webp))/i);
    if (imageMatch) return `image:${imageMatch[1]}`;

    return `${parsed.hostname}${path}`.replace(/\/$/, "");
  } catch {
    return resolved;
  }
}

function dedupeItems(items: MediaItem[]): MediaItem[] {
  const seen = new Set<string>();
  const result: MediaItem[] = [];

  for (const item of items) {
    const fingerprint = getMediaFingerprint(item.url);
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    result.push(item);
  }

  return result;
}

function mapIgdlToItems(data: IgdlResponse): MediaItem[] {
  const rawItems: IgdlResultItem[] = [];

  if (Array.isArray(data.result) && data.result.length > 0) {
    rawItems.push(...data.result);
  } else if (data.url) {
    rawItems.push({ url: data.url, thumbnail: data.thumbnail });
  }

  const items = rawItems
    .filter((item): item is IgdlResultItem & { url: string } => !!item.url?.trim())
    .filter((item) => !isThumbnailOnlyUrl(item.url))
    .map((item) => ({
      url: item.url,
      type: detectMediaType(item.url),
      thumbnail: item.thumbnail || undefined,
    }));

  return dedupeItems(items);
}

export async function fetchInstagramMedia(
  inputUrl: string
): Promise<MediaResult> {
  const parsed = parseInstagramUrl(inputUrl);
  if (!parsed) {
    throw new Error("Geçersiz Instagram bağlantısı");
  }

  const data = (await igdl(parsed.canonicalUrl)) as IgdlResponse;

  if (!data || data.status === false) {
    throw new Error(data?.message ?? "Medya bulunamadı");
  }

  let items = mapIgdlToItems(data);

  if (parsed.contentType === "story" && parsed.storyId) {
    items = items.slice(0, 1);
  }

  if (items.length === 0) {
    throw new Error("İndirme bağlantısı bulunamadı");
  }

  return {
    platform: "instagram",
    contentType: parsed.contentType,
    username: parsed.username,
    items,
  };
}
