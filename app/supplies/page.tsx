import Link from "next/link";
import SuppliesTracker from "./SuppliesTracker";
import SeoSupportBlock from "@/components/SeoSupportBlock";

const supplies = [
  {
    category: "Daubers & Markers",
    items: [
      {
        name: "Bingo Daubers 12-Pack",
        description: "Assorted colors, non-toxic, easy-grip bottles",
        price: "$12.99",
        image: "https://m.media-amazon.com/images/I/71qH5+bN+TL._AC_SL1500_.jpg",
        amazonUrl: "https://www.amazon.com/s?k=bingo+daubers+12+pack&tag=mybingocard-20",
      },
      {
        name: "Mini Bingo Daubers 24-Pack",
        description: "Perfect for parties and classrooms",
        price: "$15.99",
        image: "https://m.media-amazon.com/images/I/81Jc8+LzURL._AC_SL1500_.jpg",
        amazonUrl: "https://www.amazon.com/s?k=mini+bingo+daubers&tag=mybingocard-20",
      },
      {
        name: "Jumbo Bingo Markers",
        description: "Easy to see, great for seniors",
        price: "$8.99",
        image: "https://m.media-amazon.com/images/I/71X1D7k2QFL._AC_SL1500_.jpg",
        amazonUrl: "https://www.amazon.com/s?k=jumbo+bingo+markers&tag=mybingocard-20",
      },
    ],
  },
  {
    category: "Bingo Cages & Balls",
    items: [
      {
        name: "Metal Bingo Cage Set",
        description: "Professional cage with 75 balls and master board",
        price: "$29.99",
        image: "https://m.media-amazon.com/images/I/71V9JkC1aOL._AC_SL1500_.jpg",
        amazonUrl: "https://www.amazon.com/s?k=bingo+cage+set&tag=mybingocard-20",
      },
      {
        name: "Electronic Bingo Machine",
        description: "Automatic ball selector with LED display",
        price: "$49.99",
        image: "https://m.media-amazon.com/images/I/71CDWXK3K9L._AC_SL1500_.jpg",
        amazonUrl: "https://www.amazon.com/s?k=electronic+bingo+machine&tag=mybingocard-20",
      },
      {
        name: "Replacement Bingo Balls",
        description: "1.5\" balls, numbered 1-75",
        price: "$14.99",
        image: "https://m.media-amazon.com/images/I/81q+Z9XHGQL._AC_SL1500_.jpg",
        amazonUrl: "https://www.amazon.com/s?k=bingo+balls+1-75&tag=mybingocard-20",
      },
    ],
  },
  {
    category: "Chips & Markers",
    items: [
      {
        name: "Bingo Chips 1000-Pack",
        description: "Translucent chips in assorted colors",
        price: "$9.99",
        image: "https://m.media-amazon.com/images/I/71rN6ZF+84L._AC_SL1500_.jpg",
        amazonUrl: "https://www.amazon.com/s?k=bingo+chips+1000&tag=mybingocard-20",
      },
      {
        name: "Magnetic Bingo Wand",
        description: "Easy chip pickup with magnetic wand",
        price: "$7.99",
        image: "https://m.media-amazon.com/images/I/61+3aSjXjKL._AC_SL1500_.jpg",
        amazonUrl: "https://www.amazon.com/s?k=magnetic+bingo+wand+chips&tag=mybingocard-20",
      },
      {
        name: "Cute Shaped Markers",
        description: "Hearts, stars, and fun shapes for themed games",
        price: "$11.99",
        image: "https://m.media-amazon.com/images/I/81Vc1eTIJSL._AC_SL1500_.jpg",
        amazonUrl: "https://www.amazon.com/s?k=cute+bingo+markers+shapes&tag=mybingocard-20",
      },
    ],
  },
  {
    category: "Card Holders & Accessories",
    items: [
      {
        name: "Bingo Card Holder Tray",
        description: "Holds up to 10 cards, sturdy plastic",
        price: "$12.99",
        image: "https://m.media-amazon.com/images/I/71kxv0TQZPL._AC_SL1500_.jpg",
        amazonUrl: "https://www.amazon.com/s?k=bingo+card+holder+tray&tag=mybingocard-20",
      },
      {
        name: "Bingo Tote Bag",
        description: "Carry all your supplies in style",
        price: "$19.99",
        image: "https://m.media-amazon.com/images/I/81zg8A+7vFL._AC_SL1500_.jpg",
        amazonUrl: "https://www.amazon.com/s?k=bingo+tote+bag&tag=mybingocard-20",
      },
      {
        name: "Lucky Bingo Cushion",
        description: "Comfortable seat cushion for long games",
        price: "$24.99",
        image: "https://m.media-amazon.com/images/I/71qNs-F3KFL._AC_SL1500_.jpg",
        amazonUrl: "https://www.amazon.com/s?k=bingo+seat+cushion&tag=mybingocard-20",
      },
    ],
  },
  {
    category: "Prize Ideas",
    items: [
      {
        name: "Gift Card Variety Pack",
        description: "Popular store gift cards for winners",
        price: "$50+",
        image: "https://m.media-amazon.com/images/I/71LpMe0bLjL._AC_SL1500_.jpg",
        amazonUrl: "https://www.amazon.com/gift-cards/b?node=2238192011&tag=mybingocard-20",
      },
      {
        name: "Candy Prize Pack",
        description: "Assorted candy for game prizes",
        price: "$25.99",
        image: "https://m.media-amazon.com/images/I/91JZh5m4h+L._AC_SL1500_.jpg",
        amazonUrl: "https://www.amazon.com/s?k=bulk+candy+variety+pack&tag=mybingocard-20",
      },
      {
        name: "Party Trophy Set",
        description: "Fun trophies for bingo champions",
        price: "$15.99",
        image: "https://m.media-amazon.com/images/I/71hXq3TYDGL._AC_SL1500_.jpg",
        amazonUrl: "https://www.amazon.com/s?k=party+trophies+winner&tag=mybingocard-20",
      },
    ],
  },
];

export default function SuppliesPage() {
  return (
    <div className="min-h-screen bg-[#fff7ed]">
      <SuppliesTracker />
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-[#a39a88]/50">
        <div className="container mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-[#7c5cff] to-[#7c5cff] rounded-xl flex items-center justify-center shadow-lg shadow-[#7c5cff]">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#33312e] to-[#33312e]">
              MyBingoCard
            </span>
          </Link>

          <div className="flex gap-4 items-center">
            <Link href="/create" className="bg-[#33312e] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#33312e] transition-all duration-200 shadow-lg shadow-[#33312e]/20">
              Create Card
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-32 pb-24 px-4">
        {/* Hero */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-block px-4 py-1.5 rounded-full bg-[#ffb800]/10 border border-[#ffb800] text-[#ffb800] text-xs font-bold uppercase tracking-wide mb-6">
            Everything You Need
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#33312e] mb-6 tracking-tight">
            Bingo <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7c5cff] to-[#7c5cff]">Supplies</span>
          </h1>
          <p className="text-xl text-[#33312e] leading-relaxed">
            Level up your bingo game with quality daubers, cages, chips, and prizes.
            We&apos;ve curated the best supplies from Amazon.
          </p>
        </div>

        {/* Supplies Grid */}
        <div className="max-w-7xl mx-auto space-y-16">
          {supplies.map((category) => (
            <section key={category.category}>
              <h2 className="text-2xl font-bold text-[#33312e] mb-8 flex items-center gap-3">
                <span className="w-2 h-8 bg-gradient-to-b from-[#7c5cff] to-[#7c5cff] rounded-full"></span>
                {category.category}
              </h2>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {category.items.map((item) => (
                  <a
                    key={item.name}
                    href={item.amazonUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group bg-white rounded-2xl border border-[#a39a88] overflow-hidden hover:shadow-xl hover:border-[#7c5cff] transition-all duration-300"
                  >
                    <div className="aspect-square bg-[#fff7ed] relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center text-[#6b6459] group-hover:scale-105 transition-transform duration-300">
                        <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <div className="absolute top-3 right-3 bg-[#ffb800] text-[#ffb800] text-xs font-bold px-2 py-1 rounded-full">
                        Amazon
                      </div>
                    </div>

                    <div className="p-6">
                      <h3 className="font-bold text-lg text-[#33312e] mb-2 group-hover:text-[#7c5cff] transition-colors">
                        {item.name}
                      </h3>
                      <p className="text-[#33312e] text-sm mb-4">
                        {item.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-[#33312e]">
                          {item.price}
                        </span>
                        <span className="text-[#7c5cff] font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                          View on Amazon
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* CTA */}
        <div className="max-w-4xl mx-auto mt-24">
          <div className="bg-gradient-to-br from-[#7c5cff] to-[#7c5cff] rounded-3xl p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to Play?</h2>
            <p className="text-[#7c5cff]/15 mb-8 text-lg">
              Create custom bingo cards for your next event in minutes.
            </p>
            <Link
              href="/create"
              className="inline-block px-8 py-4 bg-white text-[#7c5cff] rounded-xl font-bold text-lg hover:bg-[#7c5cff]/10 transition-colors shadow-lg"
            >
              Create Your Cards
            </Link>
          </div>
        </div>

        {/* Affiliate Disclosure */}
        <p className="text-center text-[#6b6459] text-sm mt-12 max-w-2xl mx-auto">
          As an Amazon Associate, we earn from qualifying purchases.
          Prices and availability are subject to change.
        </p>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#a39a88] py-12">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[#7c5cff] to-[#7c5cff] rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-[#33312e]">MyBingoCard</span>
            </div>
            <div className="text-[#6b6459] text-sm">
              &copy; {new Date().getFullYear()} MyBingoCard. All rights reserved.
            </div>
            <div className="flex gap-6 text-sm font-medium text-[#6b6459]">
              <Link href="/pricing" className="hover:text-[#7c5cff] transition-colors">Pricing</Link>
              <Link href="/templates" className="hover:text-[#7c5cff] transition-colors">Templates</Link>
              <Link href="/supplies" className="hover:text-[#7c5cff] transition-colors">Supplies</Link>
            </div>
          </div>
        </div>
      </footer>      <SeoSupportBlock slug="supplies" />

    </div>
  );
}
