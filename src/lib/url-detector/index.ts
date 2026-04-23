import { ContentType } from "@/types";
import { URL_PATTERNS, UrlPattern } from "./patterns";

// ─── Detection result ─────────────────────────────────────────────────────────

export interface DetectionResult {
  contentType: ContentType;
  platform: string;
  normalizedUrl: string;
}

// ─── Normalise helpers ────────────────────────────────────────────────────────

function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw.trim());
    // Drop tracking params
    const DROP_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "si"];
    DROP_PARAMS.forEach((p) => url.searchParams.delete(p));
    // Remove trailing slash for cleanliness (except root)
    let href = url.href;
    if (href.endsWith("/") && url.pathname !== "/") {
      href = href.slice(0, -1);
    }
    return href;
  } catch {
    return raw.trim();
  }
}

// ─── Main detector ────────────────────────────────────────────────────────────

export function detectUrl(rawUrl: string): DetectionResult {
  const normalizedUrl = normalizeUrl(rawUrl);

  for (const entry of URL_PATTERNS) {
    if (entry.pattern.test(normalizedUrl)) {
      return {
        contentType:   entry.contentType,
        platform:      entry.platform,
        normalizedUrl,
      };
    }
  }

  return {
    contentType:   ContentType.UNKNOWN,
    platform:      "unknown",
    normalizedUrl,
  };
}

/**
 * Utility: extract YouTube video ID from any YouTube URL variant
 */
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

/**
 * Utility: extract Twitter / X tweet ID
 */
export function extractTweetId(url: string): string | null {
  const m = url.match(/\/status\/(\d+)/);
  return m?.[1] ?? null;
}

export { URL_PATTERNS };
export type { UrlPattern };
