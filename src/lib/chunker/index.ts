/**
 * TextChunker
 *
 * Splits raw text into overlapping chunks using LangChain's
 * RecursiveCharacterTextSplitter.  Chunk size and overlap are
 * driven by env vars so they can be tuned without code changes.
 */

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export interface TextChunk {
  text: string;
  index: number;
  /** Optional: page number for PDFs */
  pageNumber?: number;
}

const DEFAULT_CHUNK_SIZE    = 1_000;
const DEFAULT_CHUNK_OVERLAP = 200;

export class TextChunker {
  private splitter: RecursiveCharacterTextSplitter;

  constructor(
    chunkSize    = parseInt(process.env.CHUNK_SIZE    ?? String(DEFAULT_CHUNK_SIZE),    10),
    chunkOverlap = parseInt(process.env.CHUNK_OVERLAP ?? String(DEFAULT_CHUNK_OVERLAP), 10)
  ) {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      // Keep paragraph / sentence boundaries where possible
      separators: ["\n\n", "\n", ". ", "! ", "? ", " ", ""],
    });
  }

  async split(text: string): Promise<TextChunk[]> {
    const docs = await this.splitter.createDocuments([text]);
    return docs.map((doc: { pageContent: string }, index: number) => ({
      text:  doc.pageContent,
      index,
    }));
  }

  /**
   * For PDFs that already carry per-page text, split page-by-page
   * and preserve page numbers in the chunk metadata.
   */
  async splitByPages(pages: string[]): Promise<TextChunk[]> {
    const results: TextChunk[] = [];
    let globalIndex = 0;

    for (let pageNum = 0; pageNum < pages.length; pageNum++) {
      const docs = await this.splitter.createDocuments([pages[pageNum]]);
      for (const doc of docs) {
        results.push({
          text:       doc.pageContent,
          index:      globalIndex++,
          pageNumber: pageNum + 1,
        });
      }
    }
    return results;
  }
}
