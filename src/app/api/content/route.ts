/**
 * POST /api/content  — Add a new URL to the user's BrainHistory
 * GET  /api/content  — List saved content (paginated)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth }               from "@/auth";
import connectDB              from "@/lib/db/mongoose";
import { Content }            from "@/models";
import { ExtractorFactory }   from "@/lib/extractors/factory";
import { detectUrl }          from "@/lib/url-detector";
import { getEmbeddingService } from "@/lib/embeddings";
import { ContentSize, ProcessingStatus } from "@/types";
import mongoose               from "mongoose";

// ─── Validation ───────────────────────────────────────────────────────────────

const AddSchema = z.object({
  url:   z.string().url("Must be a valid URL"),
  tags:  z.array(z.string().max(50)).max(20).optional().default([]),
  notes: z.string().max(2000).optional(),
});

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId  = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body   = await req.json();
    const parsed = AddSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { url, tags, notes } = parsed.data;

    await connectDB();

    // Check duplicate
    const existing = await Content.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      url,
    })
      .select("_id title contentType contentSize")
      .lean();

    if (existing) {
      const doc = existing as {
        _id: mongoose.Types.ObjectId;
        title: string;
        contentType: string;
        contentSize: string;
      };
      return NextResponse.json(
        {
          success:     true,
          contentId:   doc._id.toString(),
          title:       doc.title,
          contentType: doc.contentType,
          isLarge:     doc.contentSize === ContentSize.LARGE,
          message:     "Already saved",
        },
        { status: 200 }
      );
    }

    // Detect + extract
    const { contentType, platform } = detectUrl(url);

    let extracted: Awaited<ReturnType<typeof ExtractorFactory.extract>> | null = null;
    let extractionFailed = false;
    let extractionError  = "";

    try {
      extracted = await ExtractorFactory.extract(url);
    } catch (err) {
      // Site blocked the scraper (bot-protection, login wall, JS-only SPA, etc.)
      // Save the URL anyway with minimal fallback info so it shows up in the library.
      // The card will show the site favicon and "failed" status badge.
      extractionFailed = true;
      extractionError  = String(err);
      console.warn("[Content] Extraction failed for", url, "–", extractionError);
    }

    // Build the data we'll actually persist
    const hostname = (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } })();
    const title       = extracted?.title       ?? hostname;
    const description = extracted?.description ?? "";
    const rawText     = extracted?.rawText     ?? "";
    const thumbnail   = extracted?.thumbnail;
    const author      = extracted?.author;
    const publishedAt = extracted?.publishedAt;
    const metadata    = (extracted?.metadata   ?? {}) as Record<string, unknown>;

    const threshold   = parseInt(process.env.LARGE_CONTENT_THRESHOLD ?? "10000", 10);
    const contentSize = rawText.length > threshold ? ContentSize.LARGE : ContentSize.SMALL;

    const content = await Content.create({
      userId:          new mongoose.Types.ObjectId(userId),
      url,
      contentType,
      platform,
      title,
      description,
      thumbnail,
      author,
      publishedAt,
      rawText,
      rawTextLength:   rawText.length,
      metadata,
      contentSize,
      tags:            tags ?? [],
      notes,
      processingStatus: extractionFailed ? ProcessingStatus.FAILED  : ProcessingStatus.PENDING,
      processingError:  extractionFailed ? extractionError           : undefined,
    });

    // Kick off async embedding only when we have actual text to index
    if (!extractionFailed && extracted) {
      getEmbeddingService()
        .indexContent(
          content._id as mongoose.Types.ObjectId,
          new mongoose.Types.ObjectId(userId),
          extracted
        )
        .catch((err: unknown) => {
          console.error("[Embedding] Failed for", content._id, err);
          Content.findByIdAndUpdate(content._id, {
            processingStatus: ProcessingStatus.FAILED,
            processingError:  String(err),
          }).exec();
        });
    }

    return NextResponse.json(
      {
        success:     true,
        contentId:   (content._id as mongoose.Types.ObjectId).toString(),
        contentType: content.contentType,
        title:       content.title,
        isLarge:     contentSize === ContentSize.LARGE,
        message:     "Saved and indexing started",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/content]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId  = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page         = Math.max(1, parseInt(searchParams.get("page")   ?? "1",  10));
    const limit        = Math.min(50, parseInt(searchParams.get("limit")  ?? "20", 10));
    const contentType  = searchParams.get("type");
    const favourite    = searchParams.get("favourite") === "1";
    const collectionId = searchParams.get("collection");
    const skip         = (page - 1) * limit;

    await connectDB();

    const filter: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(userId),
    };
    if (contentType)  filter.contentType  = contentType;
    if (favourite)    filter.isFavourite  = true;
    if (collectionId && mongoose.isValidObjectId(collectionId)) {
      filter.collectionIds = new mongoose.Types.ObjectId(collectionId);
    }

    const [items, total] = await Promise.all([
      Content.find(filter)
        .select("-rawText -metadata")
        .sort({ savedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Content.countDocuments(filter),
    ]);

    return NextResponse.json({ items, total, page, limit });
  } catch (err) {
    console.error("[GET /api/content]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
