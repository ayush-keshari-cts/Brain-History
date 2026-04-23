/**
 * POST /api/upload  — Upload a local file and index it
 *
 * Body: multipart/form-data with a "file" field.
 * Max size: 50 MB.
 *
 * Supported file types:
 *   PDF         (.pdf)              — full text extraction
 *   Word        (.docx, .doc)       — full text extraction via mammoth
 *   Images      (.jpg .png .gif .webp .svg)
 *   Audio       (.mp3 .wav .m4a .ogg .flac)
 *   Video       (.mp4 .webm .mov .avi)
 *
 * Files are stored in Cloudinary under:  brainhistory/{userId}/{contentId}
 * Returns same shape as POST /api/content plus fileUrl.
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
import { uploadToCloudinary, getResourceType }       from "@/lib/cloudinary";

// ─── MIME helpers ─────────────────────────────────────────────────────────────

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
  )
    return "docx";
  if (mime === "application/msword" || ext === "doc") return "doc";
  return null;
}

// ─── Per-type text extractors ─────────────────────────────────────────────────

type ExtractResult = Pick<
  ExtractedContent,
  "title" | "description" | "rawText" | "metadata" | "isLarge"
> & { author?: string; thumbnail?: string };

async function processDocument(
  buffer: Buffer,
  docType: "pdf" | "docx" | "doc",
  filename: string
): Promise<ExtractResult> {
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
      author:        parsed.author   || undefined,
      subject:       parsed.subject  || undefined,
      keywords:      parsed.keywords ?? [],
      pageCount:     parsed.pageCount ?? 0,
      body:          parsed.text,
      fileSizeBytes: buffer.byteLength,
    } as PlatformMetadata,
  };
}

async function processImage(buffer: Buffer, mime: string, filename: string): Promise<ExtractResult> {
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

function processMedia(buffer: Buffer, mime: string, filename: string): ExtractResult {
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

    const mime        = file.type || "application/octet-stream";
    const filename    = file.name ?? "upload";
    const buffer      = Buffer.from(await file.arrayBuffer());
    const contentType = mimeToContentType(mime, filename);
    const docType     = isDocumentType(mime, filename);

    // ── 1. Extract text / metadata ────────────────────────────────────────────
    let extracted: ExtractResult;
    try {
      if (docType) {
        extracted = await processDocument(buffer, docType, filename);
      } else if (mime.startsWith("image/")) {
        extracted = await processImage(buffer, mime, filename);
      } else {
        extracted = processMedia(buffer, mime, filename);
      }
    } catch (err) {
      return NextResponse.json(
        { error: "Failed to process file", details: String(err) },
        { status: 422 }
      );
    }

    const contentSize = extracted.isLarge ? ContentSize.LARGE : ContentSize.SMALL;
    const fakeUrl     = `brainhistory://upload/${userId}/${uuidv4()}/${encodeURIComponent(filename)}`;

    await connectDB();
    const userObjId = new mongoose.Types.ObjectId(userId);

    // ── 2. Create Content doc ─────────────────────────────────────────────────
    const content = await Content.create({
      userId:           userObjId,
      url:              fakeUrl,
      contentType,
      platform:         "upload",
      title:            extracted.title || filename,
      description:      extracted.description,
      author:           extracted.author,
      rawText:          extracted.rawText,
      rawTextLength:    extracted.rawText.length,
      metadata:         extracted.metadata as Record<string, unknown>,
      contentSize,
      tags:             [],
      processingStatus: ProcessingStatus.PENDING,
    });

    const contentId = (content._id as mongoose.Types.ObjectId).toString();

    // ── 3. Upload to Cloudinary (awaited so fileUrl is ready immediately) ──────
    let fileUrl: string | undefined;
    try {
      const result = await uploadToCloudinary(buffer, {
        folder:           `brainhistory/${userId}`,
        publicId:         contentId,
        resourceType:     getResourceType(mime),
        originalFilename: filename,
      });
      fileUrl = result.secure_url;
      await Content.findByIdAndUpdate(content._id, {
        fileUrl:            result.secure_url,
        cloudinaryPublicId: result.public_id,
      });
    } catch (err) {
      // Non-fatal — content is still indexed, just no file preview
      console.error("[Upload] Cloudinary upload failed for", contentId, err);
    }

    // ── 4. Kick off async embedding ────────────────────────────────────────────
    getEmbeddingService()
      .indexContent(
        content._id as mongoose.Types.ObjectId,
        new mongoose.Types.ObjectId(userId),
        {
          url:         fakeUrl,
          contentType,
          title:       extracted.title || filename,
          description: extracted.description,
          rawText:     extracted.rawText,
          metadata:    extracted.metadata as PlatformMetadata,
          isLarge:     contentSize === ContentSize.LARGE,
          extractedAt: new Date(),
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
        message:     "File uploaded and indexing started",
      },
      { status: 201 }
    );

  } catch (err) {
    console.error("[POST /api/upload]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
