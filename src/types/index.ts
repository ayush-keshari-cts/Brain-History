// ─────────────────────────────────────────────────────────────────────────────
// BrainHistory – Central type definitions
// ─────────────────────────────────────────────────────────────────────────────

// ─── Content Type Enum ────────────────────────────────────────────────────────

export enum ContentType {
  TWEET         = "tweet",
  YOUTUBE_VIDEO = "youtube_video",
  YOUTUBE_MUSIC = "youtube_music",
  INSTAGRAM     = "instagram",
  BLOG          = "blog",
  PDF           = "pdf",
  IMAGE         = "image",
  SCREENSHOT    = "screenshot",
  WEBSITE       = "website",
  GITHUB        = "github",
  REDDIT        = "reddit",
  LINKEDIN      = "linkedin",
  TIKTOK        = "tiktok",
  SPOTIFY       = "spotify",
  AUDIO         = "audio",
  VIDEO         = "video",
  UNKNOWN       = "unknown",
}

// ─── Content Size Category ────────────────────────────────────────────────────

export enum ContentSize {
  SMALL = "small",   // Return full metadata + AI response
  LARGE = "large",   // Chat mode (PDF, long docs) or option to view full
}

// ─── Processing Status ────────────────────────────────────────────────────────

export enum ProcessingStatus {
  PENDING    = "pending",
  PROCESSING = "processing",
  COMPLETED  = "completed",
  FAILED     = "failed",
}

// ─── Platform-specific metadata shapes ───────────────────────────────────────

export interface TweetMetadata {
  tweetId: string;
  authorHandle: string;
  authorName: string;
  text: string;
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
  mediaUrls?: string[];
  hashtags?: string[];
  mentions?: string[];
  quotedTweetId?: string;
  isRetweet: boolean;
  lang?: string;
}

export interface YouTubeMetadata {
  videoId: string;
  channelId: string;
  channelName: string;
  title: string;
  description: string;
  duration: number;            // seconds
  viewCount?: number;
  likeCount?: number;
  tags?: string[];
  thumbnailUrl: string;
  isMusic: boolean;
  playlistId?: string;
  transcript?: string;
}

export interface InstagramMetadata {
  postId: string;
  authorHandle: string;
  authorName: string;
  caption: string;
  mediaType: "image" | "video" | "carousel";
  mediaUrls?: string[];
  likeCount?: number;
  hashtags?: string[];
}

export interface BlogMetadata {
  title: string;
  author?: string;
  publishedAt?: Date;
  description?: string;
  body: string;
  readingTimeMinutes?: number;
  tags?: string[];
  siteName?: string;
  favicon?: string;
}

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  pageCount: number;
  body: string;                // full extracted text
  fileSizeBytes?: number;
}

export interface ImageMetadata {
  alt?: string;
  width?: number;
  height?: number;
  mimeType?: string;
  ocrText?: string;            // extracted text via OCR
  dominantColors?: string[];
  fileSizeBytes?: number;
}

export interface GitHubMetadata {
  owner: string;
  repo: string;
  type: "repo" | "issue" | "pr" | "file" | "gist";
  title: string;
  description?: string;
  stars?: number;
  language?: string;
  body?: string;
  labels?: string[];
}

export interface RedditMetadata {
  subreddit: string;
  title: string;
  author: string;
  body?: string;
  score?: number;
  commentCount?: number;
  flair?: string;
}

export interface WebsiteMetadata {
  title: string;
  description?: string;
  body: string;
  siteName?: string;
  favicon?: string;
  lang?: string;
}

// Union of all platform metadata
export type PlatformMetadata =
  | TweetMetadata
  | YouTubeMetadata
  | InstagramMetadata
  | BlogMetadata
  | PDFMetadata
  | ImageMetadata
  | GitHubMetadata
  | RedditMetadata
  | WebsiteMetadata;

// ─── Extracted Content (output of any extractor) ─────────────────────────────

export interface ExtractedContent {
  url: string;
  contentType: ContentType;
  title: string;
  description?: string;
  thumbnail?: string;
  author?: string;
  publishedAt?: Date;
  /** Raw text used for embedding / chunking */
  rawText: string;
  /** Platform-specific structured metadata */
  metadata: PlatformMetadata;
  /** Whether content exceeds LARGE_CONTENT_THRESHOLD */
  isLarge: boolean;
  extractedAt: Date;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface SearchQuery {
  query: string;
  userId: string;
  contentTypes?: ContentType[];
  limit?: number;
  offset?: number;
}

export interface SearchResultItem {
  contentId: string;
  url: string;
  contentType: ContentType;
  title: string;
  description?: string;
  thumbnail?: string;
  savedAt: Date;
  similarityScore: number;
  isLarge: boolean;
  /** Relevant snippet for small content or matching chunk for large content */
  snippet?: string;
}

export interface SearchResponse {
  results: SearchResultItem[];
  total: number;
  /** AI-generated answer using retrieved content as context */
  aiAnswer: string;
  /** Latest info from AI beyond what was saved */
  latestAiContext?: string;
}

// ─── Chat (large content) ─────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface ChatRequest {
  sessionId?: string;
  contentId: string;
  userId: string;
  message: string;
}

export interface ChatResponse {
  sessionId: string;
  answer: string;
  sourceChunks: string[];
}

// ─── API payloads ─────────────────────────────────────────────────────────────

export interface AddContentRequest {
  url: string;
  tags?: string[];
  notes?: string;
}

export interface AddContentResponse {
  success: boolean;
  contentId?: string;
  contentType?: ContentType;
  title?: string;
  isLarge?: boolean;
  message?: string;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

export type Platform =
  | "twitter"
  | "youtube"
  | "instagram"
  | "blog"
  | "pdf"
  | "image"
  | "github"
  | "reddit"
  | "linkedin"
  | "tiktok"
  | "spotify"
  | "website"
  | "unknown";
