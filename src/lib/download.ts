export function buildProxyUrl(mediaUrl: string, filename: string): string {
  const params = new URLSearchParams({
    url: mediaUrl,
    filename,
  });
  return `/api/proxy?${params.toString()}`;
}

export function triggerDownload(downloadUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function triggerDownloadAll(
  items: { url: string; filename: string }[]
): Promise<void> {
  for (const [index, item] of items.entries()) {
    if (index > 0) {
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    triggerDownload(item.url, item.filename);
  }
}
