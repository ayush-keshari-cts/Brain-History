"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { Suspense, useState, useEffect, useRef } from "react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { api, type CollectionItem } from "@/lib/api-client";

interface AppShellProps {
  user: { name: string; email: string; image?: string };
  children: React.ReactNode;
}

const NAV = [
  { href: "/dashboard", label: "Library",   icon: LibraryIcon },
  { href: "/search",    label: "AI Search",  icon: SearchIcon },
  { href: "/profile",   label: "Profile",    icon: UserIcon },
];

// Optional custom emoji icons for collections (shown in popup picker only)
const COLLECTION_ICONS = [
  "⭐", "💡", "🎯", "🚀", "📝", "🎨", "🎵",
  "🎬", "🔖", "💼", "🌟", "🔬", "🏆", "🌱", "⚡",
  "🔥", "💎", "🎓", "🎁", "📊", "🧠", "🌍", "🎮",
];

// Color map for collection dots
const COLOR_DOT: Record<string, string> = {
  violet:  "bg-violet-500",
  blue:    "bg-blue-500",
  green:   "bg-green-500",
  emerald: "bg-emerald-500",
  red:     "bg-red-500",
  orange:  "bg-orange-500",
  amber:   "bg-amber-500",
  pink:    "bg-pink-500",
  sky:     "bg-sky-500",
  teal:    "bg-teal-500",
};

const COLORS = Object.keys(COLOR_DOT);

// Icon text-color classes per collection color (for the brain SVG icon)
const COLOR_ICON: Record<string, string> = {
  violet:  "text-violet-500  dark:text-violet-400",
  blue:    "text-blue-500    dark:text-blue-400",
  green:   "text-green-500   dark:text-green-400",
  emerald: "text-emerald-500 dark:text-emerald-400",
  red:     "text-red-500     dark:text-red-400",
  orange:  "text-orange-500  dark:text-orange-400",
  amber:   "text-amber-500   dark:text-amber-400",
  pink:    "text-pink-500    dark:text-pink-400",
  sky:     "text-sky-500     dark:text-sky-400",
  teal:    "text-teal-500    dark:text-teal-400",
};

// Background tint classes per collection color (for the brain icon container)
const COLOR_BG: Record<string, string> = {
  violet:  "bg-violet-50  dark:bg-violet-500/10",
  blue:    "bg-blue-50    dark:bg-blue-500/10",
  green:   "bg-green-50   dark:bg-green-500/10",
  emerald: "bg-emerald-50 dark:bg-emerald-500/10",
  red:     "bg-red-50     dark:bg-red-500/10",
  orange:  "bg-orange-50  dark:bg-orange-500/10",
  amber:   "bg-amber-50   dark:bg-amber-500/10",
  pink:    "bg-pink-50    dark:bg-pink-500/10",
  sky:     "bg-sky-50     dark:bg-sky-500/10",
  teal:    "bg-teal-50    dark:bg-teal-500/10",
};

export default function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950">

      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 z-20 bg-white dark:bg-zinc-950 border-r border-zinc-100 dark:border-zinc-800/60">

        {/* Brand */}
        <div className="h-14 flex items-center px-5 shrink-0 border-b border-zinc-100 dark:border-zinc-800/60">
          <Link href="/dashboard" className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
              <BrainIcon className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
              Brain<span className="gradient-text">History</span>
            </span>
          </Link>
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="shrink-0 ml-1 p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
          >
            {theme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
          </button>
        </div>

        {/* Nav + Collections — scrollable */}
        <div className="flex-1 overflow-y-auto flex flex-col">

          {/* Main nav */}
          <nav className="px-2.5 pt-4 pb-2 space-y-0.5 shrink-0">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                    active
                      ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? "text-violet-600 dark:text-violet-400" : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"}`} />
                  {label}
                  {active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-500 dark:bg-violet-400" />}
                </Link>
              );
            })}
          </nav>

          {/* Divider */}
          <div className="mx-4 border-t border-zinc-100 dark:border-zinc-800/60" />

          {/* Collections — only shown on dashboard */}
          {pathname.startsWith("/dashboard") && (
            <Suspense fallback={<CollectionsSkeleton />}>
              <CollectionsSideSection />
            </Suspense>
          )}
        </div>

        {/* AI badge */}
        <div className="px-3 pb-2 shrink-0">
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20">
            <SparkleIcon className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400 shrink-0" />
            <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">AI Powered</span>
          </div>
        </div>

        {/* User section */}
        <div className="shrink-0 px-2.5 py-3 border-t border-zinc-100 dark:border-zinc-800/60">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900">
            <Avatar name={user.name} image={user.image} size={28} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate text-zinc-800 dark:text-zinc-200">{user.name}</p>
              <p className="text-xs truncate text-zinc-400 dark:text-zinc-500">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            className="mt-1 w-full text-left px-3 py-1.5 text-xs rounded-xl text-zinc-400 dark:text-zinc-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all duration-150"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ─────────────────────────────────────────────── */}
      <header className="md:hidden fixed inset-x-0 top-0 h-14 z-20 flex items-center px-4 gap-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-100 dark:border-zinc-800/60">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
            <BrainIcon className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
            Brain<span className="gradient-text">History</span>
          </span>
        </Link>
        <div className="flex-1" />
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`text-sm font-medium transition-colors ${
              pathname.startsWith(href)
                ? "text-violet-600 dark:text-violet-400"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            {label}
          </Link>
        ))}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
        >
          {theme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
        </button>
        <button
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
        >
          Sign out
        </button>
      </header>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="flex-1 md:ml-60 min-h-screen">
        <div className="pt-14 md:pt-0 h-full">{children}</div>
      </main>
    </div>
  );
}

// ─── Collections sidebar section ─────────────────────────────────────────────

function CollectionsSideSection() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const activeId     = searchParams.get("collection") ?? undefined;

  const [collections,  setCollections]  = useState<CollectionItem[]>([]);
  const [showCreate,   setShowCreate]   = useState(false);
  const [loading,      setLoading]      = useState(true);

  const refresh = () => {
    api.listCollections()
      .then((r) => setCollections(r.collections))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  const navigate = (id: string | undefined) => {
    router.push(id ? `/dashboard?collection=${id}` : "/dashboard");
  };

  const handleDeleted = (id: string) => {
    setCollections((prev) => prev.filter((c) => c._id !== id));
    if (activeId === id) router.push("/dashboard");
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 py-3">
      {/* Section header */}
      <div className="flex items-center justify-between px-4 mb-1">
        <div className="flex items-center gap-1.5">
          <StackIcon className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
          <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            Collections
          </span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          title="New collection"
          className="p-1 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
        >
          <PlusIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Inline create form */}
      {showCreate && (
        <div className="px-2.5 mb-1">
          <CollectionCreateForm
            onCreated={(col) => { setCollections((prev) => [...prev, col]); setShowCreate(false); navigate(col._id); }}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2.5 space-y-0.5 min-h-0">
        {/* All library */}
        <button
          onClick={() => navigate(undefined)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all group ${
            !activeId
              ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
          }`}
        >
          <InboxStackIcon className={`h-4 w-4 shrink-0 ${!activeId ? "text-violet-500 dark:text-violet-400" : "text-zinc-400 dark:text-zinc-500"}`} />
          <span className="flex-1 truncate text-left text-sm">All saved</span>
        </button>

        {loading ? (
          <>
            {[1, 2].map((i) => (
              <div key={i} className="h-9 mx-1 rounded-xl skeleton" />
            ))}
          </>
        ) : collections.length === 0 ? (
          <p className="px-3 py-2 text-xs text-zinc-400 dark:text-zinc-500 italic">
            No collections yet
          </p>
        ) : (
          collections.map((col) => (
            <CollectionRow
              key={col._id}
              col={col}
              active={activeId === col._id}
              onSelect={() => navigate(col._id)}
              onDeleted={handleDeleted}
              onRenamed={(updated) => setCollections((prev) => prev.map((c) => c._id === updated._id ? updated : c))}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Single collection row ────────────────────────────────────────────────────

function CollectionRow({
  col, active, onSelect, onDeleted, onRenamed,
}: {
  col: CollectionItem;
  active: boolean;
  onSelect: () => void;
  onDeleted: (id: string) => void;
  onRenamed: (updated: CollectionItem) => void;
}) {
  const [editing,  setEditing]  = useState(false);
  const [name,     setName]     = useState(col.name);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showMenu]);

  const handleRename = async () => {
    if (!name.trim() || name.trim() === col.name) { setEditing(false); setName(col.name); return; }
    setRenaming(true);
    try {
      const res = await api.updateCollection(col._id, { name: name.trim() });
      onRenamed({ ...col, ...res.collection });
      setEditing(false);
    } catch { setName(col.name); setEditing(false); }
    finally { setRenaming(false); }
  };

  const handleDelete = async () => {
    setShowMenu(false);
    setDeleting(true);
    try {
      await api.deleteCollection(col._id);
      onDeleted(col._id);
    } catch { setDeleting(false); }
  };

  const iconColor = COLOR_ICON[col.color] ?? COLOR_ICON.violet;
  const iconBg    = COLOR_BG[col.color]   ?? COLOR_BG.violet;

  if (editing) {
    return (
      <div className="px-1">
        <input
          ref={inputRef}
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") { setEditing(false); setName(col.name); } }}
          disabled={renaming}
          className="w-full px-3 py-2 text-sm rounded-xl bg-white dark:bg-zinc-900 border border-violet-400 dark:border-violet-500 outline-none text-zinc-800 dark:text-zinc-200 disabled:opacity-50"
          maxLength={50}
        />
      </div>
    );
  }

  return (
    <div className={`group/row relative flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all cursor-pointer ${
      active
        ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300"
        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
    } ${deleting ? "opacity-40 pointer-events-none" : ""}`}
      onClick={onSelect}
    >
      {/* BrainHistory brand icon badge — colored per collection */}
      <div className={`shrink-0 h-6 w-6 rounded-md flex items-center justify-center ${iconBg}`}>
        {col.emoji && col.emoji !== "brain" ? (
          <span className="text-sm leading-none">{col.emoji}</span>
        ) : (
          <BrainIcon className={`h-3.5 w-3.5 ${iconColor}`} />
        )}
      </div>

      <span className="flex-1 truncate text-sm font-medium">{col.name}</span>

      {col.itemCount > 0 && (
        <span className={`text-xs tabular-nums shrink-0 ${active ? "text-violet-500/70 dark:text-violet-400/70" : "text-zinc-400 dark:text-zinc-500"}`}>
          {col.itemCount}
        </span>
      )}

      {/* ⋯ menu — appears on row hover */}
      <div
        className="relative shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity"
        ref={menuRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setShowMenu((v) => !v)}
          className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          title="Options"
        >
          <DotsIcon className="h-3.5 w-3.5" />
        </button>
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg z-50 overflow-hidden py-1">
            <button
              onClick={() => { setShowMenu(false); setEditing(true); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <PencilIcon className="h-3.5 w-3.5" /> Rename
            </button>
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            >
              <TrashIcon className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Inline create form ───────────────────────────────────────────────────────

function CollectionCreateForm({
  onCreated, onCancel,
}: {
  onCreated: (col: CollectionItem) => void;
  onCancel: () => void;
}) {
  const [name,           setName]           = useState("");
  const [icon,           setIcon]           = useState("brain"); // "brain" = use SVG logo
  const [color,          setColor]          = useState("violet");
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState("");
  const [showIconPicker, setShowIconPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close icon popup on outside click
  useEffect(() => {
    if (!showIconPicker) return;
    const h = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowIconPicker(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showIconPicker]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      // Store "brain" sentinel or the chosen emoji
      const res = await api.createCollection(name.trim(), icon === "brain" ? "brain" : icon, color);
      onCreated(res.collection);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setSaving(false);
    }
  };

  const previewBg    = COLOR_BG[color]   ?? COLOR_BG.violet;
  const previewColor = COLOR_ICON[color] ?? COLOR_ICON.violet;

  return (
    <form onSubmit={submit} className="space-y-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">

      {/* Icon button + name in one row */}
      <div className="flex items-center gap-2">

        {/* Icon preview — click to open popup */}
        <div className="relative shrink-0" ref={pickerRef}>
          <button
            type="button"
            title="Choose icon (optional)"
            onClick={() => setShowIconPicker((v) => !v)}
            className={`h-8 w-8 rounded-lg flex items-center justify-center border transition-all hover:scale-105 ${previewBg} border-zinc-200 dark:border-zinc-700`}
          >
            {icon === "brain" ? (
              <BrainIcon className={`h-4 w-4 ${previewColor}`} />
            ) : (
              <span className="text-base leading-none">{icon}</span>
            )}
          </button>

          {/* Icon popup */}
          {showIconPicker && (
            <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl p-2 w-52">
              <p className="text-xs text-zinc-400 dark:text-zinc-500 px-1 pb-1.5">Choose an icon</p>
              <div className="grid grid-cols-6 gap-1">
                {/* Brain logo option (first) */}
                <button
                  type="button"
                  onClick={() => { setIcon("brain"); setShowIconPicker(false); }}
                  className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${icon === "brain" ? "bg-violet-100 dark:bg-violet-500/20 ring-2 ring-violet-400" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`}
                  title="BrainHistory logo"
                >
                  <BrainIcon className={`h-4 w-4 ${previewColor}`} />
                </button>
                {/* Emoji options */}
                {COLLECTION_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => { setIcon(ic); setShowIconPicker(false); }}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center text-base transition-all ${icon === ic ? "bg-violet-100 dark:bg-violet-500/20 ring-2 ring-violet-400" : "hover:bg-zinc-100 dark:hover:bg-zinc-700"}`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Name */}
        <input
          autoFocus
          type="text"
          placeholder="Collection name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          className="flex-1 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 outline-none focus:border-violet-400 dark:focus:border-violet-500 text-zinc-800 dark:text-zinc-200"
        />
      </div>

      {/* Color swatches */}
      <div className="flex items-center gap-1.5 px-0.5">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={`h-3.5 w-3.5 rounded-full ${COLOR_DOT[c]} transition-transform ${color === c ? "scale-125 ring-2 ring-offset-1 ring-white dark:ring-zinc-800" : "opacity-50 hover:opacity-80"}`}
          />
        ))}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-1.5">
        <button type="button" onClick={onCancel}
          className="flex-1 py-1.5 text-xs font-medium rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving || !name.trim()}
          className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 transition-colors">
          {saving ? "…" : "Create"}
        </button>
      </div>
    </form>
  );
}

function CollectionsSkeleton() {
  return (
    <div className="px-2.5 py-3 space-y-1">
      {[1, 2].map((i) => <div key={i} className="h-9 rounded-xl skeleton" />)}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ name, image, size }: { name: string; image?: string; size: number }) {
  const style = { width: size, height: size };
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={name} style={style} className="rounded-full object-cover ring-2 ring-violet-500/30 shrink-0" />;
  }
  return (
    <div style={style} className="rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0" aria-hidden>
      <span style={{ fontSize: size * 0.42 }}>{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}

function BrainIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" /></svg>;
}
function LibraryIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>;
}
function SearchIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
}
function UserIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
}
function SparkleIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L13.4 8.4L19 9L13.4 9.6L12 15L10.6 9.6L5 9L10.6 8.4L12 3Z" /><path opacity="0.5" d="M19 14L19.8 16.8L23 17L19.8 17.2L19 20L18.2 17.2L15 17L18.2 16.8L19 14Z" /><path opacity="0.5" d="M5 14L5.8 16.8L9 17L5.8 17.2L5 20L4.2 17.2L1 17L4.2 16.8L5 14Z" /></svg>;
}
function SunIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
}
function MoonIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
}

// Modern "stack/layers" icon for Collections section header
function StackIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6 6.878V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 004.5 9v.878m13.5-3A2.25 2.25 0 0119.5 9v.878m0 0a2.25 2.25 0 00-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0121 12v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6c0-.98.626-1.813 1.5-2.122" /></svg>;
}
function PlusIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
}
function DotsIcon({ className }: { className?: string }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>;
}
function PencilIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
}
function TrashIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
}
// "All saved" icon — inbox with down arrow (Heroicons inbox-stack)
function InboxStackIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7.875 14.25l1.214 1.942a2.25 2.25 0 001.908 1.058h2.006c.776 0 1.497-.4 1.908-1.058l1.214-1.942M2.41 9h4.636a2.25 2.25 0 011.872 1.002l.164.246a2.25 2.25 0 001.872 1.002h2.092a2.25 2.25 0 001.872-1.002l.164-.246A2.25 2.25 0 0116.954 9h4.636M2.41 9a2.25 2.25 0 00-.16.832V12a2.25 2.25 0 002.25 2.25h15a2.25 2.25 0 002.25-2.25V9.832c0-.287-.055-.57-.16-.832M2.41 9a2.25 2.25 0 01.382-.632l3.285-3.832a2.25 2.25 0 011.708-.786h8.43c.657 0 1.281.287 1.709.786l3.284 3.832c.163.19.291.404.382.632M4.5 20.25h15A2.25 2.25 0 0021.75 18v-2.625c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125V18a2.25 2.25 0 002.25 2.25z" /></svg>;
}
