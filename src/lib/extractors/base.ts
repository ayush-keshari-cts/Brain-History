/**
 * BaseExtractor
 *
 * Every platform extractor extends this abstract class.
 * The pattern is:
 *   1. detectUrl()        → returns contentType
 *   2. new XExtractor()   → instantiated by ExtractorFactory
 *   3. extractor.extract(url) → returns ExtractedContent
 *
 * Adding a new platform:
 *   1. Create src/lib/extractors/<platform>.ts extending BaseExtractor
 *   2. Register it in src/lib/extractors/factory.ts
 */

import { ContentType, ExtractedContent } from "@/types";

export abstract class BaseExtractor {
  /** Which ContentType(s) this extractor handles */
  abstract readonly supportedTypes: ContentType[];

  /**
   * Main entry point.
   * Must return a fully populated ExtractedContent or throw on failure.
   */
  abstract extract(url: string): Promise<ExtractedContent>;

  // ─── Shared helpers ──────────────────────────────────────────────────────

  protected isLargeContent(text: string): boolean {
    const threshold = parseInt(
      process.env.LARGE_CONTENT_THRESHOLD ?? "10000",
      10
    );
    return text.length > threshold;
  }

  protected now(): Date {
    return new Date();
  }

  /**
   * Truncate a string for use as a description preview.
   */
  protected truncate(text: string, maxLength = 300): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trimEnd() + "…";
  }

  /**
   * Strip excessive whitespace / newlines from scraped text.
   */
  protected cleanText(text: string): string {
    return text
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }
}
