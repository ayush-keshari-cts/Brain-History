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
    setLoading(true); setError(null);
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
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">

      {/* Hero */}
      <div className="space-y-3 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-500/20">
          <SparkleIcon className="h-3.5 w-3.5" />
          AI-Powered Semantic Search
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Ask your <span className="gradient-text">saved content</span>
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Ask anything — AI finds relevant content and synthesizes an answer from your library.
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch}>
        <div className="flex items-center gap-2 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-sm dark:shadow-zinc-900/50 px-4 py-2 focus-within:ring-2 focus-within:ring-violet-500/30 focus-within:border-violet-400 dark:focus-within:border-violet-500 transition-all">
          <SearchIcon className="h-5 w-5 text-violet-500 dark:text-violet-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What do you want to know about your saved content?"
            className="flex-1 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 bg-transparent focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20"
          >
            {loading ? <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <SearchIcon className="h-4 w-4" />}
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
          <span className="h-2 w-2 rounded-full bg-red-400 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          <div className="h-32 rounded-2xl skeleton border border-zinc-100 dark:border-zinc-800" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl skeleton border border-zinc-100 dark:border-zinc-800" />
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && result && (
        <div className="space-y-5">

          {/* AI Answer */}
          {result.aiAnswer && (
            <div className="rounded-2xl p-5 space-y-3 bg-white dark:bg-zinc-900 border border-violet-200 dark:border-violet-500/30 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-violet-500/5 dark:bg-violet-500/8 blur-2xl pointer-events-none" />
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25 shrink-0">
                  <SparkleIcon className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">AI Answer</span>
                <span className="ml-auto text-xs text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-100 dark:border-violet-500/20">
                  from your library
                </span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {result.aiAnswer}
              </p>
            </div>
          )}

          {/* Sources */}
          {result.results.length > 0 ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Sources</span>
                <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                <span className="text-xs text-zinc-400 dark:text-zinc-500">{result.results.length} results</span>
              </div>
              {result.results.map((item) => (
                <SearchResultCard key={item.contentId} item={item} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-12 space-y-3 text-center">
              <div className="h-12 w-12 rounded-2xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 flex items-center justify-center">
                <SearchIcon className="h-5 w-5 text-violet-500 dark:text-violet-400" />
              </div>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">No matching content found</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">Try saving more content to your library first.</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !result && !error && (
        <div className="grid grid-cols-2 gap-3 pt-2">
          {EXAMPLE_QUERIES.map((q) => (
            <button key={q} onClick={() => setQuery(q)}
              className="text-left px-4 py-3 rounded-xl text-xs bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-violet-200 dark:hover:border-violet-500/30 hover:text-violet-600 dark:hover:text-violet-400 transition-all">
              <span className="text-violet-400 mr-1.5">→</span>{q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const EXAMPLE_QUERIES = [
  "What did I read about machine learning?",
  "Summarize my saved articles",
  "What YouTube videos do I have?",
  "Find content about productivity",
];

const TYPE_EMOJI: Record<string, string> = {
  tweet: "𝕏", youtube_video: "▶", blog: "✦", pdf: "⬛",
  github: "⊛", reddit: "◎", website: "◉", image: "⬡", unknown: "◇",
};

function SearchResultCard({ item }: { item: SearchResultItem }) {
  const emoji  = TYPE_EMOJI[item.contentType] ?? "◇";
  const domain = (() => { try { return new URL(item.url).hostname.replace(/^www\./, ""); } catch { return item.url; } })();
  const pct    = Math.round(item.similarityScore * 100);

  return (
    <div className="card-accent group rounded-2xl p-4 space-y-2 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:-translate-y-px transition-all duration-150">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 flex items-center justify-center text-sm font-bold text-violet-600 dark:text-violet-400 shrink-0 mt-0.5">
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{item.title}</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">{domain}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-100 dark:border-violet-500/20 font-medium">
            {pct}%
          </span>
          <a href={item.url} target="_blank" rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Open original">
            <ExternalLinkIcon className="h-3.5 w-3.5" />
          </a>
          <Link href={item.isLarge ? `/content/${item.contentId}/chat` : `/content/${item.contentId}`}
            className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
            title={item.isLarge ? "Chat" : "View"}>
            {item.isLarge ? <ChatIcon className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
          </Link>
        </div>
      </div>
      {item.snippet && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2 pl-11">
          {item.snippet}
        </p>
      )}
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
}
function SparkleIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L13.4 8.4L19 9L13.4 9.6L12 15L10.6 9.6L5 9L10.6 8.4L12 3Z" /></svg>;
}
function ExternalLinkIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>;
}
function EyeIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
}
function ChatIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
}
