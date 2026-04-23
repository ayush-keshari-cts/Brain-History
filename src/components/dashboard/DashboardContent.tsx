"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, type ContentItem } from "@/lib/api-client";
import SaveUrlForm from "./SaveUrlForm";
import TypeFilterBar from "./TypeFilterBar";
import ContentCard from "./ContentCard";

const PAGE_SIZE = 20;

export default function DashboardContent() {
  const [items, setItems]           = useState<ContentItem[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeType, setActiveType] = useState<string | undefined>(undefined);
  const pollRef                     = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Initial load
  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchPage(1, activeType);
  }, [activeType, fetchPage]);

  // Poll every 4s while any item is still pending/processing
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
      // Replace if already exists (duplicate URL scenario), otherwise prepend
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Save URLs and chat with your content using AI.
        </p>
      </div>

      {/* Save URL form */}
      <SaveUrlForm onAdded={handleAdded} />

      {/* Filter bar */}
      <TypeFilterBar active={activeType} onChange={setActiveType} />

      {/* Content grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
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
                className="px-5 py-2 text-sm font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : `Load more (${total - items.length} remaining)`}
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
    <div className="text-center py-20 space-y-3">
      <div className="text-4xl">📭</div>
      <p className="text-neutral-500 dark:text-neutral-400">
        {filtered ? "No content matches this filter." : "Nothing saved yet. Paste a URL above to get started."}
      </p>
    </div>
  );
}
