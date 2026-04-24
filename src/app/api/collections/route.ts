/**
 * GET  /api/collections  — list user's collections (with item counts)
 * POST /api/collections  — create a new collection  { name, emoji?, color? }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth }                      from "@/auth";
import connectDB                     from "@/lib/db/mongoose";
import { Collection, Content }       from "@/models";
import mongoose                      from "mongoose";

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const session = await auth();
    const userId  = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const userObjId = new mongoose.Types.ObjectId(userId);

    const collections = await Collection.find({ userId: userObjId })
      .sort({ createdAt: 1 })
      .lean();

    if (collections.length === 0) {
      return NextResponse.json({ collections: [] });
    }

    // Count items per collection
    const collectionObjIds = collections.map((c) => c._id);
    const counts = await Content.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { userId: userObjId, collectionIds: { $in: collectionObjIds } } },
      { $unwind: "$collectionIds" },
      { $match: { collectionIds: { $in: collectionObjIds } } },
      { $group: { _id: "$collectionIds", count: { $sum: 1 } } },
    ]);

    const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

    const result = collections.map((c) => ({
      _id:       c._id.toString(),
      name:      c.name,
      emoji:     c.emoji,
      color:     c.color,
      itemCount: countMap.get(c._id.toString()) ?? 0,
      createdAt: c.createdAt,
    }));

    return NextResponse.json({ collections: result });
  } catch (err) {
    console.error("[GET /api/collections]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

const VALID_COLORS = ["violet", "blue", "green", "emerald", "red", "orange", "amber", "pink", "sky", "teal"];

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId  = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: { name?: unknown; emoji?: unknown; color?: unknown };
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name.trim().slice(0, 50) : "";
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const emoji = typeof body.emoji === "string" ? body.emoji.slice(0, 8) : "📁";
    const color = typeof body.color === "string" && VALID_COLORS.includes(body.color) ? body.color : "violet";

    await connectDB();

    const existing = await Collection.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      name,
    }).lean();
    if (existing) {
      return NextResponse.json({ error: "A collection with this name already exists" }, { status: 409 });
    }

    const collection = await Collection.create({
      userId: new mongoose.Types.ObjectId(userId),
      name,
      emoji,
      color,
    });

    return NextResponse.json(
      {
        collection: {
          _id:       collection._id.toString(),
          name:      collection.name,
          emoji:     collection.emoji,
          color:     collection.color,
          itemCount: 0,
          createdAt: collection.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/collections]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
