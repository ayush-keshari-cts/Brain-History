"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";

interface Message {
  role:      "user" | "assistant";
  content:   string;
  createdAt: string;
}

interface ChatViewProps {
  contentId:        string;
  title:            string;
  url:              string;
  contentType:      string;
  processingStatus: string;
  isLarge:          boolean;
}

const TYPE_EMOJI: Record<string, string> = {
  pdf: "⬛", youtube_video: "▶", blog: "✦", github: "⊛", website: "◉", unknown: "◇",
};

export default function ChatView({
  contentId, title, url, contentType, processingStatus, isLarge,
}: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [input, setInput]         = useState("");
  const [sending, setSending]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const inputRef                  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const userMsg: Message = { role: "user", content: text, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    setError(null);
    try {
      const res = await api.chat(contentId, text, sessionId);
      setSessionId(res.sessionId);
      setMessages((prev) => [...prev, { role: "assistant", content: res.answer, createdAt: new Date().toISOString() }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      setMessages((prev) => prev.slice(0, -1));
      setInput(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const notReady = processingStatus !== "completed";
  const emoji    = TYPE_EMOJI[contentType] ?? "◇";

  return (
    <div className="flex flex-col h-screen md:h-screen" style={{ background: "var(--background)" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 py-3 glass"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <Link
          href={`/content/${contentId}`}
          className="p-1.5 rounded-xl transition-all hover:text-foreground hover:bg-surface-2 dark:hover:bg-white/5"
          style={{ color: "var(--muted)" }}
          title="Back to content"
        >
          <ChevronLeftIcon className="h-4.5 w-4.5" style={{ height: "1.125rem", width: "1.125rem" }} />
        </Link>

        <div className="h-8 w-8 rounded-xl bg-violet-500/10 flex items-center justify-center text-sm font-bold text-violet-400 shrink-0"
          style={{ border: "1px solid var(--border)" }}>
          {emoji}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{title}</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs hover:text-violet-400 truncate block transition-colors"
            style={{ color: "var(--muted)" }}
          >
            {(() => { try { return new URL(url).hostname; } catch { return url; } })()}
          </a>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isLarge && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              small
            </span>
          )}
          <div className="flex items-center gap-1.5 text-xs text-violet-400 bg-violet-500/8 px-2.5 py-1 rounded-full border border-violet-500/20">
            <SparkleIcon className="h-3 w-3" />
            AI Chat
          </div>
        </div>
      </div>

      {/* ── Not ready banner ────────────────────────────────────────────── */}
      {notReady && (
        <div className="shrink-0 flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-400 bg-amber-500/8 border-b border-amber-500/15">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          Still indexing ({processingStatus}) — chat will be available once completed.
        </div>
      )}

      {/* ── Message list ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {messages.length === 0 && !notReady && (
          <div className="flex flex-col items-center justify-center h-full space-y-4 text-center py-12">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-500/30">
              <SparkleIcon className="h-7 w-7 text-white" />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-foreground">Ask anything about this content</p>
              <p className="text-xs max-w-xs" style={{ color: "var(--muted)" }}>
                The AI will answer based on what&apos;s saved. Press Enter or click Send.
              </p>
            </div>
            {/* Example questions */}
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {["Summarize this content", "What are the key points?", "Explain the main idea"].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs px-3 py-1.5 rounded-xl transition-all hover:border-violet-500/30 hover:text-violet-400"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {sending && (
          <div className="flex gap-3 justify-start">
            <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/25 shrink-0 self-end">
              <SparkleIcon className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-bl-sm"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
              <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
              <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 text-xs text-red-400 bg-red-500/8 border-t border-red-500/15">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Input area ───────────────────────────────────────────────────── */}
      <div
        className="shrink-0 px-4 py-3"
        style={{ borderTop: "1px solid var(--border)", background: "var(--sidebar-bg)" }}
      >
        <div
          className="flex items-end gap-2 rounded-2xl px-3 py-2.5 transition-all"
          style={{ background: "var(--surface)", border: "1px solid var(--border-2)" }}
          onFocusCapture={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = "rgba(139,92,246,0.4)";
            el.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.08)";
          }}
          onBlurCapture={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = "var(--border-2)";
            el.style.boxShadow = "none";
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={notReady ? "Waiting for indexing…" : "Ask a question…  (Enter to send)"}
            disabled={notReady || sending}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none disabled:opacity-40 max-h-32 overflow-y-auto"
            style={{ minHeight: "1.375rem" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
            }}
          />
          <button
            onClick={sendMessage}
            disabled={notReady || sending || !input.trim()}
            className="shrink-0 self-end h-8 w-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-violet-500/20"
            title="Send"
          >
            <SendIcon className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-1.5 text-center text-xs" style={{ color: "var(--muted)" }}>
          Answers are based on your saved content and may not be 100% accurate.
        </p>
      </div>
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/25 shrink-0 self-end">
          <SparkleIcon className="h-3.5 w-3.5 text-white" />
        </div>
      )}
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "rounded-br-sm bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20"
            : "rounded-bl-sm text-foreground"
        }`}
        style={isUser ? {} : { background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {message.content}
      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3L13.4 8.4L19 9L13.4 9.6L12 15L10.6 9.6L5 9L10.6 8.4L12 3Z" />
    </svg>
  );
}
function ChevronLeftIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
}
function SendIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>;
}
