/**
 * GET /api/files/[contentId]           — proxy Cloudinary file inline
 * GET /api/files/[contentId]?download  — proxy with Content-Disposition: attachment
 *
 * Proxies the Cloudinary file server-side so the browser always receives the
 * correct Content-Type.  A plain 302 redirect to Cloudinary does NOT work for
 * PDFs because Cloudinary serves "raw" resources as application/octet-stream
 * (no file extension in the public_id), which prevents the browser's PDF viewer
 * from rendering it.  Proxying lets us inject the stored mimeType ourselves.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth }              from "@/auth";
import connectDB             from "@/lib/db/mongoose";
import { Content }           from "@/models";
import { makeDownloadUrl }   from "@/lib/cloudinary";
import { httpClient }        from "@/lib/extractors/http-client";
import mongoose              from "mongoose";

type Params = { params: Promise<{ contentId: string }> };

/** Derive a best-effort MIME type from the stored contentType field (fallback for old uploads). */
function mimeFromContentType(ct: string | undefined): string | undefined {
  switch (ct) {
    case "pdf":        return "application/pdf";
    case "image":
    case "screenshot": return "image/jpeg";
    default:           return undefined;
  }
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    const userId  = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contentId } = await params;
    if (!mongoose.isValidObjectId(contentId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await connectDB();

    const doc = await Content.findOne({
      _id:    new mongoose.Types.ObjectId(contentId),
      userId: new mongoose.Types.ObjectId(userId),
    })
      .select("fileUrl cloudinaryPublicId mimeType contentType title")
      .lean() as {
        fileUrl?:           string;
        cloudinaryPublicId?: string;
        mimeType?:          string;
        contentType?:       string;
        title?:             string;
      } | null;

    if (!doc?.fileUrl) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const isDownload    = req.nextUrl.searchParams.has("download");
    const cloudinaryUrl = isDownload ? makeDownloadUrl(doc.fileUrl) : doc.fileUrl;

    // Fetch from Cloudinary server-side — bypasses Zscaler TLS and lets us set correct headers
    let data: Buffer;
    let contentType: string;
    try {
      const resp = await httpClient.get<ArrayBuffer>(cloudinaryUrl, {
        responseType: "arraybuffer",
        timeout:      30_000,
      });
      data = Buffer.from(resp.data);

      // Priority: stored mimeType > content-type derived from our enum > Cloudinary header
      // Cloudinary returns "application/octet-stream" for raw uploads — useless for PDF preview.
      const respCt   = (resp.headers["content-type"] as string | undefined)?.split(";")[0].trim();
      contentType    = doc.mimeType
        ?? mimeFromContentType(doc.contentType)
        ?? (respCt !== "application/octet-stream" ? respCt : undefined)
        ?? "application/octet-stream";
    } catch (err) {
      console.error("[GET /api/files] Cloudinary fetch failed:", err);
      return NextResponse.json({ error: "Failed to fetch file" }, { status: 502 });
    }

    const headers: Record<string, string> = {
      "Content-Type":        contentType,
      "Content-Length":      String(data.byteLength),
      "Cache-Control":       "private, max-age=3600",
    };

    if (isDownload) {
      const ext      = contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
      const baseName = (doc.title ?? "file").replace(/[^a-zA-Z0-9._\- ]/g, "_").slice(0, 100);
      const filename = baseName.includes(".") ? baseName : `${baseName}.${ext}`;
      headers["Content-Disposition"] = `attachment; filename="${encodeURIComponent(filename)}"`;
    } else {
      // Explicitly tell the browser to render inline — prevents download prompt
      headers["Content-Disposition"] = "inline";
    }

    return new NextResponse(new Uint8Array(data), { status: 200, headers });
  } catch (err) {
    console.error("[GET /api/files/[contentId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
