import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import CredentialsForm from "./CredentialsForm";

export const metadata = { title: "Sign In — BrainHistory" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/dashboard");

  const { callbackUrl, error } = await searchParams;
  const callbackOrDefault = callbackUrl ?? "/dashboard";

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(139,92,246,0.15) 0%, transparent 65%)" }}
      />
      <div className="absolute inset-0 dot-bg opacity-30 pointer-events-none" />

      {/* Two-column card */}
      <div className="relative w-full max-w-3xl flex flex-col md:flex-row rounded-2xl overflow-hidden shadow-2xl shadow-black/10 dark:shadow-black/50 border border-zinc-200 dark:border-zinc-700">

        {/* Gradient accent line across the very top */}
        <div
          className="absolute top-0 inset-x-0 h-px z-10"
          style={{ background: "linear-gradient(90deg, transparent 5%, rgba(139,92,246,0.6) 40%, rgba(99,102,241,0.6) 60%, transparent 95%)" }}
        />

        {/* ── LEFT — Brand + OAuth ──────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-6 p-8 bg-white dark:bg-zinc-900 md:border-r border-b md:border-b-0 border-zinc-100 dark:border-zinc-800">

          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
                <BrainIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
                  Brain<span className="gradient-text">History</span>
                </h1>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">AI-powered knowledge library</p>
              </div>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Save anything from the web. Search and chat with your saved content using AI.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Vector Search",  icon: "◈" },
              { label: "AI Chat",        icon: "✦" },
              { label: "Any URL",        icon: "◉" },
              { label: "File Upload",    icon: "⬛" },
            ].map(({ label, icon }) => (
              <span key={label} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-100 dark:border-violet-500/20">
                <span className="text-xs opacity-70">{icon}</span>
                {label}
              </span>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
              {error === "OAuthAccountNotLinked"
                ? "Email already linked to another provider."
                : "Sign-in failed. Please try again."}
            </div>
          )}

          {/* OAuth buttons */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Continue with
            </p>
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: callbackOrDefault });
              }}
            >
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 rounded-xl py-3 text-sm font-medium text-zinc-700 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-violet-300 dark:hover:border-violet-500/40 hover:bg-white dark:hover:bg-zinc-700/60 transition-all"
              >
                <GoogleIcon />
                Google
              </button>
            </form>

            <form
              action={async () => {
                "use server";
                await signIn("github", { redirectTo: callbackOrDefault });
              }}
            >
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 rounded-xl py-3 text-sm font-medium text-zinc-700 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-violet-300 dark:hover:border-violet-500/40 hover:bg-white dark:hover:bg-zinc-700/60 transition-all"
              >
                <GitHubIcon />
                GitHub
              </button>
            </form>
          </div>

          <p className="mt-auto text-xs text-zinc-400 dark:text-zinc-500">
            Your content is private and only visible to you.
          </p>
        </div>

        {/* ── RIGHT — Email + Password ──────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-6 p-8 bg-zinc-50/80 dark:bg-zinc-950">

          {/* Heading */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 flex items-center justify-center shrink-0">
                <LockIcon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Sign in with Password
              </h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 pl-10.5">
              Use your email and the password you set in your profile.
            </p>
          </div>

          {/* Credentials form (client component) */}
          <CredentialsForm callbackUrl={callbackOrDefault} />

          {/* Tip */}
          <div className="rounded-xl px-4 py-3 bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 space-y-1">
            <p className="text-xs font-medium text-violet-700 dark:text-violet-400">
              First time here?
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Sign in with Google or GitHub first, then go to{" "}
              <a href="/profile" className="text-violet-600 dark:text-violet-400 hover:underline font-medium">
                Profile → Set Password
              </a>{" "}
              to enable email sign-in.
            </p>
          </div>

          <p className="mt-auto text-xs text-zinc-400 dark:text-zinc-500 text-center">
            Passwords are hashed and never stored in plain text.
          </p>
        </div>
      </div>
    </main>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
    </svg>
  );
}
function LockIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
}
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ height: "1.125rem", width: "1.125rem" }} className="shrink-0">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ height: "1.125rem", width: "1.125rem" }} className="shrink-0 fill-current text-zinc-800 dark:text-zinc-200">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}
