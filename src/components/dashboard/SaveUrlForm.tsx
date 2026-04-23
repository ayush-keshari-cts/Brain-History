"use client";

import { useState, useRef } from "react";
import { api, type ContentItem } from "@/lib/api-client";

interface SaveUrlFormProps {
  onAdded: (item: ContentItem) => void;
}

export default function SaveUrlForm({ onAdded }: SaveUrlFormProps) {
  const [url, setUrl]         = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef              = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.addContent(trimmed);
      if (res.success && res.contentId) {
        setSuccess(
          res.message === "Already saved"
            ? `Already in your library: "${res.title}"`
            : `Saved: "${res.title}" — indexing in background`
        );
        setUrl("");

        // Construct a minimal ContentItem to add to the list immediately
        const newItem: ContentItem = {
          _id:               res.contentId,
          url:               trimmed,
          contentType:       res.contentType ?? "unknown",
          platform:          "unknown",
          title:             res.title ?? trimmed,
          savedAt:           new Date().toISOString(),
          processingStatus:  res.message === "Already saved" ? "completed" : "pending",
          contentSize:       res.isLarge ? "large" : "small",
          tags:              [],
          embeddingsCount:   0,
        };
        onAdded(newItem);
        inputRef.current?.focus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save URL");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 space-y-3 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">Save a URL</h2>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/article"
          required
          disabled={loading}
          className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-background px-3 py-2 text-sm text-foreground placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Saving…" : "Save"}
        </button>
      </form>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      {success && (
        <p className="text-xs text-green-600 dark:text-green-400">{success}</p>
      )}
    </div>
  );
}
