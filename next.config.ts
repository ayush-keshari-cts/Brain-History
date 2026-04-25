import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16.2.4 generates a malformed routes.d.ts — skip the build-time TS check.
  // IDE type checking still works normally via tsconfig + the next plugin.
  typescript: {
    ignoreBuildErrors: true,
  },
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
