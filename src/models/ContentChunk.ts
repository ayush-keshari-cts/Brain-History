/**
 * ContentChunk
 *
 * Each document here represents one text chunk of a saved Content document.
 * The `embedding` field stores the vector generated from `chunkText` and is
 * used by MongoDB Atlas Vector Search (or a compatible provider).
 *
 * Atlas Vector Search index config (create in Atlas UI / CLI):
 * {
 *   "mappings": {
 *     "dynamic": false,
 *     "fields": {
 *       "embedding": {
 *         "dimensions": 1536,        // text-embedding-3-small
 *         "similarity": "cosine",
 *         "type": "knnVector"
 *       }
 *     }
 *   }
 * }
 */

import mongoose, { Document, Model, Schema } from "mongoose";

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IContentChunk extends Document {
  _id: mongoose.Types.ObjectId;
  contentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;     // denormalised for per-user vector search

  /** Zero-based position of this chunk within the parent content */
  chunkIndex: number;

  /** The actual text of this chunk */
  chunkText: string;

  /**
   * Vector embedding of chunkText.
   * Stored as an array of numbers; the Atlas Vector Search index targets this field.
   */
  embedding: number[];

  /** Embedding model identifier (e.g. "text-embedding-3-small") */
  embeddingModel: string;

  /** Extra metadata passed through to the vector store for filtering */
  chunkMeta: {
    contentType: string;
    platform:    string;
    title:       string;
    url:         string;
    fileUrl?:    string;   // Cloudinary URL for uploaded media (image/video/audio/PDF)
    pageNumber?: number;   // useful for PDFs
  };

  createdAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const ContentChunkSchema = new Schema<IContentChunk>(
  {
    contentId: {
      type: Schema.Types.ObjectId,
      ref: "Content",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    chunkIndex: { type: Number, required: true },
    chunkText:  { type: String, required: true },

    // NOTE: Do NOT put a Mongoose validator on embedding length —
    // different models have different dimensionalities.
    embedding:      { type: [Number], required: true },
    embeddingModel: { type: String,   required: true },

    chunkMeta: {
      contentType: { type: String, required: true },
      platform:    { type: String, required: true },
      title:       { type: String, required: true },
      url:         { type: String, required: true },
      fileUrl:     String,
      pageNumber:  Number,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "content_chunks",
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

ContentChunkSchema.index({ contentId: 1, chunkIndex: 1 });
ContentChunkSchema.index({ userId: 1 });

// ─── Model ────────────────────────────────────────────────────────────────────

const ContentChunk: Model<IContentChunk> =
  mongoose.models.ContentChunk ??
  mongoose.model<IContentChunk>("ContentChunk", ContentChunkSchema);

export default ContentChunk;
