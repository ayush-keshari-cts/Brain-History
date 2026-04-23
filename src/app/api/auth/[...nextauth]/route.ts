// next-auth v5 — re-export handlers and cast to satisfy Next.js 16 route types
import { handlers } from "@/auth";
import type { NextRequest } from "next/server";

type RouteHandler = (req: NextRequest, ctx?: unknown) => Response | Promise<Response>;

export const GET  = handlers.GET  as RouteHandler;
export const POST = handlers.POST as RouteHandler;
