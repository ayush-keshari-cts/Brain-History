"use client";

import { useEffect } from "react";

interface DeleteModalProps {
  title:     string;
  onConfirm: () => void;
  onCancel:  () => void;
  loading?:  boolean;
}

export default function DeleteModal({ title, onConfirm, onCancel, loading }: DeleteModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={onCancel}
    >
      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
            <TrashIcon className="h-7 w-7 text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Text */}
        <div className="text-center space-y-1.5">
          <h3 className="text-base font-semibold text-foreground">Delete this item?</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 px-2">
            &ldquo;{title}&rdquo;
          </p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            This will permanently remove the content and all its embeddings.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-neutral-200 dark:border-neutral-700 py-2.5 text-sm font-medium text-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete"
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
