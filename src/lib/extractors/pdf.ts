/**
 * PDFExtractor
 *
 * Downloads a PDF from the given URL and extracts text using pdf-parse v1.
 * PDFs are almost always "large" content and will trigger chat mode.
 */

import { ContentType, ExtractedContent, PDFMetadata } from "@/types";
import { BaseExtractor } from "./base";
import { httpClient }    from "./http-client";
import { parsePdfBuffer } from "./document-parser";

export class PDFExtractor extends BaseExtractor {
  readonly supportedTypes = [ContentType.PDF];

  async extract(url: string): Promise<ExtractedContent> {
    const response = await httpClient.get<ArrayBuffer>(url, {
      responseType: "arraybuffer",
      maxContentLength: 50 * 1024 * 1024,
    });

    const buffer = Buffer.from(response.data);
    const parsed = await parsePdfBuffer(buffer);

    const urlFilename = decodeURIComponent(
      url.split("/").pop()?.split("?")[0] ?? ""
    ).replace(/\.pdf$/i, "");

    const pdfMeta: PDFMetadata = {
      title:         parsed.title    || urlFilename || undefined,
      author:        parsed.author   || undefined,
      subject:       parsed.subject  || undefined,
      keywords:      parsed.keywords ?? [],
      pageCount:     parsed.pageCount ?? 0,
      body:          parsed.text,
      fileSizeBytes: buffer.byteLength,
    };

    return {
      url,
      contentType: ContentType.PDF,
      title:       pdfMeta.title ?? urlFilename ?? "PDF Document",
      description: pdfMeta.subject || this.truncate(parsed.text, 200),
      author:      pdfMeta.author,
      rawText:     parsed.text,
      metadata:    pdfMeta,
      isLarge:     true,
      extractedAt: this.now(),
    };
  }
}
