/**
 * GET /api/extension/status
 *
 * Lightweight auth-check endpoint used by the Chrome extension.
 * Returns whether the current session cookie belongs to a valid user.
 *
 * CORS headers are injected by src/middleware.ts for chrome-extension:// origins.
 */

import { NextResponse } from "next/server";
import { auth }         from "@/auth";

export async function GET() {
  const session = await auth();
  const user    = session?.user as
    | { id?: string; name?: string | null; email?: string | null; image?: string | null }
    | undefined;

  return NextResponse.json({
    authenticated: Boolean(user?.id),
    user: user?.id
      ? { name: user.name ?? null, email: user.email ?? null, image: user.image ?? null }
      : null,
  });
}
