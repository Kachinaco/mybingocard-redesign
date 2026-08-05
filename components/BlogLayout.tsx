import Link from "next/link";
import { FACEBOOK_PAGE_URL, REDDIT_COMMUNITY_URL } from "@/lib/social-links";

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
    <div className="min-h-screen bg-[#fff7ed] selection:bg-[#7c5cff]/15 selection:text-[#7c5cff]">
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-[#a39a88]/50">
        <div className="container mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-[#7c5cff] to-[#7c5cff] rounded-xl flex items-center justify-center shadow-lg shadow-[#7c5cff] group-hover:shadow-[#7c5cff] transition-all duration-300">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#33312e] to-[#33312e]">
              MyBingoCard
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/templates" className="text-sm font-medium text-[#33312e] hover:text-[#7c5cff] transition-colors">Templates</Link>
            <Link href="/pricing" className="text-sm font-medium text-[#33312e] hover:text-[#7c5cff] transition-colors">Pricing</Link>
            <Link href="/blog" className="text-sm font-medium text-[#7c5cff] transition-colors">Blog</Link>
            <div className="w-px h-4 bg-[#a39a88]"></div>
            <Link href="/login" className="text-sm font-medium text-[#33312e] hover:text-[#7c5cff] transition-colors">Sign In</Link>
            <Link href="/create" className="bg-[#33312e] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#33312e] transition-all duration-200 shadow-lg shadow-[#33312e]/20">
              Create a Card
            </Link>
          </nav>
        </div>
      </header>

      <main className="pt-16">
        <article className="py-10 lg:py-14">
          <div className="container mx-auto px-4 lg:px-8 max-w-3xl">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-[#6b6459] mb-6">
              <Link href="/" className="hover:text-[#7c5cff] transition-colors">Home</Link>
              <span>/</span>
              <Link href="/blog" className="hover:text-[#7c5cff] transition-colors">Blog</Link>
              <span>/</span>
              <span className="text-[#33312e] font-medium truncate">{title}</span>
            </nav>

            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <span className={`text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r ${categoryGradient} text-white`}>
                  {category}
                </span>
                <span className="text-sm text-[#6b6459]">{readTime}</span>
              </div>
              <h1 className="text-2xl lg:text-4xl font-bold text-[#33312e] mb-4 tracking-tight leading-tight">
                {title}
              </h1>
              <div className="text-sm text-[#6b6459]">
                Published {date} by <span className="font-medium text-[#33312e]">MyBingoCard Team</span>
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-p:leading-relaxed prose-p:text-[#33312e] prose-li:text-[#33312e] prose-a:text-[#7c5cff] prose-a:no-underline hover:prose-a:underline prose-strong:text-[#33312e]">
              {children}
            </div>

            {/* CTA */}
            <div className="mt-16 bg-gradient-to-br from-[#7c5cff]/10 to-[#7c5cff]/10 rounded-2xl p-8 lg:p-12 border border-[#7c5cff]/15 text-center">
              <h3 className="text-2xl font-bold text-[#33312e] mb-3">Ready to create your bingo cards?</h3>
              <p className="text-[#33312e] mb-6 max-w-md mx-auto">
                Put these ideas into action — make custom bingo cards in under 2 minutes.
              </p>
              <Link href="/create" className="inline-flex bg-gradient-to-r from-[#7c5cff] to-[#7c5cff] text-white px-6 py-3 rounded-xl font-bold text-base shadow-xl shadow-[#7c5cff]/20 hover:shadow-[#7c5cff]/40 hover:-translate-y-1 transition-all duration-300">
                Create a Card
              </Link>
            </div>
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#a39a88] pt-16 pb-12">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-[#7c5cff] to-[#7c5cff] rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-[#33312e]">MyBingoCard</span>
              </Link>
              <p className="text-[#6b6459] max-w-sm leading-relaxed">
                Bingo card maker for printable and online games, from classrooms to parties and weddings. Save one card and export individual PDFs or PNGs for free.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-[#33312e] mb-6">Product</h4>
              <ul className="space-y-4">
                <li><Link href="/create" className="text-[#6b6459] hover:text-[#7c5cff] transition-colors">Create Cards</Link></li>
                <li><Link href="/templates" className="text-[#6b6459] hover:text-[#7c5cff] transition-colors">Templates</Link></li>
                <li><Link href="/pricing" className="text-[#6b6459] hover:text-[#7c5cff] transition-colors">Pricing</Link></li>
                <li>
                  <a href={FACEBOOK_PAGE_URL} target="_blank" rel="noopener noreferrer" className="text-[#6b6459] hover:text-[#7c5cff] transition-colors">
                    Facebook
                  </a>
                </li>
                <li>
                  <a href={REDDIT_COMMUNITY_URL} target="_blank" rel="noopener noreferrer" className="text-[#6b6459] hover:text-[#7c5cff] transition-colors">
                    Reddit
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-[#33312e] mb-6">Popular</h4>
              <ul className="space-y-4">
                <li><Link href="/wedding-bingo" className="text-[#6b6459] hover:text-[#7c5cff] transition-colors">Wedding Bingo</Link></li>
                <li><Link href="/baby-shower-bingo" className="text-[#6b6459] hover:text-[#7c5cff] transition-colors">Baby Shower Bingo</Link></li>
                <li><Link href="/classroom-bingo" className="text-[#6b6459] hover:text-[#7c5cff] transition-colors">Classroom Bingo</Link></li>
                <li><Link href="/party-bingo" className="text-[#6b6459] hover:text-[#7c5cff] transition-colors">Party Bingo</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#fff7ed] pt-8 text-center text-[#6b6459] text-sm">
            <p>&copy; {new Date().getFullYear()} MyBingoCard. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
