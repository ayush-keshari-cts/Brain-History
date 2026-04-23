/**
 * Unified database layer
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  MongoDB Atlas (content data)    │  MongoDB Atlas (vector search)  │
 * │  ─────────────────────────────   │  ─────────────────────────────  │
 * │  users          (profiles)       │  content_chunks collection      │
 * │  contents       (full metadata)  │  $vectorSearch on embedding[]   │
 * │  chat_sessions  (history)        │  index: "vector_index"          │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Both DBs live in the same MongoDB Atlas cluster — no external vector
 * service required. Vectors are stored as arrays in content_chunks and
 * queried via the Atlas Vector Search aggregation stage ($vectorSearch).
 */

export { default as connectDB } from "./mongoose";

export {
  upsertVectors,
  queryVectors,
  deleteContentVectors,
  deleteUserVectors,
  getVectorStats,
} from "./atlasVectorService";

export type {
  UpsertOptions,
  UpsertChunk,
  QueryOptions,
  QueryResult,
} from "./atlasVectorService";
