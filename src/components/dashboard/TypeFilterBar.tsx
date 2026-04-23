"use client";

const TYPES = [
  { value: undefined,       label: "All",       emoji: "◈" },
  { value: "__fav__",       label: "Favourites", emoji: "★" },
  { value: "blog",          label: "Blog",       emoji: "✦" },
  { value: "youtube_video", label: "YouTube",    emoji: "▶" },
  { value: "tweet",         label: "Tweet",      emoji: "𝕏" },
  { value: "pdf",           label: "PDF",        emoji: "⬛" },
  { value: "github",        label: "GitHub",     emoji: "⊛" },
  { value: "reddit",        label: "Reddit",     emoji: "◎" },
  { value: "website",       label: "Website",    emoji: "◉" },
  { value: "image",         label: "Image",      emoji: "⬡" },
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
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20"
                : "hover:text-foreground"
            }`}
            style={isActive ? {} : {
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--muted)",
            }}
          >
            <span className="text-xs">{emoji}</span>
            {label}
          </button>
        );
      })}
    </div>
  );
}
