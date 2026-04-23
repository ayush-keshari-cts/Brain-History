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
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">

      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <div className="space-y-3 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20">
          <SparkleIcon className="h-3.5 w-3.5" />
          AI-Powered Semantic Search
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Ask your <span className="gradient-text">saved content</span>
        </h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Ask anything — AI finds relevant content and synthesizes an answer from your library.
        </p>
      </div>

      {/* ── Search form ──────────────────────────────────────────────────── */}
      <form onSubmit={handleSearch} className="relative">
        <div className="relative flex items-center rounded-2xl overflow-hidden shadow-xl shadow-violet-500/10"
          style={{ background: "var(--surface)", border: "1px solid var(--border-2)" }}>
          <SearchIcon className="absolute left-4 h-5 w-5 shrink-0 pointer-events-none text-violet-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What do you want to know about your saved content?"
            className="flex-1 pl-12 pr-4 py-4 text-sm text-foreground placeholder:text-muted bg-transparent focus:outline-none"
          />
          <div className="pr-2">
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/25"
            >
              {loading ? (
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <SearchIcon className="h-4 w-4" />
              )}
              {loading ? "Searching…" : "Search"}
            </button>
          </div>
        </div>
      </form>

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-red-400 bg-red-500/8 border border-red-500/20">
          <span className="h-2 w-2 rounded-full bg-red-400 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Loading skeleton ─────────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-3">
          <div className="h-32 rounded-2xl skeleton" style={{ border: "1px solid var(--border)" }} />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl skeleton" style={{ border: "1px solid var(--border)" }} />
          ))}
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {!loading && result && (
        <div className="space-y-5">

          {/* AI Answer */}
          {result.aiAnswer && (
            <div className="rounded-2xl p-5 space-y-3 relative overflow-hidden"
              style={{ background: "var(--surface)", border: "1px solid rgba(139,92,246,0.25)" }}>
              {/* Gradient glow corner */}
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-violet-500/5 blur-2xl pointer-events-none" />
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
                  <SparkleIcon className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold text-foreground">AI Answer</span>
                <span className="ml-auto text-xs text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">from your library</span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--muted)" }}>
                {result.aiAnswer}
              </p>
            </div>
          )}

          {/* Source results */}
          {result.results.length > 0 ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                  Sources
                </span>
                <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                <span className="text-xs" style={{ color: "var(--muted)" }}>{result.results.length} results</span>
              </div>
              {result.results.map((item) => (
                <SearchResultCard key={item.contentId} item={item} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-12 space-y-3 text-center">
              <div className="h-12 w-12 rounded-2xl bg-violet-500/5 flex items-center justify-center"
                style={{ border: "1px solid var(--border)" }}>
                <SearchIcon className="h-5 w-5 text-violet-400" />
              </div>
              <p className="text-sm text-foreground font-medium">No matching content found</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Try saving more content to your library first.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Empty state (no search yet) ──────────────────────────────────── */}
      {!loading && !result && !error && (
        <div className="grid grid-cols-2 gap-3 pt-4">
          {EXAMPLE_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => setQuery(q)}
              className="text-left px-4 py-3 rounded-xl text-xs transition-all hover:border-violet-500/30 hover:text-foreground group"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}
            >
              <span className="text-violet-400 mr-1.5 opacity-70">→</span>
              {q}
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

// ─── Search result card ───────────────────────────────────────────────────────

const TYPE_EMOJI: Record<string, string> = {
  tweet: "𝕏", youtube_video: "▶", blog: "✦", pdf: "⬛",
  github: "⊛", reddit: "◎", website: "◉", image: "⬡", unknown: "◇",
};

function SearchResultCard({ item }: { item: SearchResultItem }) {
  const emoji  = TYPE_EMOJI[item.contentType] ?? "◇";
  const domain = (() => { try { return new URL(item.url).hostname.replace(/^www\./, ""); } catch { return item.url; } })();
  const pct    = Math.round(item.similarityScore * 100);

  return (
    <div className="card-accent group rounded-2xl p-4 space-y-2 transition-all hover:-translate-y-px"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-xl bg-violet-500/8 flex items-center justify-center text-sm font-bold text-violet-400 shrink-0 mt-0.5"
          style={{ border: "1px solid var(--border)" }}>
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
          <p className="text-xs truncate" style={{ color: "var(--muted)" }}>{domain}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Match score */}
          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 font-medium">
            {pct}%
          </span>
          <a href={item.url} target="_blank" rel="noopener noreferrer"
            className="p-1.5 rounded-lg transition-colors hover:text-foreground hover:bg-surface-2 dark:hover:bg-white/5"
            style={{ color: "var(--muted)" }} title="Open original">
            <ExternalLinkIcon className="h-3.5 w-3.5" />
          </a>
          <Link href={item.isLarge ? `/content/${item.contentId}/chat` : `/content/${item.contentId}`}
            className="p-1.5 rounded-lg transition-colors hover:text-violet-400 hover:bg-violet-500/8"
            style={{ color: "var(--muted)" }} title={item.isLarge ? "Chat" : "View"}>
            {item.isLarge ? <ChatIcon className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
          </Link>
        </div>
      </div>
      {item.snippet && (
        <p className="text-xs leading-relaxed line-clamp-2 pl-11" style={{ color: "var(--muted)" }}>
          {item.snippet}
        </p>
      )}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SearchIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
}
function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3L13.4 8.4L19 9L13.4 9.6L12 15L10.6 9.6L5 9L10.6 8.4L12 3Z" />
    </svg>
  );
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
