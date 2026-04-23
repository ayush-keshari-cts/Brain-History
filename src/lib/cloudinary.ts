/**
 * Cloudinary v2 client
 *
 * Uses require() to access cloudinary.v2 — the package is CommonJS and
 * Next.js's bundler cannot resolve named ES-module imports from it.
 * "cloudinary" is listed in serverExternalPackages so it is never bundled.
 *
 * - Images        → resource_type "image"
 * - Video / Audio → resource_type "video"
 * - PDFs, Word    → resource_type "raw"  (served as-is, no conversion)
 *
 * Files are organised under:  brainhistory/{userId}/{contentId}
 */

/* eslint-disable @typescript-eslint/no-require-imports */
import type { UploadApiResponse, UploadApiErrorResponse } from "cloudinary";

type ResourceType = "image" | "video" | "raw" | "auto";

// Access v2 via require to avoid CJS/ESM named-export resolution failures
type CloudinaryV2 = typeof import("cloudinary").v2;
const cloudinary: CloudinaryV2 = (require("cloudinary") as { v2: CloudinaryV2 }).v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map a MIME type to the correct Cloudinary resource_type */
export function getResourceType(mime: string): ResourceType {
  if (mime.startsWith("image/"))                               return "image";
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
        public_id:     publicId,
        resource_type: resourceType,
        use_filename:  false,
        overwrite:     true,
        context:       `original_filename=${originalFilename}`,
      },
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
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
 * Called when the user deletes a content item.
 */
export async function deleteFromCloudinary(
  publicId:     string,
  resourceType: ResourceType
): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

/**
 * Build a download URL from a Cloudinary secure_url by injecting fl_attachment.
 *
 * Original:  https://res.cloudinary.com/{cloud}/{type}/upload/v123/{public_id}
 * Download:  https://res.cloudinary.com/{cloud}/{type}/upload/fl_attachment/v123/{public_id}
 */
export function makeDownloadUrl(secureUrl: string): string {
  return secureUrl.replace("/upload/", "/upload/fl_attachment/");
}

export { cloudinary };
