/**
 * GET /api/download?url={encodedUrl}&filename={name}
 *
 * Auth-checked proxy downloader.
 * Fetches the remote resource server-side (bypasses CORS + Zscaler),
 * then streams it back to the browser with Content-Disposition: attachment.
 *
 * Supported use-cases:
 *   • URL-saved images   (contentType: image / screenshot)
 *   • URL-saved PDFs     (contentType: pdf)
 *
 * YouTube / social-media video URLs are intentionally NOT supported —
 * downloading YouTube content violates their Terms of Service.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth }          from "@/auth";
import { httpClient }    from "@/lib/extractors/http-client";

// Allowed content-type prefixes — reject anything that isn't a file
const ALLOWED_MIME_PREFIXES = [
  "image/",
  "application/pdf",
  "application/octet-stream",
  "video/",
  "audio/",
];

function isAllowedMime(mime: string): boolean {
  return ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p));
}

// Block known streaming / social platforms — can't download these
const BLOCKED_HOSTS = [
  "youtube.com", "youtu.be",
  "twitter.com", "x.com", "t.co",
  "tiktok.com",
  "instagram.com",
  "spotify.com",
  "netflix.com",
];

function isBlockedHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return BLOCKED_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`));
  } catch {
    return true;
  }
}

export async function GET(req: NextRequest) {
  try {
    // Auth
    const session = await auth();
    const userId  = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const rawUrl  = searchParams.get("url");
    const name    = searchParams.get("filename") ?? "download";

    if (!rawUrl) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    // Validate URL
    let targetUrl: string;
    try {
      targetUrl = decodeURIComponent(rawUrl);
      new URL(targetUrl); // throws if invalid
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Block streaming platforms
    if (isBlockedHost(targetUrl)) {
      return NextResponse.json(
        { error: "Downloading from this platform is not supported" },
        { status: 422 }
      );
    }

    // Fetch from origin (server-side, bypasses CORS + Zscaler TLS)
    let data: Buffer;
    let contentType: string;
    try {
      const resp = await httpClient.get<ArrayBuffer>(targetUrl, {
        responseType: "arraybuffer",
        timeout:      30_000,
      });
      data        = Buffer.from(resp.data);
      contentType = (resp.headers["content-type"] as string | undefined) ?? "application/octet-stream";
      // Strip charset / boundary params — keep only mime type
      contentType = contentType.split(";")[0].trim();
    } catch (err) {
      console.error("[Download] Fetch failed:", err);
      return NextResponse.json({ error: "Failed to fetch the file" }, { status: 502 });
    }

    if (!isAllowedMime(contentType)) {
      return NextResponse.json(
        { error: `Content type "${contentType}" cannot be downloaded` },
        { status: 422 }
      );
    }

    // Derive a safe filename with extension
    const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
    const safeBase = name.replace(/[^a-zA-Z0-9._\- ]/g, "_").slice(0, 100);
    const filename  = safeBase.includes(".") ? safeBase : `${safeBase}.${ext}`;

    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type":        contentType,
        "Content-Length":      String(data.byteLength),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Cache-Control":       "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[GET /api/download]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
