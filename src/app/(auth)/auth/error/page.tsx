import Link from "next/link";

export const metadata = { title: "Auth Error — BrainHistory" };

const ERROR_MESSAGES: Record<string, string> = {
  Configuration:        "There is a problem with the server configuration.",
  AccessDenied:         "You do not have permission to sign in.",
  Verification:         "The verification link has expired or has already been used.",
  OAuthAccountNotLinked: "This email is already linked to another provider.",
  Default:              "An error occurred during sign-in.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = ERROR_MESSAGES[error ?? "Default"] ?? ERROR_MESSAGES.Default;

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="text-5xl">⚠️</div>
        <h1 className="text-2xl font-bold text-foreground">Authentication Error</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{message}</p>
        {error && (
          <p className="text-xs font-mono bg-neutral-100 dark:bg-neutral-900 rounded px-3 py-1.5 text-neutral-500">
            {error}
          </p>
        )}
        <Link
          href="/auth/signin"
          className="inline-block rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Back to Sign In
        </Link>
      </div>
    </main>
  );
}
