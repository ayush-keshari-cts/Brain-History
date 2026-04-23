"use client";

const TYPES = [
  { value: undefined,       label: "All",        emoji: "◈" },
  { value: "__fav__",       label: "Favourites",  emoji: "★" },
  { value: "blog",          label: "Blog",        emoji: "✦" },
  { value: "youtube_video", label: "YouTube",     emoji: "▶" },
  { value: "tweet",         label: "Tweet",       emoji: "𝕏" },
  { value: "pdf",           label: "PDF",         emoji: "⬛" },
  { value: "github",        label: "GitHub",      emoji: "⊛" },
  { value: "reddit",        label: "Reddit",      emoji: "◎" },
  { value: "website",       label: "Website",     emoji: "◉" },
  { value: "image",         label: "Image",       emoji: "⬡" },
] as const;

interface TypeFilterBarProps {
  active:   string | undefined;
  onChange: (type: string | undefined) => void;
}

export default function TypeFilterBar({ active, onChange }: TypeFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TYPES.map(({ value, label, emoji }) => {
        const isActive = active === value;
        return (
          <button
            key={label}
            onClick={() => onChange(value)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              isActive
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20 border border-transparent"
                : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:border-violet-300 dark:hover:border-violet-500/40 hover:text-violet-600 dark:hover:text-violet-400"
            }`}
          >
            <span className="text-xs">{emoji}</span>
            {label}
          </button>
        );
      })}
    </div>
  );
}
