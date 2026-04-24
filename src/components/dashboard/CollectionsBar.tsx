"use client";

import { useState, useRef } from "react";
import { api, type CollectionItem } from "@/lib/api-client";

// Tailwind color map — must use full class strings so Tailwind doesn't purge them
const COLOR_STYLES: Record<string, { chip: string; active: string; dot: string }> = {
  violet:  { chip: "border-violet-200  dark:border-violet-500/30  text-violet-700  dark:text-violet-300  hover:bg-violet-50  dark:hover:bg-violet-500/10",  active: "bg-violet-100  dark:bg-violet-500/20  border-violet-300  dark:border-violet-500/40  text-violet-800  dark:text-violet-200",  dot: "bg-violet-400"  },
  blue:    { chip: "border-blue-200    dark:border-blue-500/30    text-blue-700    dark:text-blue-300    hover:bg-blue-50    dark:hover:bg-blue-500/10",    active: "bg-blue-100    dark:bg-blue-500/20    border-blue-300    dark:border-blue-500/40    text-blue-800    dark:text-blue-200",    dot: "bg-blue-400"    },
  green:   { chip: "border-green-200   dark:border-green-500/30   text-green-700   dark:text-green-300   hover:bg-green-50   dark:hover:bg-green-500/10",   active: "bg-green-100   dark:bg-green-500/20   border-green-300   dark:border-green-500/40   text-green-800   dark:text-green-200",   dot: "bg-green-400"   },
  emerald: { chip: "border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10", active: "bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-200", dot: "bg-emerald-400" },
  red:     { chip: "border-red-200     dark:border-red-500/30     text-red-700     dark:text-red-300     hover:bg-red-50     dark:hover:bg-red-500/10",     active: "bg-red-100     dark:bg-red-500/20     border-red-300     dark:border-red-500/40     text-red-800     dark:text-red-200",     dot: "bg-red-400"     },
  orange:  { chip: "border-orange-200  dark:border-orange-500/30  text-orange-700  dark:text-orange-300  hover:bg-orange-50  dark:hover:bg-orange-500/10",  active: "bg-orange-100  dark:bg-orange-500/20  border-orange-300  dark:border-orange-500/40  text-orange-800  dark:text-orange-200",  dot: "bg-orange-400"  },
  amber:   { chip: "border-amber-200   dark:border-amber-500/30   text-amber-700   dark:text-amber-300   hover:bg-amber-50   dark:hover:bg-amber-500/10",   active: "bg-amber-100   dark:bg-amber-500/20   border-amber-300   dark:border-amber-500/40   text-amber-800   dark:text-amber-200",   dot: "bg-amber-400"   },
  pink:    { chip: "border-pink-200    dark:border-pink-500/30    text-pink-700    dark:text-pink-300    hover:bg-pink-50    dark:hover:bg-pink-500/10",    active: "bg-pink-100    dark:bg-pink-500/20    border-pink-300    dark:border-pink-500/40    text-pink-800    dark:text-pink-200",    dot: "bg-pink-400"    },
  sky:     { chip: "border-sky-200     dark:border-sky-500/30     text-sky-700     dark:text-sky-300     hover:bg-sky-50     dark:hover:bg-sky-500/10",     active: "bg-sky-100     dark:bg-sky-500/20     border-sky-300     dark:border-sky-500/40     text-sky-800     dark:text-sky-200",     dot: "bg-sky-400"     },
  teal:    { chip: "border-teal-200    dark:border-teal-500/30    text-teal-700    dark:text-teal-300    hover:bg-teal-50    dark:hover:bg-teal-500/10",    active: "bg-teal-100    dark:bg-teal-500/20    border-teal-300    dark:border-teal-500/40    text-teal-800    dark:text-teal-200",    dot: "bg-teal-400"    },
};

const COLORS = Object.keys(COLOR_STYLES);

interface Props {
  collections:      CollectionItem[];
  activeCollection: string | undefined;
  onSelect:         (id: string | undefined) => void;
  onCreated:        (col: CollectionItem) => void;
  onDeleted:        (id: string) => void;
}

export default function CollectionsBar({ collections, activeCollection, onSelect, onCreated, onDeleted }: Props) {
  const [showCreate, setShowCreate] = useState(false);

  if (collections.length === 0 && !showCreate) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-400 dark:text-zinc-500">No collections yet.</span>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline"
        >
          <PlusIcon className="h-3 w-3" /> Create one
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* All chip */}
        <button
          onClick={() => onSelect(undefined)}
          className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
            activeCollection === undefined
              ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
              : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          }`}
        >
          All saved
        </button>

        {/* Collection chips */}
        {collections.map((col) => {
          const cs = COLOR_STYLES[col.color] ?? COLOR_STYLES.violet;
          const isActive = activeCollection === col._id;
          return (
            <CollectionChip
              key={col._id}
              col={col}
              cs={cs}
              isActive={isActive}
              onSelect={onSelect}
              onDeleted={onDeleted}
            />
          );
        })}

        {/* New collection button */}
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border border-dashed border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:border-violet-400 dark:hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
          >
            <PlusIcon className="h-3 w-3" /> New
          </button>
        )}
      </div>

      {showCreate && (
        <CreateCollectionForm
          onCreated={(col) => { onCreated(col); setShowCreate(false); }}
          onCancel={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

// ─── Collection chip with delete ──────────────────────────────────────────────

function CollectionChip({
  col, cs, isActive, onSelect, onDeleted,
}: {
  col: CollectionItem;
  cs: { chip: string; active: string; dot: string };
  isActive: boolean;
  onSelect: (id: string | undefined) => void;
  onDeleted: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete collection "${col.name}"? Items won't be deleted.`)) return;
    setDeleting(true);
    try {
      await api.deleteCollection(col._id);
      onDeleted(col._id);
    } catch {
      alert("Could not delete collection.");
      setDeleting(false);
    }
  };

  return (
    <button
      onClick={() => onSelect(isActive ? undefined : col._id)}
      disabled={deleting}
      className={`group/chip inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 text-xs font-medium rounded-full border transition-colors disabled:opacity-50 ${
        isActive ? cs.active : cs.chip
      }`}
    >
      <span>{col.emoji}</span>
      <span>{col.name}</span>
      {col.itemCount > 0 && (
        <span className="opacity-60">{col.itemCount}</span>
      )}
      {/* Delete × only shows on hover */}
      <span
        role="button"
        tabIndex={0}
        onClick={handleDelete}
        onKeyDown={(e) => e.key === "Enter" && handleDelete(e as unknown as React.MouseEvent)}
        className="ml-0.5 opacity-0 group-hover/chip:opacity-60 hover:!opacity-100 transition-opacity rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
        title="Delete collection"
      >
        <XIcon className="h-2.5 w-2.5" />
      </span>
    </button>
  );
}

// ─── Create form ─────────────────────────────────────────────────────────────

function CreateCollectionForm({
  onCreated, onCancel,
}: {
  onCreated: (col: CollectionItem) => void;
  onCancel: () => void;
}) {
  const [name,    setName]    = useState("");
  const [emoji,   setEmoji]   = useState("📁");
  const [color,   setColor]   = useState("violet");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await api.createCollection(name.trim(), emoji, color);
      onCreated(res.collection);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create collection");
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 flex-wrap p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700"
    >
      {/* Emoji picker — simple text input */}
      <input
        type="text"
        value={emoji}
        onChange={(e) => setEmoji(e.target.value.slice(-2) || "📁")}
        className="w-10 text-center text-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-1 py-1 outline-none"
        maxLength={2}
        title="Emoji"
      />

      {/* Name */}
      <input
        ref={inputRef}
        autoFocus
        type="text"
        placeholder="Collection name…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={50}
        className="flex-1 min-w-[140px] text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 dark:focus:border-violet-500 text-zinc-800 dark:text-zinc-200"
      />

      {/* Color swatches */}
      <div className="flex items-center gap-1">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={`h-4 w-4 rounded-full ${COLOR_STYLES[c].dot} transition-transform ${color === c ? "scale-125 ring-2 ring-offset-1 ring-current" : "opacity-60 hover:opacity-100"}`}
            title={c}
          />
        ))}
      </div>

      {error && <p className="w-full text-xs text-red-500">{error}</p>}

      <div className="flex items-center gap-1.5 ml-auto">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 transition-colors"
        >
          {saving ? "Creating…" : "Create"}
        </button>
      </div>
    </form>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>;
}
function XIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>;
}
