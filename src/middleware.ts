/**
 * Next.js Edge Middleware
 *
 * Responsibility: add CORS headers for requests that originate from the
 * BrainHistory Chrome extension (origin starts with "chrome-extension://").
 *
 * All other requests pass through untouched.
 */

import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";

  // Only act on Chrome-extension origins
  if (!origin.startsWith("chrome-extension://")) {
    return NextResponse.next();
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin":  origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age":       "86400",
  };

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  // Attach headers to the real response
  const response = NextResponse.next();
  Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}

export const config = {
  // Apply only to API routes (not pages, static files, etc.)
  matcher: "/api/:path*",
};
