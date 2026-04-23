/**
 * GET /api/swagger-spec
 * Returns the OpenAPI 3.0 JSON spec consumed by the Swagger UI page.
 * No auth required — spec is public.
 */
import { NextResponse } from "next/server";
import { swaggerSpec }  from "@/lib/swagger/spec";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(swaggerSpec);
}
