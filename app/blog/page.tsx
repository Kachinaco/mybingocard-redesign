import type { Metadata } from "next";
import Link from "next/link";
import BlogTracker, { BlogPostLink } from "./BlogTracker";
import SeoSupportBlock from "@/components/SeoSupportBlock";

export const metadata: Metadata = {
  title: "Blog — Bingo Card Ideas, Tips & Guides",
  description:
    "Discover bingo card ideas, tips, and step-by-step guides for weddings, baby showers, classrooms, parties, and holidays. Learn how to create the perfect custom bingo cards.",
  alternates: {
    canonical: "https://mybingocard.com/blog",
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
    slug: "best-bingo-card-generator",
    title: "How to Choose the Best Bingo Card Generator (2026 Guide)",
    excerpt: "A practical comparison of the top bingo card generators for printable PDFs, digital play, templates, and customization in 2026.",
    date: "April 14, 2026",
    readTime: "8 min read",
    category: "Comparison",
    gradient: "from-[#7c5cff] to-[#2ec4b6]",
  },
  {
    slug: "how-to-make-custom-bingo-cards",
    title: "How to Make Custom Bingo Cards in 5 Minutes",
    excerpt: "A complete step-by-step guide to creating personalized bingo cards for any event — from choosing themes to printing perfect cards.",
    date: "March 1, 2026",
    readTime: "6 min read",
    category: "Guide",
    gradient: "from-[#7c5cff] to-[#7c5cff]",
  },
  {
    slug: "best-bingo-games-baby-showers",
    title: "The 7 Best Bingo Games for Baby Showers",
    excerpt: "From gift bingo to baby prediction cards — discover baby shower bingo variations that guests absolutely love.",
    date: "February 24, 2026",
    readTime: "8 min read",
    category: "Baby Shower",
    gradient: "from-[#ff5d8f] to-[#ff5d8f]",
  },
  {
    slug: "fun-classroom-bingo-ideas",
    title: "15 Fun Classroom Bingo Ideas Students Love",
    excerpt: "Engaging bingo games for every subject — vocabulary, math, science, and more. Proven ideas teachers use to boost participation.",
    date: "February 18, 2026",
    readTime: "7 min read",
    category: "Education",
    gradient: "from-[#7c5cff] to-[#2ec4b6]",
  },
  {
    slug: "wedding-bingo-guide",
    title: "The Ultimate Wedding Bingo Guide for 2026",
    excerpt: "Everything you need to know about wedding reception bingo — square ideas, printable tips, and how to make it a hit with guests.",
    date: "February 10, 2026",
    readTime: "9 min read",
    category: "Wedding",
    gradient: "from-[#7c5cff] to-[#ff5d8f]",
  },
  {
    slug: "holiday-bingo-ideas",
    title: "20+ Holiday Bingo Ideas for Christmas & Beyond",
    excerpt: "Creative holiday bingo card ideas for Christmas parties, Hanukkah celebrations, New Year gatherings, and winter events.",
    date: "February 3, 2026",
    readTime: "7 min read",
    category: "Holiday",
    gradient: "from-[#2ec4b6] to-[#2ec4b6]",
  },
  {
    slug: "party-bingo-tips",
    title: "How to Run the Perfect Bingo Game at Any Party",
    excerpt: "Pro tips for hosting bingo at birthday parties, game nights, and celebrations — from card setup to prizes and keeping energy high.",
    date: "January 27, 2026",
    readTime: "6 min read",
    category: "Party",
    gradient: "from-[#2ec4b6] to-[#2ec4b6]",
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[#fff7ed] selection:bg-[#7c5cff]/15 selection:text-[#7c5cff]">
      <BlogTracker />
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
        {/* Hero */}
        <section className="py-10 lg:py-14">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h1 className="text-3xl lg:text-4xl font-bold text-[#33312e] mb-4 tracking-tight">
                Bingo Card Ideas, Tips &{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7c5cff] to-[#7c5cff]">Guides</span>
              </h1>
              <p className="text-lg text-[#33312e] leading-relaxed">
                Everything you need to create amazing bingo games for weddings, baby showers, classrooms, parties, and holidays.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {posts.map((post, index) => (
                <BlogPostLink
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  slug={post.slug}
                  position={index}
                  className="group bg-white rounded-2xl overflow-hidden border border-[#fff7ed] hover:shadow-xl hover:shadow-[#a39a88]/50 transition-all duration-300 hover:-translate-y-1"
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
                      <span className="text-xs text-[#6b6459]">{post.readTime}</span>
                    </div>
                    <h2 className="text-lg font-bold text-[#33312e] mb-2 group-hover:text-[#7c5cff] transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-sm text-[#33312e] leading-relaxed mb-4">
                      {post.excerpt}
                    </p>
                    <div className="text-xs text-[#6b6459]">{post.date}</div>
                  </div>
                </BlogPostLink>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-14 bg-white border-t border-[#fff7ed]">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-[#33312e] mb-4">Ready to create your own bingo cards?</h2>
            <p className="text-[#33312e] mb-6 max-w-xl mx-auto">
              Put these ideas into action — make custom bingo cards in under 2 minutes.
            </p>
            <Link href="/create" className="inline-flex bg-gradient-to-r from-[#7c5cff] to-[#7c5cff] text-white px-6 py-3 rounded-xl font-bold text-base shadow-xl shadow-[#7c5cff]/20 hover:shadow-[#7c5cff]/40 hover:-translate-y-1 transition-all duration-300">
              Create a Card
            </Link>
          </div>
        </section>
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
      </footer>      <SeoSupportBlock slug="blog" />

    </div>
  );
}
