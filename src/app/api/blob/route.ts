import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"

const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const

const MAX_BYTES = 50 * 1024 * 1024

function pathLooksSafe(pathname: string): boolean {
  if (!pathname || pathname.length > 512) return false
  if (pathname.includes("..") || pathname.startsWith("/")) return false
  const base = pathname.split("/").pop() ?? pathname
  const ext = base.split(".").pop()?.toLowerCase()
  return (
    ext != null &&
    ["pdf", "doc", "docx", "xls", "xlsx", "png", "jpg", "jpeg", "gif", "webp"].includes(ext)
  )
}

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "File uploads are not configured. Set BLOB_READ_WRITE_TOKEN." },
      { status: 503 },
    )
  }

  let body: HandleUploadBody
  try {
    body = (await request.json()) as HandleUploadBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathLooksSafe(pathname)) {
          throw new Error("Invalid file: use PDF, Word, Excel, or common image types only.")
        }
        return {
          allowedContentTypes: [...ALLOWED_CONTENT_TYPES],
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
        }
      },
    })
    return NextResponse.json(jsonResponse)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload rejected"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
