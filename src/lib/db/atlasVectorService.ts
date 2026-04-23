/**
 * Atlas Vector Service
 *
 * Replaces Pinecone — all vector operations now go through MongoDB Atlas
 * Vector Search on the `content_chunks` collection.
 *
 * Per-user isolation: every query filters by `userId` (indexed filter field).
 * Per-document chat: queries additionally filter by `contentId`.
 *
 * Atlas Vector Search index required (create once in Atlas UI):
 * Collection : content_chunks
 * Index name : vector_index
 * JSON definition:
 * {
 *   "fields": [
 *     { "type": "vector",  "path": "embedding",            "numDimensions": 1536, "similarity": "cosine" },
 *     { "type": "filter",  "path": "userId"                                                               },
 *     { "type": "filter",  "path": "contentId"                                                            },
 *     { "type": "filter",  "path": "chunkMeta.contentType"                                                }
 *   ]
 * }
 */

import mongoose from "mongoose";
import connectDB from "./mongoose";
import ContentChunk from "@/models/ContentChunk";

// ─── Upsert ───────────────────────────────────────────────────────────────────

export interface UpsertChunk {
  chunkIndex:  number;
  chunkText:   string;
  embedding:   number[];
  pageNumber?: number;
}

export interface UpsertOptions {
  userId:      string;
  contentId:   string;
  contentType: string;
  platform:    string;
  title:       string;
  url:         string;
  thumbnail?:  string;
  savedAt:     Date;
  chunks:      UpsertChunk[];
}

const BATCH_SIZE = 100;

export async function upsertVectors(opts: UpsertOptions): Promise<void> {
  await connectDB();

  const contentObjId = new mongoose.Types.ObjectId(opts.contentId);
  const userObjId    = new mongoose.Types.ObjectId(opts.userId);
  const model        = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";

  // Idempotent — remove any existing chunks for this content first
  await ContentChunk.deleteMany({ contentId: contentObjId });

  const docs = opts.chunks.map((chunk) => ({
    contentId:      contentObjId,
    userId:         userObjId,
    chunkIndex:     chunk.chunkIndex,
    chunkText:      chunk.chunkText,
    embedding:      chunk.embedding,
    embeddingModel: model,
    chunkMeta: {
      contentType: opts.contentType,
      platform:    opts.platform,
      title:       opts.title,
      url:         opts.url,
      pageNumber:  chunk.pageNumber,
    },
  }));

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    await ContentChunk.insertMany(docs.slice(i, i + BATCH_SIZE));
  }
}

// ─── Query ────────────────────────────────────────────────────────────────────

export interface QueryOptions {
  userId:        string;
  queryVector:   number[];
  topK?:         number;
  contentTypes?: string[];
  contentId?:    string;
}

export interface QueryResult {
  vectorId:   string;           // ContentChunk._id.toString()
  score:      number;
  chunkIndex: number;
  chunkText:  string;
  pageNumber: number;
  contentId:  string;
  // chunkMeta fields (for the merge step in vectorSearch.ts)
  contentType: string;
  platform:    string;
  title:       string;
  url:         string;
}

export async function queryVectors(opts: QueryOptions): Promise<QueryResult[]> {
  await connectDB();

  const limit       = opts.topK ?? 10;
  const numCandidates = Math.max(limit * 15, 150);

  // Pre-filter applied inside the ANN scan (fields must exist in the index)
  const filter: Record<string, unknown> = {
    userId: new mongoose.Types.ObjectId(opts.userId),
  };
  if (opts.contentId) {
    filter.contentId = new mongoose.Types.ObjectId(opts.contentId);
  }
  if (opts.contentTypes?.length) {
    filter["chunkMeta.contentType"] = { $in: opts.contentTypes };
  }

  const pipeline: mongoose.PipelineStage[] = [
    {
      $vectorSearch: {
        index:         "vector_index",
        path:          "embedding",
        queryVector:   opts.queryVector,
        numCandidates,
        limit,
        filter,
      },
    } as unknown as mongoose.PipelineStage,
    {
      $project: {
        _id:        1,
        chunkIndex: 1,
        chunkText:  1,
        contentId:  1,
        chunkMeta:  1,
        score:      { $meta: "vectorSearchScore" },
      },
    },
  ];

  const raw = await ContentChunk.aggregate(pipeline) as Array<{
    _id:        mongoose.Types.ObjectId;
    chunkIndex: number;
    chunkText:  string;
    contentId:  mongoose.Types.ObjectId;
    chunkMeta:  { contentType: string; platform: string; title: string; url: string; pageNumber?: number };
    score:      number;
  }>;

  return raw.map((r) => ({
    vectorId:    r._id.toString(),
    score:       r.score,
    chunkIndex:  r.chunkIndex,
    chunkText:   r.chunkText,
    pageNumber:  r.chunkMeta.pageNumber ?? 0,
    contentId:   r.contentId.toString(),
    contentType: r.chunkMeta.contentType,
    platform:    r.chunkMeta.platform,
    title:       r.chunkMeta.title,
    url:         r.chunkMeta.url,
  }));
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteContentVectors(
  _userId: string,
  contentId: string
): Promise<void> {
  await connectDB();
  await ContentChunk.deleteMany({ contentId: new mongoose.Types.ObjectId(contentId) });
}

export async function deleteUserVectors(userId: string): Promise<void> {
  await connectDB();
  await ContentChunk.deleteMany({ userId: new mongoose.Types.ObjectId(userId) });
}

export async function getVectorStats(userId: string) {
  await connectDB();
  const count = await ContentChunk.countDocuments({
    userId: new mongoose.Types.ObjectId(userId),
  });
  return { totalVectors: count };
}
