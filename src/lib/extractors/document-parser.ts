/**
 * documentParser
 *
 * Parse common document formats from a Buffer — used by both the URL extractor
 * (pdf.ts fetches → Buffer) and the file upload route (direct Buffer from upload).
 *
 * Supported formats:
 *   PDF   (.pdf)  — pdf-parse v1
 *   DOCX  (.docx) — mammoth
 *   DOC   (.doc)  — mammoth (best-effort; older binary format)
 */

export interface ParsedDocument {
  text:      string;
  title?:    string;
  author?:   string;
  subject?:  string;
  keywords?: string[];
  pageCount?: number;
  /** approximate — based on text character count */
  isLarge:   boolean;
}

const LARGE_THRESHOLD = 10_000; // chars

// ─── PDF ──────────────────────────────────────────────────────────────────────

export async function parsePdfBuffer(buffer: Buffer): Promise<ParsedDocument> {
  // Lazy require prevents DOMMatrix crash during module init in Next.js
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (
    buf: Buffer
  ) => Promise<{
    text: string;
    numpages: number;
    info: Record<string, string | undefined>;
  }>;

  const parsed = await pdfParse(buffer);

  const text = parsed.text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return {
    text,
    title:     parsed.info?.Title   || undefined,
    author:    parsed.info?.Author  || undefined,
    subject:   parsed.info?.Subject || undefined,
    keywords:  parsed.info?.Keywords
      ? (parsed.info.Keywords as string).split(/[,;]/).map((k) => k.trim()).filter(Boolean)
      : undefined,
    pageCount: parsed.numpages,
    isLarge:   text.length > LARGE_THRESHOLD,
  };
}

// ─── DOCX / DOC ───────────────────────────────────────────────────────────────

export async function parseWordBuffer(buffer: Buffer): Promise<ParsedDocument> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mammoth = require("mammoth") as {
    extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string; messages: unknown[] }>;
  };

  const result = await mammoth.extractRawText({ buffer });

  const text = result.value
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return {
    text,
    isLarge: text.length > LARGE_THRESHOLD,
  };
}
