import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

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
      {/* Radial gradient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(139,92,246,0.18) 0%, transparent 60%)" }}
      />

      {/* Dot grid */}
      <div className="absolute inset-0 dot-bg opacity-40 pointer-events-none" />

      {/* Card */}
      <div className="relative w-full max-w-sm space-y-8 rounded-2xl p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-2xl shadow-black/10 dark:shadow-black/40">
        {/* Subtle top gradient line */}
        <div
          className="absolute top-0 left-8 right-8 h-px rounded-full"
          style={{ background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent)" }}
        />

        {/* Brand */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-violet-500/35">
              <BrainIcon className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Brain<span className="gradient-text">History</span>
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Your AI-powered knowledge library.
              <br />
              Save anything. Find it instantly.
            </p>
          </div>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 justify-center">
          {["Vector Search", "AI Chat", "Any URL", "File Upload"].map((feat) => (
            <span
              key={feat}
              className="text-xs px-2.5 py-1 rounded-full font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
            >
              {feat}
            </span>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
            {error === "OAuthAccountNotLinked"
              ? "This email is already linked to another provider."
              : "Sign-in failed. Please try again."}
          </div>
        )}

        {/* OAuth buttons */}
        <div className="space-y-3">
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
              Continue with Google
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
              Continue with GitHub
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
          Your content is private and only visible to you.
        </p>
      </div>
    </main>
  );
}

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
    </svg>
  );
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
