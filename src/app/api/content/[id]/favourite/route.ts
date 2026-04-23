/**
 * PATCH /api/content/[id]/favourite  — toggle isFavourite
 */

import { NextRequest, NextResponse } from "next/server";
import { auth }       from "@/auth";
import connectDB      from "@/lib/db/mongoose";
import { Content }    from "@/models";
import mongoose       from "mongoose";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_req: NextRequest, { params }: Params) {
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

    const doc = await Content.findOne({
      _id:    new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
    }).select("isFavourite");

    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    doc.isFavourite = !doc.isFavourite;
    await doc.save();

    return NextResponse.json({ isFavourite: doc.isFavourite });
  } catch (err) {
    console.error("[PATCH /api/content/[id]/favourite]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
