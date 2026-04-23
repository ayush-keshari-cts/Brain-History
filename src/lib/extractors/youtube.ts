/**
 * YouTubeExtractor
 *
 * Handles both regular videos and YouTube Music links.
 * Uses the YouTube Data API v3 when YOUTUBE_API_KEY is set.
 * Falls back to the oEmbed endpoint (title + thumbnail only) without a key.
 *
 * Required env: YOUTUBE_API_KEY (optional but recommended)
 */

import { ContentType, ExtractedContent, YouTubeMetadata } from "@/types";
import { extractYouTubeId } from "@/lib/url-detector";
import { BaseExtractor } from "./base";
import { httpClient } from "./http-client";

export class YouTubeExtractor extends BaseExtractor {
  readonly supportedTypes = [ContentType.YOUTUBE_VIDEO, ContentType.YOUTUBE_MUSIC];

  async extract(url: string): Promise<ExtractedContent> {
    const videoId = extractYouTubeId(url);
    if (!videoId) throw new Error(`Cannot extract YouTube video ID from: ${url}`);

    const isMusic = url.includes("music.youtube.com");
    const apiKey  = process.env.YOUTUBE_API_KEY;

    if (apiKey) {
      return this.extractViaApi(url, videoId, isMusic, apiKey);
    }
    return this.extractViaOEmbed(url, videoId, isMusic);
  }

  // ─── YouTube Data API v3 ───────────────────────────────────────────────────

  private async extractViaApi(
    url: string,
    videoId: string,
    isMusic: boolean,
    apiKey: string
  ): Promise<ExtractedContent> {
    const { data } = await httpClient.get(
      "https://www.googleapis.com/youtube/v3/videos",
      {
        params: {
          key:  apiKey,
          id:   videoId,
          part: "snippet,contentDetails,statistics",
        },
      }
    );

    const item = data.items?.[0];
    if (!item) throw new Error(`YouTube video not found: ${videoId}`);

    const { snippet, contentDetails, statistics } = item;

    // Parse ISO 8601 duration → seconds
    const duration = parseDuration(contentDetails?.duration ?? "PT0S");

    const ytMeta: YouTubeMetadata = {
      videoId,
      channelId:    snippet.channelId,
      channelName:  snippet.channelTitle,
      title:        snippet.title,
      description:  snippet.description ?? "",
      duration,
      viewCount:    parseInt(statistics?.viewCount ?? "0", 10),
      likeCount:    parseInt(statistics?.likeCount  ?? "0", 10),
      tags:         snippet.tags ?? [],
      thumbnailUrl: snippet.thumbnails?.maxres?.url
                 ?? snippet.thumbnails?.high?.url
                 ?? snippet.thumbnails?.default?.url
                 ?? "",
      isMusic,
    };

    const rawText = this.cleanText(
      `${ytMeta.title}\n\n${ytMeta.description}`
    );

    return {
      url,
      contentType: isMusic ? ContentType.YOUTUBE_MUSIC : ContentType.YOUTUBE_VIDEO,
      title:       ytMeta.title,
      description: this.truncate(ytMeta.description, 300),
      thumbnail:   ytMeta.thumbnailUrl,
      author:      ytMeta.channelName,
      publishedAt: snippet.publishedAt ? new Date(snippet.publishedAt) : undefined,
      rawText,
      metadata:    ytMeta,
      isLarge:     this.isLargeContent(rawText),
      extractedAt: this.now(),
    };
  }

  // ─── oEmbed fallback ───────────────────────────────────────────────────────

  private async extractViaOEmbed(
    url: string,
    videoId: string,
    isMusic: boolean
  ): Promise<ExtractedContent> {
    const { data } = await httpClient.get("https://www.youtube.com/oembed", {
      params: { url, format: "json" },
    });

    const ytMeta: YouTubeMetadata = {
      videoId,
      channelId:    "",
      channelName:  data.author_name ?? "",
      title:        data.title ?? "",
      description:  "",
      duration:     0,
      thumbnailUrl: data.thumbnail_url ?? "",
      isMusic,
    };

    const rawText = this.cleanText(ytMeta.title);

    return {
      url,
      contentType: isMusic ? ContentType.YOUTUBE_MUSIC : ContentType.YOUTUBE_VIDEO,
      title:       ytMeta.title,
      thumbnail:   ytMeta.thumbnailUrl,
      author:      ytMeta.channelName,
      rawText,
      metadata:    ytMeta,
      isLarge:     false,
      extractedAt: this.now(),
    };
  }
}

// ─── ISO 8601 duration parser ─────────────────────────────────────────────────

function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] ?? "0") * 3600)
       + (parseInt(m[2] ?? "0") * 60)
       + parseInt(m[3] ?? "0");
}
