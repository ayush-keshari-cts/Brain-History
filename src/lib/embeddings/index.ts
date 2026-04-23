/**
 * EmbeddingService
 *
 * Orchestrates the full content indexing pipeline:
 *
 *   MongoDB Atlas (content data)       MongoDB Atlas (vector search)
 *   ──────────────────────             ──────────────────────────────
 *   Content doc (metadata,             content_chunks collection
 *   rawText, processingStatus)         embedding[] + $vectorSearch
 *
 * Flow (indexContent):
 *   1. Chunk rawText via RecursiveCharacterTextSplitter
 *   2. Batch-embed chunks via OpenAI
 *   3. Upsert ContentChunk docs → Atlas (content_chunks collection)
 *   4. Update Content.processingStatus + embeddingsCount → MongoDB
 */

import { OpenAIEmbeddings }  from "@langchain/openai";
import mongoose               from "mongoose";
import { ExtractedContent }  from "@/types";
import { TextChunker }       from "@/lib/chunker";
import connectDB             from "@/lib/db/mongoose";
import { upsertVectors }     from "@/lib/db/atlasVectorService";
import { Content }           from "@/models";
import { ProcessingStatus }  from "@/types";

// ─── Provider factory ─────────────────────────────────────────────────────────

function createEmbeddings() {
  const provider = process.env.AI_PROVIDER ?? "openai";

  if (provider === "openai") {
    return new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName:    process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
    });
  }

  throw new Error(`Unsupported AI_PROVIDER for embeddings: ${provider}`);
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class EmbeddingService {
  private embeddings = createEmbeddings();
  private chunker    = new TextChunker();

  /** Embed a single string → vector */
  async embed(text: string): Promise<number[]> {
    const [vector] = await this.embeddings.embedDocuments([text]);
    return vector;
  }

  /** Embed a query string (may use a query-optimised model endpoint) */
  async embedQuery(query: string): Promise<number[]> {
    return this.embeddings.embedQuery(query);
  }

  /**
   * Full indexing pipeline — called after a Content document is created.
   *
   * MongoDB writes (content data):
   *   Content.processingStatus  → "processing" → "completed" | "failed"
   *   Content.embeddingsCount   → number of chunks stored
   *
   * MongoDB writes (vector store):
   *   ContentChunk docs → content_chunks collection (embedding[] field)
   */
  async indexContent(
    contentId: mongoose.Types.ObjectId,
    userId:    mongoose.Types.ObjectId,
    extracted: ExtractedContent & { platform?: string; thumbnail?: string; savedAt?: Date }
  ): Promise<void> {
    await connectDB();

    // Mark as processing
    await Content.findByIdAndUpdate(contentId, {
      processingStatus: ProcessingStatus.PROCESSING,
    });

    try {
      // ── 1. Chunk ──────────────────────────────────────────────────────────
      const chunks = await this.chunker.split(extracted.rawText);

      if (chunks.length === 0) {
        throw new Error("No text chunks could be generated from content");
      }

      // ── 2. Batch embed ────────────────────────────────────────────────────
      const BATCH_SIZE = 100;
      const allVectors: number[][] = [];

      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE).map((c) => c.text);
        const vecs  = await this.embeddings.embedDocuments(batch);
        allVectors.push(...vecs);
      }

      // ── 3. Upsert → Atlas (content_chunks collection) ────────────────────
      await upsertVectors({
        userId:      userId.toString(),
        contentId:   contentId.toString(),
        contentType: extracted.contentType,
        platform:    extracted.platform ?? "unknown",
        title:       extracted.title,
        url:         extracted.url,
        thumbnail:   extracted.thumbnail,
        savedAt:     extracted.savedAt ?? new Date(),
        chunks: chunks.map((chunk, i) => ({
          chunkIndex:  chunk.index,
          chunkText:   chunk.text,
          embedding:   allVectors[i],
          pageNumber:  chunk.pageNumber,
        })),
      });

      // ── 4. Update MongoDB ─────────────────────────────────────────────────
      await Content.findByIdAndUpdate(contentId, {
        processingStatus: ProcessingStatus.COMPLETED,
        embeddingsCount:  chunks.length,
      });

    } catch (err) {
      await Content.findByIdAndUpdate(contentId, {
        processingStatus: ProcessingStatus.FAILED,
        processingError:  String(err),
      });
      throw err;
    }
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _service: EmbeddingService | null = null;

export function getEmbeddingService(): EmbeddingService {
  if (!_service) _service = new EmbeddingService();
  return _service;
}
