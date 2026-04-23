"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface AppShellProps {
  user: { name: string; email: string; image?: string };
  children: React.ReactNode;
}

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/search",    label: "Search",    icon: SearchIcon },
];

export default function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Desktop sidebar ──────────────────────────────────────────── */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 z-20 border-r border-neutral-200 dark:border-neutral-800 bg-background">
        {/* Brand */}
        <div className="h-14 flex items-center px-5 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-foreground">
            <span className="text-xl">🧠</span>
            BrainHistory
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="shrink-0 p-3 border-t border-neutral-200 dark:border-neutral-800 space-y-1">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <Avatar name={user.name} image={user.image} size={28} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate text-foreground">{user.name}</p>
              <p className="text-xs text-neutral-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            className="w-full text-left px-3 py-1.5 text-xs text-neutral-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ──────────────────────────────────────────── */}
      <header className="md:hidden fixed inset-x-0 top-0 h-14 z-20 flex items-center px-4 gap-4 bg-background border-b border-neutral-200 dark:border-neutral-800">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-foreground">
          <span className="text-xl">🧠</span>
          BrainHistory
        </Link>
        <div className="flex-1" />
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`text-sm font-medium transition-colors ${
              pathname.startsWith(href) ? "text-blue-600 dark:text-blue-400" : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            {label}
          </Link>
        ))}
        <button
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="text-xs text-neutral-500 hover:text-red-600 transition-colors"
        >
          Sign out
        </button>
      </header>

      {/* ── Main content ────────────────────────────────────────────── */}
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
    return <img src={image} alt={name} style={style} className="rounded-full object-cover shrink-0" />;
  }
  return (
    <div
      style={style}
      className="rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shrink-0"
      aria-hidden
    >
      <span style={{ fontSize: size * 0.45 }}>{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
