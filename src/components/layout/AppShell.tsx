"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface AppShellProps {
  user: { name: string; email: string; image?: string };
  children: React.ReactNode;
}

const NAV = [
  { href: "/dashboard", label: "Library",   icon: LibraryIcon },
  { href: "/search",    label: "AI Search",  icon: SearchIcon },
];

export default function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950">

      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 z-20 bg-white dark:bg-zinc-950 border-r border-zinc-100 dark:border-zinc-800/60">

        {/* Brand */}
        <div className="h-14 flex items-center px-5 shrink-0 border-b border-zinc-100 dark:border-zinc-800/60">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
              <BrainIcon className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">
              Brain<span className="gradient-text">History</span>
            </span>
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-0.5">
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

        {/* AI badge */}
        <div className="px-3 pb-2">
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
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
        >
          Sign out
        </button>
      </header>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="flex-1 md:ml-56 min-h-screen">
        <div className="pt-14 md:pt-0 h-full">{children}</div>
      </main>
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
    <div
      style={style}
      className="rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0"
      aria-hidden
    >
      <span style={{ fontSize: size * 0.42 }}>{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
    </svg>
  );
}
function LibraryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3L13.4 8.4L19 9L13.4 9.6L12 15L10.6 9.6L5 9L10.6 8.4L12 3Z" />
      <path opacity="0.5" d="M19 14L19.8 16.8L23 17L19.8 17.2L19 20L18.2 17.2L15 17L18.2 16.8L19 14Z" />
      <path opacity="0.5" d="M5 14L5.8 16.8L9 17L5.8 17.2L5 20L4.2 17.2L1 17L4.2 16.8L5 14Z" />
    </svg>
  );
}
