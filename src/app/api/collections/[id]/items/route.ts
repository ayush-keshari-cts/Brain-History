/**
 * POST   /api/collections/[id]/items  — add a content item to this collection
 * DELETE /api/collections/[id]/items  — remove a content item from this collection
 * Body (both): { contentId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth }                      from "@/auth";
import connectDB                     from "@/lib/db/mongoose";
import { Collection, Content }       from "@/models";
import mongoose                      from "mongoose";

type Params = { params: Promise<{ id: string }> };

async function getIds(req: NextRequest, { params }: Params) {
  const session = await auth();
  const userId  = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { error: "Unauthorized" as const, status: 401 };

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return { error: "Invalid collection id" as const, status: 400 };

  let body: { contentId?: unknown };
  try { body = await req.json(); } catch {
    return { error: "Invalid JSON" as const, status: 400 };
  }

  const contentId = typeof body.contentId === "string" ? body.contentId : "";
  if (!contentId || !mongoose.isValidObjectId(contentId)) {
    return { error: "contentId is required and must be valid" as const, status: 400 };
  }

  return {
    userId,
    collectionObjId: new mongoose.Types.ObjectId(id),
    contentObjId:    new mongoose.Types.ObjectId(contentId),
    userObjId:       new mongoose.Types.ObjectId(userId),
  };
}

// ─── POST: add to collection ──────────────────────────────────────────────────

export async function POST(req: NextRequest, ctx: Params) {
  try {
    const resolved = await getIds(req, ctx);
    if ("error" in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }
    const { userObjId, collectionObjId, contentObjId } = resolved;

    await connectDB();

    // Verify collection belongs to user
    const col = await Collection.findOne({ _id: collectionObjId, userId: userObjId }).lean();
    if (!col) return NextResponse.json({ error: "Collection not found" }, { status: 404 });

    // Verify content belongs to user and add collection
    const updated = await Content.findOneAndUpdate(
      { _id: contentObjId, userId: userObjId },
      { $addToSet: { collectionIds: collectionObjId } },
      { returnDocument: "after" }
    ).select("_id collectionIds").lean() as { _id: mongoose.Types.ObjectId; collectionIds: mongoose.Types.ObjectId[] } | null;

    if (!updated) return NextResponse.json({ error: "Content not found" }, { status: 404 });

    return NextResponse.json({
      success:       true,
      collectionIds: updated.collectionIds.map((c) => c.toString()),
    });
  } catch (err) {
    console.error("[POST /api/collections/[id]/items]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── DELETE: remove from collection ──────────────────────────────────────────

export async function DELETE(req: NextRequest, ctx: Params) {
  try {
    const resolved = await getIds(req, ctx);
    if ("error" in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }
    const { userObjId, collectionObjId, contentObjId } = resolved;

    await connectDB();

    const updated = await Content.findOneAndUpdate(
      { _id: contentObjId, userId: userObjId },
      { $pull: { collectionIds: collectionObjId } },
      { returnDocument: "after" }
    ).select("_id collectionIds").lean() as { _id: mongoose.Types.ObjectId; collectionIds: mongoose.Types.ObjectId[] } | null;

    if (!updated) return NextResponse.json({ error: "Content not found" }, { status: 404 });

    return NextResponse.json({
      success:       true,
      collectionIds: updated.collectionIds.map((c) => c.toString()),
    });
  } catch (err) {
    console.error("[DELETE /api/collections/[id]/items]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
