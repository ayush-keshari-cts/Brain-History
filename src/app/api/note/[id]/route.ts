/**
 * PATCH /api/note/[id]
 *
 * Update a saved note's title and/or body, then re-index the new text
 * so semantic search reflects the changes.
 */

import { NextRequest, NextResponse }          from "next/server";
import { auth }                               from "@/auth";
import connectDB                              from "@/lib/db/mongoose";
import { Content }                            from "@/models";
import { getEmbeddingService }               from "@/lib/embeddings";
import { deleteContentVectors }              from "@/lib/db/atlasVectorService";
import { ContentType, ContentSize, ProcessingStatus } from "@/types";
import type { PlatformMetadata }             from "@/types";
import mongoose                               from "mongoose";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    const userId  = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    let body: { title?: string; text?: string };
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const text  = (body.text ?? "").trim();
    const title = (body.title ?? "").trim() || text.split("\n")[0].slice(0, 120) || "Untitled note";

    if (!text) return NextResponse.json({ error: "Note text is required" }, { status: 400 });
    if (text.length > 100_000) {
      return NextResponse.json({ error: "Note exceeds 100,000 character limit" }, { status: 413 });
    }

    await connectDB();
    const contentId = new mongoose.Types.ObjectId(id);
    const userObjId = new mongoose.Types.ObjectId(userId);

    const existing = await Content.findOne({ _id: contentId, userId: userObjId, contentType: ContentType.NOTE })
      .select("_id")
      .lean() as { _id: mongoose.Types.ObjectId } | null;

    if (!existing) return NextResponse.json({ error: "Note not found" }, { status: 404 });

    const isLarge     = text.length > 10_000;
    const contentSize = isLarge ? ContentSize.LARGE : ContentSize.SMALL;

    // Update the document
    await Content.findByIdAndUpdate(contentId, {
      title,
      description:      text.slice(0, 200),
      rawText:          text,
      rawTextLength:    text.length,
      contentSize,
      processingStatus: ProcessingStatus.PENDING,
      processingError:  undefined,
      "metadata.body":  text,
      "metadata.title": title,
    });

    // Re-index: delete old vectors then create new ones
    deleteContentVectors(userId, id).catch(() => {});

    getEmbeddingService()
      .indexContent(contentId, userObjId, {
        url:         `brainhistory://note/${userId}/${id}`,
        contentType: ContentType.NOTE,
        title,
        description: text.slice(0, 200),
        rawText:     text,
        metadata:    { body: text, title } as PlatformMetadata,
        isLarge,
        extractedAt: new Date(),
        platform:    "note",
      })
      .catch((err: unknown) => {
        console.error("[Note update embed] failed for", id, err);
        Content.findByIdAndUpdate(contentId, {
          processingStatus: ProcessingStatus.FAILED,
          processingError:  String(err),
        }).exec();
      });

    return NextResponse.json({ success: true, title, isLarge });
  } catch (err) {
    console.error("[PATCH /api/note/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
