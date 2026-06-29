"use client";

import { useState } from "react";
import {
  buildFilename,
  type ContentType,
  type InstagramResult,
  type MediaItem,
} from "@/lib/instagram";

const CONTENT_LABELS: Record<ContentType, string> = {
  post: "Gönderi",
  reel: "Reels",
  story: "Story",
};

function DownloadIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function LoaderIcon() {
  return (
    <svg
      className="animate-spin"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function MediaCard({
  item,
  index,
  contentType,
  username,
  onCopy,
}: {
  item: MediaItem;
  index: number;
  contentType: ContentType;
  username?: string;
  onCopy: (url: string) => void;
}) {
  const filename = buildFilename(contentType, item.type, index, username);
  const downloadUrl = `/api/proxy?url=${encodeURIComponent(item.url)}&filename=${encodeURIComponent(filename)}`;
  const previewUrl =
    item.type === "video" && item.thumbnail ? item.thumbnail : item.url;

  const handleDownload = async () => {
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error("İndirme başarısız");

    if (item.type === "image") {
      const blob = await response.blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Görsel işlenemedi");
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();

      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("PNG oluşturulamadı"))),
          "image/png"
        );
      });

      const objectUrl = URL.createObjectURL(pngBlob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
      return;
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-all duration-300 hover:border-white/25 hover:bg-white/[0.06]">
      <div className="aspect-square overflow-hidden bg-black">
        {item.type === "video" ? (
          <video
            src={item.url}
            controls
            muted
            playsInline
            className="h-full w-full object-cover"
            poster={item.thumbnail}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={`Medya ${index + 1}`}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/20 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider text-white/70">
            {item.type === "video" ? "MP4" : "PNG"}
          </span>
          {index > 0 && (
            <span className="text-xs text-white/40">#{index + 1}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onCopy(item.url)}
            className="rounded-full border border-white/20 px-3 py-2 text-xs text-white/70 transition-all hover:border-white/40 hover:text-white"
          >
            Linki Kopyala
          </button>
          <button
            type="button"
            onClick={() => void handleDownload()}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-all hover:bg-white/90 active:scale-95"
          >
            <DownloadIcon />
            İndir
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Downloader() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InstagramResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Bir hata oluştu");
      }

      setResult(data as InstagramResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text);
    } catch {
      /* clipboard denied */
    }
  };

  const copyLink = async (mediaUrl: string) => {
    try {
      await navigator.clipboard.writeText(mediaUrl);
    } catch {
      setError("Link kopyalanamadı");
    }
  };

  const downloadAll = async () => {
    if (!result) return;
    for (const [index, item] of result.items.entries()) {
      const filename = buildFilename(
        result.contentType,
        item.type,
        index,
        result.username
      );
      const response = await fetch(
        `/api/proxy?url=${encodeURIComponent(item.url)}&filename=${encodeURIComponent(filename)}`
      );
      if (!response.ok) continue;

      let blob = await response.blob();

      if (item.type === "image") {
        const bitmap = await createImageBitmap(blob);
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0);
          blob =
            (await new Promise<Blob | null>((resolve) =>
              canvas.toBlob(resolve, "image/png")
            )) ?? blob;
        }
        bitmap.close();
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    }
  };

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-4">
      <header className="text-center">
        <div className="mb-6 inline-flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/5">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
            >
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1.5" fill="white" stroke="none" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white ">
            InstaSave
          </h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative flex flex-col gap-1 sm:flex-row">
          <div className="relative flex-1">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.instagram.com/reel/..."
              className="w-full rounded-2xl border border-white/15 bg-white/[0.04] px-5 py-4 pr-24 text-sm text-white placeholder:text-white/30 outline-none transition-all focus:border-white/40 focus:bg-white/[0.07] sm:text-base"
              disabled={loading}
            />
            <button
              type="button"
              onClick={handlePaste}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1.5 text-xs font-medium text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
            >
              Yapıştır
            </button>
          </div>
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-sm font-semibold text-black transition-all hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40 sm:text-base"
          >
            {loading ? (
              <>
                <LoaderIcon />
                Analiz ediliyor...
              </>
            ) : (
              "İndir"
            )}
          </button>
        </div>
      </form>

      <div className="flex flex-wrap justify-center gap-3">
        {(["reel", "post", "story"] as ContentType[]).map((type) => (
          <span
            key={type}
            className="rounded-full border border-white/10 px-4 py-1.5 text-xs text-white/40"
          >
            {CONTENT_LABELS[type]}
          </span>
        ))}
      </div>

      {error && (
        <div className="w-full rounded-2xl border border-white/20 bg-white/[0.03] px-5 py-4 text-center text-sm text-white/70">
          {error}
        </div>
      )}

      {result && (
        <div className="w-full animate-fade-in">
          <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-full bg-white px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-black">
                  {CONTENT_LABELS[result.contentType]}
                </span>
                {result.username && (
                  <span className="text-sm text-white/50">
                    @{result.username}
                  </span>
                )}
              </div>
              {result.caption && (
                <p className="line-clamp-2 max-w-lg text-sm text-white/40">
                  {result.caption}
                </p>
              )}
            </div>

            {result.items.length > 1 && result.contentType !== "story" && (
              <button
                onClick={downloadAll}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition-all hover:border-white/40 hover:bg-white/5"
              >
                <DownloadIcon />
                Tümünü İndir ({result.items.length})
              </button>
            )}
          </div>

          <div
            className={`grid gap-4 ${
              result.items.length > 1
                ? "grid-cols-1 sm:grid-cols-2"
                : "grid-cols-1"
            }`}
          >
            {result.items.map((item, index) => (
              <MediaCard
                key={`${item.url}-${index}`}
                item={item}
                index={index}
                contentType={result.contentType}
                username={result.username}
                onCopy={copyLink}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
