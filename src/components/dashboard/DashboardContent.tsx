"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  const pollRef                       = useRef<ReturnType<typeof setInterval> | null>(null);

  // Active filters come from URL params — set by sidebar (collection) or filter bar (type)
  const router           = useRouter();
  const searchParams     = useSearchParams();
  const activeCollection = searchParams.get("collection") ?? undefined;
  const activeType       = searchParams.get("type") ?? undefined;

  // Collections list — needed by ContentCard picker
  const [collections,    setCollections]    = useState<CollectionItem[]>([]);
  // Available content types for dynamic filter bar
  const [availableTypes, setAvailableTypes] = useState<AvailableType[]>([]);

  // ── Bulk selection ──────────────────────────────────────────────────────────
  const [selectMode,          setSelectMode]          = useState(false);
  const [selectedIds,         setSelectedIds]         = useState<Set<string>>(new Set());
  const [bulkDeleting,        setBulkDeleting]        = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // ── Save form toggle ─────────────────────────────────────────────────────────
  const [showSaveForm, setShowSaveForm] = useState(false);

  // ── Fetch collections for picker ─────────────────────────────────────────
  const refreshCollections = useCallback(() => {
    api.listCollections()
      .then((r) => setCollections(r.collections))
      .catch(() => {});
  }, []);

  const refreshTypes = useCallback(() => {
    fetch("/api/content/types")
      .then((r) => r.json())
      .then((data: { types: AvailableType[] }) => {
        setAvailableTypes(data.types ?? []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshCollections();
    refreshTypes();
  }, [refreshCollections, refreshTypes]);

  // Re-fetch collections whenever the sidebar creates / renames / deletes one
  useEffect(() => {
    const handler = () => refreshCollections();
    window.addEventListener("collections-changed", handler);
    return () => window.removeEventListener("collections-changed", handler);
  }, [refreshCollections]);

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
    refreshTypes();
  };

  const handleDeleted = (id: string) => {
    setItems((prev) => prev.filter((i) => i._id !== id));
    setTotal((t) => Math.max(0, t - 1));
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    refreshTypes();
  };

  const handleUpdated = (updated: ContentItem) => {
    setItems((prev) => prev.map((i) => (i._id === updated._id ? updated : i)));
    if (JSON.stringify(updated.collectionIds) !== JSON.stringify(
      items.find((i) => i._id === updated._id)?.collectionIds
    )) {
      refreshCollections();
    }
  };

  const handleTypeChange = (type: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (type) params.set("type", type);
    else params.delete("type");
    router.replace(`/dashboard?${params.toString()}`);
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
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-7">

      {/* Bulk delete modal */}
      {showBulkDeleteModal && (
        <DeleteModal
          title={`${selectedCount} selected item${selectedCount !== 1 ? "s" : ""}`}
          loading={bulkDeleting}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowBulkDeleteModal(false)}
        />
      )}

      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-zinc-400 dark:text-zinc-600">Workspace</span>
        <span className="text-zinc-300 dark:text-zinc-700">/</span>
        <span className="text-zinc-500 dark:text-zinc-500">Library</span>
        <span className="mx-1 text-zinc-300 dark:text-zinc-700">•</span>
        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-live" />
          Synced
        </span>
      </div>

      {/* ── Hero header ── */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-[2.25rem] font-bold tracking-tight text-zinc-900 dark:text-[#F5F5F7] leading-[1.15]">
            Your second{" "}
            <em className="font-display not-italic gradient-text">brain</em>
          </h1>
          {!loading && (
            <div className="flex items-center gap-5 mt-3 flex-wrap">
              <StatPill icon={<ItemsIcon className="h-3.5 w-3.5" />} value={total} label="items saved" />
              {availableTypes.length > 0 && (
                <StatPill icon={<TypesIcon className="h-3.5 w-3.5" />} value={availableTypes.length} label="content types" />
              )}
              {collections.length > 0 && (
                <StatPill icon={<CollectionsIcon className="h-3.5 w-3.5" />} value={collections.length} label="collections" />
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 text-amber-700 dark:text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              {pendingCount} indexing
            </span>
          )}
          {!loading && items.length > 0 && (
            <button
              onClick={() => { selectMode ? exitSelectMode() : setSelectMode(true); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                selectMode
                  ? "bg-violet-600 border-violet-600 text-white hover:bg-violet-700"
                  : "bg-white dark:bg-[#16161D] border-zinc-200 dark:border-white/[0.08] text-zinc-600 dark:text-zinc-400 hover:border-violet-400/50 dark:hover:border-violet-500/40 hover:text-violet-600 dark:hover:text-violet-400"
              }`}
            >
              <CheckboxIcon className="h-3.5 w-3.5" />
              {selectMode ? "Cancel" : "Select"}
            </button>
          )}
          <button
            onClick={() => setShowSaveForm((v) => !v)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              showSaveForm
                ? "bg-zinc-100 dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/[0.08]"
                : "text-white bg-[#7C5CFF] hover:bg-[#9B7BFF] shadow-lg shadow-violet-500/25"
            }`}
          >
            <PlusIcon className="h-4 w-4" />
            {showSaveForm ? "Close" : "Save new"}
          </button>
        </div>
      </div>

      {/* ── Save form (toggleable) ── */}
      {showSaveForm && (
        <div className="animate-fade-in-up">
          <SaveUrlForm onAdded={handleAdded} />
        </div>
      )}

      <TypeFilterBar
        active={activeType}
        onChange={handleTypeChange}
        availableTypes={availableTypes}
        total={total}
      />

      {/* ── Content grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 rounded-2xl skeleton border border-zinc-100 dark:border-white/[0.06]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState filtered={!!activeType || !!activeCollection} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div key={item._id} className="card-stagger animate-fade-in-up">
                <ContentCard
                  item={item}
                  onDeleted={handleDeleted}
                  onUpdated={handleUpdated}
                  selectMode={selectMode}
                  selected={selectedIds.has(item._id)}
                  onSelect={toggleSelect}
                  collections={collections}
                />
              </div>
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-white dark:bg-[#16161D] border border-zinc-200 dark:border-white/[0.08] text-zinc-600 dark:text-zinc-400 hover:border-violet-400/50 dark:hover:border-violet-500/40 hover:text-violet-600 dark:hover:text-violet-400 transition-all disabled:opacity-50"
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fab-in">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#111116]/95 backdrop-blur-xl shadow-2xl border border-white/[0.08]">
            <span className="text-sm font-medium text-white/90">
              {selectedCount > 0 ? `${selectedCount} selected` : "Select items"}
            </span>
            {selectedCount > 0 && (
              <>
                <div className="h-4 w-px bg-white/10" />
                <button onClick={selectAll} className="text-xs font-medium text-white/40 hover:text-white/80 transition-colors">
                  Select all
                </button>
                <button onClick={clearSelect} className="text-xs font-medium text-white/40 hover:text-white/80 transition-colors">
                  Clear
                </button>
                <button
                  onClick={() => setShowBulkDeleteModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-red-500 hover:bg-red-400 text-white transition-colors"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                  Delete {selectedCount}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {selectMode && <div className="h-20" />}
    </div>
  );
}

function StatPill({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 text-sm">
      <span className="text-zinc-400 dark:text-zinc-600">{icon}</span>
      <span className="font-semibold text-zinc-700 dark:text-zinc-300">{value.toLocaleString()}</span>
      <span className="text-zinc-400 dark:text-zinc-600">{label}</span>
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
          {filtered ? "Try a different filter or save more content." : 'Click "Save new" above to get started.'}
        </p>
      </div>
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
}
function CheckboxIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="3"/><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4"/></svg>;
}
function TrashIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>;
}
function ItemsIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>;
}
function TypesIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>;
}
function CollectionsIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6 6.878V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 004.5 9v.878m13.5-3A2.25 2.25 0 0119.5 9v.878m0 0a2.25 2.25 0 00-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0121 12v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6c0-.98.626-1.813 1.5-2.122" /></svg>;
}
