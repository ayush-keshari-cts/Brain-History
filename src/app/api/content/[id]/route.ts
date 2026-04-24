/**
 * GET    /api/content/[id]  – full content item with metadata
 * PATCH  /api/content/[id]  – update mutable fields (notes)
 * DELETE /api/content/[id]  – remove from MongoDB + Atlas vectors + chat sessions
 */

import { NextRequest, NextResponse }        from "next/server";
import { auth }                             from "@/auth";
import connectDB                            from "@/lib/db/mongoose";
import { Content, ChatSession }             from "@/models";
import { deleteContentVectors }             from "@/lib/db/atlasVectorService";
import { deleteFromCloudinary, getResourceType } from "@/lib/cloudinary";
import mongoose                             from "mongoose";

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

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    const userId  = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    let body: { notes?: string };
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Only `notes` is user-editable here (title changes go through /api/note/[id])
    const notes = typeof body.notes === "string" ? body.notes.slice(0, 2000) : "";

    await connectDB();

    const updated = await Content.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id), userId: new mongoose.Types.ObjectId(userId) },
      { notes },
      { returnDocument: "after" }
    ).select("_id notes").lean() as { _id: mongoose.Types.ObjectId; notes?: string } | null;

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true, notes: updated.notes ?? "" });
  } catch (err) {
    console.error("[PATCH /api/content/[id]]", err);
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
      .select("_id cloudinaryPublicId contentType")
      .lean() as { _id: mongoose.Types.ObjectId; cloudinaryPublicId?: string; contentType?: string } | null;

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete MongoDB records first (critical)
    await Promise.all([
      Content.deleteOne({ _id: contentId }),
      ChatSession.deleteMany({ contentId }),
    ]);

    // Best-effort vector cleanup — don't fail the request if Pinecone is unreachable
    deleteContentVectors(userId, id).catch(
      (err: unknown) => console.warn("[Delete] Vector cleanup failed:", err)
    );

    // Best-effort Cloudinary cleanup (don't fail the request if this errors)
    if (existing.cloudinaryPublicId) {
      const resourceType = getResourceType(
        existing.contentType === "image"        ? "image/"  :
        existing.contentType === "spotify"      ? "audio/"  :
        existing.contentType === "youtube_video" ? "video/" : "raw/"
      );
      deleteFromCloudinary(existing.cloudinaryPublicId, resourceType).catch(
        (err: unknown) => console.warn("[Delete] Cloudinary cleanup failed:", err)
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/content/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
