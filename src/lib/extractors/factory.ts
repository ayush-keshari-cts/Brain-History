/**
 * ExtractorFactory
 *
 * Registry pattern: maps each ContentType to its extractor instance.
 * Adding a new platform requires only:
 *   1. Creating a new extractor class
 *   2. Adding one line to the REGISTRY below
 *
 * Usage:
 *   const extracted = await ExtractorFactory.extract(url);
 */

import { ContentType, ExtractedContent } from "@/types";
import { detectUrl }          from "@/lib/url-detector";
import { BaseExtractor }      from "./base";
import { TwitterExtractor }   from "./twitter";
import { YouTubeExtractor }   from "./youtube";
import { BlogExtractor }      from "./blog";
import { PDFExtractor }       from "./pdf";
import { ImageExtractor }     from "./image";
import { GitHubExtractor }    from "./github";

// ─── Registry ─────────────────────────────────────────────────────────────────
// Lazy-instantiated singletons — one instance per extractor type

type ExtractorConstructor = new () => BaseExtractor;

const REGISTRY: Partial<Record<ContentType, ExtractorConstructor>> = {
  [ContentType.TWEET]:         TwitterExtractor,
  [ContentType.YOUTUBE_VIDEO]: YouTubeExtractor,
  [ContentType.YOUTUBE_MUSIC]: YouTubeExtractor,
  [ContentType.INSTAGRAM]:     BlogExtractor,   // oEmbed fallback via HTML scrape
  [ContentType.BLOG]:          BlogExtractor,
  [ContentType.WEBSITE]:       BlogExtractor,
  [ContentType.REDDIT]:        BlogExtractor,
  [ContentType.LINKEDIN]:      BlogExtractor,
  [ContentType.TIKTOK]:        BlogExtractor,
  [ContentType.SPOTIFY]:       BlogExtractor,
  [ContentType.PDF]:           PDFExtractor,
  [ContentType.IMAGE]:         ImageExtractor,
  [ContentType.SCREENSHOT]:    ImageExtractor,
  [ContentType.GITHUB]:        GitHubExtractor,
  [ContentType.UNKNOWN]:       BlogExtractor,   // best-effort scrape
};

const instances = new Map<ExtractorConstructor, BaseExtractor>();

function getInstance(Ctor: ExtractorConstructor): BaseExtractor {
  if (!instances.has(Ctor)) {
    instances.set(Ctor, new Ctor());
  }
  return instances.get(Ctor)!;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export const ExtractorFactory = {
  /**
   * Detect URL type → pick extractor → run extraction.
   * Returns ExtractedContent or throws.
   */
  async extract(url: string): Promise<ExtractedContent & { platform: string }> {
    const { contentType, platform, normalizedUrl } = detectUrl(url);

    const Ctor = REGISTRY[contentType];
    if (!Ctor) {
      throw new Error(`No extractor registered for content type: ${contentType}`);
    }

    const extractor = getInstance(Ctor);
    const result    = await extractor.extract(normalizedUrl);

    return { ...result, platform };
  },

  /**
   * Resolve the extractor for a given ContentType without running it.
   * Useful for unit-testing individual extractors.
   */
  getExtractor(contentType: ContentType): BaseExtractor {
    const Ctor = REGISTRY[contentType];
    if (!Ctor) throw new Error(`No extractor for: ${contentType}`);
    return getInstance(Ctor);
  },

  /** Returns the list of all registered content types. */
  supportedTypes(): ContentType[] {
    return Object.keys(REGISTRY) as ContentType[];
  },
};
