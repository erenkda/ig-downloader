import { NextRequest, NextResponse } from "next/server";
import { fetchMedia } from "@/lib/fetch-media";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = body?.url;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Instagram veya TikTok bağlantısı gerekli" },
        { status: 400 }
      );
    }

    const result = await fetchMedia(url);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
