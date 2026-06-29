import { aio, ttdl } from "btch-downloader";
import type { ContentType, MediaItem, MediaResult } from "@/lib/types";

const TIKTOK_PATTERNS = [
  /https?:\/\/((www|m|vm|vt)\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/i,
  /https?:\/\/((www|m|vm|vt)\.)?tiktok\.com\/@[\w.-]+\/photo\/\d+/i,
  /https?:\/\/((www|m|vm|vt)\.)?tiktok\.com\/t\/[\w-]+/i,
  /https?:\/\/vm\.tiktok\.com\/[\w-]+/i,
  /https?:\/\/vt\.tiktok\.com\/[\w-]+/i,
];

type TtdlResponse = Record<string, unknown> & {
  status?: boolean | string;
  message?: string;
  title?: string;
  thumbnail?: string;
  video?: string[] | string;
  audio?: string[] | string;
};

export function isValidTikTokUrl(input: string): boolean {
  const url = extractTikTokUrl(input);
  return url !== null;
}

export function extractTikTokUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const embedded = trimmed.match(
    /https?:\/\/(?:www\.|m\.|vm\.|vt\.)?tiktok\.com\/[^\s"'<>]+/i
  );
  const candidate = (embedded?.[0] ?? trimmed).replace(/[)\]}>.,!?]+$/, "");

  if (TIKTOK_PATTERNS.some((pattern) => pattern.test(candidate))) {
    return candidate;
  }

  return null;
}

function parseTikTokUsername(url: string): string | undefined {
  const match = url.match(/tiktok\.com\/@([\w.-]+)/i);
  return match?.[1];
}

function isTruthyStatus(status: unknown): boolean {
  return (
    status === true ||
    status === "true" ||
    status === 1 ||
    status === "1" ||
    status === "ok"
  );
}

function isVideoDownloadUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (!lower.startsWith("http")) return false;

  if (/\.(jpe?g|png|webp|gif|heic)(\?|$|#)/i.test(lower)) return false;
  if (lower.includes(".image?") || lower.includes("tplv-tiktokx-origin.image")) {
    return false;
  }

  return (
    lower.includes("tiktokio.com") ||
    lower.includes("tiktok-dl.php") ||
    lower.includes("original") ||
    lower.includes(".mp4") ||
    lower.includes("no_watermark") ||
    lower.includes("nowm") ||
    lower.includes("muscdn") ||
    (lower.includes("tokcdn") && !lower.includes(".image"))
  );
}

function prioritizeNoWatermark(urls: string[]): string[] {
  const preferred = urls.filter((url) => {
    const lower = url.toLowerCase();
    return (
      lower.includes("original") ||
      lower.includes("nowm") ||
      lower.includes("no_watermark") ||
      lower.includes("without_watermark")
    );
  });

  return preferred.length > 0 ? preferred : urls;
}

function extractVideoUrls(data: TtdlResponse): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  const add = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || !isVideoDownloadUrl(trimmed) || seen.has(trimmed)) return;
    seen.add(trimmed);
    urls.push(trimmed);
  };

  const video = data.video;
  if (typeof video === "string") add(video);
  else if (Array.isArray(video)) video.forEach((v) => typeof v === "string" && add(v));

  const knownKeys = [
    "video_url",
    "download",
    "play",
    "no_watermark",
    "nowm",
    "url",
    "hd",
    "sd",
  ] as const;

  for (const key of knownKeys) {
    const value = data[key];
    if (typeof value === "string") add(value);
  }

  const walk = (value: unknown) => {
    if (typeof value === "string") {
      if (isVideoDownloadUrl(value)) add(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (value && typeof value === "object") {
      Object.values(value).forEach(walk);
    }
  };

  walk(data.result);
  walk(data.data);

  return prioritizeNoWatermark(urls);
}

function buildUrlVariants(url: string): string[] {
  const variants = new Set<string>([url, url.split("?")[0], url.split("#")[0]]);

  try {
    const parsed = new URL(url.includes("://") ? url : `https://${url}`);
    parsed.hostname = parsed.hostname.replace(/^m\./, "www.");
    variants.add(parsed.toString().replace(/\/$/, ""));
    variants.add(`${parsed.origin}${parsed.pathname}`);
  } catch {
    /* ignore invalid url */
  }

  return [...variants].filter(Boolean);
}

async function fetchTtdlResponse(url: string): Promise<TtdlResponse> {
  return (await ttdl(url)) as unknown as TtdlResponse;
}

async function resolveTikTokData(
  inputUrl: string
): Promise<{ data: TtdlResponse; videoUrls: string[] }> {
  const variants = buildUrlVariants(inputUrl);
  let lastData: TtdlResponse | null = null;

  for (const variant of variants) {
    try {
      const data = await fetchTtdlResponse(variant);
      lastData = data;

      if (!isTruthyStatus(data.status)) continue;

      const videoUrls = extractVideoUrls(data);
      if (videoUrls.length > 0) {
        return { data, videoUrls };
      }
    } catch {
      /* try next variant */
    }
  }

  try {
    const aioData = (await aio(inputUrl)) as unknown as TtdlResponse;
    lastData = aioData;

    const nestedStatus =
      aioData.data && typeof aioData.data === "object"
        ? (aioData.data as TtdlResponse).status
        : undefined;

    if (isTruthyStatus(aioData.status) || isTruthyStatus(nestedStatus)) {
      const videoUrls = extractVideoUrls(aioData);
      if (videoUrls.length > 0) {
        return { data: aioData, videoUrls };
      }
    }
  } catch {
    /* fall through */
  }

  if (lastData && !isTruthyStatus(lastData.status)) {
    throw new Error(
      typeof lastData.message === "string"
        ? lastData.message
        : "TikTok videosu bulunamadı"
    );
  }

  throw new Error(
    "Filigransız video bulunamadı. Link geçerli mi ve video herkese açık mı kontrol edin."
  );
}

export async function fetchTikTokMedia(inputUrl: string): Promise<MediaResult> {
  const extracted = extractTikTokUrl(inputUrl);
  if (!extracted) {
    throw new Error("Geçersiz TikTok bağlantısı");
  }

  const { data, videoUrls } = await resolveTikTokData(extracted);

  const thumbnail =
    typeof data.thumbnail === "string"
      ? data.thumbnail
      : data.data &&
          typeof data.data === "object" &&
          typeof (data.data as TtdlResponse).thumbnail === "string"
        ? (data.data as TtdlResponse).thumbnail
        : undefined;

  const title =
    typeof data.title === "string"
      ? data.title
      : data.data &&
          typeof data.data === "object" &&
          typeof (data.data as TtdlResponse).title === "string"
        ? (data.data as TtdlResponse).title
        : undefined;

  const items: MediaItem[] = videoUrls.map((videoUrl) => ({
    url: videoUrl,
    type: "video" as const,
    thumbnail,
  }));

  return {
    platform: "tiktok",
    contentType: "tiktok" satisfies ContentType,
    username: parseTikTokUsername(extracted),
    caption: title,
    items,
  };
}
