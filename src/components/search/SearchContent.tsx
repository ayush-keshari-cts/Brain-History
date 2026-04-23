"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import type { SearchResponse, SearchResultItem } from "@/types";

export default function SearchContent() {
  const [query, setQuery]     = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<SearchResponse | null>(null);
  const [error, setError]     = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setError(null);

    try {
      const data = await api.search(q);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Search</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Ask anything — AI will search your saved content and answer.
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What do you want to know?"
          className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="shrink-0 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="h-24 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && result && (
        <div className="space-y-6">
          {/* AI Answer */}
          {result.aiAnswer && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-5 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
                <span>🤖</span>
                AI Answer
              </div>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                {result.aiAnswer}
              </p>
            </div>
          )}

          {/* Source results */}
          {result.results.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Sources ({result.results.length})
              </h2>
              {result.results.map((item) => (
                <SearchResultCard key={item.contentId} item={item} />
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-neutral-500 dark:text-neutral-400 text-sm">
              No matching content found. Try saving more URLs first.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Search result card ───────────────────────────────────────────────────────

const TYPE_EMOJI: Record<string, string> = {
  tweet: "🐦", youtube_video: "📹", blog: "📝", pdf: "📄",
  github: "🐙", reddit: "🟠", website: "🌐", image: "🖼️", unknown: "🔗",
};

function SearchResultCard({ item }: { item: SearchResultItem }) {
  const emoji  = TYPE_EMOJI[item.contentType] ?? "🔗";
  const domain = (() => { try { return new URL(item.url).hostname.replace(/^www\./, ""); } catch { return item.url; } })();
  const pct    = Math.round(item.similarityScore * 100);

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-2 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0 mt-0.5">{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
            <span className="text-xs text-neutral-400 shrink-0">{pct}% match</span>
          </div>
          <p className="text-xs text-neutral-400 truncate">{domain}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded text-neutral-400 hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Open original"
          >
            <ExternalLinkIcon className="h-3.5 w-3.5" />
          </a>
          <Link
            href={item.isLarge ? `/content/${item.contentId}/chat` : `/content/${item.contentId}`}
            className="p-1.5 rounded text-neutral-400 hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title={item.isLarge ? "Chat" : "View"}
          >
            {item.isLarge ? <ChatIcon className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
          </Link>
        </div>
      </div>
      {item.snippet && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed line-clamp-3">
          {item.snippet}
        </p>
      )}
    </div>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}
