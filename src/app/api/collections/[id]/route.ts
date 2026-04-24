/**
 * PATCH  /api/collections/[id]  — rename / re-emoji / recolor a collection
 * DELETE /api/collections/[id]  — delete collection (items stay, just lose the tag)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth }                      from "@/auth";
import connectDB                     from "@/lib/db/mongoose";
import { Collection, Content }       from "@/models";
import mongoose                      from "mongoose";

type Params = { params: Promise<{ id: string }> };

const VALID_COLORS = ["violet", "blue", "green", "emerald", "red", "orange", "amber", "pink", "sky", "teal"];

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

    let body: { name?: unknown; emoji?: unknown; color?: unknown };
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const update: Record<string, string> = {};
    if (typeof body.name  === "string") update.name  = body.name.trim().slice(0, 50);
    if (typeof body.emoji === "string") update.emoji = body.emoji.slice(0, 8);
    if (typeof body.color === "string" && VALID_COLORS.includes(body.color)) update.color = body.color;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    await connectDB();

    const updated = await Collection.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id), userId: new mongoose.Types.ObjectId(userId) },
      update,
      { returnDocument: "after" }
    ).select("_id name emoji color").lean() as {
      _id: mongoose.Types.ObjectId;
      name: string;
      emoji: string;
      color: string;
    } | null;

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      collection: {
        _id:   updated._id.toString(),
        name:  updated.name,
        emoji: updated.emoji,
        color: updated.color,
      },
    });
  } catch (err) {
    console.error("[PATCH /api/collections/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    const userId  = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await connectDB();
    const collectionObjId = new mongoose.Types.ObjectId(id);
    const userObjId       = new mongoose.Types.ObjectId(userId);

    const existing = await Collection.findOne({ _id: collectionObjId, userId: userObjId }).lean();
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await Promise.all([
      Collection.deleteOne({ _id: collectionObjId }),
      // Remove this collection from all content items
      Content.updateMany(
        { userId: userObjId, collectionIds: collectionObjId },
        { $pull: { collectionIds: collectionObjId } }
      ),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/collections/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
