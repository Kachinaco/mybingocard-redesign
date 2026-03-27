import Link from "next/link";
import NotFoundBingo from "@/components/NotFoundBingo";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col items-center justify-center px-4 py-12 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <div className="text-center mb-8 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs font-bold uppercase tracking-wide px-4 py-1.5 rounded-full mb-4">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Error 404
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-3 tracking-tight">
          Page not{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
            found.
          </span>
        </h1>
        <p className="text-slate-500 text-lg max-w-md mx-auto">
          But hey, while you&apos;re here... why not play some 404 Bingo?
        </p>
      </div>

      <NotFoundBingo />

      {/* Navigation */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3 items-center animate-fade-in-up">
        <Link
          href="/"
          className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Go Home
        </Link>
        <Link
          href="/templates"
          className="bg-white text-indigo-600 border-2 border-indigo-200 px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-300"
        >
          Browse Templates
        </Link>
        <Link
          href="/create"
          className="text-slate-500 hover:text-indigo-600 font-semibold text-sm transition-colors"
        >
          Create a Card
        </Link>
      </div>

      {/* Footer brand */}
      <div className="mt-12 flex items-center gap-2 text-slate-400 text-sm">
        <div className="w-6 h-6 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </div>
        MyBingoCard
      </div>
    </div>
  );
}
