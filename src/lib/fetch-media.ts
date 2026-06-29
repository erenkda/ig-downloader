import { fetchInstagramMedia, isValidInstagramUrl } from "@/lib/instagram";
import { fetchTikTokMedia, isValidTikTokUrl } from "@/lib/tiktok";
import type { MediaResult } from "@/lib/types";

export function detectPlatform(
  url: string
): "instagram" | "tiktok" | null {
  if (isValidInstagramUrl(url)) return "instagram";
  if (isValidTikTokUrl(url)) return "tiktok";
  return null;
}

export async function fetchMedia(inputUrl: string): Promise<MediaResult> {
  const platform = detectPlatform(inputUrl);

  if (platform === "instagram") {
    return fetchInstagramMedia(inputUrl);
  }

  if (platform === "tiktok") {
    return fetchTikTokMedia(inputUrl);
  }

  throw new Error(
    "Geçersiz bağlantı. Instagram veya TikTok linki yapıştırın."
  );
}
