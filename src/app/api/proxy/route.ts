import { NextRequest, NextResponse } from "next/server";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const ALLOWED_HOSTS = [
  "cdninstagram.com",
  "fbcdn.net",
  "instagram.com",
  "rapidcdn.app",
  "tiktokcdn.com",
  "tiktokcdn-us.com",
  "tiktokv.com",
  "tiktokio.com",
  "muscdn.com",
  "byteoversea.com",
  "ibyteimg.com",
  "tiktok.com",
  "tokcdn.net",
  "tiktokv.eu",
];

function isAllowedMediaUrl(parsed: URL): boolean {
  if (ALLOWED_HOSTS.some((host) => parsed.hostname.includes(host))) {
    return true;
  }

  return parsed.pathname.includes("tiktok-dl.php");
}

function getReferer(hostname: string): string {
  if (
    hostname.includes("tiktok") ||
    hostname.includes("tiktokio") ||
    hostname.includes("muscdn") ||
    hostname.includes("byteoversea")
  ) {
    return "https://www.tiktok.com/";
  }
  return "https://www.instagram.com/";
}

function getContentType(filename: string, upstream: string | null): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "mp4") return "video/mp4";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  return upstream ?? "application/octet-stream";
}

function buildContentDisposition(filename: string): string {
  const safe = filename.replace(/[^\w.\-() ]/g, "_");
  return `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(request: NextRequest) {
  const mediaUrl = request.nextUrl.searchParams.get("url");
  const filename = request.nextUrl.searchParams.get("filename") ?? "download";

  if (!mediaUrl) {
    return NextResponse.json({ error: "URL gerekli" }, { status: 400 });
  }

  try {
    const parsed = new URL(mediaUrl);
    if (!isAllowedMediaUrl(parsed)) {
      return NextResponse.json({ error: "Geçersiz medya kaynağı" }, { status: 400 });
    }

    const response = await fetch(mediaUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Referer: getReferer(parsed.hostname),
        Accept: "*/*",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Medya indirilemedi" },
        { status: response.status }
      );
    }

    const upstreamType = response.headers.get("content-type");
    const contentType = getContentType(filename, upstreamType);
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": buildContentDisposition(filename),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "İndirme başarısız" }, { status: 500 });
  }
}
