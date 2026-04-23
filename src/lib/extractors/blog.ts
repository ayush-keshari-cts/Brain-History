/**
 * BlogExtractor
 *
 * General-purpose web page / blog article extractor.
 * Uses axios to fetch the HTML and cheerio to parse it.
 *
 * Extraction priority:
 *   1. JSON-LD structured data (Article / BlogPosting)
 *   2. Open Graph / Twitter Card meta tags
 *   3. Heuristic main-content selectors
 *   4. Plain <body> text as last resort
 */

import * as cheerio from "cheerio";
import { ContentType, ExtractedContent, BlogMetadata } from "@/types";
import { BaseExtractor } from "./base";
import { httpClient } from "./http-client";

const CONTENT_SELECTORS = [
  "article",
  '[role="main"]',
  "main",
  ".post-content",
  ".entry-content",
  ".article-body",
  ".content-body",
  "#article-body",
  ".post-body",
];

const READING_SPEED_WPM = 200;

export class BlogExtractor extends BaseExtractor {
  readonly supportedTypes = [ContentType.BLOG, ContentType.WEBSITE];

  async extract(url: string): Promise<ExtractedContent> {
    const { data: html } = await httpClient.get<string>(url, {
      maxContentLength: 5 * 1024 * 1024, // 5 MB cap
    });

    const $ = cheerio.load(html);

    // ── Remove noise ─────────────────────────────────────────────────────────
    $("script, style, noscript, nav, footer, header, aside, .ads, .advertisement, .sidebar").remove();

    // ── Meta helpers ──────────────────────────────────────────────────────────
    const meta = (name: string) =>
      $(`meta[name="${name}"]`).attr("content") ??
      $(`meta[property="${name}"]`).attr("content") ??
      "";

    const title =
      meta("og:title") ||
      meta("twitter:title") ||
      $("title").text().trim() ||
      $("h1").first().text().trim();

    const description =
      meta("og:description") ||
      meta("twitter:description") ||
      meta("description");

    const author =
      meta("author") ||
      meta("article:author") ||
      $('[rel="author"]').first().text().trim() ||
      $(".author").first().text().trim();

    const publishedRaw =
      meta("article:published_time") ||
      meta("og:article:published_time") ||
      $("time[datetime]").first().attr("datetime") ||
      "";

    const siteName = meta("og:site_name") || new URL(url).hostname;
    const thumbnail = meta("og:image") || meta("twitter:image");

    // ── Body extraction ───────────────────────────────────────────────────────
    let bodyEl = CONTENT_SELECTORS.map((sel) => $(sel).first())
      .find((el) => el.length > 0);

    if (!bodyEl || !bodyEl.length) bodyEl = $("body");

    const body = this.cleanText(bodyEl.text());
    const wordCount = body.split(/\s+/).filter(Boolean).length;

    // ── JSON-LD override ──────────────────────────────────────────────────────
    let jsonLdTitle = "";
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() ?? "{}");
        const node = Array.isArray(json) ? json[0] : json;
        if (["Article", "BlogPosting", "NewsArticle"].includes(node["@type"])) {
          jsonLdTitle = node.headline ?? node.name ?? "";
        }
      } catch {
        // ignore malformed JSON-LD
      }
    });

    const blogMeta: BlogMetadata = {
      title: jsonLdTitle || title,
      author:               author || undefined,
      publishedAt:          publishedRaw ? new Date(publishedRaw) : undefined,
      description:          description || undefined,
      body,
      readingTimeMinutes:   Math.ceil(wordCount / READING_SPEED_WPM),
      siteName:             siteName || undefined,
    };

    const rawText = this.cleanText(`${blogMeta.title}\n\n${body}`);

    return {
      url,
      contentType: ContentType.BLOG,
      title:       blogMeta.title || url,
      description: blogMeta.description || this.truncate(body, 200),
      thumbnail:   thumbnail || undefined,
      author:      blogMeta.author,
      publishedAt: blogMeta.publishedAt,
      rawText,
      metadata:    blogMeta,
      isLarge:     this.isLargeContent(rawText),
      extractedAt: this.now(),
    };
  }
}
