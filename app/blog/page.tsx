import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog — Bingo Card Ideas, Tips & Guides",
  description:
    "Discover bingo card ideas, tips, and step-by-step guides for weddings, baby showers, classrooms, parties, and holidays. Learn how to create the perfect custom bingo cards.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Blog — Bingo Card Ideas, Tips & Guides | MyBingoCard",
    description:
      "Bingo card ideas, tips, and guides for every occasion. Learn how to create custom bingo cards for weddings, baby showers, classrooms & more.",
    url: "https://mybingocard.com/blog",
    type: "website",
  },
};

const posts = [
  {
    slug: "how-to-make-custom-bingo-cards",
    title: "How to Make Custom Bingo Cards in 5 Minutes",
    excerpt: "A complete step-by-step guide to creating personalized bingo cards for any event — from choosing themes to printing perfect cards.",
    date: "March 1, 2026",
    readTime: "6 min read",
    category: "Guide",
    gradient: "from-violet-500 to-indigo-500",
  },
  {
    slug: "best-bingo-games-baby-showers",
    title: "The 7 Best Bingo Games for Baby Showers",
    excerpt: "From gift bingo to baby prediction cards — discover the most popular baby shower bingo variations that guests absolutely love.",
    date: "February 24, 2026",
    readTime: "8 min read",
    category: "Baby Shower",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    slug: "fun-classroom-bingo-ideas",
    title: "15 Fun Classroom Bingo Ideas Students Love",
    excerpt: "Engaging bingo games for every subject — vocabulary, math, science, and more. Proven ideas teachers use to boost participation.",
    date: "February 18, 2026",
    readTime: "7 min read",
    category: "Education",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    slug: "wedding-bingo-guide",
    title: "The Ultimate Wedding Bingo Guide for 2026",
    excerpt: "Everything you need to know about wedding reception bingo — square ideas, printable tips, and how to make it a hit with guests.",
    date: "February 10, 2026",
    readTime: "9 min read",
    category: "Wedding",
    gradient: "from-violet-500 to-fuchsia-500",
  },
  {
    slug: "holiday-bingo-ideas",
    title: "20+ Holiday Bingo Ideas for Christmas & Beyond",
    excerpt: "Creative holiday bingo card ideas for Christmas parties, Hanukkah celebrations, New Year gatherings, and winter events.",
    date: "February 3, 2026",
    readTime: "7 min read",
    category: "Holiday",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    slug: "party-bingo-tips",
    title: "How to Run the Perfect Bingo Game at Any Party",
    excerpt: "Pro tips for hosting bingo at birthday parties, game nights, and celebrations — from card setup to prizes and keeping energy high.",
    date: "January 27, 2026",
    readTime: "6 min read",
    category: "Party",
    gradient: "from-emerald-500 to-teal-500",
  },
];

export default function BlogPage() {
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
        {/* Hero */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
                Bingo Card Ideas, Tips &{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">Guides</span>
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed">
                Everything you need to create amazing bingo games for weddings, baby showers, classrooms, parties, and holidays.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className={`h-48 bg-gradient-to-br ${post.gradient} flex items-center justify-center`}>
                    <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6">
                      <div className="grid grid-cols-3 gap-1.5">
                        {[...Array(9)].map((_, i) => (
                          <div key={i} className={`w-6 h-6 rounded-md ${i === 4 ? "bg-white" : "bg-white/40"}`}></div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-gradient-to-r ${post.gradient} text-white`}>
                        {post.category}
                      </span>
                      <span className="text-xs text-slate-400">{post.readTime}</span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">
                      {post.excerpt}
                    </p>
                    <div className="text-xs text-slate-400">{post.date}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-white border-t border-slate-100">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Ready to create your own bingo cards?</h2>
            <p className="text-slate-600 mb-8 max-w-xl mx-auto">
              Put these ideas into action — create free custom bingo cards in under 2 minutes.
            </p>
            <Link href="/create" className="inline-flex bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-1 transition-all duration-300">
              Create Free Bingo Cards
            </Link>
          </div>
        </section>
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
                The world&apos;s most popular bingo card generator for any occasion.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-6">Product</h4>
              <ul className="space-y-4">
                <li><Link href="/create" className="text-slate-500 hover:text-indigo-600 transition-colors">Create Cards</Link></li>
                <li><Link href="/templates" className="text-slate-500 hover:text-indigo-600 transition-colors">Templates</Link></li>
                <li><Link href="/pricing" className="text-slate-500 hover:text-indigo-600 transition-colors">Pricing</Link></li>
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
