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
  pdf: "📄", youtube_video: "📹", blog: "📝", github: "🐙", website: "🌐", unknown: "🔗",
};

export default function ChatView({
  contentId,
  title,
  url,
  contentType,
  processingStatus,
  isLarge,
}: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [input, setInput]         = useState("");
  const [sending, setSending]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const inputRef                  = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
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
      const assistantMsg: Message = {
        role:      "assistant",
        content:   res.answer,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      // Remove the optimistically added user message on error
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
  const emoji    = TYPE_EMOJI[contentType] ?? "🔗";

  return (
    <div className="flex flex-col h-screen md:h-[calc(100vh-0px)]">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-background">
        <Link
          href={`/content/${contentId}`}
          className="text-neutral-400 hover:text-foreground transition-colors"
          title="Back to content"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </Link>
        <span className="text-xl shrink-0">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{title}</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-neutral-400 hover:text-blue-600 truncate block"
          >
            {(() => { try { return new URL(url).hostname; } catch { return url; } })()}
          </a>
        </div>
        {!isLarge && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 shrink-0">
            small content
          </span>
        )}
      </div>

      {/* Not ready banner */}
      {notReady && (
        <div className="shrink-0 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          Content is still being indexed ({processingStatus}). Chat will be available once completed.
        </div>
      )}

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !notReady && (
          <div className="flex flex-col items-center justify-center h-full space-y-3 text-center">
            <span className="text-5xl">{emoji}</span>
            <p className="text-sm font-medium text-foreground">Ask anything about this content</p>
            <p className="text-xs text-neutral-400 max-w-xs">
              The AI will answer based on what&apos;s saved in BrainHistory. Press Enter or click Send.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {sending && (
          <div className="flex gap-2 justify-start">
            <div className="rounded-2xl rounded-tl-sm bg-neutral-100 dark:bg-neutral-800 px-4 py-2.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="shrink-0 px-4 py-2 bg-red-50 dark:bg-red-950/30 border-t border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Input area */}
      <div className="shrink-0 border-t border-neutral-200 dark:border-neutral-800 bg-background px-4 py-3">
        <div className="flex items-end gap-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={notReady ? "Waiting for indexing to complete…" : "Ask a question… (Enter to send, Shift+Enter for newline)"}
            disabled={notReady || sending}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-neutral-400 focus:outline-none disabled:opacity-50 max-h-32 overflow-y-auto"
            style={{ minHeight: "1.5rem" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
            }}
          />
          <button
            onClick={sendMessage}
            disabled={notReady || sending || !input.trim()}
            className="shrink-0 self-end rounded-lg bg-blue-600 p-1.5 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Send"
          >
            <SendIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-xs text-neutral-400 text-center">
          AI answers are based on your saved content and may not be 100% accurate.
        </p>
      </div>
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="h-7 w-7 shrink-0 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold self-end">
          AI
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "rounded-br-sm bg-blue-600 text-white"
            : "rounded-bl-sm bg-neutral-100 dark:bg-neutral-800 text-foreground"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}
