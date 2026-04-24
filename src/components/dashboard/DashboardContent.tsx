"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, type ContentItem, type CollectionItem } from "@/lib/api-client";
import SaveUrlForm from "./SaveUrlForm";
import TypeFilterBar, { type AvailableType } from "./TypeFilterBar";
import ContentCard from "./ContentCard";
import DeleteModal from "@/components/ui/DeleteModal";

const PAGE_SIZE = 20;

export default function DashboardContent() {
  // ── Content list ────────────────────────────────────────────────────────────
  const [items, setItems]             = useState<ContentItem[]>([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeType, setActiveType]   = useState<string | undefined>(undefined);
  const pollRef                       = useRef<ReturnType<typeof setInterval> | null>(null);

  // Active collection comes from URL (?collection=xxx) — set by the sidebar
  const searchParams     = useSearchParams();
  const activeCollection = searchParams.get("collection") ?? undefined;

  // Collections list — needed by ContentCard picker
  const [collections,     setCollections]     = useState<CollectionItem[]>([]);
  // Available content types for dynamic filter bar
  const [availableTypes,  setAvailableTypes]  = useState<AvailableType[]>([]);
  const [hasFavourites,   setHasFavourites]   = useState(false);

  // ── Bulk selection ──────────────────────────────────────────────────────────
  const [selectMode,          setSelectMode]          = useState(false);
  const [selectedIds,         setSelectedIds]         = useState<Set<string>>(new Set());
  const [bulkDeleting,        setBulkDeleting]        = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // ── Fetch collections for picker ─────────────────────────────────────────
  const refreshCollections = useCallback(() => {
    api.listCollections()
      .then((r) => setCollections(r.collections))
      .catch(() => {});
  }, []);

  const refreshTypes = useCallback(() => {
    fetch("/api/content/types")
      .then((r) => r.json())
      .then((data: { types: AvailableType[]; hasFavourites: boolean }) => {
        setAvailableTypes(data.types ?? []);
        setHasFavourites(data.hasFavourites ?? false);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshCollections();
    refreshTypes();
  }, [refreshCollections, refreshTypes]);

  // ── Fetch content pages ─────────────────────────────────────────────────────
  const fetchPage = useCallback(
    async (pg: number, type?: string, collectionId?: string, append = false) => {
      try {
        const data = await api.listContent(pg, PAGE_SIZE, type, collectionId);
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
    fetchPage(1, activeType, activeCollection);
    // Reset selection when filter changes
    setSelectMode(false);
    setSelectedIds(new Set());
  }, [activeType, activeCollection, fetchPage]);

  // Poll for pending items
  useEffect(() => {
    const hasPending = items.some(
      (i) => i.processingStatus === "pending" || i.processingStatus === "processing"
    );
    if (hasPending) {
      pollRef.current = setInterval(() => fetchPage(1, activeType, activeCollection), 4000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [items, activeType, activeCollection, fetchPage]);

  // ── Item event handlers ──────────────────────────────────────────────────────
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
    refreshTypes(); // new type chip may need to appear
  };

  const handleDeleted = (id: string) => {
    setItems((prev) => prev.filter((i) => i._id !== id));
    setTotal((t) => Math.max(0, t - 1));
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    refreshTypes(); // type chip may disappear if last of its kind
  };

  const handleUpdated = (updated: ContentItem) => {
    setItems((prev) => prev.map((i) => (i._id === updated._id ? updated : i)));
    // Refresh collection counts in sidebar if membership changed
    if (JSON.stringify(updated.collectionIds) !== JSON.stringify(
      items.find((i) => i._id === updated._id)?.collectionIds
    )) {
      refreshCollections();
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    setLoadingMore(true);
    fetchPage(nextPage, activeType, activeCollection, true);
  };

  // ── Bulk selection ──────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll   = () => setSelectedIds(new Set(items.map((i) => i._id)));
  const clearSelect = () => setSelectedIds(new Set());

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      await api.bulkDeleteContent(Array.from(selectedIds));
      const deleted = new Set(selectedIds);
      setItems((prev) => prev.filter((i) => !deleted.has(i._id)));
      setTotal((t) => Math.max(0, t - deleted.size));
      exitSelectMode();
      refreshTypes();
    } catch { /* keep modal open for retry */ }
    finally {
      setBulkDeleting(false);
      setShowBulkDeleteModal(false);
    }
  };

  const hasMore       = items.length < total;
  const pendingCount  = items.filter((i) => i.processingStatus === "pending" || i.processingStatus === "processing").length;
  const selectedCount = selectedIds.size;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-7">

      {/* Bulk delete modal */}
      {showBulkDeleteModal && (
        <DeleteModal
          title={`${selectedCount} selected item${selectedCount !== 1 ? "s" : ""}`}
          loading={bulkDeleting}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowBulkDeleteModal(false)}
        />
      )}

      {/* ── Header ── */}
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
          {!loading && items.length > 0 && (
            <button
              onClick={() => { selectMode ? exitSelectMode() : setSelectMode(true); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                selectMode
                  ? "bg-violet-600 border-violet-600 text-white hover:bg-violet-700"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-violet-300 dark:hover:border-violet-500/40 hover:text-violet-600 dark:hover:text-violet-400"
              }`}
            >
              <CheckboxIcon className="h-3.5 w-3.5" />
              {selectMode ? "Cancel" : "Select"}
            </button>
          )}
        </div>
      </div>

      <SaveUrlForm onAdded={handleAdded} />
      <TypeFilterBar
        active={activeType}
        onChange={setActiveType}
        availableTypes={availableTypes}
        hasFavourites={hasFavourites}
      />

      {/* ── Content grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 rounded-2xl skeleton border border-zinc-100 dark:border-zinc-800" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState filtered={!!activeType || !!activeCollection} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <ContentCard
                key={item._id}
                item={item}
                onDeleted={handleDeleted}
                onUpdated={handleUpdated}
                selectMode={selectMode}
                selected={selectedIds.has(item._id)}
                onSelect={toggleSelect}
                collections={collections}
              />
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
                  <><span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />Loading…</>
                ) : (
                  `Load more  ·  ${total - items.length} remaining`
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Floating bulk action bar ── */}
      {selectMode && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-200 ${
          selectedCount > 0 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
        }`}>
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-zinc-900 dark:bg-zinc-100 shadow-2xl border border-zinc-700 dark:border-zinc-300">
            <span className="text-sm font-medium text-white dark:text-zinc-900">
              {selectedCount} selected
            </span>
            <div className="h-4 w-px bg-zinc-700 dark:bg-zinc-300" />
            <button onClick={selectAll} className="text-xs font-medium text-zinc-400 dark:text-zinc-500 hover:text-white dark:hover:text-zinc-900 transition-colors">
              Select all
            </button>
            <button onClick={clearSelect} className="text-xs font-medium text-zinc-400 dark:text-zinc-500 hover:text-white dark:hover:text-zinc-900 transition-colors">
              Clear
            </button>
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </div>
      )}

      {selectMode && <div className="h-20" />}
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
          {filtered ? "Try a different filter or save more content." : "Paste a URL or upload a file above to get started."}
        </p>
      </div>
    </div>
  );
}

function CheckboxIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="3"/><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4"/></svg>;
}
function TrashIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>;
}
