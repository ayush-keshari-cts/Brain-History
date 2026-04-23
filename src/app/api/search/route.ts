/**
 * POST /api/search  — semantic search over saved content
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth }        from "@/auth";
import { runSearch }   from "@/lib/rag/searchGraph";
import { ContentType } from "@/types";

const BodySchema = z.object({
  query:        z.string().min(1).max(500),
  contentTypes: z.array(z.nativeEnum(ContentType)).optional(),
  limit:        z.number().int().min(1).max(50).optional().default(10),
  offset:       z.number().int().min(0).optional().default(0),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId  = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body   = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { query, contentTypes, limit, offset } = parsed.data;

    const response = await runSearch({
      query,
      userId,
      contentTypes,
      limit,
      offset,
    });

    return NextResponse.json(response);
  } catch (err) {
    console.error("[POST /api/search]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
