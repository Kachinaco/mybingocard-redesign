import Link from "next/link";
import "@/app/confetti-site.css";

export default function PlayfulShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <nav className="nav">
        <div className="nav-in">
          <Link href="/" className="logo">
            My<span>Bingo</span>Card
          </Link>
          <div className="nav-links">
            <Link href="/templates">Templates</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/features">Features</Link>
            <Link href="/create" className="btn btn-sm">
              Make a card now
            </Link>
          </div>
        </div>
      </nav>
      {children}
      <footer className="footer">
        <div className="footer-in">
          <div>
            <Link href="/" className="logo">My<span>Bingo</span>Card</Link>
            <p className="fine">Custom bingo cards for every party, classroom, and get-together.</p>
          </div>
          <div>
            <h4>Create</h4>
            <Link href="/create">Make a card</Link>
            <Link href="/templates">Templates</Link>
            <Link href="/bingo-games">Bingo games</Link>
          </div>
          <div>
            <h4>Learn</h4>
            <Link href="/how-to-play-bingo">How to play</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/features">Features</Link>
          </div>
          <div>
            <h4>Company</h4>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/pricing">Pricing</Link>
          </div>
        </div>
        <div className="footer-bar">Design direction 05 — Playful Confetti · MyBingoCard</div>
      </footer>
    </>
  );
}
