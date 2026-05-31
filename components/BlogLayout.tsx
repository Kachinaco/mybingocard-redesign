import Link from "next/link";
import { FACEBOOK_PAGE_URL } from "@/lib/social-links";

interface BlogLayoutProps {
  children: React.ReactNode;
  title: string;
  date: string;
  readTime: string;
  category: string;
  categoryGradient: string;
}

export default function BlogLayout({ children, title, date, readTime, category, categoryGradient }: BlogLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="container mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:shadow-indigo-300 transition-all duration-300">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
              MyBingoCard
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/templates" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Templates</Link>
            <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Pricing</Link>
            <Link href="/blog" className="text-sm font-medium text-indigo-600 transition-colors">Blog</Link>
            <div className="w-px h-4 bg-slate-200"></div>
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Sign In</Link>
            <Link href="/create" className="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-all duration-200 shadow-lg shadow-slate-900/20">
              Create Free
            </Link>
          </nav>
        </div>
      </header>

      <main className="pt-20">
        <article className="py-12 lg:py-20">
          <div className="container mx-auto px-4 lg:px-8 max-w-3xl">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
              <Link href="/" className="hover:text-indigo-600 transition-colors">Home</Link>
              <span>/</span>
              <Link href="/blog" className="hover:text-indigo-600 transition-colors">Blog</Link>
              <span>/</span>
              <span className="text-slate-900 font-medium truncate">{title}</span>
            </nav>

            {/* Header */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-4">
                <span className={`text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r ${categoryGradient} text-white`}>
                  {category}
                </span>
                <span className="text-sm text-slate-400">{readTime}</span>
              </div>
              <h1 className="text-3xl lg:text-5xl font-bold text-slate-900 mb-4 tracking-tight leading-tight">
                {title}
              </h1>
              <div className="text-sm text-slate-500">
                Published {date} by <span className="font-medium text-slate-700">MyBingoCard Team</span>
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-p:leading-relaxed prose-p:text-slate-600 prose-li:text-slate-600 prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-slate-900">
              {children}
            </div>

            {/* CTA */}
            <div className="mt-16 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl p-8 lg:p-12 border border-indigo-100 text-center">
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Ready to create your bingo cards?</h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                Put these ideas into action — create free custom bingo cards in under 2 minutes.
              </p>
              <Link href="/create" className="inline-flex bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-1 transition-all duration-300">
                Create Free Bingo Cards
              </Link>
            </div>
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 pt-16 pb-12">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-slate-900">MyBingoCard</span>
              </Link>
              <p className="text-slate-500 max-w-sm leading-relaxed">
                Free bingo card generator for printable and online games, from classrooms to parties and weddings.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-6">Product</h4>
              <ul className="space-y-4">
                <li><Link href="/create" className="text-slate-500 hover:text-indigo-600 transition-colors">Create Cards</Link></li>
                <li><Link href="/templates" className="text-slate-500 hover:text-indigo-600 transition-colors">Templates</Link></li>
                <li><Link href="/pricing" className="text-slate-500 hover:text-indigo-600 transition-colors">Pricing</Link></li>
                <li>
                  <a href={FACEBOOK_PAGE_URL} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-indigo-600 transition-colors">
                    Facebook
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-6">Popular</h4>
              <ul className="space-y-4">
                <li><Link href="/wedding-bingo" className="text-slate-500 hover:text-indigo-600 transition-colors">Wedding Bingo</Link></li>
                <li><Link href="/baby-shower-bingo" className="text-slate-500 hover:text-indigo-600 transition-colors">Baby Shower Bingo</Link></li>
                <li><Link href="/classroom-bingo" className="text-slate-500 hover:text-indigo-600 transition-colors">Classroom Bingo</Link></li>
                <li><Link href="/party-bingo" className="text-slate-500 hover:text-indigo-600 transition-colors">Party Bingo</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-8 text-center text-slate-400 text-sm">
            <p>&copy; 2025 MyBingoCard. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
