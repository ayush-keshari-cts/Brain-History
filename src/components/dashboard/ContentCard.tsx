"use client";

import { useState } from "react";
import Link from "next/link";
import { api, type ContentItem } from "@/lib/api-client";
import DeleteModal from "@/components/ui/DeleteModal";

const TYPE_CONFIG: Record<string, { emoji: string; light: string; dark: string; grad: string }> = {
  tweet:         { emoji: "𝕏",  light: "bg-sky-50 text-sky-600 border-sky-100",            dark: "dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20",       grad: "from-sky-500/20 via-sky-400/10 to-transparent dark:from-sky-500/15" },
  youtube_video: { emoji: "▶",  light: "bg-red-50 text-red-600 border-red-100",             dark: "dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",        grad: "from-red-500/20 via-red-400/10 to-transparent dark:from-red-500/15" },
  youtube_music: { emoji: "♪",  light: "bg-red-50 text-red-600 border-red-100",             dark: "dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",        grad: "from-red-500/20 via-red-400/10 to-transparent dark:from-red-500/15" },
  instagram:     { emoji: "◈",  light: "bg-pink-50 text-pink-600 border-pink-100",          dark: "dark:bg-pink-500/10 dark:text-pink-400 dark:border-pink-500/20",     grad: "from-pink-500/20 via-pink-400/10 to-transparent dark:from-pink-500/15" },
  blog:          { emoji: "✦",  light: "bg-emerald-50 text-emerald-700 border-emerald-100", dark: "dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20", grad: "from-emerald-500/20 via-emerald-400/10 to-transparent dark:from-emerald-500/15" },
  pdf:           { emoji: "⬛", light: "bg-orange-50 text-orange-600 border-orange-100",    dark: "dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20", grad: "from-orange-500/20 via-orange-400/10 to-transparent dark:from-orange-500/15" },
  image:         { emoji: "⬡",  light: "bg-violet-50 text-violet-700 border-violet-100",    dark: "dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20", grad: "from-violet-500/20 via-violet-400/10 to-transparent dark:from-violet-500/15" },
  screenshot:    { emoji: "⬡",  light: "bg-violet-50 text-violet-700 border-violet-100",    dark: "dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20", grad: "from-violet-500/20 via-violet-400/10 to-transparent dark:from-violet-500/15" },
  website:       { emoji: "◉",  light: "bg-blue-50 text-blue-700 border-blue-100",          dark: "dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",     grad: "from-blue-500/20 via-blue-400/10 to-transparent dark:from-blue-500/15" },
  github:        { emoji: "⊛",  light: "bg-zinc-100 text-zinc-700 border-zinc-200",         dark: "dark:bg-zinc-700/30 dark:text-zinc-300 dark:border-zinc-600/30",     grad: "from-zinc-400/20 via-zinc-300/10 to-transparent dark:from-zinc-400/15" },
  reddit:        { emoji: "◎",  light: "bg-orange-50 text-orange-600 border-orange-100",    dark: "dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20", grad: "from-orange-500/20 via-orange-400/10 to-transparent dark:from-orange-500/15" },
  linkedin:      { emoji: "in", light: "bg-blue-50 text-blue-700 border-blue-100",          dark: "dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",     grad: "from-blue-500/20 via-blue-400/10 to-transparent dark:from-blue-500/15" },
  spotify:       { emoji: "♫",  light: "bg-green-50 text-green-700 border-green-100",       dark: "dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",  grad: "from-green-500/20 via-green-400/10 to-transparent dark:from-green-500/15" },
  audio:         { emoji: "♫",  light: "bg-green-50 text-green-700 border-green-100",       dark: "dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",  grad: "from-green-500/20 via-green-400/10 to-transparent dark:from-green-500/15" },
  video:         { emoji: "▶",  light: "bg-red-50 text-red-600 border-red-100",             dark: "dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",        grad: "from-red-500/20 via-red-400/10 to-transparent dark:from-red-500/15" },
  unknown:       { emoji: "◇",  light: "bg-zinc-100 text-zinc-600 border-zinc-200",         dark: "dark:bg-zinc-700/30 dark:text-zinc-400 dark:border-zinc-600/30",     grad: "from-zinc-400/20 via-zinc-300/10 to-transparent dark:from-zinc-400/15" },
};

const STATUS_CONFIG = {
  pending:    { dot: "bg-amber-400 animate-pulse",  badge: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" },
  processing: { dot: "bg-blue-400 animate-pulse",   badge: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" },
  completed:  { dot: "bg-emerald-400",              badge: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" },
  failed:     { dot: "bg-red-400",                  badge: "bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20" },
} as const;

// Type-specific large icons for placeholder banners
const TYPE_ICON: Record<string, React.ReactNode> = {
  pdf: (
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth={1.3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6M9 17h4M13 3v5a1 1 0 001 1h5"/>
    </svg>
  ),
  youtube_video: (
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="currentColor">
      <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
    </svg>
  ),
  youtube_music: (
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="currentColor">
      <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
    </svg>
  ),
  spotify: (
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  ),
  audio: (
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth={1.3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
    </svg>
  ),
  video: (
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth={1.3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
  ),
  image: (
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth={1.3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
    </svg>
  ),
  blog: (
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth={1.3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
    </svg>
  ),
  website: (
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth={1.3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
    </svg>
  ),
  tweet: (
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  reddit: (
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="currentColor">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
    </svg>
  ),
};

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

  const placeholderIcon = TYPE_ICON[item.contentType] ?? TYPE_ICON.blog;

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

      {/* Thumbnail / Placeholder */}
      {item.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.thumbnail} alt="" className="w-full h-36 object-cover" />
      ) : (
        <div className={`w-full h-36 flex flex-col items-center justify-center gap-2 relative overflow-hidden bg-gradient-to-br ${tc.grad} bg-zinc-50 dark:bg-zinc-800/60`}>
          {/* Subtle dot pattern */}
          <div className="absolute inset-0 dot-bg opacity-20" />
          {/* Icon */}
          <div className={`relative z-10 ${tc.light} ${tc.dark} border rounded-2xl p-2.5`}>
            {placeholderIcon}
          </div>
          {/* Content type label */}
          <span className={`relative z-10 text-xs font-semibold tracking-wide uppercase opacity-60 ${tc.light.split(" ")[1]} ${tc.dark.split(" ")[1]}`}>
            {item.contentType.replace(/_/g, " ")}
          </span>
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
