/**
 * GET /api/files/[contentId]           — redirect to Cloudinary URL (inline)
 * GET /api/files/[contentId]?download  — redirect to Cloudinary URL with fl_attachment
 *
 * Auth-checks ownership before redirecting, so Cloudinary URLs are never
 * exposed directly in page source — they only load after the session check.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth }         from "@/auth";
import connectDB        from "@/lib/db/mongoose";
import { Content }      from "@/models";
import { makeDownloadUrl } from "@/lib/cloudinary";
import mongoose         from "mongoose";

type Params = { params: Promise<{ contentId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    const userId  = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contentId } = await params;
    if (!mongoose.isValidObjectId(contentId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await connectDB();

    const content = await Content.findOne({
      _id:    new mongoose.Types.ObjectId(contentId),
      userId: new mongoose.Types.ObjectId(userId),
    })
      .select("fileUrl cloudinaryPublicId")
      .lean() as { fileUrl?: string; cloudinaryPublicId?: string } | null;

    if (!content?.fileUrl) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const isDownload = req.nextUrl.searchParams.has("download");
    const targetUrl  = isDownload
      ? makeDownloadUrl(content.fileUrl)
      : content.fileUrl;

    return NextResponse.redirect(targetUrl, { status: 302 });
  } catch (err) {
    console.error("[GET /api/files/[contentId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
