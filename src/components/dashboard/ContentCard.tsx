"use client";

import { useState } from "react";
import Link from "next/link";
import { api, type ContentItem } from "@/lib/api-client";
import DeleteModal from "@/components/ui/DeleteModal";

const TYPE_CONFIG: Record<string, { emoji: string; light: string; dark: string }> = {
  tweet:         { emoji: "𝕏",  light: "bg-sky-50 text-sky-600 border-sky-100",          dark: "dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20" },
  youtube_video: { emoji: "▶",  light: "bg-red-50 text-red-600 border-red-100",           dark: "dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20" },
  youtube_music: { emoji: "♪",  light: "bg-red-50 text-red-600 border-red-100",           dark: "dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20" },
  instagram:     { emoji: "◈",  light: "bg-pink-50 text-pink-600 border-pink-100",        dark: "dark:bg-pink-500/10 dark:text-pink-400 dark:border-pink-500/20" },
  blog:          { emoji: "✦",  light: "bg-emerald-50 text-emerald-700 border-emerald-100", dark: "dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" },
  pdf:           { emoji: "⬛", light: "bg-orange-50 text-orange-600 border-orange-100",  dark: "dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20" },
  image:         { emoji: "⬡",  light: "bg-violet-50 text-violet-700 border-violet-100",  dark: "dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20" },
  screenshot:    { emoji: "⬡",  light: "bg-violet-50 text-violet-700 border-violet-100",  dark: "dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20" },
  website:       { emoji: "◉",  light: "bg-blue-50 text-blue-700 border-blue-100",        dark: "dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" },
  github:        { emoji: "⊛",  light: "bg-zinc-100 text-zinc-700 border-zinc-200",       dark: "dark:bg-zinc-700/30 dark:text-zinc-300 dark:border-zinc-600/30" },
  reddit:        { emoji: "◎",  light: "bg-orange-50 text-orange-600 border-orange-100",  dark: "dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20" },
  linkedin:      { emoji: "in", light: "bg-blue-50 text-blue-700 border-blue-100",        dark: "dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" },
  spotify:       { emoji: "♫",  light: "bg-green-50 text-green-700 border-green-100",     dark: "dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20" },
  unknown:       { emoji: "◇",  light: "bg-zinc-100 text-zinc-600 border-zinc-200",       dark: "dark:bg-zinc-700/30 dark:text-zinc-400 dark:border-zinc-600/30" },
};

const STATUS_CONFIG = {
  pending:    { dot: "bg-amber-400 animate-pulse",  badge: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" },
  processing: { dot: "bg-blue-400 animate-pulse",   badge: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" },
  completed:  { dot: "bg-emerald-400",              badge: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" },
  failed:     { dot: "bg-red-400",                  badge: "bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20" },
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

  const isUploaded = item.platform === "upload";
  const URL_DOWNLOADABLE = ["image", "screenshot", "pdf"];
  const canDownloadUrl = !isUploaded && URL_DOWNLOADABLE.includes(item.contentType);
  const downloadHref = isUploaded && item.fileUrl
    ? `/api/files/${item._id}?download`
    : canDownloadUrl
      ? `/api/download?url=${encodeURIComponent(item.url)}&filename=${encodeURIComponent(item.title)}`
      : null;

  const tc = TYPE_CONFIG[item.contentType] ?? TYPE_CONFIG.unknown;
  const sc = STATUS_CONFIG[item.processingStatus] ?? STATUS_CONFIG.completed;
  const typeBadge = `${tc.light} ${tc.dark}`;

  const domain = isUploaded
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

    <div className={`card-accent relative group flex flex-col rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-md dark:hover:shadow-zinc-900/50 transition-all duration-200 hover:-translate-y-0.5 ${deleting ? "opacity-40 pointer-events-none" : ""}`}>

      {/* Favourite button */}
      <button
        onClick={handleFavourite}
        disabled={favLoading}
        title={item.isFavourite ? "Remove from favourites" : "Add to favourites"}
        className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-100 dark:border-zinc-700 shadow-sm hover:scale-110 transition-transform disabled:opacity-50"
      >
        <StarIcon filled={item.isFavourite} className={`h-3.5 w-3.5 ${item.isFavourite ? "text-amber-400" : "text-zinc-300 dark:text-zinc-600"}`} />
      </button>

      {/* Thumbnail */}
      {item.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.thumbnail} alt="" className="w-full h-32 object-cover bg-zinc-100 dark:bg-zinc-800" />
      ) : (
        <div className="w-full h-32 flex items-center justify-center relative overflow-hidden bg-zinc-50 dark:bg-zinc-800/50">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-indigo-500/5" />
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-xl font-bold border ${typeBadge}`}>
            {tc.emoji}
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Title */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug">
            {item.title}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500 truncate">{domain}</p>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border ${sc.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
            {item.processingStatus}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize border ${typeBadge}`}>
            {item.contentType.replace(/_/g, " ")}
          </span>
          {item.contentSize === "large" && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-violet-50 text-violet-700 border border-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20">
              large
            </span>
          )}
        </div>

        {/* Date + actions */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <span className="text-xs text-zinc-400 dark:text-zinc-500">{dateStr}</span>
          <div className="flex items-center gap-0.5">
            {!isUploaded && (
              <a href={item.url} target="_blank" rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Open original">
                <ExternalLinkIcon className="h-3.5 w-3.5" />
              </a>
            )}
            <Link href={`/content/${item._id}`}
              className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
              title="View">
              <EyeIcon className="h-3.5 w-3.5" />
            </Link>
            {downloadHref && (
              <a href={downloadHref}
                className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                title="Download">
                <DownloadIcon className="h-3.5 w-3.5" />
              </a>
            )}
            {item.contentSize === "large" && item.processingStatus === "completed" && (
              <Link href={`/content/${item._id}/chat`}
                className="p-1.5 rounded-lg text-violet-500 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
                title="Chat">
                <ChatIcon className="h-3.5 w-3.5" />
              </Link>
            )}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              title="Delete">
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return filled ? (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
  ) : (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
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
