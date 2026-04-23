"use client";

/**
 * /api-docs — Swagger UI for BrainHistory API
 * CSS loaded from CDN to avoid Turbopack resolution issues with swagger-ui-react.
 */

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Head from "next/head";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<object | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load Swagger UI CSS from CDN
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "https://unpkg.com/swagger-ui-dist@5/swagger-ui.css";
    document.head.appendChild(link);

    fetch("/api/swagger-spec")
      .then((r) => r.json())
      .then(setSpec)
      .catch(() => setError("Failed to load API spec"));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gray-900 text-white px-6 py-4 flex items-center gap-3">
        <span className="text-2xl font-bold tracking-tight">🧠 BrainHistory</span>
        <span className="text-gray-400 text-sm mt-1">API Documentation</span>
        <span className="ml-auto text-xs text-gray-500 font-mono">OpenAPI 3.0</span>
      </div>

      {error && (
        <div className="p-8 text-red-600 font-medium">{error}</div>
      )}
      {!spec && !error && (
        <div className="p-8 text-gray-400 animate-pulse">Loading API spec…</div>
      )}
      {spec && (
        <SwaggerUI
          spec={spec}
          docExpansion="list"
          defaultModelsExpandDepth={1}
          tryItOutEnabled={true}
          requestInterceptor={(req) => {
            req.credentials = "include";
            return req;
          }}
        />
      )}

      <style>{`
        .swagger-ui .topbar { display: none !important; }
      `}</style>
    </div>
  );
}
