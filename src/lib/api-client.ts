/**
 * Typed API client — thin fetch wrappers for browser use.
 * All functions throw on non-2xx responses.
 */

import type { AddContentResponse, SearchResponse, ChatResponse } from "@/types";

// ─── Shapes ───────────────────────────────────────────────────────────────────

export interface ContentItem {
  _id: string;
  url: string;
  contentType: string;
  platform: string;
  title: string;
  description?: string;
  thumbnail?: string;
  author?: string;
  savedAt: string;
  processingStatus: "pending" | "processing" | "completed" | "failed";
  contentSize: "small" | "large";
  tags: string[];
  notes?: string;
  isFavourite: boolean;
  fileUrl?: string;
  embeddingsCount: number;
  rawTextLength?: number;
  processingError?: string;
}

export interface ContentListResponse {
  items: ContentItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ChatSessionResponse {
  sessionId: string;
  messages: Array<{ role: "user" | "assistant"; content: string; createdAt: string }>;
  summary?: string;
}

// ─── Core fetch ───────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const b = body as { error?: string; details?: string };
    // Include details if present (e.g. "Extraction failed: <root cause>")
    const message = b.details
      ? `${b.error ?? "Error"}: ${b.details}`
      : (b.error ?? `HTTP ${res.status}`);
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const api = {
  /** Add a URL to BrainHistory */
  addContent: (url: string, tags?: string[], notes?: string) =>
    apiFetch<AddContentResponse>("/api/content", {
      method: "POST",
      body: JSON.stringify({ url, tags, notes }),
    }),

  /** Save a plain-text note */
  addNote: (text: string, title?: string) =>
    apiFetch<{ success: boolean; contentId: string; title: string; contentType: string; isLarge: boolean }>(
      "/api/note", { method: "POST", body: JSON.stringify({ text, title }) }
    ),

  /** Update an existing note's title and body */
  updateNote: (id: string, text: string, title?: string) =>
    apiFetch<{ success: boolean; title: string; isLarge: boolean }>(
      `/api/note/${id}`, { method: "PATCH", body: JSON.stringify({ text, title }) }
    ),

  /** List saved content with optional type filter + pagination */
  listContent: (page = 1, limit = 20, type?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (type === "__fav__") {
      params.set("favourite", "1");
    } else if (type) {
      params.set("type", type);
    }
    return apiFetch<ContentListResponse>(`/api/content?${params}`);
  },

  /** Get a single content item (includes rawText + metadata) */
  getContent: (id: string) =>
    apiFetch<{ content: ContentItem & { rawText?: string; metadata?: unknown } }>(
      `/api/content/${id}`
    ),

  /** Delete a content item */
  deleteContent: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/content/${id}`, { method: "DELETE" }),

  /** Toggle isFavourite on a content item */
  toggleFavourite: (id: string) =>
    apiFetch<{ isFavourite: boolean }>(`/api/content/${id}/favourite`, { method: "PATCH" }),

  /** Run semantic search */
  search: (query: string, contentTypes?: string[], limit = 10) =>
    apiFetch<SearchResponse>("/api/search", {
      method: "POST",
      body: JSON.stringify({ query, contentTypes, limit }),
    }),

  /** Send a chat message for a large content item */
  chat: (contentId: string, message: string, sessionId?: string) =>
    apiFetch<ChatResponse>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ contentId, message, sessionId }),
    }),

  /** Load an existing chat session */
  getChatSession: (sessionId: string) =>
    apiFetch<ChatSessionResponse>(`/api/chat?sessionId=${sessionId}`),
};
