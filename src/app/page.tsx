import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";

export const metadata: Metadata = {
  title: "BrainHistory — Your AI-Powered Second Brain for the Web",
  description:
    "Save any URL, PDF, YouTube video, or file. BrainHistory indexes everything with AI so you can search semantically and chat with your saved content.",
  openGraph: {
    title: "BrainHistory — Your AI-Powered Second Brain for the Web",
    description:
      "Save any URL, PDF, YouTube video, or file. Search and chat with your entire knowledge library using AI.",
    type: "website",
  },
};

export default async function Home() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">

      {/* ── Navbar ───────────────────────────────────────────────────── */}
      <nav className="fixed inset-x-0 top-0 z-30 h-14 flex items-center px-6 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-100 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/30">
              <BrainIcon className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight">
              Brain<span className="gradient-text">History</span>
            </span>
          </div>
          <Link
            href="/auth/signin"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-md shadow-violet-500/20"
          >
            Sign in →
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div style={{ background: "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(139,92,246,0.18) 0%, transparent 70%)" }} className="absolute inset-0" />
          <div style={{ background: "radial-gradient(ellipse 40% 30% at 80% 60%, rgba(99,102,241,0.1) 0%, transparent 70%)" }} className="absolute inset-0" />
        </div>
        <div className="absolute inset-0 dot-bg opacity-25 pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30">
            <SparkleIcon className="h-3.5 w-3.5" />
            AI-powered knowledge library
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight text-zinc-900 dark:text-zinc-50">
            Your second brain<br />
            for{" "}
            <span className="gradient-text">everything</span>{" "}
            on the web
          </h1>

          <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Save any URL, PDF, YouTube video, or file in one click.
            BrainHistory indexes it all with AI — then lets you search semantically
            and chat with your entire knowledge library.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-base font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-xl shadow-violet-500/25 hover:shadow-violet-500/35 hover:-translate-y-0.5"
            >
              <SparkleIcon className="h-4.5 w-4.5" />
              Get started free
            </Link>
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-base font-medium text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:border-violet-300 dark:hover:border-violet-500/40 transition-all"
            >
              Sign in
            </Link>
          </div>

          {/* Supported content types row */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
            {[
              { label: "YouTube",  color: "bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20" },
              { label: "PDFs",     color: "bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20" },
              { label: "GitHub",   color: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-700/30 dark:text-zinc-300 dark:border-zinc-600" },
              { label: "Blogs",    color: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" },
              { label: "Reddit",   color: "bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20" },
              { label: "Twitter/X",color: "bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20" },
              { label: "Audio",    color: "bg-green-50 text-green-700 border-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20" },
              { label: "Images",   color: "bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20" },
              { label: "& more…",  color: "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700" },
            ].map(({ label, color }) => (
              <span key={label} className={`text-xs px-2.5 py-1 rounded-full font-medium border ${color}`}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="px-6 py-20 bg-white dark:bg-zinc-900 border-y border-zinc-100 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">Everything your second brain needs</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
              Three powerful features that work together to make your saved knowledge instantly useful.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <SaveIcon />,
                color: "from-violet-600 to-indigo-600",
                shadow: "shadow-violet-500/25",
                title: "Save anything, instantly",
                desc: "Paste any URL or upload a file. YouTube videos, PDFs, GitHub repos, articles, Reddit threads, images, audio — BrainHistory handles them all automatically.",
              },
              {
                icon: <SearchFeatureIcon />,
                color: "from-sky-500 to-blue-600",
                shadow: "shadow-sky-500/25",
                title: "AI semantic search",
                desc: "Ask natural language questions across your entire library. Get an AI-synthesised answer with sources, not just a list of links.",
              },
              {
                icon: <ChatFeatureIcon />,
                color: "from-emerald-500 to-teal-600",
                shadow: "shadow-emerald-500/25",
                title: "Chat with any content",
                desc: "Open a focused chat session for any saved item. Ask follow-up questions, get summaries, extract key points — powered by RAG.",
              },
            ].map(({ icon, color, shadow, title, desc }) => (
              <div key={title} className="card-accent group rounded-2xl p-6 space-y-4 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700 hover:-translate-y-1 transition-all duration-200">
                <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg ${shadow}`}>
                  {icon}
                </div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
            <p className="text-zinc-500 dark:text-zinc-400">Three steps from URL to insight.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Save", desc: "Paste any URL or upload a file. We scrape, extract, and store the content automatically.", accent: "text-violet-600 dark:text-violet-400" },
              { step: "02", title: "Index", desc: "AI splits content into chunks, creates vector embeddings, and stores them in your private library.", accent: "text-indigo-600 dark:text-indigo-400" },
              { step: "03", title: "Discover", desc: "Search semantically or open a chat session. Your knowledge is always one question away.", accent: "text-sky-600 dark:text-sky-400" },
            ].map(({ step, title, desc, accent }) => (
              <div key={step} className="space-y-3">
                <div className={`text-4xl font-black ${accent} opacity-30`}>{step}</div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-violet-500/30">
            <BrainIcon className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">
            Start building your<br />
            <span className="gradient-text">second brain</span> today
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400">
            Sign in with Google or GitHub — no credit card, no setup required.
            Your content is private and only visible to you.
          </p>
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-base font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-xl shadow-violet-500/25 hover:shadow-violet-500/35 hover:-translate-y-0.5"
          >
            <SparkleIcon className="h-5 w-5" />
            Get started free →
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="px-6 py-8 border-t border-zinc-100 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-md bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <BrainIcon className="h-3 w-3 text-white" />
            </div>
            <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
              Brain<span className="gradient-text">History</span>
            </span>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Your content is private and only visible to you.
          </p>
        </div>
      </footer>
    </main>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function BrainIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" /></svg>;
}
function SparkleIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L13.4 8.4L19 9L13.4 9.6L12 15L10.6 9.6L5 9L10.6 8.4L12 3Z" /><path opacity="0.5" d="M19 14L19.8 16.8L23 17L19.8 17.2L19 20L18.2 17.2L15 17L18.2 16.8L19 14Z" /></svg>;
}
function SaveIcon() {
  return <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>;
}
function SearchFeatureIcon() {
  return <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
}
function ChatFeatureIcon() {
  return <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
}
