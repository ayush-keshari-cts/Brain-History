"use client";

// Full label + emoji map for every content type the app can produce.
// Only types that exist in the user's library will be rendered.
const TYPE_META: Record<string, { label: string; emoji: string }> = {
  blog:          { label: "Blog",          emoji: "✦"  },
  website:       { label: "Website",       emoji: "◉"  },
  youtube_video: { label: "YouTube",       emoji: "▶"  },
  youtube_music: { label: "YT Music",      emoji: "♪"  },
  tweet:         { label: "Tweet",         emoji: "𝕏"  },
  reddit:        { label: "Reddit",        emoji: "◎"  },
  linkedin:      { label: "LinkedIn",      emoji: "in" },
  instagram:     { label: "Instagram",     emoji: "◈"  },
  tiktok:        { label: "TikTok",        emoji: "♬"  },
  spotify:       { label: "Spotify",       emoji: "♫"  },
  audio:         { label: "Audio",         emoji: "♫"  },
  video:         { label: "Video",         emoji: "▶"  },
  pdf:           { label: "PDF",           emoji: "⬛" },
  image:         { label: "Image",         emoji: "⬡"  },
  screenshot:    { label: "Screenshot",    emoji: "⬡"  },
  github:        { label: "GitHub",        emoji: "⊛"  },
  note:          { label: "Note",          emoji: "✎"  },
  unknown:       { label: "Other",         emoji: "◇"  },
};

export interface AvailableType {
  value: string;
  count: number;
}

interface TypeFilterBarProps {
  active:         string | undefined;
  onChange:       (type: string | undefined) => void;
  availableTypes: AvailableType[];
  hasFavourites:  boolean;
  total?:         number;
}

export default function TypeFilterBar({
  active, onChange, availableTypes, hasFavourites, total,
}: TypeFilterBarProps) {
  // Don't render the bar at all when there's nothing to filter
  if (availableTypes.length === 0 && !hasFavourites) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {/* All — always present */}
      <Chip
        label="All saved"
        emoji="◈"
        active={active === undefined}
        onClick={() => onChange(undefined)}
        count={total}
      />

      {/* Favourites — only if user has some */}
      {hasFavourites && (
        <Chip
          label="Favourites"
          emoji="★"
          active={active === "__fav__"}
          onClick={() => onChange("__fav__")}
        />
      )}

      {/* One chip per content type the user actually has */}
      {availableTypes.map(({ value, count }) => {
        const meta = TYPE_META[value];
        if (!meta) return null; // unknown / future type
        return (
          <Chip
            key={value}
            label={meta.label}
            emoji={meta.emoji}
            active={active === value}
            onClick={() => onChange(value)}
            count={count}
          />
        );
      })}
    </div>
  );
}

function Chip({
  label, emoji, active, onClick, count,
}: {
  label:   string;
  emoji:   string;
  active:  boolean;
  onClick: () => void;
  count?:  number;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
        active
          ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20 border border-transparent"
          : "bg-white dark:bg-[#16161D] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.08] hover:border-violet-400/50 dark:hover:border-violet-500/40 hover:text-violet-600 dark:hover:text-violet-400"
      }`}
    >
      <span>{emoji}</span>
      {label}
      {count !== undefined && (
        <span className={`px-1.5 py-px rounded-md text-[10px] leading-none font-semibold ${
          active
            ? "bg-white/20 text-white"
            : "bg-zinc-100 dark:bg-white/[0.06] text-zinc-500 dark:text-zinc-400"
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}
