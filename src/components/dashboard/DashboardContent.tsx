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
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
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

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Your <span className="gradient-text">Library</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Save anything — AI makes it searchable and conversational.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {!loading && total > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              {total} item{total !== 1 ? "s" : ""}
            </div>
          )}
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 text-amber-700 dark:text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              {pendingCount} indexing
            </div>
          )}
        </div>
      </div>

      <SaveUrlForm onAdded={handleAdded} />
      <TypeFilterBar active={activeType} onChange={setActiveType} />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 rounded-2xl skeleton border border-zinc-100 dark:border-zinc-800" />
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
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-violet-300 dark:hover:border-violet-500/40 hover:text-violet-600 dark:hover:text-violet-400 transition-all disabled:opacity-50"
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
      <div className="h-16 w-16 rounded-2xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 flex items-center justify-center">
        <svg className="h-7 w-7 text-violet-500 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          {filtered ? "No content matches this filter" : "Your library is empty"}
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-xs">
          {filtered
            ? "Try a different filter or save more content."
            : "Paste a URL or upload a file above to get started."}
        </p>
      </div>
    </div>
  );
}
