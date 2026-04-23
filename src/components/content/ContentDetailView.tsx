"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import DeleteModal from "@/components/ui/DeleteModal";

const TYPE_CONFIG: Record<string, { emoji: string; badge: string }> = {
  tweet:         { emoji: "𝕏",  badge: "bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20" },
  youtube_video: { emoji: "▶",  badge: "bg-red-50 text-red-700 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20" },
  youtube_music: { emoji: "♪",  badge: "bg-red-50 text-red-700 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20" },
  instagram:     { emoji: "◈",  badge: "bg-pink-50 text-pink-700 border-pink-100 dark:bg-pink-500/10 dark:text-pink-400 dark:border-pink-500/20" },
  blog:          { emoji: "✦",  badge: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" },
  pdf:           { emoji: "⬛", badge: "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20" },
  image:         { emoji: "⬡",  badge: "bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20" },
  screenshot:    { emoji: "⬡",  badge: "bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20" },
  website:       { emoji: "◉",  badge: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" },
  github:        { emoji: "⊛",  badge: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-700/30 dark:text-zinc-300 dark:border-zinc-600/30" },
  reddit:        { emoji: "◎",  badge: "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20" },
  spotify:       { emoji: "♫",  badge: "bg-green-50 text-green-700 border-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20" },
  unknown:       { emoji: "◇",  badge: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-700/30 dark:text-zinc-400 dark:border-zinc-600/30" },
};

const STATUS_CONFIG: Record<string, { dot: string; badge: string }> = {
  pending:    { dot: "bg-amber-400 animate-pulse",  badge: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" },
  processing: { dot: "bg-blue-400 animate-pulse",   badge: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" },
  completed:  { dot: "bg-emerald-400",              badge: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" },
  failed:     { dot: "bg-red-400",                  badge: "bg-red-50 text-red-700 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20" },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ContentDetailView({ content }: { content: Record<string, any> }) {
  const router = useRouter();
  const [deleting,        setDeleting]        = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [favourite,       setFavourite]       = useState<boolean>(Boolean(content.isFavourite));
  const [favLoading,      setFavLoading]      = useState(false);

  const isUploaded = content.platform === "upload";
  const hasFile    = Boolean(content.fileUrl);

  const isImage = content.contentType === "image" || content.contentType === "screenshot";
  const isPdf   = content.contentType === "pdf";
  const isAudio = content.contentType === "spotify";
  const isVideo = content.contentType === "youtube_video" || content.contentType === "youtube_music";

  const viewerFileUrl: string | null = isUploaded && hasFile
    ? `/api/files/${content._id}`
    : (isPdf || isImage) && content.url
      ? (content.url as string)
      : null;
  const showViewer = Boolean(viewerFileUrl);

  const URL_DOWNLOADABLE = ["image", "screenshot", "pdf"];
  const downloadUrl = isUploaded && hasFile
    ? `/api/files/${content._id}?download`
    : URL_DOWNLOADABLE.includes(content.contentType) && !isUploaded
      ? `/api/download?url=${encodeURIComponent(content.url)}&filename=${encodeURIComponent(content.title)}`
      : null;

  const isLarge     = content.contentSize === "large";
  const isCompleted = content.processingStatus === "completed";
  const tc          = TYPE_CONFIG[content.contentType] ?? TYPE_CONFIG.unknown;
  const sc          = STATUS_CONFIG[content.processingStatus] ?? STATUS_CONFIG.completed;
  const savedDate   = content.savedAt
    ? new Date(content.savedAt).toLocaleDateString(undefined, { dateStyle: "long" })
    : "";

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await api.deleteContent(content._id);
      router.push("/dashboard");
    } catch {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleFavourite = async () => {
    if (favLoading) return;
    setFavLoading(true);
    try {
      const res = await api.toggleFavourite(content._id);
      setFavourite(res.isFavourite);
    } catch {
      alert("Could not update favourite.");
    } finally {
      setFavLoading(false);
    }
  };

  return (
    <>
    {showDeleteModal && (
      <DeleteModal title={content.title} loading={deleting} onConfirm={handleDeleteConfirm} onCancel={() => setShowDeleteModal(false)} />
    )}
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Back */}
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
        <ChevronLeftIcon className="h-4 w-4" />
        Library
      </Link>

      {/* Media viewer */}
      {showViewer && viewerFileUrl && (
        <MediaViewer fileUrl={viewerFileUrl} downloadUrl={downloadUrl ?? "#"}
          isImage={isImage} isPdf={isPdf} isAudio={isAudio} isVideo={isVideo} filename={content.title} />
      )}

      {/* Fallback thumbnail */}
      {!showViewer && !isUploaded && content.thumbnail && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={content.thumbnail} alt="" className="w-full max-h-64 object-cover rounded-2xl" />
      )}

      {/* Detail card */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-5 space-y-4 shadow-sm">

        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-base font-bold shrink-0 mt-0.5 border ${tc.badge}`}>
            {tc.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <h1 className="flex-1 text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-snug">{content.title}</h1>
              <button onClick={handleFavourite} disabled={favLoading}
                title={favourite ? "Remove from favourites" : "Add to favourites"}
                className="shrink-0 p-1.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors disabled:opacity-50">
                <StarIcon filled={favourite} className={`h-5 w-5 ${favourite ? "text-amber-400" : "text-zinc-300 dark:text-zinc-600"}`} />
              </button>
            </div>
            {content.description && (
              <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-3">{content.description}</p>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border ${sc.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
            {content.processingStatus}
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize border ${tc.badge}`}>
            {content.contentType?.replace(/_/g, " ")}
          </span>
          {isLarge && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-violet-50 text-violet-700 border border-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20">
              large document
            </span>
          )}
          {isUploaded && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-teal-50 text-teal-700 border border-teal-100 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20">
              uploaded
            </span>
          )}
          {content.embeddingsCount > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700">
              {content.embeddingsCount} chunks
            </span>
          )}
        </div>

        {/* Meta */}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs pt-2 border-t border-zinc-100 dark:border-zinc-800">
          {content.author && (
            <><dt className="font-medium text-zinc-400 dark:text-zinc-500">Author</dt><dd className="text-zinc-700 dark:text-zinc-300 truncate">{content.author}</dd></>
          )}
          {savedDate && (
            <><dt className="font-medium text-zinc-400 dark:text-zinc-500">Saved</dt><dd className="text-zinc-700 dark:text-zinc-300">{savedDate}</dd></>
          )}
          {!isUploaded && (
            <><dt className="font-medium text-zinc-400 dark:text-zinc-500">Source</dt>
            <dd className="truncate">
              <a href={content.url} target="_blank" rel="noopener noreferrer" className="text-violet-600 dark:text-violet-400 hover:underline">
                {(() => { try { return new URL(content.url).hostname.replace(/^www\./, ""); } catch { return content.url; } })()}
              </a>
            </dd></>
          )}
        </dl>

        {/* Tags */}
        {Array.isArray(content.tags) && content.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {content.tags.map((tag: string) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-lg font-medium bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Processing error */}
      {content.processingStatus === "failed" && content.processingError && (
        <div className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
          <span className="h-2 w-2 rounded-full bg-red-400 shrink-0 mt-0.5" />
          <div><strong className="font-semibold">Indexing failed:</strong> {content.processingError}</div>
        </div>
      )}

      {/* Notes */}
      {content.notes && (
        <div className="rounded-2xl p-4 space-y-2 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Notes</p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{content.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {!isUploaded && (
          <a href={content.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-violet-300 dark:hover:border-violet-500/40 hover:text-violet-600 dark:hover:text-violet-400 transition-all">
            <ExternalLinkIcon className="h-4 w-4" />
            Open original
          </a>
        )}
        {downloadUrl && (
          <a href={downloadUrl}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-violet-300 dark:hover:border-violet-500/40 hover:text-violet-600 dark:hover:text-violet-400 transition-all">
            <DownloadIcon className="h-4 w-4" />
            Download
          </a>
        )}
        {isLarge && isCompleted && (
          <Link href={`/content/${content._id}/chat`}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/20">
            <ChatIcon className="h-4 w-4" />
            Chat with content
          </Link>
        )}
        {!isLarge && isCompleted && (
          <Link href="/search"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30 text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/15 transition-all">
            <SearchIcon className="h-4 w-4" />
            Find related
          </Link>
        )}
        <button onClick={() => setShowDeleteModal(true)}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-white dark:bg-zinc-900 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
          <TrashIcon className="h-4 w-4" />
          Delete
        </button>
      </div>
    </div>
    </>
  );
}

// ─── Media Viewer ─────────────────────────────────────────────────────────────

function MediaViewer({ fileUrl, downloadUrl, isImage, isPdf, isAudio, isVideo, filename }: {
  fileUrl: string; downloadUrl: string; isImage: boolean; isPdf: boolean; isAudio: boolean; isVideo: boolean; filename: string;
}) {
  const baseCard = "rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800";
  const header   = "flex items-center justify-between px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800";

  if (isPdf) return (
    <div className={baseCard}>
      <div className={header}>
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">PDF Preview</span>
        <a href={downloadUrl} className="inline-flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:underline">
          <DownloadIcon className="h-3.5 w-3.5" /> Download
        </a>
      </div>
      <iframe src={fileUrl} title={filename} className="w-full" style={{ height: "72vh" }} />
    </div>
  );

  if (isImage) return (
    <div className={baseCard}>
      <div className={header}>
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Image Preview</span>
        <a href={downloadUrl} className="inline-flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:underline">
          <DownloadIcon className="h-3.5 w-3.5" /> Download
        </a>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={fileUrl} alt={filename} className="w-full max-h-[70vh] object-contain bg-zinc-50 dark:bg-zinc-800" />
    </div>
  );

  if (isAudio) return (
    <div className="rounded-2xl p-5 space-y-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 flex items-center justify-center text-2xl shrink-0">🎵</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{filename}</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Audio file</p>
        </div>
        <a href={downloadUrl} className="inline-flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:underline shrink-0">
          <DownloadIcon className="h-3.5 w-3.5" /> Download
        </a>
      </div>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio controls className="w-full" src={fileUrl}>Your browser does not support the audio element.</audio>
    </div>
  );

  if (isVideo) return (
    <div className={`${baseCard} bg-zinc-950 dark:bg-zinc-950 border-zinc-800`}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800">
        <span className="text-xs font-medium text-zinc-400">Video Preview</span>
        <a href={downloadUrl} className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:underline">
          <DownloadIcon className="h-3.5 w-3.5" /> Download
        </a>
      </div>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video controls className="w-full max-h-[70vh] bg-black" src={fileUrl}>Your browser does not support the video element.</video>
    </div>
  );

  return (
    <div className="rounded-2xl p-5 flex items-center gap-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
      <div className="h-12 w-12 rounded-2xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 flex items-center justify-center text-2xl shrink-0">📁</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{filename}</p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">Uploaded document</p>
      </div>
      <a href={downloadUrl} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/20 shrink-0">
        <DownloadIcon className="h-4 w-4" /> Download
      </a>
    </div>
  );
}

function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return filled ? (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
  ) : (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
  );
}
function ChevronLeftIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>;
}
function ExternalLinkIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>;
}
function DownloadIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>;
}
function ChatIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>;
}
function SearchIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>;
}
function TrashIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>;
}
