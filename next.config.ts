import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These packages use Node.js-only APIs or native bindings.
  // Tell Next.js to require them as-is instead of bundling.
  serverExternalPackages: [
    "pdf-parse",
    "mammoth",
    "sharp",
    "mongoose",
  ],
};

export default nextConfig;
