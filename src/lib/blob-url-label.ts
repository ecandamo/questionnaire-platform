/** Best-effort display name from a Vercel Blob (or similar) URL pathname. */
export function fileLabelFromBlobUrl(url: string): string {
  try {
    const path = decodeURIComponent(new URL(url).pathname)
    const leaf = path.split("/").filter(Boolean).pop() ?? "file"
    const stripped = leaf.replace(/^respond-uploads\/\d+-/, "").replace(/^\d+-/, "")
    return stripped || "Uploaded file"
  } catch {
    return "Uploaded file"
  }
}
