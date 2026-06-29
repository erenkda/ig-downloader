export type MediaType = "video" | "image";
export type Platform = "instagram" | "tiktok";
export type ContentType = "post" | "reel" | "story" | "tiktok";

export interface MediaItem {
  url: string;
  type: MediaType;
  thumbnail?: string;
}

export interface MediaResult {
  platform: Platform;
  contentType: ContentType;
  username?: string;
  caption?: string;
  items: MediaItem[];
}

export function getFileExtension(type: MediaType): string {
  return type === "video" ? "mp4" : "png";
}

export function buildFilename(
  contentType: ContentType,
  type: MediaType,
  index: number,
  username?: string,
  platform: Platform = "instagram"
): string {
  const ext = getFileExtension(type);
  const prefix = username ? `${username}_` : "";
  const suffix = index > 0 ? `_${index + 1}` : "";
  const label =
    platform === "tiktok" ? "tiktok" : `instagram_${contentType}`;
  return `${prefix}${label}${suffix}.${ext}`;
}
