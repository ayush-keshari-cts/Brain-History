/**
 * GET /api/content/types
 * Returns the content types (and favourite flag) that the current user
 * actually has saved, so the dashboard filter bar only shows relevant chips.
 */

import { NextResponse }  from "next/server";
import { auth }          from "@/auth";
import connectDB         from "@/lib/db/mongoose";
import { Content }       from "@/models";
import mongoose          from "mongoose";

export async function GET() {
  try {
    const session = await auth();
    const userId  = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const userObjId = new mongoose.Types.ObjectId(userId);

    const [typeCounts, favCount] = await Promise.all([
      // Group by contentType
      Content.aggregate<{ _id: string; count: number }>([
        { $match: { userId: userObjId } },
        { $group: { _id: "$contentType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // Count favourites
      Content.countDocuments({ userId: userObjId, isFavourite: true }),
    ]);

    return NextResponse.json({
      types:         typeCounts.map((t) => ({ value: t._id, count: t.count })),
      hasFavourites: favCount > 0,
    });
  } catch (err) {
    console.error("[GET /api/content/types]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
