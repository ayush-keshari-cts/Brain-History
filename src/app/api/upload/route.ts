/**
 * POST /api/upload
 *
 * Architecture:
 *
 *   ┌─ buffer ──────────────────────────────────────────────────────────┐
 *   │                                                                   │
 *   │  ① uploadToCloudinary()        ② extractText()                   │
 *   │     → fileUrl (CDN link)           → rawText, title, metadata    │
 *   │     → cloudinaryPublicId                                          │
 *   │              ↓  (both in parallel)         ↓                     │
 *   │         Content doc created  (fileUrl + rawText both set)        │
 *   │                          ↓                                       │
 *   │             ③ indexContent() — async, non-blocking               │
 *   │                passes fileUrl into every chunk's metadata        │
 *   │                so vector search results reference original file  │
 *   └───────────────────────────────────────────────────────────────────┘
 *
 * Eye icon:   shows original file (Cloudinary CDN)
 * Search:     uses vector chunks (Atlas) — each chunk carries fileUrl
 */

import { NextRequest, NextResponse }                from "next/server";
import { auth }                                      from "@/auth";
import connectDB                                     from "@/lib/db/mongoose";
import { Content }                                   from "@/models";
import { getEmbeddingService }                       from "@/lib/embeddings";
import { ContentType, ContentSize, ProcessingStatus } from "@/types";
import type { ExtractedContent, PlatformMetadata }   from "@/types";
import mongoose                                      from "mongoose";
import { v4 as uuidv4 }                              from "uuid";
import sharp                                         from "sharp";
import { parsePdfBuffer, parseWordBuffer }           from "@/lib/extractors/document-parser";
import { uploadToCloudinary, getResourceType, makeThumbnailUrl } from "@/lib/cloudinary";

// ─── MIME → ContentType ───────────────────────────────────────────────────────

function mimeToContentType(mime: string, filename: string): ContentType {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (mime === "application/pdf" || ext === "pdf")                                       return ContentType.PDF;
  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "application/msword" || ext === "docx" || ext === "doc"
  )                                                                                       return ContentType.PDF;
  if (mime.startsWith("image/"))                                                          return ContentType.IMAGE;
  if (mime.startsWith("audio/"))                                                          return ContentType.SPOTIFY;
  if (mime.startsWith("video/"))                                                          return ContentType.YOUTUBE_VIDEO;
  return ContentType.UNKNOWN;
}

function isDocumentType(mime: string, filename: string): "pdf" | "docx" | "doc" | null {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) return "docx";
  if (mime === "application/msword" || ext === "doc") return "doc";
  return null;
}

// ─── Text extractors ──────────────────────────────────────────────────────────

type ExtractResult = Pick<ExtractedContent, "title" | "description" | "rawText" | "metadata" | "isLarge">
  & { author?: string };

async function extractText(
  buffer: Buffer,
  docType: "pdf" | "docx" | "doc" | null,
  mime:     string,
  filename: string,
): Promise<ExtractResult> {
  if (docType) {
    const parsed   = docType === "pdf"
      ? await parsePdfBuffer(buffer)
      : await parseWordBuffer(buffer);
    const baseName = filename.replace(/\.(pdf|docx|doc)$/i, "");
    const title    = parsed.title || baseName;
    return {
      title,
      author:      parsed.author,
      description: parsed.subject || parsed.text.slice(0, 200),
      rawText:     parsed.text,
      isLarge:     parsed.isLarge,
      metadata: {
        title,
        author:        parsed.author    || undefined,
        subject:       parsed.subject   || undefined,
        keywords:      parsed.keywords  ?? [],
        pageCount:     parsed.pageCount ?? 0,
        body:          parsed.text,
        fileSizeBytes: buffer.byteLength,
      } as PlatformMetadata,
    };
  }

  if (mime.startsWith("image/")) {
    const meta = await sharp(buffer).metadata();
    return {
      title:       filename,
      description: `${meta.width ?? "?"}×${meta.height ?? "?"} image`,
      rawText:     filename,
      isLarge:     false,
      metadata: {
        alt:           filename,
        width:         meta.width,
        height:        meta.height,
        mimeType:      mime,
        fileSizeBytes: buffer.byteLength,
      } as PlatformMetadata,
    };
  }

  // Audio / Video
  const kind = mime.startsWith("audio/") ? "Audio" : "Video";
  return {
    title:       filename,
    description: `${kind} file — ${filename}`,
    rawText:     filename,
    isLarge:     false,
    metadata: {
      title:         filename,
      description:   `${kind} file`,
      body:          filename,
      fileSizeBytes: buffer.byteLength,
    } as PlatformMetadata,
  };
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId  = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file field" }, { status: 400 });
    }
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds 50 MB limit" }, { status: 413 });
    }

    const mime         = file.type || "application/octet-stream";
    const filename     = file.name ?? "upload";
    const buffer       = Buffer.from(await file.arrayBuffer());
    const contentType  = mimeToContentType(mime, filename);
    const docType      = isDocumentType(mime, filename);
    const resourceType = getResourceType(mime);
    const fakeUrl      = `brainhistory://upload/${userId}/${uuidv4()}/${encodeURIComponent(filename)}`;

    // ── ① + ② Run Cloudinary upload AND text extraction IN PARALLEL ──────────
    const [cloudinaryResult, extractionResult] = await Promise.allSettled([
      uploadToCloudinary(buffer, {
        folder:           `brainhistory/${userId}`,
        publicId:         uuidv4(),          // UUID — independent of MongoDB _id
        resourceType,
        originalFilename: filename,
      }),
      extractText(buffer, docType, mime, filename),
    ]);

    // Text extraction is required
    if (extractionResult.status === "rejected") {
      return NextResponse.json(
        { error: "Failed to process file", details: String(extractionResult.reason) },
        { status: 422 }
      );
    }
    const extracted = extractionResult.value;

    // Cloudinary is best-effort (preview unavailable if it fails, but still indexed)
    const fileUrl            = cloudinaryResult.status === "fulfilled" ? cloudinaryResult.value.secure_url : undefined;
    const cloudinaryPublicId = cloudinaryResult.status === "fulfilled" ? cloudinaryResult.value.public_id  : undefined;
    // Derive thumbnail: resized image or video first-frame JPEG — pure Cloudinary URL, no proxy
    const thumbnail          = fileUrl ? makeThumbnailUrl(fileUrl, mime) : undefined;

    if (cloudinaryResult.status === "rejected") {
      console.error("[Upload] Cloudinary upload failed:", cloudinaryResult.reason);
    }

    const contentSize = extracted.isLarge ? ContentSize.LARGE : ContentSize.SMALL;

    await connectDB();
    const userObjId = new mongoose.Types.ObjectId(userId);

    // ── Create Content doc — fileUrl already set (no second update needed) ───
    const content = await Content.create({
      userId:             userObjId,
      url:                fakeUrl,
      contentType,
      platform:           "upload",
      title:              extracted.title || filename,
      description:        extracted.description,
      author:             extracted.author,
      thumbnail,                              // ← Cloudinary thumbnail URL
      rawText:            extracted.rawText,
      rawTextLength:      extracted.rawText.length,
      metadata:           extracted.metadata as Record<string, unknown>,
      contentSize,
      tags:               [],
      processingStatus:   ProcessingStatus.PENDING,
      fileUrl,
      cloudinaryPublicId,
    });

    const contentId = (content._id as mongoose.Types.ObjectId).toString();

    // ── ③ Kick off embeddings async — carries fileUrl into every chunk ────────
    getEmbeddingService()
      .indexContent(
        content._id as mongoose.Types.ObjectId,
        userObjId,
        {
          url:         fakeUrl,
          contentType,
          title:       extracted.title || filename,
          description: extracted.description,
          rawText:     extracted.rawText,
          metadata:    extracted.metadata as PlatformMetadata,
          isLarge:     contentSize === ContentSize.LARGE,
          extractedAt: new Date(),
          platform:    "upload",
          fileUrl,          // ← stored in every vector chunk's metadata
        }
      )
      .catch((err: unknown) => {
        console.error("[Upload embed] failed for", contentId, err);
        Content.findByIdAndUpdate(content._id, {
          processingStatus: ProcessingStatus.FAILED,
          processingError:  String(err),
        }).exec();
      });

    return NextResponse.json(
      {
        success:     true,
        contentId,
        contentType,
        title:       extracted.title || filename,
        isLarge:     contentSize === ContentSize.LARGE,
        fileUrl,
        thumbnail,
        message:     "File uploaded and indexing started",
      },
      { status: 201 }
    );

  } catch (err) {
    console.error("[POST /api/upload]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
