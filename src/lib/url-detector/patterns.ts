/**
 * URL pattern registry
 *
 * Each entry maps a regex (tested against the full URL) to a ContentType.
 * Order matters — more specific patterns come first.
 */

import { ContentType } from "@/types";

export interface UrlPattern {
  pattern: RegExp;
  contentType: ContentType;
  platform: string;
}

export const URL_PATTERNS: UrlPattern[] = [
  // ── Twitter / X ──────────────────────────────────────────────────────────
  {
    pattern: /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/.+\/status\/\d+/i,
    contentType: ContentType.TWEET,
    platform: "twitter",
  },

  // ── YouTube Music ─────────────────────────────────────────────────────────
  {
    pattern: /^https?:\/\/music\.youtube\.com/i,
    contentType: ContentType.YOUTUBE_MUSIC,
    platform: "youtube",
  },

  // ── YouTube Video / Shorts ────────────────────────────────────────────────
  {
    pattern: /^https?:\/\/(www\.|m\.)?(youtube\.com\/(watch|shorts|embed|live)|youtu\.be\/)/i,
    contentType: ContentType.YOUTUBE_VIDEO,
    platform: "youtube",
  },

  // ── Instagram ─────────────────────────────────────────────────────────────
  {
    pattern: /^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\//i,
    contentType: ContentType.INSTAGRAM,
    platform: "instagram",
  },

  // ── Reddit ────────────────────────────────────────────────────────────────
  {
    pattern: /^https?:\/\/(www\.|old\.)?reddit\.com\/(r\/[^/]+\/(comments|s))\//i,
    contentType: ContentType.REDDIT,
    platform: "reddit",
  },

  // ── LinkedIn ──────────────────────────────────────────────────────────────
  {
    pattern: /^https?:\/\/(www\.)?linkedin\.com\/(posts|pulse|in)\//i,
    contentType: ContentType.LINKEDIN,
    platform: "linkedin",
  },

  // ── TikTok ────────────────────────────────────────────────────────────────
  {
    pattern: /^https?:\/\/(www\.|vm\.)?tiktok\.com\/@[^/]+\/video\//i,
    contentType: ContentType.TIKTOK,
    platform: "tiktok",
  },

  // ── Spotify ───────────────────────────────────────────────────────────────
  {
    pattern: /^https?:\/\/open\.spotify\.com\/(track|album|playlist|episode|show)\//i,
    contentType: ContentType.SPOTIFY,
    platform: "spotify",
  },

  // ── GitHub ────────────────────────────────────────────────────────────────
  {
    pattern: /^https?:\/\/(www\.)?github\.com\//i,
    contentType: ContentType.GITHUB,
    platform: "github",
  },

  // ── PDF (direct link ending in .pdf or query param) ───────────────────────
  {
    pattern: /\.pdf(\?.*)?$/i,
    contentType: ContentType.PDF,
    platform: "pdf",
  },

  // ── Images ────────────────────────────────────────────────────────────────
  {
    pattern: /\.(png|jpe?g|gif|webp|svg|bmp|tiff?)(\?.*)?$/i,
    contentType: ContentType.IMAGE,
    platform: "image",
  },

  // ── Generic website / blog (catch-all) ───────────────────────────────────
  {
    pattern: /^https?:\/\//i,
    contentType: ContentType.BLOG,
    platform: "website",
  },
];
