/**
 * vectorSearch
 *
 * Queries MongoDB Atlas Vector Search ($vectorSearch aggregation) and joins
 * the result with the full Content document.
 *
 * Atlas does the ANN search on content_chunks.embedding[], then we fetch
 * the parent Content metadata — no external vector service required.
 */

import mongoose            from "mongoose";
import connectDB           from "@/lib/db/mongoose";
import { queryVectors }    from "@/lib/db/atlasVectorService";
import { Content }         from "@/models";
import { ContentType }     from "@/types";

// ─── Result shapes ────────────────────────────────────────────────────────────

export interface VectorSearchResult {
  vectorId:     string;
  score:        number;
  chunkIndex:   number;
  chunkText:    string;
  pageNumber?:  number;
  contentId:    string;

  // From Content document
  contentType:  ContentType;
  platform:     string;
  title:        string;
  url:          string;
  description?: string;
  thumbnail?:   string;
  author?:      string;
  savedAt:      Date;
  isLarge:      boolean;
}

export interface VectorSearchOptions {
  userId:        string;
  queryVector:   number[];
  limit?:        number;
  contentTypes?: string[];
  /** Restrict to a single content item (PDF chat mode) */
  contentId?:    string;
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function vectorSearch(
  opts: VectorSearchOptions
): Promise<VectorSearchResult[]> {
  await connectDB();

  // ── Step 1: Atlas $vectorSearch → top-K chunks ─────────────────────────────
  const chunkResults = await queryVectors({
    userId:       opts.userId,
    queryVector:  opts.queryVector,
    topK:         opts.limit ?? 10,
    contentTypes: opts.contentTypes,
    contentId:    opts.contentId,
  });

  if (chunkResults.length === 0) return [];

  // ── Step 2: Fetch Content metadata for unique content IDs ──────────────────
  const uniqueContentIds = [...new Set(chunkResults.map((r) => r.contentId))];

  const mongoDocs = await Content.find({
    _id: { $in: uniqueContentIds.map((id) => new mongoose.Types.ObjectId(id)) },
  })
    .select("_id contentType platform title description thumbnail author url savedAt contentSize")
    .lean() as Array<{
      _id:          { toString(): string };
      contentType:  string;
      platform:     string;
      title:        string;
      url:          string;
      description?: string;
      thumbnail?:   string;
      author?:      string;
      savedAt:      Date;
      contentSize:  string;
    }>;

  const docsById = new Map(mongoDocs.map((d) => [d._id.toString(), d]));

  // ── Step 3: Merge ──────────────────────────────────────────────────────────
  return chunkResults.flatMap((r) => {
    const doc = docsById.get(r.contentId);
    if (!doc) return []; // content deleted — skip stale chunk

    return [{
      vectorId:    r.vectorId,
      score:       r.score,
      chunkIndex:  r.chunkIndex,
      chunkText:   r.chunkText,
      pageNumber:  r.pageNumber || undefined,
      contentId:   r.contentId,

      contentType: doc.contentType as ContentType,
      platform:    doc.platform,
      title:       doc.title,
      url:         doc.url,
      description: doc.description,
      thumbnail:   doc.thumbnail,
      author:      doc.author,
      savedAt:     doc.savedAt,
      isLarge:     doc.contentSize === "large",
    }];
  });
}
