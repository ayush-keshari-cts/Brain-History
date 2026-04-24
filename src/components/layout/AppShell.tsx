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

const NAV_PRIMARY = [
  { href: "/dashboard", label: "Library",  icon: LibraryIcon             },
  { href: "/search",    label: "AI Search", icon: SparkleIcon, tag: "AI" },
];
const NAV_SECONDARY = [
  { href: "/profile",   label: "Profile",  icon: UserIcon                },
];
// combined for mobile header
const NAV = [...NAV_PRIMARY, ...NAV_SECONDARY];

// Gradient per collection color for the sidebar dot
const COL_GRAD: Record<string, string> = {
  violet:  "linear-gradient(135deg,#7C3AED,#A78BFA)",
  blue:    "linear-gradient(135deg,#1D4ED8,#60A5FA)",
  green:   "linear-gradient(135deg,#059669,#34D399)",
  emerald: "linear-gradient(135deg,#047857,#10B981)",
  red:     "linear-gradient(135deg,#B91C1C,#FCA5A5)",
  orange:  "linear-gradient(135deg,#C2410C,#FB923C)",
  amber:   "linear-gradient(135deg,#B45309,#FCD34D)",
  pink:    "linear-gradient(135deg,#BE185D,#F9A8D4)",
  sky:     "linear-gradient(135deg,#0369A1,#7DD3FC)",
  teal:    "linear-gradient(135deg,#0F766E,#5EEAD4)",
};

export default function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  // Initials for avatar
  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-[#0B0B0F]">

      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden md:flex md:w-[252px] md:flex-col md:fixed md:inset-y-0 z-20
                        bg-white dark:bg-[#111116]
                        border-r border-zinc-100 dark:border-white/[0.06]">

        {/* Brand */}
        <div className="h-14 flex items-center px-4 shrink-0 border-b border-zinc-100 dark:border-white/[0.06]">
          <Link href="/dashboard" className="flex items-center gap-2.5 flex-1 min-w-0">
            <LogoMark />
            <span className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-[#F5F5F7] truncate">
              Brain<span className="font-normal dark:opacity-65">History</span>
            </span>
          </Link>
          <button
            onClick={toggleTheme}
            title={isDark ? "Light mode" : "Dark mode"}
            className="shrink-0 ml-1 p-1.5 rounded-lg text-zinc-400 dark:text-white/40
                       hover:text-zinc-700 dark:hover:text-white/80
                       hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-all"
          >
            {isDark ? <SunIcon className="h-3.5 w-3.5" /> : <MoonIcon className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Scrollable nav area */}
        <div className="flex-1 overflow-y-auto flex flex-col py-3 gap-1">

          {/* Search trigger */}
          <div className="px-3 mb-1">
            <Link
              href="/search"
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl
                         bg-zinc-100 dark:bg-[#16161D]
                         border border-zinc-200 dark:border-white/[0.06]
                         text-zinc-500 dark:text-white/40
                         hover:border-zinc-300 dark:hover:border-white/[0.10]
                         hover:text-zinc-700 dark:hover:text-white/70
                         transition-all text-xs"
            >
              <SearchIcon className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <span className="flex-1">Search or ask anything</span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded
                              bg-white dark:bg-white/[0.04]
                              border border-zinc-200 dark:border-white/[0.06]
                              text-zinc-400 dark:text-white/25">⌘K</kbd>
            </Link>
          </div>

          {/* Workspace label */}
          <div className="px-4 py-1">
            <span className="text-[10.5px] font-medium tracking-widest uppercase
                             text-zinc-400 dark:text-white/25">Workspace</span>
          </div>

          {/* Main nav — Suspense for useSearchParams (Starred active state) */}
          <Suspense fallback={<MainNavFallback pathname={pathname} />}>
            <MainNav pathname={pathname} />
          </Suspense>

          {/* Divider */}
          <div className="mx-4 my-2 border-t border-zinc-100 dark:border-white/[0.06]" />

          {/* Collections — only on dashboard */}
          {pathname.startsWith("/dashboard") && (
            <Suspense fallback={<CollectionsSkeleton />}>
              <CollectionsSideSection />
            </Suspense>
          )}
        </div>

        {/* User section */}
        <div className="shrink-0 px-3 py-3 border-t border-zinc-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl
                          hover:bg-zinc-50 dark:hover:bg-white/[0.04] transition-all cursor-pointer"
               onClick={() => signOut({ callbackUrl: "/auth/signin" })}
               title="Sign out"
          >
            <Avatar name={user.name} image={user.image} initials={initials} size={28} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate text-zinc-800 dark:text-[#F5F5F7]">{user.name}</p>
              <p className="text-[10px] truncate text-zinc-400 dark:text-white/40 font-mono">{user.email}</p>
            </div>
            <ChevronIcon className="h-3.5 w-3.5 text-zinc-300 dark:text-white/20 shrink-0" />
          </div>
        </div>
      </aside>

      {/* ── Mobile top bar ─────────────────────────────────────────────── */}
      <header className="md:hidden fixed inset-x-0 top-0 h-14 z-20 flex items-center px-4 gap-4
                         bg-white/90 dark:bg-[#111116]/90 backdrop-blur-sm
                         border-b border-zinc-100 dark:border-white/[0.06]">
        <Link href="/dashboard" className="flex items-center gap-2">
          <LogoMark size={24} />
          <span className="font-semibold text-sm text-zinc-900 dark:text-[#F5F5F7]">
            Brain<span className="font-normal dark:opacity-65">History</span>
          </span>
        </Link>
        <div className="flex-1" />
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`text-xs font-medium transition-colors ${
              pathname.startsWith(href)
                ? "text-violet-600 dark:text-[#9B7BFF]"
                : "text-zinc-500 dark:text-white/50 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            {label}
          </Link>
        ))}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg text-zinc-400 dark:text-white/40
                     hover:text-zinc-700 dark:hover:text-white
                     hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-all"
        >
          {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
        </button>
      </header>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="flex-1 md:ml-[252px] min-h-screen">
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

  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [showCreate,  setShowCreate]  = useState(false);
  const [loading,     setLoading]     = useState(true);

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
    window.dispatchEvent(new CustomEvent("collections-changed"));
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Section header */}
      <div className="flex items-center justify-between px-4 mb-1">
        <span className="text-[10.5px] font-medium tracking-widest uppercase
                         text-zinc-400 dark:text-white/25">Collections</span>
        <button
          onClick={() => setShowCreate(true)}
          title="New collection"
          className="p-1 rounded-lg text-zinc-400 dark:text-white/30
                     hover:text-violet-600 dark:hover:text-[#9B7BFF]
                     hover:bg-violet-50 dark:hover:bg-[rgba(124,92,255,0.1)] transition-colors"
        >
          <PlusIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-0.5 min-h-0">

        {/* Inline create form */}
        {showCreate && (
          <InlineCreateForm
            onCreated={(col) => {
              setCollections((prev) => [...prev, col]);
              setShowCreate(false);
              navigate(col._id);
              window.dispatchEvent(new CustomEvent("collections-changed"));
            }}
            onCancel={() => setShowCreate(false)}
          />
        )}

        {/* All saved */}
        <button
          onClick={() => navigate(undefined)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all relative group ${
            !activeId
              ? "bg-violet-50 dark:bg-[rgba(124,92,255,0.12)] text-violet-700 dark:text-[#F5F5F7]"
              : "text-zinc-500 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
          }`}
        >
          {!activeId && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4
                             bg-violet-600 dark:bg-[#7C5CFF] rounded-r-full" />
          )}
          <InboxIcon className={`h-4 w-4 shrink-0 ${!activeId ? "text-violet-500 dark:text-[#9B7BFF]" : "text-zinc-400 dark:text-white/40"}`} />
          <span className="flex-1 truncate text-left">All saved</span>
        </button>

        {loading ? (
          <>{[1, 2].map((i) => <div key={i} className="h-9 mx-1 rounded-xl skeleton" />)}</>
        ) : collections.length === 0 ? (
          <p className="px-3 py-2 text-xs text-zinc-400 dark:text-white/25 italic">No collections yet</p>
        ) : (
          [...collections].sort((a, b) => (b.itemCount ?? 0) - (a.itemCount ?? 0)).map((col) => (
            <CollectionRow
              key={col._id}
              col={col}
              active={activeId === col._id}
              onSelect={() => navigate(col._id)}
              onDeleted={handleDeleted}
              onRenamed={(updated) => {
                setCollections((prev) => prev.map((c) => c._id === updated._id ? updated : c));
                window.dispatchEvent(new CustomEvent("collections-changed"));
              }}
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
  const menuRef = useRef<HTMLDivElement>(null);

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

  const dotGrad = COL_GRAD[col.color] ?? COL_GRAD.violet;

  if (editing) {
    return (
      <div className="px-1">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") { setEditing(false); setName(col.name); }
          }}
          disabled={renaming}
          maxLength={50}
          className="w-full px-3 py-2 text-sm rounded-xl
                     bg-white dark:bg-[#16161D]
                     border border-violet-400 dark:border-[#7C5CFF]
                     outline-none text-zinc-800 dark:text-[#F5F5F7] disabled:opacity-50"
        />
      </div>
    );
  }

  return (
    <div
      className={`group/row relative flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all cursor-pointer ${
        active
          ? "bg-violet-50 dark:bg-[rgba(124,92,255,0.12)] text-violet-700 dark:text-[#F5F5F7]"
          : "text-zinc-500 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
      } ${deleting ? "opacity-40 pointer-events-none" : ""}`}
      onClick={onSelect}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4
                         bg-violet-600 dark:bg-[#7C5CFF] rounded-r-full" />
      )}

      {/* Gradient color dot */}
      <span
        className="shrink-0 h-2 w-2 rounded-[3px]"
        style={{ background: dotGrad }}
      />

      <span className="flex-1 truncate text-[13px] font-medium">{col.name}</span>

      {col.itemCount > 0 && (
        <span className={`font-mono text-[11px] shrink-0 tabular-nums ${
          active ? "text-violet-500/70 dark:text-[#9B7BFF]/70" : "text-zinc-400 dark:text-white/30"
        }`}>
          {col.itemCount}
        </span>
      )}

      {/* ⋯ menu */}
      <div
        className="relative shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity"
        ref={menuRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setShowMenu((v) => !v)}
          className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-white/[0.08] transition-colors"
        >
          <DotsIcon className="h-3.5 w-3.5" />
        </button>
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 w-36
                          bg-white dark:bg-[#1C1C25]
                          border border-zinc-200 dark:border-white/[0.08]
                          rounded-xl shadow-lg z-50 overflow-hidden py-1">
            <button
              onClick={() => { setShowMenu(false); setEditing(true); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs
                         text-zinc-700 dark:text-white/70
                         hover:bg-zinc-50 dark:hover:bg-white/[0.06] transition-colors"
            >
              <PencilIcon className="h-3.5 w-3.5" /> Rename
            </button>
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs
                         text-red-600 dark:text-red-400
                         hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
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

function InlineCreateForm({
  onCreated, onCancel,
}: {
  onCreated: (col: CollectionItem) => void;
  onCancel: () => void;
}) {
  const [name,   setName]   = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = async () => {
    if (!name.trim()) { onCancel(); return; }
    if (saving) return;
    setSaving(true);
    try {
      const res = await api.createCollection(name.trim(), "brain", "violet");
      onCreated(res.collection);
    } catch { setSaving(false); }
  };

  return (
    <div className="px-1 pb-0.5">
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl
                      bg-violet-50 dark:bg-[rgba(124,92,255,0.10)]
                      border border-violet-200 dark:border-[rgba(124,92,255,0.25)]">
        <span className="shrink-0 h-2 w-2 rounded-[3px]"
              style={{ background: "linear-gradient(135deg,#7C3AED,#A78BFA)" }} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Collection name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") onCancel();
          }}
          onBlur={() => { if (!saving) submit(); }}
          disabled={saving}
          maxLength={50}
          className="flex-1 min-w-0 bg-transparent text-sm
                     text-zinc-800 dark:text-[#F5F5F7]
                     placeholder-zinc-400 dark:placeholder-white/30
                     outline-none disabled:opacity-50"
        />
      </div>
    </div>
  );
}

function CollectionsSkeleton() {
  return (
    <div className="px-2 py-1 space-y-1">
      {[1, 2].map((i) => <div key={i} className="h-9 rounded-xl skeleton" />)}
    </div>
  );
}

// ─── Main nav (needs useSearchParams for Starred active state) ────────────────

function MainNav({ pathname }: { pathname: string }) {
  const searchParams    = useSearchParams();
  const isStarredActive = pathname === "/dashboard" && searchParams.get("type") === "__fav__";
  return <NavItems pathname={pathname} isStarredActive={isStarredActive} />;
}

function MainNavFallback({ pathname }: { pathname: string }) {
  // Renders without search-param knowledge — Library always active on /dashboard, Starred never active
  return <NavItems pathname={pathname} isStarredActive={false} />;
}

function NavItems({ pathname, isStarredActive }: { pathname: string; isStarredActive: boolean }) {
  return (
    <nav className="px-2 space-y-0.5">
      {/* Primary: Library + AI Search */}
      {NAV_PRIMARY.map(({ href, label, icon: Icon, tag }) => {
        const active = href === "/dashboard"
          ? (pathname === href || pathname.startsWith(href)) && !isStarredActive
          : pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 group ${
              active
                ? "bg-violet-50 dark:bg-[var(--bh-brand-soft,rgba(124,92,255,0.12))] text-violet-700 dark:text-[#F5F5F7]"
                : "text-zinc-500 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
            }`}
          >
            {active && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4
                               bg-violet-600 dark:bg-[#7C5CFF] rounded-r-full" />
            )}
            <Icon className={`h-4 w-4 shrink-0 ${
              active
                ? "text-violet-600 dark:text-[#9B7BFF]"
                : "text-zinc-400 dark:text-white/40 group-hover:text-zinc-600 dark:group-hover:text-white/70"
            }`} />
            <span className="flex-1 truncate">{label}</span>
            {tag && (
              <span className="font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded-[3px]
                               bg-violet-100 dark:bg-[rgba(124,92,255,0.15)]
                               text-violet-700 dark:text-[#9B7BFF]
                               border border-violet-200 dark:border-[rgba(124,92,255,0.25)]
                               tracking-wide uppercase">{tag}</span>
            )}
          </Link>
        );
      })}

      {/* Starred — below AI Search */}
      <Link
        href="/dashboard?type=__fav__"
        className={`relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 group ${
          isStarredActive
            ? "bg-violet-50 dark:bg-[var(--bh-brand-soft,rgba(124,92,255,0.12))] text-violet-700 dark:text-[#F5F5F7]"
            : "text-zinc-500 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
        }`}
      >
        {isStarredActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4
                           bg-violet-600 dark:bg-[#7C5CFF] rounded-r-full" />
        )}
        <StarIcon className={`h-4 w-4 shrink-0 ${
          isStarredActive
            ? "text-violet-600 dark:text-[#9B7BFF]"
            : "text-zinc-400 dark:text-white/40 group-hover:text-zinc-600 dark:group-hover:text-white/70"
        }`} />
        <span className="flex-1 truncate">Starred</span>
      </Link>

      {/* Secondary: Profile */}
      {NAV_SECONDARY.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 group ${
              active
                ? "bg-violet-50 dark:bg-[var(--bh-brand-soft,rgba(124,92,255,0.12))] text-violet-700 dark:text-[#F5F5F7]"
                : "text-zinc-500 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
            }`}
          >
            {active && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4
                               bg-violet-600 dark:bg-[#7C5CFF] rounded-r-full" />
            )}
            <Icon className={`h-4 w-4 shrink-0 ${
              active
                ? "text-violet-600 dark:text-[#9B7BFF]"
                : "text-zinc-400 dark:text-white/40 group-hover:text-zinc-600 dark:group-hover:text-white/70"
            }`} />
            <span className="flex-1 truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, image, initials, size }: { name: string; image?: string; initials: string; size: number }) {
  const style = { width: size, height: size };
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={name} style={style}
                className="rounded-full object-cover ring-2 ring-violet-500/20 shrink-0" />;
  }
  return (
    <div style={{ ...style, fontSize: size * 0.38 }}
         className="rounded-full bg-gradient-to-br from-amber-400 to-pink-500
                    flex items-center justify-center text-white font-semibold shrink-0
                    shadow-sm ring-1 ring-black/5"
         aria-hidden>
      {initials}
    </div>
  );
}

// ─── Logo mark ────────────────────────────────────────────────────────────────

function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className="shrink-0">
      <defs>
        <linearGradient id="lm-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9B7BFF" />
          <stop offset="100%" stopColor="#5B3FD9" />
        </linearGradient>
        <linearGradient id="lm-shine" x1="0" y1="0" x2="0" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255,255,255,0.20)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#lm-g)" />
      <rect width="32" height="32" rx="8" fill="url(#lm-shine)" />
      <path
        d="M10 7L10 25M10 7C17 7 22 9.5 22 13C22 15 20.5 16 18 16C21 16 23 17.5 23 20C23 23 19 25 10 25"
        stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx="10" cy="16" r="1.4" fill="white" />
    </svg>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function LibraryIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5v-15A2.5 2.5 0 016.5 2H20v20H6.5a2.5 2.5 0 010-5H20"/></svg>;
}
function SparkleIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L13.4 8.4L19 9L13.4 9.6L12 15L10.6 9.6L5 9L10.6 8.4L12 3Z"/><path opacity=".45" d="M19 14L19.8 16.8L23 17L19.8 17.2L19 20L18.2 17.2L15 17L18.2 16.8L19 14ZM5 14L5.8 16.8L9 17L5.8 17.2L5 20L4.2 17.2L1 17L4.2 16.8L5 14Z"/></svg>;
}
function UserIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>;
}
function SearchIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/></svg>;
}
function SunIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>;
}
function MoonIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>;
}
function PlusIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>;
}
function DotsIcon({ className }: { className?: string }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>;
}
function PencilIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>;
}
function TrashIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>;
}
function InboxIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7.875 14.25l1.214 1.942a2.25 2.25 0 001.908 1.058h2.006c.776 0 1.497-.4 1.908-1.058l1.214-1.942M2.41 9h4.636a2.25 2.25 0 011.872 1.002l.164.246a2.25 2.25 0 001.872 1.002h2.092a2.25 2.25 0 001.872-1.002l.164-.246A2.25 2.25 0 0116.954 9h4.636M2.41 9a2.25 2.25 0 00-.16.832V12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 12V9.832c0-.287-.055-.57-.16-.832M2.41 9a2.25 2.25 0 01.382-.632l3.285-3.832a2.25 2.25 0 011.708-.786h8.43c.657 0 1.281.287 1.709.786l3.284 3.832c.163.19.291.404.382.632M4.5 20.25h15A2.25 2.25 0 0021.75 18v-2.625c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125V18a2.25 2.25 0 002.25 2.25z"/></svg>;
}
function ChevronIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="6 9 12 15 18 9"/></svg>;
}
function StarIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/></svg>;
}
