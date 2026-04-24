/**
 * DELETE /api/content/bulk  — remove multiple content items at once
 * Body: { ids: string[] }   — up to 100 ids per request
 */

import { NextRequest, NextResponse }        from "next/server";
import { auth }                             from "@/auth";
import connectDB                            from "@/lib/db/mongoose";
import { Content, ChatSession }             from "@/models";
import { deleteContentVectors }             from "@/lib/db/atlasVectorService";
import { deleteFromCloudinary, getResourceType } from "@/lib/cloudinary";
import mongoose                             from "mongoose";

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const userId  = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: { ids?: unknown };
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
    }

    const ids = (body.ids as unknown[]).filter(
      (id): id is string => typeof id === "string" && mongoose.isValidObjectId(id)
    );

    if (ids.length === 0) {
      return NextResponse.json({ error: "No valid ids provided" }, { status: 400 });
    }
    if (ids.length > 100) {
      return NextResponse.json({ error: "Cannot delete more than 100 items at once" }, { status: 400 });
    }

    await connectDB();
    const userObjId    = new mongoose.Types.ObjectId(userId);
    const contentObjIds = ids.map((id) => new mongoose.Types.ObjectId(id));

    // Fetch items to get Cloudinary info before deletion
    const existing = await Content.find({
      _id:    { $in: contentObjIds },
      userId: userObjId,
    })
      .select("_id cloudinaryPublicId contentType")
      .lean() as Array<{ _id: mongoose.Types.ObjectId; cloudinaryPublicId?: string; contentType?: string }>;

    const foundIds = existing.map((e) => e._id);

    // Delete MongoDB records (critical path)
    await Promise.all([
      Content.deleteMany({ _id: { $in: foundIds }, userId: userObjId }),
      ChatSession.deleteMany({ contentId: { $in: foundIds } }),
    ]);

    // Best-effort cleanup — don't fail the request on partial errors
    existing.forEach((item) => {
      const idStr = item._id.toString();

      deleteContentVectors(userId, idStr).catch(
        (err: unknown) => console.warn(`[BulkDelete] Vector cleanup failed for ${idStr}:`, err)
      );

      if (item.cloudinaryPublicId) {
        const resourceType = getResourceType(
          item.contentType === "image"         ? "image/"  :
          item.contentType === "spotify"       ? "audio/"  :
          item.contentType === "youtube_video" ? "video/"  : "raw/"
        );
        deleteFromCloudinary(item.cloudinaryPublicId, resourceType).catch(
          (err: unknown) => console.warn(`[BulkDelete] Cloudinary cleanup failed for ${idStr}:`, err)
        );
      }
    });

    return NextResponse.json({ success: true, deleted: foundIds.length });
  } catch (err) {
    console.error("[DELETE /api/content/bulk]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
