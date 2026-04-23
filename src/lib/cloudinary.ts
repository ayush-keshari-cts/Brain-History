/**
 * Cloudinary v2 client
 *
 * Uses require() to access cloudinary.v2 — the package is CommonJS and
 * Next.js's bundler cannot resolve named ES-module imports from it.
 * "cloudinary" is listed in serverExternalPackages so it is never bundled.
 *
 * Config is applied lazily inside each function (not at module load time)
 * because Next.js env vars are not guaranteed to be present when the module
 * is first required during the build/startup phase.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
import type { UploadApiResponse, UploadApiErrorResponse } from "cloudinary";

type ResourceType = "image" | "video" | "raw" | "auto";
type CloudinaryV2 = typeof import("cloudinary").v2;

/** Returns a fully-configured Cloudinary v2 instance. */
function getCloudinary(): CloudinaryV2 {
  const cld = (require("cloudinary") as { v2: CloudinaryV2 }).v2;
  cld.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure:     true,
  });
  return cld;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map a MIME type to the correct Cloudinary resource_type */
export function getResourceType(mime: string): ResourceType {
  if (mime.startsWith("image/"))                               return "image";
  if (mime.startsWith("video/") || mime.startsWith("audio/")) return "video";
  return "raw";
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
  const cloudinary = getCloudinary();
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
  const cloudinary = getCloudinary();
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

/**
 * Build a thumbnail URL from a Cloudinary secure_url using transformations.
 *
 * Images → resized + cropped version of the image itself (no extra API call)
 * Videos → auto-captured first-frame JPEG thumbnail
 * Others → undefined
 */
export function makeThumbnailUrl(secureUrl: string, mime: string): string | undefined {
  if (mime.startsWith("image/")) {
    return secureUrl.replace(
      "/image/upload/",
      "/image/upload/w_600,h_300,c_fill,f_auto,q_auto/"
    );
  }
  if (mime.startsWith("video/")) {
    return secureUrl
      .replace("/video/upload/", "/video/upload/so_0,w_600,h_300,c_fill,f_jpg,q_auto/")
      .replace(/\.[^.]+$/, ".jpg");
  }
  return undefined;
}

/**
 * Build a download URL by injecting fl_attachment into a Cloudinary URL.
 *
 * Original:  …/upload/v123/{public_id}
 * Download:  …/upload/fl_attachment/v123/{public_id}
 */
export function makeDownloadUrl(secureUrl: string): string {
  return secureUrl.replace("/upload/", "/upload/fl_attachment/");
}
