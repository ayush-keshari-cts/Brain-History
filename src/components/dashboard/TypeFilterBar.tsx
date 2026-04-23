"use client";

const TYPES = [
  { value: undefined,       label: "All" },
  { value: "__fav__",       label: "⭐ Favourites" },
  { value: "blog",          label: "Blog" },
  { value: "youtube_video", label: "YouTube" },
  { value: "tweet",         label: "Tweet" },
  { value: "pdf",           label: "PDF" },
  { value: "github",        label: "GitHub" },
  { value: "reddit",        label: "Reddit" },
  { value: "website",       label: "Website" },
  { value: "image",         label: "Image" },
] as const;

interface TypeFilterBarProps {
  active:   string | undefined;
  onChange: (type: string | undefined) => void;
}

export default function TypeFilterBar({ active, onChange }: TypeFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {TYPES.map(({ value, label }) => {
        const isActive = active === value;
        return (
          <button
            key={label}
            onClick={() => onChange(value)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              isActive
                ? "bg-blue-600 text-white"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
