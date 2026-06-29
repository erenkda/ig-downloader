import { NextRequest, NextResponse } from "next/server";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export async function GET(request: NextRequest) {
  const mediaUrl = request.nextUrl.searchParams.get("url");
  const filename = request.nextUrl.searchParams.get("filename") ?? "download";

  if (!mediaUrl) {
    return NextResponse.json({ error: "URL gerekli" }, { status: 400 });
  }

  try {
    const parsed = new URL(mediaUrl);
    const allowedHosts = [
      "cdninstagram.com",
      "fbcdn.net",
      "instagram.com",
      "rapidcdn.app",
    ];
    if (!allowedHosts.some((host) => parsed.hostname.includes(host))) {
      return NextResponse.json({ error: "Geçersiz medya kaynağı" }, { status: 400 });
    }

    const response = await fetch(mediaUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Referer: "https://www.instagram.com/",
        Accept: "*/*",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Medya indirilemedi" },
        { status: response.status }
      );
    }

    const contentType =
      response.headers.get("content-type") ?? "application/octet-stream";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "İndirme başarısız" }, { status: 500 });
  }
}
