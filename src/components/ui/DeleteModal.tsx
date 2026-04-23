"use client";

import { useEffect } from "react";

interface DeleteModalProps {
  title:     string;
  onConfirm: () => void;
  onCancel:  () => void;
  loading?:  boolean;
}

export default function DeleteModal({ title, onConfirm, onCancel, loading }: DeleteModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 flex items-center justify-center">
            <TrashIcon className="h-6 w-6 text-red-500 dark:text-red-400" />
          </div>
        </div>

        {/* Text */}
        <div className="text-center space-y-2">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Delete this item?</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 px-2">
            &ldquo;{title}&rdquo;
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            This permanently removes the content and all embeddings. This action cannot be undone.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-violet-300 dark:hover:border-violet-500/40 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <TrashIcon className="h-4 w-4" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
