/**
 * ChatSession
 *
 * Stores conversation history when a user chats with a large saved content
 * (e.g. a PDF or long article).  Each message alternates user / assistant.
 */

import mongoose, { Document, Model, Schema } from "mongoose";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface IChatMessage {
  role: "user" | "assistant";
  content: string;
  /** Chunk IDs used as context for this assistant turn */
  sourceChunkIds?: mongoose.Types.ObjectId[];
  createdAt: Date;
}

export interface IChatSession extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  contentId: mongoose.Types.ObjectId;
  messages: IChatMessage[];
  /** Condensed memory of the conversation (updated periodically) */
  summary?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-schema ───────────────────────────────────────────────────────────────

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    role:           { type: String, enum: ["user", "assistant"], required: true },
    content:        { type: String, required: true },
    sourceChunkIds: [{ type: Schema.Types.ObjectId, ref: "ContentChunk" }],
    createdAt:      { type: Date, default: () => new Date() },
  },
  { _id: false }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const ChatSessionSchema = new Schema<IChatSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    contentId: {
      type: Schema.Types.ObjectId,
      ref: "Content",
      required: true,
      index: true,
    },
    messages: { type: [ChatMessageSchema], default: [] },
    summary:  String,
  },
  {
    timestamps: true,
    collection: "chat_sessions",
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

ChatSessionSchema.index({ userId: 1, contentId: 1 });
ChatSessionSchema.index({ userId: 1, updatedAt: -1 });

// ─── Model ────────────────────────────────────────────────────────────────────

const ChatSession: Model<IChatSession> =
  mongoose.models.ChatSession ??
  mongoose.model<IChatSession>("ChatSession", ChatSessionSchema);

export default ChatSession;
