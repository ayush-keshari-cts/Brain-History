"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import DeleteModal from "@/components/ui/DeleteModal";

const TYPE_CONFIG: Record<string, { emoji: string; badge: string; grad: string }> = {
  tweet:         { emoji: "𝕏",  badge: "bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20",             grad: "from-sky-500/15 to-transparent" },
  youtube_video: { emoji: "▶",  badge: "bg-red-50 text-red-700 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",              grad: "from-red-500/15 to-transparent" },
  youtube_music: { emoji: "♪",  badge: "bg-red-50 text-red-700 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",              grad: "from-red-500/15 to-transparent" },
  instagram:     { emoji: "◈",  badge: "bg-pink-50 text-pink-700 border-pink-100 dark:bg-pink-500/10 dark:text-pink-400 dark:border-pink-500/20",         grad: "from-pink-500/15 to-transparent" },
  blog:          { emoji: "✦",  badge: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20", grad: "from-emerald-500/15 to-transparent" },
  pdf:           { emoji: "⬛", badge: "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20", grad: "from-orange-500/15 to-transparent" },
  image:         { emoji: "⬡",  badge: "bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20", grad: "from-violet-500/15 to-transparent" },
  screenshot:    { emoji: "⬡",  badge: "bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20", grad: "from-violet-500/15 to-transparent" },
  website:       { emoji: "◉",  badge: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",         grad: "from-blue-500/15 to-transparent" },
  github:        { emoji: "⊛",  badge: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-700/30 dark:text-zinc-300 dark:border-zinc-600/30",        grad: "from-zinc-400/15 to-transparent" },
  reddit:        { emoji: "◎",  badge: "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20", grad: "from-orange-500/15 to-transparent" },
  spotify:       { emoji: "♫",  badge: "bg-green-50 text-green-700 border-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",   grad: "from-green-500/15 to-transparent" },
  audio:         { emoji: "♫",  badge: "bg-green-50 text-green-700 border-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",   grad: "from-green-500/15 to-transparent" },
  video:         { emoji: "▶",  badge: "bg-red-50 text-red-700 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",              grad: "from-red-500/15 to-transparent" },
  unknown:       { emoji: "◇",  badge: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-700/30 dark:text-zinc-400 dark:border-zinc-600/30",        grad: "from-zinc-400/15 to-transparent" },
};

const STATUS_CONFIG: Record<string, { dot: string; badge: string }> = {
  pending:    { dot: "bg-amber-400 animate-pulse",  badge: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" },
  processing: { dot: "bg-blue-400 animate-pulse",   badge: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" },
  completed:  { dot: "bg-emerald-400",              badge: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" },
  failed:     { dot: "bg-red-400",                  badge: "bg-red-50 text-red-700 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20" },
};

// Extract YouTube video ID from any YouTube URL
function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
    return null;
  } catch { return null; }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ContentDetailView({ content }: { content: Record<string, any> }) {
  const router = useRouter();
  const [deleting,        setDeleting]        = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [favourite,       setFavourite]       = useState<boolean>(Boolean(content.isFavourite));
  const [favLoading,      setFavLoading]      = useState(false);

  const isUploaded = content.platform === "upload";
  const hasFile    = Boolean(content.fileUrl);

  // Detect content kind — also covers uploaded audio/video via mimeType
  const isImage  = content.contentType === "image" || content.contentType === "screenshot";
  const isPdf    = content.contentType === "pdf";
  const isAudio  = content.contentType === "spotify" || content.contentType === "audio"
    || Boolean(isUploaded && (content.mimeType as string | undefined)?.startsWith("audio/"));
  const isVideo  = ["video", "youtube_video", "youtube_music"].includes(content.contentType)
    || Boolean(isUploaded && (content.mimeType as string | undefined)?.startsWith("video/"));

  // YouTube embed ID (only for URL-based YouTube content)
  const youtubeId = !isUploaded && ["youtube_video", "youtube_music"].includes(content.contentType)
    ? getYouTubeId(content.url as string)
    : null;

  // File URL for native player / iframe
  const viewerFileUrl: string | null = isUploaded && hasFile
    ? `/api/files/${content._id}`
    : (isPdf || isImage) && content.url
      ? (content.url as string)
      : null;

  const showViewer  = Boolean(viewerFileUrl) || Boolean(youtubeId);

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
    ? new Date(content.savedAt).toLocaleDateString("en-US", { dateStyle: "long" })
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

      {/* ── Media / Viewer ────────────────────────────────────────── */}
      {youtubeId ? (
        <YouTubeViewer videoId={youtubeId} title={content.title as string} />
      ) : showViewer && viewerFileUrl ? (
        <MediaViewer
          fileUrl={viewerFileUrl}
          downloadUrl={downloadUrl ?? "#"}
          isImage={isImage} isPdf={isPdf} isAudio={isAudio} isVideo={isVideo}
          filename={content.title as string}
        />
      ) : (
        /* Placeholder banner when no media viewer */
        <PlaceholderBanner
          contentType={content.contentType as string}
          thumbnail={content.thumbnail as string | undefined}
          title={content.title as string}
          url={!isUploaded ? content.url as string : undefined}
          tc={tc}
        />
      )}

      {/* ── Detail card ───────────────────────────────────────────── */}
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
            {(content.contentType as string)?.replace(/_/g, " ")}
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

// ─── YouTube Embed ────────────────────────────────────────────────────────────

function YouTubeViewer({ videoId, title }: { videoId: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div ref={containerRef}
      className={`overflow-hidden bg-black border border-zinc-800 shadow-xl shadow-black/20 ${isFullscreen ? "flex flex-col h-full" : "rounded-2xl"}`}>
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-xs font-medium text-zinc-400">YouTube</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 truncate max-w-xs hidden sm:block">{title}</span>
          <button onClick={toggleFullscreen} title="Fullscreen"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
            {isFullscreen ? <ExitFullscreenIcon className="h-4 w-4" /> : <FullscreenIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {isFullscreen ? (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          className="flex-1 w-full h-full border-0"
        />
      ) : (
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0"
          />
        </div>
      )}
    </div>
  );
}

// ─── Native Media Viewer (uploaded files) ─────────────────────────────────────

function MediaViewer({ fileUrl, downloadUrl, isImage, isPdf, isAudio, isVideo, filename }: {
  fileUrl: string; downloadUrl: string; isImage: boolean; isPdf: boolean; isAudio: boolean; isVideo: boolean; filename: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Shared toolbar action button style
  const toolbarBtn = "p-1.5 rounded-lg transition-colors";

  if (isPdf) return (
    <div ref={containerRef}
      className={`overflow-hidden ${isFullscreen
        ? "flex flex-col h-full w-full bg-zinc-950"
        : "rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm"}`}>
      {/* Toolbar */}
      <div className={`flex items-center justify-between px-4 py-2.5 shrink-0 ${isFullscreen
        ? "bg-zinc-900 border-b border-zinc-800"
        : "border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900"}`}>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-orange-500" />
          <span className={`text-xs font-medium ${isFullscreen ? "text-zinc-300" : "text-zinc-500 dark:text-zinc-400"}`}>
            PDF — <span className="max-w-[16rem] truncate inline-block align-bottom">{filename}</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <a href={downloadUrl}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${isFullscreen
              ? "text-zinc-300 hover:text-white hover:bg-zinc-800"
              : "text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10"}`}>
            <DownloadIcon className="h-3.5 w-3.5" /> Download
          </a>
          <button onClick={toggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            className={`${toolbarBtn} ${isFullscreen
              ? "text-zinc-400 hover:text-white hover:bg-zinc-800"
              : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
            {isFullscreen ? <ExitFullscreenIcon className="h-4 w-4" /> : <FullscreenIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <iframe
        src={fileUrl}
        title={filename}
        className={`w-full border-0 ${isFullscreen ? "flex-1 h-full" : "h-[72vh]"}`}
      />
    </div>
  );

  if (isImage) return (
    <div ref={containerRef}
      className={`overflow-hidden ${isFullscreen
        ? "flex flex-col h-full w-full bg-black"
        : "rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm"}`}>
      {/* Toolbar */}
      <div className={`flex items-center justify-between px-4 py-2.5 shrink-0 ${isFullscreen
        ? "bg-zinc-900/80 border-b border-zinc-800"
        : "border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900"}`}>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-violet-500" />
          <span className={`text-xs font-medium ${isFullscreen ? "text-zinc-300" : "text-zinc-500 dark:text-zinc-400"}`}>
            Image — <span className="max-w-[16rem] truncate inline-block align-bottom">{filename}</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <a href={downloadUrl}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${isFullscreen
              ? "text-zinc-300 hover:text-white hover:bg-zinc-800"
              : "text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10"}`}>
            <DownloadIcon className="h-3.5 w-3.5" /> Download
          </a>
          <button onClick={toggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            className={`${toolbarBtn} ${isFullscreen
              ? "text-zinc-400 hover:text-white hover:bg-zinc-800"
              : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
            {isFullscreen ? <ExitFullscreenIcon className="h-4 w-4" /> : <FullscreenIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={fileUrl}
        alt={filename}
        className={`block ${isFullscreen
          ? "flex-1 w-full h-full object-contain bg-black"
          : "w-full max-h-[80vh] object-contain bg-zinc-50 dark:bg-zinc-800"}`}
      />
    </div>
  );

  if (isAudio) return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden">
      {/* Waveform header */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-600/10 border border-green-100 dark:border-green-500/20 flex items-center justify-center shrink-0">
          <svg className="h-7 w-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{filename}</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Audio file</p>
        </div>
        <a href={downloadUrl}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors shrink-0">
          <DownloadIcon className="h-3.5 w-3.5" /> Download
        </a>
      </div>
      <div className="px-5 pb-5">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio controls className="w-full rounded-xl" src={fileUrl} style={{ accentColor: "#8b5cf6" }}>
          Your browser does not support the audio element.
        </audio>
      </div>
    </div>
  );

  if (isVideo) return (
    <div ref={containerRef}
      className={`overflow-hidden bg-zinc-950 border border-zinc-800 shadow-xl shadow-black/20 ${isFullscreen ? "flex flex-col h-full w-full" : "rounded-2xl"}`}>
      <div className={`flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 shrink-0`}>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-xs font-medium text-zinc-400">
            Video — <span className="max-w-[16rem] truncate inline-block align-bottom">{filename}</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <a href={downloadUrl}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors">
            <DownloadIcon className="h-3.5 w-3.5" /> Download
          </a>
          <button onClick={toggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            className={`${toolbarBtn} text-zinc-400 hover:text-white hover:bg-zinc-800`}>
            {isFullscreen ? <ExitFullscreenIcon className="h-4 w-4" /> : <FullscreenIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        controls
        src={fileUrl}
        className={`bg-black ${isFullscreen ? "flex-1 w-full h-full object-contain" : "w-full max-h-[72vh]"}`}
      >
        Your browser does not support the video element.
      </video>
    </div>
  );

  // Generic uploaded file
  return (
    <div className="rounded-2xl p-5 flex items-center gap-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
      <div className="h-12 w-12 rounded-2xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 flex items-center justify-center text-2xl shrink-0">📁</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{filename}</p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">Uploaded file</p>
      </div>
      <a href={downloadUrl} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/20 shrink-0">
        <DownloadIcon className="h-4 w-4" /> Download
      </a>
    </div>
  );
}

// ─── Placeholder Banner ───────────────────────────────────────────────────────

function PlaceholderBanner({ contentType, thumbnail, title, url, tc }: {
  contentType: string;
  thumbnail?: string;
  title: string;
  url?: string;
  tc: { badge: string; grad: string };
}) {
  if (thumbnail) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={thumbnail} alt={title} className="w-full max-h-72 object-cover rounded-2xl border border-zinc-100 dark:border-zinc-800" />
    );
  }

  return (
    <div className={`w-full h-52 rounded-2xl flex flex-col items-center justify-center gap-3 relative overflow-hidden bg-gradient-to-br ${tc.grad} bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800`}>
      <div className="absolute inset-0 dot-bg opacity-20" />
      <div className={`relative z-10 ${tc.badge} border rounded-2xl p-4`}>
        <TypeBannerIcon contentType={contentType} />
      </div>
      <div className="relative z-10 text-center space-y-0.5 px-4">
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 line-clamp-1">{title}</p>
        {url && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
            {(() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } })()}
          </p>
        )}
      </div>
    </div>
  );
}

function TypeBannerIcon({ contentType }: { contentType: string }) {
  const cls = "h-8 w-8";
  switch (contentType) {
    case "pdf": return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/><path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6M9 17h4M13 3v5a1 1 0 001 1h5"/></svg>;
    case "github": return <svg className={cls} fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>;
    case "tweet": return <svg className={cls} fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
    case "spotify": case "audio": return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>;
    case "image": case "screenshot": return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>;
    case "blog": return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}><path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>;
    case "reddit": return <svg className={cls} fill="currentColor" viewBox="0 0 24 24"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>;
    default: return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>;
  }
}

// ─── Icons ────────────────────────────────────────────────────────────────────

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
function FullscreenIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>;
}
function ExitFullscreenIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4m0 5H4m0 0l5-5M15 9h5m-5 0V4m0 5l5-5M9 15H4m5 0v5m0-5l-5 5m11-5h5m-5 0v5m0-5l5 5"/></svg>;
}
