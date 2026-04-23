"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, type ContentItem } from "@/lib/api-client";
import SaveUrlForm from "./SaveUrlForm";
import TypeFilterBar from "./TypeFilterBar";
import ContentCard from "./ContentCard";

const PAGE_SIZE = 20;

export default function DashboardContent() {
  const [items, setItems]             = useState<ContentItem[]>([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeType, setActiveType]   = useState<string | undefined>(undefined);
  const pollRef                       = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPage = useCallback(
    async (pg: number, type?: string, append = false) => {
      try {
        const data = await api.listContent(pg, PAGE_SIZE, type);
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setTotal(data.total);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchPage(1, activeType);
  }, [activeType, fetchPage]);

  useEffect(() => {
    const hasPending = items.some(
      (i) => i.processingStatus === "pending" || i.processingStatus === "processing"
    );
    if (hasPending) {
      pollRef.current = setInterval(() => fetchPage(1, activeType), 4000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [items, activeType, fetchPage]);

  const handleAdded = (newItem: ContentItem) => {
    setItems((prev) => {
      const exists = prev.findIndex((i) => i._id === newItem._id);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = newItem;
        return updated;
      }
      return [newItem, ...prev];
    });
    setTotal((t) => t + 1);
  };

  const handleDeleted = (id: string) => {
    setItems((prev) => prev.filter((i) => i._id !== id));
    setTotal((t) => Math.max(0, t - 1));
  };

  const handleUpdated = (updated: ContentItem) => {
    setItems((prev) => prev.map((i) => (i._id === updated._id ? updated : i)));
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    setLoadingMore(true);
    fetchPage(nextPage, activeType, true);
  };

  const hasMore = items.length < total;
  const pendingCount = items.filter(i => i.processingStatus === "pending" || i.processingStatus === "processing").length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-7">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Your <span className="gradient-text">Library</span>
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Save anything — AI makes it searchable and conversational.
          </p>
        </div>
        {/* Stats */}
        <div className="flex items-center gap-3 shrink-0">
          {!loading && total > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--muted)" }}>
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              {total} item{total !== 1 ? "s" : ""}
            </div>
          )}
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              {pendingCount} indexing
            </div>
          )}
        </div>
      </div>

      {/* ── Save form ─────────────────────────────────────────────────────── */}
      <SaveUrlForm onAdded={handleAdded} />

      {/* ── Filter bar ───────────────────────────────────────────────────── */}
      <TypeFilterBar active={activeType} onChange={setActiveType} />

      {/* ── Content grid ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 rounded-2xl skeleton" style={{ border: "1px solid var(--border)" }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState filtered={!!activeType} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <ContentCard key={item._id} item={item} onDeleted={handleDeleted} onUpdated={handleUpdated} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl transition-all disabled:opacity-50 hover:border-violet-500/40"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}
              >
                {loadingMore ? (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Loading…
                  </>
                ) : (
                  `Load more  ·  ${total - items.length} remaining`
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center">
      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 flex items-center justify-center"
        style={{ border: "1px solid var(--border-2)" }}>
        <svg className="h-7 w-7 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">
          {filtered ? "No content matches this filter" : "Your library is empty"}
        </p>
        <p className="text-xs max-w-xs" style={{ color: "var(--muted)" }}>
          {filtered
            ? "Try a different filter or save more content."
            : "Paste a URL or upload a file above to get started."}
        </p>
      </div>
    </div>
  );
}
