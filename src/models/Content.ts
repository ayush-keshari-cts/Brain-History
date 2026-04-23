import mongoose, { Document, Model, Schema } from "mongoose";
import { ContentType, ContentSize, ProcessingStatus } from "@/types";

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IContent extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;

  // Source
  url: string;
  contentType: ContentType;
  platform: string;              // human-readable: "twitter", "youtube" …

  // Display
  title: string;
  description?: string;
  thumbnail?: string;
  author?: string;
  publishedAt?: Date;

  // Full extracted text (used for chunking & embedding)
  rawText: string;
  rawTextLength: number;

  // Flexible platform-specific metadata (varies by content type)
  metadata: Record<string, unknown>;

  // Size category derived from rawTextLength vs threshold
  contentSize: ContentSize;

  // User annotations
  tags: string[];
  notes?: string;

  // Indexing / pipeline state
  processingStatus: ProcessingStatus;
  processingError?: string;
  embeddingsCount: number;       // how many chunks were embedded

  savedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const ContentSchema = new Schema<IContent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    url:         { type: String, required: true, trim: true },
    contentType: { type: String, enum: Object.values(ContentType), required: true },
    platform:    { type: String, required: true },

    title:       { type: String, required: true, trim: true },
    description: String,
    thumbnail:   String,
    author:      String,
    publishedAt: Date,

    rawText:       { type: String, required: true },
    rawTextLength: { type: Number, required: true },

    // Mixed type – no fixed shape, stores whatever the extractor produces
    metadata: { type: Schema.Types.Mixed, default: {} },

    contentSize: {
      type: String,
      enum: Object.values(ContentSize),
      required: true,
    },

    tags:  { type: [String], default: [] },
    notes: String,

    processingStatus: {
      type: String,
      enum: Object.values(ProcessingStatus),
      default: ProcessingStatus.PENDING,
    },
    processingError: String,
    embeddingsCount: { type: Number, default: 0 },

    savedAt: { type: Date, default: () => new Date() },
  },
  {
    timestamps: true,
    collection: "contents",
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Prevent duplicate saves of the same URL per user
ContentSchema.index({ userId: 1, url: 1 }, { unique: true });

// Filtering by type or status per user
ContentSchema.index({ userId: 1, contentType: 1 });
ContentSchema.index({ userId: 1, processingStatus: 1 });
ContentSchema.index({ userId: 1, savedAt: -1 });

// Full-text search fallback (Atlas Search is preferred for vector)
ContentSchema.index({ title: "text", description: "text", tags: "text" });

// ─── Model ────────────────────────────────────────────────────────────────────

const Content: Model<IContent> =
  mongoose.models.Content ?? mongoose.model<IContent>("Content", ContentSchema);

export default Content;
