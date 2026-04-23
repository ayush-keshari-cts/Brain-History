"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import DeleteModal from "@/components/ui/DeleteModal";

const TYPE_CONFIG: Record<string, { emoji: string; color: string }> = {
  tweet:         { emoji: "𝕏",  color: "bg-sky-500/10 text-sky-400" },
  youtube_video: { emoji: "▶",  color: "bg-red-500/10 text-red-400" },
  youtube_music: { emoji: "♪",  color: "bg-red-500/10 text-red-400" },
  instagram:     { emoji: "◈",  color: "bg-pink-500/10 text-pink-400" },
  blog:          { emoji: "✦",  color: "bg-emerald-500/10 text-emerald-400" },
  pdf:           { emoji: "⬛", color: "bg-orange-500/10 text-orange-400" },
  image:         { emoji: "⬡",  color: "bg-violet-500/10 text-violet-400" },
  screenshot:    { emoji: "⬡",  color: "bg-violet-500/10 text-violet-400" },
  website:       { emoji: "◉",  color: "bg-blue-500/10 text-blue-400" },
  github:        { emoji: "⊛",  color: "bg-zinc-500/10 text-zinc-400" },
  reddit:        { emoji: "◎",  color: "bg-orange-500/10 text-orange-400" },
  linkedin:      { emoji: "in", color: "bg-blue-500/10 text-blue-400" },
  spotify:       { emoji: "♫",  color: "bg-green-500/10 text-green-400" },
  unknown:       { emoji: "◇",  color: "bg-zinc-500/10 text-zinc-400" },
};

const STATUS_CONFIG: Record<string, { dot: string; pill: string }> = {
  pending:    { dot: "bg-amber-400 animate-pulse",  pill: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  processing: { dot: "bg-blue-400 animate-pulse",   pill: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  completed:  { dot: "bg-emerald-400",              pill: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  failed:     { dot: "bg-red-400",                  pill: "bg-red-500/10 text-red-400 border-red-500/20" },
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
  const typeConf    = TYPE_CONFIG[content.contentType] ?? TYPE_CONFIG.unknown;
  const statusConf  = STATUS_CONFIG[content.processingStatus] ?? STATUS_CONFIG.completed;

  const savedDate = content.savedAt
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
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm transition-colors hover:text-foreground"
        style={{ color: "var(--muted)" }}
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Library
      </Link>

      {/* ── Media viewer ──────────────────────────────────────────────────── */}
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

      {/* Fallback thumbnail for non-viewable URL content */}
      {!showViewer && !isUploaded && content.thumbnail && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={content.thumbnail} alt="" className="w-full max-h-64 object-cover rounded-2xl" />
      )}

      {/* ── Header card ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-5 space-y-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

        {/* Title row */}
        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-base font-bold shrink-0 mt-0.5 ${typeConf.color}`}
            style={{ border: "1px solid var(--border)" }}>
            {typeConf.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <h1 className="flex-1 text-xl font-bold text-foreground leading-snug">{content.title}</h1>
              <button
                onClick={handleFavourite}
                disabled={favLoading}
                title={favourite ? "Remove from favourites" : "Add to favourites"}
                className="shrink-0 p-1.5 rounded-xl transition-all hover:bg-amber-500/10 disabled:opacity-50"
              >
                <StarIcon filled={favourite} className={`h-5 w-5 ${favourite ? "text-amber-400" : "text-muted"}`} />
              </button>
            </div>
            {content.description && (
              <p className="mt-1.5 text-sm leading-relaxed line-clamp-3" style={{ color: "var(--muted)" }}>
                {content.description}
              </p>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border ${statusConf.pill}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${statusConf.dot}`} />
            {content.processingStatus}
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${typeConf.color}`}
            style={{ border: "1px solid var(--border)" }}>
            {content.contentType?.replace(/_/g, " ")}
          </span>
          {isLarge && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-medium">
              large document
            </span>
          )}
          {isUploaded && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium">
              uploaded
            </span>
          )}
          {content.embeddingsCount > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}>
              {content.embeddingsCount} chunks indexed
            </span>
          )}
        </div>

        {/* Meta */}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs pt-1"
          style={{ borderTop: "1px solid var(--border)" }}>
          {content.author && (
            <>
              <dt className="font-medium" style={{ color: "var(--muted)" }}>Author</dt>
              <dd className="text-foreground truncate">{content.author}</dd>
            </>
          )}
          {savedDate && (
            <>
              <dt className="font-medium" style={{ color: "var(--muted)" }}>Saved</dt>
              <dd className="text-foreground">{savedDate}</dd>
            </>
          )}
          {!isUploaded && (
            <>
              <dt className="font-medium" style={{ color: "var(--muted)" }}>Source</dt>
              <dd className="truncate">
                <a href={content.url} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 hover:underline">
                  {(() => { try { return new URL(content.url).hostname.replace(/^www\./, ""); } catch { return content.url; } })()}
                </a>
              </dd>
            </>
          )}
        </dl>

        {/* Tags */}
        {Array.isArray(content.tags) && content.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {content.tags.map((tag: string) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-lg font-medium"
                style={{ background: "var(--surface-2)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Processing error */}
      {content.processingStatus === "failed" && content.processingError && (
        <div className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm text-red-400 bg-red-500/8 border border-red-500/20">
          <span className="h-2 w-2 rounded-full bg-red-400 shrink-0 mt-1" />
          <div>
            <strong className="font-semibold">Indexing failed:</strong>{" "}
            {content.processingError}
          </div>
        </div>
      )}

      {/* Notes */}
      {content.notes && (
        <div className="rounded-2xl p-4 space-y-2"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Notes</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{content.notes}</p>
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {!isUploaded && (
          <a
            href={content.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:border-violet-500/30 hover:text-violet-400"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <ExternalLinkIcon className="h-4 w-4" />
            Open original
          </a>
        )}

        {downloadUrl && (
          <a
            href={downloadUrl}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:border-violet-500/30 hover:text-violet-400"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <DownloadIcon className="h-4 w-4" />
            Download
          </a>
        )}

        {isLarge && isCompleted && (
          <Link
            href={`/content/${content._id}/chat`}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/20"
          >
            <ChatIcon className="h-4 w-4" />
            Chat with content
          </Link>
        )}

        {!isLarge && isCompleted && (
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-violet-400 transition-all"
            style={{ background: "var(--surface)", border: "1px solid rgba(139,92,246,0.25)" }}
          >
            <SearchIcon className="h-4 w-4" />
            Find related content
          </Link>
        )}

        <button
          onClick={() => setShowDeleteModal(true)}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-red-400 transition-all hover:bg-red-500/10"
          style={{ background: "var(--surface)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <TrashIcon className="h-4 w-4" />
          Delete
        </button>
      </div>
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
  const headerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.5rem 1rem",
    borderBottom: "1px solid var(--border)",
  };

  if (isPdf) {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div style={headerStyle}>
          <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>PDF Preview</span>
          <a href={downloadUrl} className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors">
            <DownloadIcon className="h-3.5 w-3.5" /> Download
          </a>
        </div>
        <iframe src={fileUrl} title={filename} className="w-full" style={{ height: "72vh" }} />
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div style={headerStyle}>
          <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>Image Preview</span>
          <a href={downloadUrl} className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors">
            <DownloadIcon className="h-3.5 w-3.5" /> Download
          </a>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fileUrl} alt={filename} className="w-full max-h-[70vh] object-contain" style={{ background: "var(--surface-2)" }} />
      </div>
    );
  }

  if (isAudio) {
    return (
      <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 flex items-center justify-center text-2xl"
            style={{ border: "1px solid var(--border)" }}>
            🎵
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{filename}</p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Audio file</p>
          </div>
          <a href={downloadUrl} className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors shrink-0">
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
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div style={{ ...headerStyle, background: "var(--sidebar-bg)" }}>
          <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>Video Preview</span>
          <a href={downloadUrl} className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors">
            <DownloadIcon className="h-3.5 w-3.5" /> Download
          </a>
        </div>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video controls className="w-full max-h-[70vh] bg-black" src={fileUrl}>
          Your browser does not support the video element.
        </video>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="h-12 w-12 rounded-2xl bg-violet-500/8 flex items-center justify-center text-2xl shrink-0"
        style={{ border: "1px solid var(--border)" }}>
        📁
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{filename}</p>
        <p className="text-xs" style={{ color: "var(--muted)" }}>Uploaded document</p>
      </div>
      <a
        href={downloadUrl}
        className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/20 shrink-0"
      >
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
