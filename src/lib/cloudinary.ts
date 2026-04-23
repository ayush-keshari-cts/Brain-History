/**
 * Cloudinary v2 client
 *
 * - Images  → resource_type "image"
 * - Video / Audio → resource_type "video"  (Cloudinary handles both)
 * - PDFs, Word, other docs → resource_type "raw"  (served as-is, no conversion)
 *
 * Files are organised under:  brainhistory/{userId}/{contentId}
 */

import { v2 as cloudinary } from "cloudinary";
import type { UploadApiResponse } from "cloudinary";

type ResourceType = "image" | "video" | "raw" | "auto";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map a MIME type to the correct Cloudinary resource_type */
export function getResourceType(mime: string): ResourceType {
  if (mime.startsWith("image/"))                          return "image";
  if (mime.startsWith("video/") || mime.startsWith("audio/")) return "video";
  return "raw";   // PDFs, Word docs, etc.
}

/**
 * Upload a Buffer to Cloudinary.
 * Returns the full Cloudinary response (secure_url, public_id, …).
 */
export function uploadToCloudinary(
  buffer: Buffer,
  {
    folder,
    publicId,
    resourceType,
    originalFilename,
  }: {
    folder:           string;
    publicId:         string;
    resourceType:     ResourceType;
    originalFilename: string;
  }
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id:         publicId,
        resource_type:     resourceType,
        use_filename:      false,
        overwrite:         true,
        // Store the original filename in context so we can use it for downloads
        context:           `original_filename=${originalFilename}`,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload returned no result"));
        } else {
          resolve(result);
        }
      }
    );
    stream.end(buffer);
  });
}

/**
 * Delete a file from Cloudinary by its public_id.
 * Needed when the user deletes a content item.
 */
export async function deleteFromCloudinary(
  publicId:     string,
  resourceType: ResourceType
): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

/**
 * Build a download URL from a Cloudinary secure_url by injecting the
 * fl_attachment flag.
 *
 * Original:  https://res.cloudinary.com/{cloud}/{type}/upload/v123/{id}
 * Download:  https://res.cloudinary.com/{cloud}/{type}/upload/fl_attachment/v123/{id}
 */
export function makeDownloadUrl(secureUrl: string): string {
  return secureUrl.replace("/upload/", "/upload/fl_attachment/");
}

export { cloudinary };
