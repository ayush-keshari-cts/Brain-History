/**
 * TwitterExtractor
 *
 * Uses the Twitter v2 API (Bearer token) to fetch tweet data.
 * Falls back to the public oEmbed endpoint if no token is configured
 * (oEmbed returns limited HTML but requires no auth).
 *
 * Required env: TWITTER_BEARER_TOKEN
 */

import { ContentType, ExtractedContent, TweetMetadata } from "@/types";
import { extractTweetId } from "@/lib/url-detector";
import { BaseExtractor } from "./base";
import { httpClient } from "./http-client";

export class TwitterExtractor extends BaseExtractor {
  readonly supportedTypes = [ContentType.TWEET];

  async extract(url: string): Promise<ExtractedContent> {
    const tweetId = extractTweetId(url);
    if (!tweetId) throw new Error(`Cannot extract tweet ID from: ${url}`);

    const bearerToken = process.env.TWITTER_BEARER_TOKEN;

    if (bearerToken) {
      return this.extractViaApi(url, tweetId, bearerToken);
    }
    return this.extractViaOEmbed(url, tweetId);
  }

  // ─── Twitter v2 API ────────────────────────────────────────────────────────

  private async extractViaApi(
    url: string,
    tweetId: string,
    token: string
  ): Promise<ExtractedContent> {
    const endpoint = `https://api.twitter.com/2/tweets/${tweetId}`;
    const params = {
      "tweet.fields":
        "text,author_id,created_at,public_metrics,entities,lang,referenced_tweets",
      expansions: "author_id,attachments.media_keys",
      "user.fields": "name,username",
      "media.fields": "url,preview_image_url",
    };

    const { data } = await httpClient.get(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });

    const tweet = data.data;
    const author = data.includes?.users?.[0];
    const media: string[] =
      data.includes?.media
        ?.filter((m: { type: string }) => m.type === "photo")
        .map((m: { url?: string; preview_image_url?: string }) => m.url ?? m.preview_image_url)
        .filter(Boolean) ?? [];

    const metrics = tweet.public_metrics ?? {};
    const entities = tweet.entities ?? {};

    const tweetMeta: TweetMetadata = {
      tweetId,
      authorHandle: author?.username ?? "unknown",
      authorName:   author?.name ?? "unknown",
      text:         tweet.text,
      likeCount:    metrics.like_count,
      retweetCount: metrics.retweet_count,
      replyCount:   metrics.reply_count,
      mediaUrls:    media,
      hashtags:     entities.hashtags?.map((h: { tag: string }) => h.tag) ?? [],
      mentions:     entities.mentions?.map((m: { username: string }) => m.username) ?? [],
      isRetweet:    tweet.referenced_tweets?.some((r: { type: string }) => r.type === "retweeted") ?? false,
      lang:         tweet.lang,
    };

    const rawText = this.cleanText(tweet.text);

    return {
      url,
      contentType: ContentType.TWEET,
      title: `@${tweetMeta.authorHandle}: ${this.truncate(rawText, 80)}`,
      description: this.truncate(rawText, 300),
      author: `${tweetMeta.authorName} (@${tweetMeta.authorHandle})`,
      publishedAt: tweet.created_at ? new Date(tweet.created_at) : undefined,
      rawText,
      metadata: tweetMeta,
      isLarge: this.isLargeContent(rawText),
      extractedAt: this.now(),
    };
  }

  // ─── oEmbed fallback ───────────────────────────────────────────────────────

  private async extractViaOEmbed(
    url: string,
    tweetId: string
  ): Promise<ExtractedContent> {
    const { data } = await httpClient.get("https://publish.twitter.com/oembed", {
      params: { url, omit_script: true },
    });

    // Strip HTML tags from the html field
    const rawText = this.cleanText(
      (data.html as string).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")
    );

    const tweetMeta: TweetMetadata = {
      tweetId,
      authorHandle: data.author_url?.split("/").pop() ?? "unknown",
      authorName:   data.author_name ?? "unknown",
      text:         rawText,
      isRetweet:    false,
    };

    return {
      url,
      contentType: ContentType.TWEET,
      title: `@${tweetMeta.authorHandle}: ${this.truncate(rawText, 80)}`,
      description: this.truncate(rawText, 300),
      author: tweetMeta.authorName,
      rawText,
      metadata: tweetMeta,
      isLarge: false,
      extractedAt: this.now(),
    };
  }
}
