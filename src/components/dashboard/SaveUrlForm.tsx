"use client";

import { useState, useRef, useCallback } from "react";
import { api, type ContentItem } from "@/lib/api-client";

interface SaveUrlFormProps {
  onAdded: (item: ContentItem) => void;
}

type Tab = "url" | "file";

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

export default function SaveUrlForm({ onAdded }: SaveUrlFormProps) {
  const [tab, setTab]             = useState<Tab>("url");
  const [url, setUrl]             = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError]     = useState<string | null>(null);
  const [urlSuccess, setUrlSuccess] = useState<string | null>(null);
  const urlInputRef                 = useRef<HTMLInputElement>(null);

  const [file, setFile]               = useState<File | null>(null);
  const [dragging, setDragging]       = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError]     = useState<string | null>(null);
  const [fileSuccess, setFileSuccess] = useState<string | null>(null);
  const fileInputRef                  = useRef<HTMLInputElement>(null);

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
          isFavourite:      false,
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
      const res  = await fetch("/api/upload", { method: "POST", body: formData });
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
        thumbnail:        body.thumbnail,
        savedAt:          new Date().toISOString(),
        processingStatus: "pending",
        contentSize:      body.isLarge ? "large" : "small",
        tags:             [],
        isFavourite:      false,
        fileUrl:          body.fileUrl,
        embeddingsCount:  0,
      });
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setFileLoading(false);
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      {/* Tabs */}
      <div className="flex" style={{ borderBottom: "1px solid var(--border)" }}>
        {(["url", "file"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all ${
              tab === t
                ? "text-violet-500 dark:text-violet-300 border-b-2 border-violet-500"
                : "hover:text-foreground border-b-2 border-transparent"
            }`}
            style={{ color: tab === t ? undefined : "var(--muted)" }}
          >
            {t === "url" ? <LinkIcon className="h-3.5 w-3.5" /> : <UploadIcon className="h-3.5 w-3.5" />}
            {t === "url" ? "Save URL" : "Upload File"}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {/* URL tab */}
        {tab === "url" && (
          <>
            <form onSubmit={handleUrlSubmit} className="flex gap-2">
              <div className="flex-1 relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "var(--muted)" }} />
                <input
                  ref={urlInputRef}
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste any URL — YouTube, articles, GitHub, PDFs…"
                  required
                  disabled={urlLoading}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-foreground placeholder:text-muted focus:outline-none transition-all disabled:opacity-50"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-2)",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(139,92,246,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.12)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-2)"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
              <button
                type="submit"
                disabled={urlLoading || !url.trim()}
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30"
              >
                {urlLoading ? (
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <SaveIcon className="h-4 w-4" />
                )}
                {urlLoading ? "Saving…" : "Save"}
              </button>
            </form>
            {urlError   && <p className="text-xs text-red-400 flex items-center gap-1.5"><span>⚠</span>{urlError}</p>}
            {urlSuccess && <p className="text-xs text-emerald-400 flex items-center gap-1.5"><span>✓</span>{urlSuccess}</p>}
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Supports YouTube · Blogs · GitHub · Twitter/X · Reddit · PDFs · Images and more
            </p>
          </>
        )}

        {/* File upload tab */}
        {tab === "file" && (
          <>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-all p-8 ${
                dragging
                  ? "border-violet-500 bg-violet-500/5"
                  : "hover:border-violet-500/40"
              }`}
              style={{ borderColor: dragging ? undefined : "var(--border-2)", background: dragging ? undefined : "var(--surface-2)" }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }}
              />
              {file ? (
                <SelectedFile file={file} onClear={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} />
              ) : (
                <>
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 flex items-center justify-center"
                    style={{ border: "1px solid var(--border-2)" }}>
                    <UploadIcon className="h-5 w-5 text-violet-400" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Drop a file or{" "}
                      <span className="text-violet-500 dark:text-violet-300">click to browse</span>
                    </p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      PDF · Word · Images · Audio · Video  ·  up to 50 MB
                    </p>
                  </div>
                </>
              )}
            </div>

            {file && (
              <button
                onClick={handleFileUpload}
                disabled={fileLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20"
              >
                {fileLoading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Uploading & Indexing…
                  </>
                ) : (
                  <>
                    <UploadIcon className="h-4 w-4" />
                    Upload & Index
                  </>
                )}
              </button>
            )}

            {fileError   && <p className="text-xs text-red-400 flex items-center gap-1.5"><span>⚠</span>{fileError}</p>}
            {fileSuccess && <p className="text-xs text-emerald-400 flex items-center gap-1.5"><span>✓</span>{fileSuccess}</p>}
          </>
        )}
      </div>
    </div>
  );
}

function SelectedFile({ file, onClear }: { file: File; onClear: () => void }) {
  return (
    <div className="flex items-center gap-3 w-full" onClick={(e) => e.stopPropagation()}>
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 flex items-center justify-center text-lg shrink-0"
        style={{ border: "1px solid var(--border-2)" }}>
        {fileEmoji(file.type, file.name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          {fileTypeLabel(file.type, file.name)} · {formatBytes(file.size)}
        </p>
      </div>
      <button
        onClick={onClear}
        className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center transition-colors hover:bg-red-500/10 hover:text-red-500"
        style={{ color: "var(--muted)" }}
        title="Remove file"
      >
        <XIcon className="h-3.5 w-3.5" />
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

function LinkIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>;
}
function UploadIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
}
function SaveIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>;
}
function XIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
}
