"use client";

import { useState } from "react";
import Link from "next/link";
import { api, type ContentItem } from "@/lib/api-client";

const TYPE_EMOJI: Record<string, string> = {
  tweet:         "🐦",
  youtube_video: "📹",
  youtube_music: "🎵",
  instagram:     "📸",
  blog:          "📝",
  pdf:           "📄",
  image:         "🖼️",
  screenshot:    "🖥️",
  website:       "🌐",
  github:        "🐙",
  reddit:        "🟠",
  linkedin:      "💼",
  tiktok:        "🎬",
  spotify:       "🎧",
  unknown:       "🔗",
};

const STATUS_STYLE = {
  pending:    "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  processing: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  completed:  "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  failed:     "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
} as const;

interface ContentCardProps {
  item:      ContentItem;
  onDeleted: (id: string) => void;
}

export default function ContentCard({ item, onDeleted }: ContentCardProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete "${item.title}"?`)) return;
    setDeleting(true);
    try {
      await api.deleteContent(item._id);
      onDeleted(item._id);
    } catch {
      setDeleting(false);
      alert("Failed to delete. Please try again.");
    }
  };

  const isPending = item.processingStatus === "pending" || item.processingStatus === "processing";
  const emoji     = TYPE_EMOJI[item.contentType] ?? "🔗";
  const domain    = (() => { try { return new URL(item.url).hostname.replace(/^www\./, ""); } catch { return item.url; } })();
  const dateStr   = new Date(item.savedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className={`relative flex flex-col rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-sm hover:shadow-md transition-shadow ${deleting ? "opacity-50 pointer-events-none" : ""}`}>
      {/* Thumbnail or placeholder */}
      {item.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.thumbnail} alt="" className="w-full h-28 object-cover bg-neutral-100 dark:bg-neutral-800" />
      ) : (
        <div className="w-full h-28 bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-700 flex items-center justify-center">
          <span className="text-4xl">{emoji}</span>
        </div>
      )}

      <div className="flex flex-col flex-1 p-3 gap-2">
        {/* Title + domain */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">{item.title}</p>
          <p className="mt-0.5 text-xs text-neutral-400 truncate">{domain}</p>
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 capitalize">
            {emoji} {item.contentType.replace(/_/g, " ")}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[item.processingStatus]}`}>
            {isPending && <span className="inline-block h-1.5 w-1.5 rounded-full bg-current mr-1 animate-pulse" />}
            {item.processingStatus}
          </span>
          {item.contentSize === "large" && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
              large
            </span>
          )}
        </div>

        {/* Date + actions */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-400">{dateStr}</span>
          <div className="flex items-center gap-1">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title="Open original"
            >
              <ExternalLinkIcon className="h-3.5 w-3.5" />
            </a>
            <Link
              href={`/content/${item._id}`}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title="View details"
            >
              <EyeIcon className="h-3.5 w-3.5" />
            </Link>
            {item.contentSize === "large" && item.processingStatus === "completed" && (
              <Link
                href={`/content/${item._id}/chat`}
                className="p-1.5 rounded-lg text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                title="Chat with this content"
              >
                <ChatIcon className="h-3.5 w-3.5" />
              </Link>
            )}
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Delete"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
