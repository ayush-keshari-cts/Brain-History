"use client";

import { useState, useRef, useCallback } from "react";
import { api, type ContentItem } from "@/lib/api-client";

interface SaveUrlFormProps {
  onAdded: (item: ContentItem) => void;
}

type Tab = "url" | "file";

// ─── Accepted file types ──────────────────────────────────────────────────────
const ACCEPT = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  ".docx", ".doc",
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg", "audio/flac", "audio/x-m4a",
  "video/mp4", "video/webm", "video/ogg", "video/avi", "video/quicktime",
].join(",");

const FILE_LABEL: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
  "application/msword": "Word",
  "image/jpeg": "JPEG", "image/png": "PNG", "image/gif": "GIF",
  "image/webp": "WebP", "image/svg+xml": "SVG",
};
function fileTypeLabel(mime: string, filename?: string) {
  if (FILE_LABEL[mime]) return FILE_LABEL[mime];
  const ext = filename?.split(".").pop()?.toLowerCase();
  if (ext === "docx" || ext === "doc") return "Word";
  if (mime.startsWith("audio/")) return "Audio";
  if (mime.startsWith("video/")) return "Video";
  if (mime.startsWith("image/")) return "Image";
  return mime.split("/")[1]?.toUpperCase() ?? "File";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SaveUrlForm({ onAdded }: SaveUrlFormProps) {
  const [tab, setTab]         = useState<Tab>("url");

  // URL tab state
  const [url, setUrl]         = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError]     = useState<string | null>(null);
  const [urlSuccess, setUrlSuccess] = useState<string | null>(null);
  const urlInputRef             = useRef<HTMLInputElement>(null);

  // File tab state
  const [file, setFile]           = useState<File | null>(null);
  const [dragging, setDragging]   = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError]     = useState<string | null>(null);
  const [fileSuccess, setFileSuccess] = useState<string | null>(null);
  const fileInputRef              = useRef<HTMLInputElement>(null);

  // ─── URL submit ──────────────────────────────────────────────────────────────

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setUrlLoading(true);
    setUrlError(null);
    setUrlSuccess(null);

    try {
      const res = await api.addContent(trimmed);
      if (res.success && res.contentId) {
        setUrlSuccess(
          res.message === "Already saved"
            ? `Already in your library: "${res.title}"`
            : `Saved: "${res.title}"`
        );
        setUrl("");
        onAdded({
          _id:              res.contentId,
          url:              trimmed,
          contentType:      res.contentType ?? "unknown",
          platform:         "unknown",
          title:            res.title ?? trimmed,
          savedAt:          new Date().toISOString(),
          processingStatus: res.message === "Already saved" ? "completed" : "pending",
          contentSize:      res.isLarge ? "large" : "small",
          tags:             [],
          embeddingsCount:  0,
        });
        urlInputRef.current?.focus();
      }
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : "Failed to save URL");
    } finally {
      setUrlLoading(false);
    }
  };

  // ─── File upload ─────────────────────────────────────────────────────────────

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);

  const handleFileUpload = async () => {
    if (!file) return;

    setFileLoading(true);
    setFileError(null);
    setFileSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.details ? `${body.error}: ${body.details}` : (body.error ?? `HTTP ${res.status}`));
      }

      setFileSuccess(`Uploaded: "${body.title}"`);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      onAdded({
        _id:              body.contentId,
        url:              `(uploaded)`,
        contentType:      body.contentType ?? "unknown",
        platform:         "upload",
        title:            body.title ?? file.name,
        savedAt:          new Date().toISOString(),
        processingStatus: "pending",
        contentSize:      body.isLarge ? "large" : "small",
        tags:             [],
        embeddingsCount:  0,
      });
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setFileLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800">
        <button
          onClick={() => setTab("url")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            tab === "url"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/40 dark:bg-blue-950/20"
              : "text-neutral-500 dark:text-neutral-400 hover:text-foreground"
          }`}
        >
          🔗 Save URL
        </button>
        <button
          onClick={() => setTab("file")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            tab === "file"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/40 dark:bg-blue-950/20"
              : "text-neutral-500 dark:text-neutral-400 hover:text-foreground"
          }`}
        >
          📁 Upload File
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* ── URL tab ─────────────────────────────────────────────────────────── */}
        {tab === "url" && (
          <>
            <form onSubmit={handleUrlSubmit} className="flex gap-2">
              <input
                ref={urlInputRef}
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article, youtube.com/watch?v=…"
                required
                disabled={urlLoading}
                className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-background px-3 py-2 text-sm text-foreground placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={urlLoading || !url.trim()}
                className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {urlLoading ? "Saving…" : "Save"}
              </button>
            </form>
            {urlError   && <p className="text-xs text-red-600 dark:text-red-400">{urlError}</p>}
            {urlSuccess && <p className="text-xs text-green-600 dark:text-green-400">{urlSuccess}</p>}
            <p className="text-xs text-neutral-400">
              Supports YouTube, blogs, GitHub, Twitter/X, Reddit, PDFs, images, and more.
            </p>
          </>
        )}

        {/* ── File upload tab ──────────────────────────────────────────────────── */}
        {tab === "file" && (
          <>
            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors p-6 ${
                dragging
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                  : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 bg-neutral-50 dark:bg-neutral-800/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFile(f);
                }}
              />
              {file ? (
                <SelectedFile file={file} onClear={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }} />
              ) : (
                <>
                  <span className="text-3xl">📂</span>
                  <p className="text-sm font-medium text-foreground">
                    Drop a file or <span className="text-blue-600 dark:text-blue-400">click to browse</span>
                  </p>
                  <p className="text-xs text-neutral-400 text-center">
                    PDF · Word (DOCX, DOC) · Images (JPG, PNG, GIF, WebP)
                    <br />
                    Audio (MP3, WAV, M4A) · Video (MP4, WebM) · Up to 50 MB
                  </p>
                </>
              )}
            </div>

            {/* Upload button */}
            {file && (
              <button
                onClick={handleFileUpload}
                disabled={fileLoading}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {fileLoading ? "Uploading…" : "Upload & Index"}
              </button>
            )}

            {fileError   && <p className="text-xs text-red-600 dark:text-red-400">{fileError}</p>}
            {fileSuccess && <p className="text-xs text-green-600 dark:text-green-400">{fileSuccess}</p>}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SelectedFile({ file, onClear }: { file: File; onClear: () => void }) {
  return (
    <div
      className="flex items-center gap-3 w-full"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="text-2xl shrink-0">{fileEmoji(file.type, file.name)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
        <p className="text-xs text-neutral-400">
          {fileTypeLabel(file.type, file.name)} · {formatBytes(file.size)}
        </p>
      </div>
      <button
        onClick={onClear}
        className="shrink-0 p-1 rounded-full text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
        title="Remove file"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function fileEmoji(mime: string, filename?: string) {
  const ext = filename?.split(".").pop()?.toLowerCase();
  if (mime === "application/pdf" || ext === "pdf")    return "📄";
  if (mime.includes("word") || ext === "docx" || ext === "doc") return "📝";
  if (mime.startsWith("image/"))                      return "🖼️";
  if (mime.startsWith("audio/"))                      return "🎵";
  if (mime.startsWith("video/"))                      return "🎬";
  return "📁";
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
