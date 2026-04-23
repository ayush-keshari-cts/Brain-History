/**
 * POST /api/chat   — chat with a single large content item
 * GET  /api/chat   — load session history (?sessionId=xxx)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth }       from "@/auth";
import connectDB      from "@/lib/db/mongoose";
import { Content, ChatSession } from "@/models";
import { runChat }    from "@/lib/rag/chatGraph";
import mongoose       from "mongoose";

// ─── POST ─────────────────────────────────────────────────────────────────────

const PostSchema = z.object({
  contentId: z.string().min(1),
  message:   z.string().min(1).max(2000),
  sessionId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId  = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body   = await req.json();
    const parsed = PostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { contentId, message, sessionId } = parsed.data;

    await connectDB();

    const content = await Content.findOne({
      _id:    new mongoose.Types.ObjectId(contentId),
      userId: new mongoose.Types.ObjectId(userId),
    })
      .select("_id contentSize processingStatus")
      .lean() as { _id: mongoose.Types.ObjectId; contentSize: string; processingStatus: string } | null;

    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    if (content.processingStatus !== "completed") {
      return NextResponse.json(
        { error: "Content is still being indexed. Please wait." },
        { status: 409 }
      );
    }

    const response = await runChat({ contentId, userId, message, sessionId });

    return NextResponse.json(response);
  } catch (err) {
    console.error("[POST /api/chat]", err);
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

    const sessionId = new URL(req.url).searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    await connectDB();

    const chatSession = await ChatSession.findOne({
      _id:    new mongoose.Types.ObjectId(sessionId),
      userId: new mongoose.Types.ObjectId(userId),
    }).lean() as { _id: mongoose.Types.ObjectId; messages: unknown[]; summary?: string } | null;

    if (!chatSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({
      sessionId: chatSession._id.toString(),
      messages:  chatSession.messages,
      summary:   chatSession.summary,
    });
  } catch (err) {
    console.error("[GET /api/chat]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
