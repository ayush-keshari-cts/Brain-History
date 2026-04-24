/**
 * POST /api/note
 *
 * Save a plain-text note (or password snippet, code, anything textual).
 * No file, no URL — just a title + body stored in MongoDB and indexed for
 * semantic search.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth }                      from "@/auth";
import connectDB                     from "@/lib/db/mongoose";
import { Content }                   from "@/models";
import { getEmbeddingService }       from "@/lib/embeddings";
import { ContentType, ContentSize, ProcessingStatus } from "@/types";
import type { PlatformMetadata }     from "@/types";
import mongoose                      from "mongoose";
import { v4 as uuidv4 }             from "uuid";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId  = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { title?: string; text?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const text  = (body.text ?? "").trim();
    const title = (body.title ?? "").trim() || text.split("\n")[0].slice(0, 120) || "Untitled note";

    if (!text) {
      return NextResponse.json({ error: "Note text is required" }, { status: 400 });
    }
    if (text.length > 100_000) {
      return NextResponse.json({ error: "Note exceeds 100,000 character limit" }, { status: 413 });
    }

    const fakeUrl    = `brainhistory://note/${userId}/${uuidv4()}`;
    const isLarge    = text.length > 10_000;
    const contentSize = isLarge ? ContentSize.LARGE : ContentSize.SMALL;

    await connectDB();
    const userObjId = new mongoose.Types.ObjectId(userId);

    const content = await Content.create({
      userId:           userObjId,
      url:              fakeUrl,
      contentType:      ContentType.NOTE,
      platform:         "note",
      title,
      description:      text.slice(0, 200),
      rawText:          text,
      rawTextLength:    text.length,
      metadata: {
        body:  text,
        title,
      } as PlatformMetadata,
      contentSize,
      tags:             [],
      processingStatus: ProcessingStatus.PENDING,
    });

    const contentId = (content._id as mongoose.Types.ObjectId).toString();

    // Index embeddings async (non-blocking)
    getEmbeddingService()
      .indexContent(
        content._id as mongoose.Types.ObjectId,
        userObjId,
        {
          url:         fakeUrl,
          contentType: ContentType.NOTE,
          title,
          description: text.slice(0, 200),
          rawText:     text,
          metadata:    { body: text, title } as PlatformMetadata,
          isLarge,
          extractedAt: new Date(),
          platform:    "note",
        }
      )
      .catch((err: unknown) => {
        console.error("[Note embed] failed for", contentId, err);
        Content.findByIdAndUpdate(content._id, {
          processingStatus: ProcessingStatus.FAILED,
          processingError:  String(err),
        }).exec();
      });

    return NextResponse.json(
      { success: true, contentId, title, contentType: ContentType.NOTE, isLarge },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/note]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
