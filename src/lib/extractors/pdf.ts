/**
 * PDFExtractor
 *
 * Downloads a PDF from the given URL and extracts text using pdf-parse.
 * PDFs are almost always "large" content and will trigger chat mode.
 *
 * NOTE: pdf-parse is required INSIDE the extract() method (not at top level)
 * to avoid Node.js crashing on DOMMatrix during module initialisation in Next.js.
 */

import axios from "axios";
import { ContentType, ExtractedContent, PDFMetadata } from "@/types";
import { BaseExtractor } from "./base";

type PdfParseResult = {
  text: string;
  numpages: number;
  info: Record<string, string | undefined>;
};

export class PDFExtractor extends BaseExtractor {
  readonly supportedTypes = [ContentType.PDF];

  async extract(url: string): Promise<ExtractedContent> {
    // Lazy require — prevents DOMMatrix crash during module evaluation
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<PdfParseResult>;

    const response = await axios.get<ArrayBuffer>(url, {
      responseType: "arraybuffer",
      timeout: 60_000,
      maxContentLength: 50 * 1024 * 1024,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BrainHistoryBot/1.0)" },
    });

    const buffer  = Buffer.from(response.data);
    const parsed  = await pdfParse(buffer);
    const rawText = this.cleanText(parsed.text);

    const urlFilename = decodeURIComponent(
      url.split("/").pop()?.split("?")[0] ?? ""
    ).replace(/\.pdf$/i, "");

    const pdfMeta: PDFMetadata = {
      title:         parsed.info?.Title   || urlFilename || undefined,
      author:        parsed.info?.Author  || undefined,
      subject:       parsed.info?.Subject || undefined,
      keywords:      parsed.info?.Keywords
                       ? (parsed.info.Keywords as string).split(/[,;]/).map((k: string) => k.trim()).filter(Boolean)
                       : [],
      pageCount:     parsed.numpages,
      body:          rawText,
      fileSizeBytes: buffer.byteLength,
    };

    return {
      url,
      contentType: ContentType.PDF,
      title:       pdfMeta.title ?? urlFilename ?? "PDF Document",
      description: pdfMeta.subject || this.truncate(rawText, 200),
      author:      pdfMeta.author,
      rawText,
      metadata:    pdfMeta,
      isLarge:     true,
      extractedAt: this.now(),
    };
  }
}
