import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
  // These packages use Node.js-only APIs or native bindings.
  // Tell Next.js to require them as-is instead of bundling.
  serverExternalPackages: [
    "pdf-parse",
    "mammoth",
    "sharp",
    "mongoose",
    "cloudinary",
  ],
};

export default nextConfig;
