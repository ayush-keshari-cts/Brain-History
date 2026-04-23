"use client";

import { useState } from "react";
import Link from "next/link";
import { api, type ContentItem } from "@/lib/api-client";
import DeleteModal from "@/components/ui/DeleteModal";

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { emoji: string; color: string }> = {
  tweet:         { emoji: "𝕏",  color: "bg-sky-500/10 text-sky-400 dark:text-sky-300" },
  youtube_video: { emoji: "▶",  color: "bg-red-500/10 text-red-400 dark:text-red-300" },
  youtube_music: { emoji: "♪",  color: "bg-red-500/10 text-red-400 dark:text-red-300" },
  instagram:     { emoji: "◈",  color: "bg-pink-500/10 text-pink-400 dark:text-pink-300" },
  blog:          { emoji: "✦",  color: "bg-emerald-500/10 text-emerald-400 dark:text-emerald-300" },
  pdf:           { emoji: "⬛", color: "bg-orange-500/10 text-orange-400 dark:text-orange-300" },
  image:         { emoji: "⬡",  color: "bg-violet-500/10 text-violet-400 dark:text-violet-300" },
  screenshot:    { emoji: "⬡",  color: "bg-violet-500/10 text-violet-400 dark:text-violet-300" },
  website:       { emoji: "◉",  color: "bg-blue-500/10 text-blue-400 dark:text-blue-300" },
  github:        { emoji: "⊛",  color: "bg-zinc-500/10 text-zinc-400 dark:text-zinc-300" },
  reddit:        { emoji: "◎",  color: "bg-orange-500/10 text-orange-400 dark:text-orange-300" },
  linkedin:      { emoji: "in", color: "bg-blue-500/10 text-blue-400 dark:text-blue-300" },
  tiktok:        { emoji: "◈",  color: "bg-pink-500/10 text-pink-400 dark:text-pink-300" },
  spotify:       { emoji: "♫",  color: "bg-green-500/10 text-green-400 dark:text-green-300" },
  unknown:       { emoji: "◇",  color: "bg-zinc-500/10 text-zinc-400 dark:text-zinc-300" },
};

const STATUS_CONFIG = {
  pending:    { dot: "bg-amber-400 animate-pulse",  pill: "bg-amber-500/10 text-amber-400 dark:text-amber-300" },
  processing: { dot: "bg-blue-400 animate-pulse",   pill: "bg-blue-500/10 text-blue-400 dark:text-blue-300" },
  completed:  { dot: "bg-emerald-400",              pill: "bg-emerald-500/10 text-emerald-400 dark:text-emerald-300" },
  failed:     { dot: "bg-red-400",                  pill: "bg-red-500/10 text-red-400 dark:text-red-300" },
} as const;

interface Props {
  item:      ContentItem;
  onDeleted: (id: string) => void;
  onUpdated: (item: ContentItem) => void;
}

export default function ContentCard({ item, onDeleted, onUpdated }: Props) {
  const [deleting,        setDeleting]        = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [favLoading,      setFavLoading]      = useState(false);

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await api.deleteContent(item._id);
      onDeleted(item._id);
    } catch {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleFavourite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (favLoading) return;
    setFavLoading(true);
    try {
      const res = await api.toggleFavourite(item._id);
      onUpdated({ ...item, isFavourite: res.isFavourite });
    } catch {
      alert("Could not update favourite.");
    } finally {
      setFavLoading(false);
    }
  };

  const isPending  = item.processingStatus === "pending" || item.processingStatus === "processing";
  const isUploaded = item.platform === "upload";

  const URL_DOWNLOADABLE = ["image", "screenshot", "pdf"];
  const canDownloadUrl   = !isUploaded && URL_DOWNLOADABLE.includes(item.contentType);
  const downloadHref     = isUploaded && item.fileUrl
    ? `/api/files/${item._id}?download`
    : canDownloadUrl
      ? `/api/download?url=${encodeURIComponent(item.url)}&filename=${encodeURIComponent(item.title)}`
      : null;

  const typeConf  = TYPE_CONFIG[item.contentType] ?? TYPE_CONFIG.unknown;
  const statusConf = STATUS_CONFIG[item.processingStatus] ?? STATUS_CONFIG.completed;

  const domain  = isUploaded
    ? "Uploaded file"
    : (() => { try { return new URL(item.url).hostname.replace(/^www\./, ""); } catch { return item.url; } })();
  const dateStr = new Date(item.savedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <>
    {showDeleteModal && (
      <DeleteModal
        title={item.title}
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteModal(false)}
      />
    )}

    <div
      className={`card-accent relative group flex flex-col rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 ${
        deleting ? "opacity-40 pointer-events-none scale-95" : ""
      }`}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      {/* Hover shadow */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ boxShadow: "0 8px 32px rgba(139,92,246,0.12)" }} />

      {/* Favourite star */}
      <button
        onClick={handleFavourite}
        disabled={favLoading}
        title={item.isFavourite ? "Remove from favourites" : "Add to favourites"}
        className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full glass transition-transform hover:scale-110 disabled:opacity-50"
        style={{ border: "1px solid var(--border)" }}
      >
        <StarIcon filled={item.isFavourite} className={`h-3.5 w-3.5 ${item.isFavourite ? "text-amber-400" : "text-muted"}`} />
      </button>

      {/* Thumbnail / placeholder */}
      {item.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumbnail}
          alt=""
          className="w-full h-32 object-cover"
          style={{ background: "var(--surface-2)" }}
        />
      ) : (
        <div
          className="w-full h-32 flex items-center justify-center relative overflow-hidden"
          style={{ background: "var(--surface-2)" }}
        >
          {/* Subtle gradient radial bg */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-indigo-500/5" />
          <div
            className={`h-12 w-12 rounded-2xl flex items-center justify-center text-xl font-bold ${typeConf.color}`}
            style={{ border: "1px solid var(--border-2)" }}
          >
            {typeConf.emoji}
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Title + domain */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
            {item.title}
          </p>
          <p className="mt-0.5 text-xs truncate" style={{ color: "var(--muted)" }}>{domain}</p>
        </div>

        {/* Status + type badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusConf.pill}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${statusConf.dot}`} />
            {item.processingStatus}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${typeConf.color}`}>
            {item.contentType.replace(/_/g, " ")}
          </span>
          {item.contentSize === "large" && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 dark:text-violet-300 font-medium">
              large
            </span>
          )}
        </div>

        {/* Date + actions */}
        <div className="flex items-center justify-between pt-1" style={{ borderTop: "1px solid var(--border)" }}>
          <span className="text-xs" style={{ color: "var(--muted)" }}>{dateStr}</span>
          <div className="flex items-center gap-0.5">
            {/* External link */}
            {!isUploaded && (
              <a href={item.url} target="_blank" rel="noopener noreferrer"
                className="p-1.5 rounded-lg transition-colors hover:text-foreground hover:bg-surface-2 dark:hover:bg-white/5"
                style={{ color: "var(--muted)" }} title="Open original">
                <ExternalLinkIcon className="h-3.5 w-3.5" />
              </a>
            )}
            {/* View */}
            <Link href={`/content/${item._id}`}
              className="p-1.5 rounded-lg transition-colors hover:text-violet-500 hover:bg-violet-500/8"
              style={{ color: "var(--muted)" }} title="View">
              <EyeIcon className="h-3.5 w-3.5" />
            </Link>
            {/* Download */}
            {downloadHref && (
              <a href={downloadHref}
                className="p-1.5 rounded-lg transition-colors hover:text-blue-400 hover:bg-blue-500/8"
                style={{ color: "var(--muted)" }} title="Download">
                <DownloadIcon className="h-3.5 w-3.5" />
              </a>
            )}
            {/* Chat */}
            {item.contentSize === "large" && item.processingStatus === "completed" && (
              <Link href={`/content/${item._id}/chat`}
                className="p-1.5 rounded-lg transition-colors text-violet-500 hover:text-violet-400 hover:bg-violet-500/10"
                title="Chat">
                <ChatIcon className="h-3.5 w-3.5" />
              </Link>
            )}
            {/* Delete */}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-1.5 rounded-lg transition-colors hover:text-red-500 hover:bg-red-500/8"
              style={{ color: "var(--muted)" }} title="Delete"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return filled ? (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
    </svg>
  ) : (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
    </svg>
  );
}
function ExternalLinkIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>;
}
function EyeIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>;
}
function DownloadIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>;
}
function ChatIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>;
}
function TrashIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>;
}
