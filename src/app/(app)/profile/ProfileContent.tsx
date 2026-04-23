"use client";

import { useState } from "react";
import { useTheme } from "@/components/providers/ThemeProvider";

interface Props {
  name:        string;
  email:       string;
  image?:      string;
  providers:   string[];
  hasPassword: boolean;
  joinedAt:    string;
}

const PROVIDER_LABEL: Record<string, string> = {
  google: "Google",
  github: "GitHub",
};

export default function ProfileContent({ name, email, image, providers, hasPassword: initialHasPassword, joinedAt }: Props) {
  const { theme, setTheme }  = useTheme();
  const [hasPassword, setHasPassword] = useState(initialHasPassword);

  // Password form state
  const [currentPw,  setCurrentPw]  = useState("");
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [pwLoading,  setPwLoading]  = useState(false);
  const [pwError,    setPwError]    = useState<string | null>(null);
  const [pwSuccess,  setPwSuccess]  = useState<string | null>(null);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null); setPwSuccess(null);

    if (newPw !== confirmPw) { setPwError("New passwords do not match"); return; }
    if (newPw.length < 8)    { setPwError("Password must be at least 8 characters"); return; }

    setPwLoading(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPw, currentPassword: hasPassword ? currentPw : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update password");
      setPwSuccess(hasPassword ? "Password changed successfully" : "Password set! You can now sign in with email & password.");
      setHasPassword(true);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setPwLoading(false);
    }
  };

  const joined = new Date(joinedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

      {/* Page title */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Profile
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Manage your account and security settings.
        </p>
      </div>

      {/* ── Identity card ────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 flex items-center gap-5">
        <Avatar name={name} image={image} size={64} />
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate">{name}</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{email}</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Member since {joined}</p>
        </div>
        <div className="shrink-0 hidden sm:flex flex-col items-end gap-1.5">
          {providers.map((p) => (
            <span key={p} className="text-xs px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-100 dark:border-violet-500/20 font-medium">
              {PROVIDER_LABEL[p] ?? p}
            </span>
          ))}
          {hasPassword && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 font-medium">
              Password
            </span>
          )}
        </div>
      </div>

      {/* ── Theme preference ─────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 flex items-center justify-center shrink-0">
            <PaletteIcon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Appearance</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Choose your preferred colour theme</p>
          </div>
        </div>
        <div className="flex gap-3">
          {(["light", "dark"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                theme === t
                  ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/30 shadow-sm"
                  : "bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-violet-200 dark:hover:border-violet-500/30"
              }`}
            >
              {t === "light" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
              {t === "light" ? "Light" : "Dark"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Security / Password ──────────────────────────────────────── */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 flex items-center justify-center shrink-0">
            <LockIcon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {hasPassword ? "Change Password" : "Set a Password"}
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              {hasPassword
                ? "Update your password for email sign-in"
                : "Add a password to sign in with your email address"}
            </p>
          </div>
          {hasPassword && (
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
              Set
            </span>
          )}
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          {hasPassword && (
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="Enter current password"
                required={hasPassword}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 dark:focus:border-violet-500 transition-all"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
              {hasPassword ? "New Password" : "Password"}
            </label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="At least 8 characters"
              required
              className="w-full px-3 py-2.5 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 dark:focus:border-violet-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
              Confirm {hasPassword ? "New " : ""}Password
            </label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Repeat the password"
              required
              className="w-full px-3 py-2.5 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 dark:focus:border-violet-500 transition-all"
            />
          </div>

          {pwError && (
            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" /> {pwError}
            </p>
          )}
          {pwSuccess && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" /> {pwSuccess}
            </p>
          )}

          <button
            type="submit"
            disabled={pwLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20"
          >
            {pwLoading
              ? <><span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Saving…</>
              : <><LockIcon className="h-4 w-4" /> {hasPassword ? "Change Password" : "Set Password"}</>
            }
          </button>
        </form>
      </div>

      {/* ── Linked Accounts ──────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 flex items-center justify-center shrink-0">
            <LinkIcon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Linked Accounts</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">OAuth providers connected to your account</p>
          </div>
        </div>
        <div className="space-y-2">
          {(["google", "github"] as const).map((p) => {
            const linked = providers.includes(p);
            return (
              <div key={p} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700">
                <div className="h-7 w-7 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 flex items-center justify-center shrink-0">
                  {p === "google" ? <GoogleIcon /> : <GitHubIcon />}
                </div>
                <span className="flex-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {PROVIDER_LABEL[p]}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  linked
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20"
                    : "bg-zinc-100 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-600"
                }`}>
                  {linked ? "Connected" : "Not linked"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

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
    <div style={style} className="rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0">
      <span style={{ fontSize: size * 0.38 }}>{name.charAt(0).toUpperCase()}</span>
    </div>
  );
}

function LockIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
}
function LinkIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>;
}
function PaletteIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>;
}
function SunIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
}
function MoonIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
}
function GoogleIcon() {
  return <svg viewBox="0 0 24 24" style={{ height: "1rem", width: "1rem" }} aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>;
}
function GitHubIcon() {
  return <svg viewBox="0 0 24 24" style={{ height: "1rem", width: "1rem" }} className="fill-current text-zinc-800 dark:text-zinc-200" aria-hidden="true">
    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
  </svg>;
}
