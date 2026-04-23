/**
 * ImageExtractor
 *
 * Downloads the image and extracts:
 *  - MIME type, dimensions, file size (via sharp)
 *  - Alt text from surrounding HTML (if referrer page is available)
 *
 * OCR is intentionally left as a TODO stub — integrate Tesseract.js or
 * an external OCR API (e.g. Google Vision) when needed.
 */

import sharp from "sharp";
import { ContentType, ExtractedContent, ImageMetadata } from "@/types";
import { BaseExtractor } from "./base";
import { httpClient } from "./http-client";

export class ImageExtractor extends BaseExtractor {
  readonly supportedTypes = [ContentType.IMAGE, ContentType.SCREENSHOT];

  async extract(url: string): Promise<ExtractedContent> {
    const response = await httpClient.get<ArrayBuffer>(url, {
      responseType: "arraybuffer",
      maxContentLength: 20 * 1024 * 1024, // 20 MB
    });

    const buffer   = Buffer.from(response.data);
    const metadata = await sharp(buffer).metadata();

    const imgMeta: ImageMetadata = {
      width:         metadata.width,
      height:        metadata.height,
      mimeType:      metadata.format ? `image/${metadata.format}` : undefined,
      fileSizeBytes: buffer.byteLength,
      // ocrText: TODO — integrate Tesseract.js or Google Vision API
    };

    // Derive a name from the URL
    const filename = decodeURIComponent(
      url.split("/").pop()?.split("?")[0] ?? "image"
    );

    const rawText = this.cleanText(
      [filename, imgMeta.ocrText].filter(Boolean).join("\n")
    );

    return {
      url,
      contentType: ContentType.IMAGE,
      title:       filename,
      description: imgMeta.ocrText
                     ? this.truncate(imgMeta.ocrText, 200)
                     : `${metadata.width}×${metadata.height} image`,
      thumbnail:   url,
      rawText:     rawText || filename,
      metadata:    imgMeta,
      isLarge:     false,
      extractedAt: this.now(),
    };
  }
}
