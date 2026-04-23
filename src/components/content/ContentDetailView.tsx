"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import DeleteModal from "@/components/ui/DeleteModal";

const TYPE_EMOJI: Record<string, string> = {
  tweet: "🐦", youtube_video: "📹", youtube_music: "🎵", instagram: "📸",
  blog: "📝", pdf: "📄", image: "🖼️", screenshot: "🖥️", website: "🌐",
  github: "🐙", reddit: "🟠", linkedin: "💼", tiktok: "🎬", spotify: "🎵",
  unknown: "🔗",
};

const STATUS_STYLE: Record<string, string> = {
  pending:    "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  processing: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  completed:  "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  failed:     "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ContentDetailView({ content }: { content: Record<string, any> }) {
  const router = useRouter();
  const [deleting,         setDeleting]         = useState(false);
  const [showDeleteModal,  setShowDeleteModal]  = useState(false);
  const [favourite,        setFavourite]        = useState<boolean>(Boolean(content.isFavourite));
  const [favLoading,       setFavLoading]       = useState(false);

  const isUploaded  = content.platform === "upload";
  const hasFile     = Boolean(content.fileUrl);

  const isImage = content.contentType === "image" || content.contentType === "screenshot";
  const isPdf   = content.contentType === "pdf";
  const isAudio = content.contentType === "spotify";
  const isVideo = content.contentType === "youtube_video" || content.contentType === "youtube_music";

  // For uploaded files, always go through our proxy (sets correct Content-Type for PDFs).
  // For URL-based PDFs / images, use the original URL directly in the viewer.
  const viewerFileUrl: string | null = isUploaded && hasFile
    ? `/api/files/${content._id}`
    : (isPdf || isImage) && content.url
      ? (content.url as string)
      : null;
  const showViewer = Boolean(viewerFileUrl);

  // Download URL: uploaded → Cloudinary proxy; URL-based image/pdf → /api/download proxy
  const URL_DOWNLOADABLE = ["image", "screenshot", "pdf"];
  const downloadUrl = isUploaded && hasFile
    ? `/api/files/${content._id}?download`
    : URL_DOWNLOADABLE.includes(content.contentType) && !isUploaded
      ? `/api/download?url=${encodeURIComponent(content.url)}&filename=${encodeURIComponent(content.title)}`
      : null;

  const isLarge     = content.contentSize === "large";
  const isCompleted = content.processingStatus === "completed";
  const emoji       = TYPE_EMOJI[content.contentType] ?? "🔗";
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
      <DeleteModal
        title={content.title}
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteModal(false)}
      />
    )}
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Back */}
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-foreground transition-colors">
        <ChevronLeftIcon className="h-4 w-4" /> Dashboard
      </Link>

      {/* ── Media viewer ────────────────────────────────────────────────────── */}
      {showViewer && viewerFileUrl && (
        <MediaViewer
          fileUrl={viewerFileUrl}
          downloadUrl={downloadUrl ?? "#"}
          isImage={isImage}
          isPdf={isPdf}
          isAudio={isAudio}
          isVideo={isVideo}
          filename={content.title}
        />
      )}

      {/* Fallback thumbnail for URL-based content that has no viewer (e.g. tweet, video link) */}
      {!showViewer && !isUploaded && content.thumbnail && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={content.thumbnail} alt="" className="w-full max-h-64 object-cover rounded-xl" />
      )}

      {/* ── Title + meta ─────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-3xl shrink-0 mt-1">{emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <h1 className="flex-1 text-xl font-bold text-foreground leading-snug">{content.title}</h1>
              {/* Favourite button */}
              <button onClick={handleFavourite} disabled={favLoading} title={favourite ? "Remove from favourites" : "Add to favourites"}
                className="shrink-0 p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors disabled:opacity-50">
                <StarIcon filled={favourite} className={`h-5 w-5 ${favourite ? "text-amber-400" : "text-neutral-300 dark:text-neutral-600"}`} />
              </button>
            </div>
            {content.description && (
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 line-clamp-3">{content.description}</p>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 capitalize">
            {content.contentType?.replace(/_/g, " ")}
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLE[content.processingStatus] ?? ""}`}>
            {content.processingStatus}
          </span>
          {isLarge && <span className="text-xs px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">large document</span>}
          {isUploaded && <span className="text-xs px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300">uploaded file</span>}
          {content.embeddingsCount > 0 && <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">{content.embeddingsCount} chunks indexed</span>}
        </div>

        {/* Meta fields */}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {content.author && (<><dt className="text-neutral-400">Author</dt><dd className="text-foreground truncate">{content.author}</dd></>)}
          {savedDate && (<><dt className="text-neutral-400">Saved</dt><dd className="text-foreground">{savedDate}</dd></>)}
          {!isUploaded && (
            <><dt className="text-neutral-400">URL</dt>
            <dd className="truncate"><a href={content.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{content.url}</a></dd></>
          )}
        </dl>

        {/* Tags */}
        {Array.isArray(content.tags) && content.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {content.tags.map((tag: string) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">#{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Processing error */}
      {content.processingStatus === "failed" && content.processingError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <strong>Indexing failed:</strong> {content.processingError}
        </div>
      )}

      {/* ── Actions ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {!isUploaded && (
          <a href={content.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm font-medium text-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
            <ExternalLinkIcon className="h-4 w-4" /> Open original
          </a>
        )}

        {downloadUrl && (
          <a href={downloadUrl}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm font-medium text-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
            <DownloadIcon className="h-4 w-4" /> Download original
          </a>
        )}

        {isLarge && isCompleted && (
          <Link href={`/content/${content._id}/chat`}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            <ChatIcon className="h-4 w-4" /> Chat with this content
          </Link>
        )}

        {!isLarge && isCompleted && (
          <Link href="/search"
            className="inline-flex items-center gap-2 rounded-lg border border-blue-300 dark:border-blue-700 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
            <SearchIcon className="h-4 w-4" /> Find related content
          </Link>
        )}

        <button
          onClick={() => setShowDeleteModal(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-red-300 dark:border-red-800 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
        >
          <TrashIcon className="h-4 w-4" /> Delete
        </button>
      </div>

      {/* Notes */}
      {content.notes && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-1">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Notes</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{content.notes}</p>
        </div>
      )}
    </div>
    </>
  );
}

// ─── Media Viewer ─────────────────────────────────────────────────────────────

function MediaViewer({
  fileUrl, downloadUrl, isImage, isPdf, isAudio, isVideo, filename,
}: {
  fileUrl: string;
  downloadUrl: string;
  isImage: boolean;
  isPdf: boolean;
  isAudio: boolean;
  isVideo: boolean;
  filename: string;
}) {
  if (isPdf) {
    return (
      <div className="rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-200 dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500">PDF Preview</span>
          <a href={downloadUrl} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
            <DownloadIcon className="h-3.5 w-3.5" /> Download
          </a>
        </div>
        <iframe
          src={fileUrl}
          title={filename}
          className="w-full"
          style={{ height: "70vh" }}
        />
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-2">
        <div className="flex justify-end px-2 py-1">
          <a href={downloadUrl} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
            <DownloadIcon className="h-3.5 w-3.5" /> Download
          </a>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fileUrl} alt={filename} className="w-full max-h-[70vh] object-contain rounded-lg" />
      </div>
    );
  }

  if (isAudio) {
    return (
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎵</span>
            <div>
              <p className="text-sm font-medium text-foreground">{filename}</p>
              <p className="text-xs text-neutral-400">Audio file</p>
            </div>
          </div>
          <a href={downloadUrl} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
            <DownloadIcon className="h-3.5 w-3.5" /> Download
          </a>
        </div>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio controls className="w-full" src={fileUrl}>
          Your browser does not support the audio element.
        </audio>
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-black">
        <div className="flex justify-end px-4 py-2 bg-neutral-900">
          <a href={downloadUrl} className="text-xs text-blue-400 hover:underline flex items-center gap-1">
            <DownloadIcon className="h-3.5 w-3.5" /> Download
          </a>
        </div>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video controls className="w-full max-h-[70vh]" src={fileUrl}>
          Your browser does not support the video element.
        </video>
      </div>
    );
  }

  // Generic download card (Word docs, etc.)
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 flex items-center gap-4">
      <span className="text-4xl">📁</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{filename}</p>
        <p className="text-xs text-neutral-400">Uploaded document</p>
      </div>
      <a href={downloadUrl}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shrink-0">
        <DownloadIcon className="h-4 w-4" /> Download
      </a>
    </div>
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
