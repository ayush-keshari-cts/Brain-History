/**
 * GET    /api/content/[id]  – full content item with metadata
 * DELETE /api/content/[id]  – remove from MongoDB + Atlas vectors + chat sessions
 */

import { NextRequest, NextResponse }  from "next/server";
import { auth }                       from "@/auth";
import connectDB                      from "@/lib/db/mongoose";
import { Content, ChatSession }       from "@/models";
import { deleteContentVectors }       from "@/lib/db/atlasVectorService";
import mongoose                       from "mongoose";

// Next.js 15+ — params is a Promise
type Params = { params: Promise<{ id: string }> };

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    const userId  = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await connectDB();

    const content = await Content.findOne({
      _id:    new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
    }).lean();

    if (!content) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ content });
  } catch (err) {
    console.error("[GET /api/content/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    const userId  = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await connectDB();

    const contentId  = new mongoose.Types.ObjectId(id);
    const userObjId  = new mongoose.Types.ObjectId(userId);

    const existing = await Content.findOne({ _id: contentId, userId: userObjId })
      .select("_id")
      .lean();

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete from MongoDB (content + sessions) and Atlas vectors in parallel
    await Promise.all([
      Content.deleteOne({ _id: contentId }),
      ChatSession.deleteMany({ contentId }),
      deleteContentVectors(userId, id),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/content/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
