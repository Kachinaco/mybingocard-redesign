import Link from "next/link";
import "@/app/confetti-site.css";
import BingoPreviewBehavior from "@/components/BingoPreviewBehavior";

export default function PlayfulShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="site-header">
        <div className="site-header-inner">
          <div className="brand-group">
            <Link href="/" className="brand">
              My<span>Bingo</span>Card
            </Link>
          </div>
          <nav className="primary-nav" aria-label="Primary">
            <Link href="/templates" className="nav-link">Templates</Link>
            <Link href="/pricing" className="nav-link">Pricing</Link>
            <Link href="/features" className="nav-link">Features</Link>
            <Link href="/blog" className="nav-link">Blog</Link>
          </nav>
          <nav className="account-nav" aria-label="Account">
            <Link href="/login" className="nav-link">Log in</Link>
            <Link href="/create" className="button button-primary button-small">
              Make a card
            </Link>
          </nav>
        </div>
      </header>
      <main id="main" className="site-main">
        <BingoPreviewBehavior />
        {children}
      </main>
      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="footer-column">
            <Link href="/" className="brand">My<span>Bingo</span>Card</Link>
            <p className="footer-note">Custom bingo cards for every party, classroom, and get-together.</p>
          </div>
          <div className="footer-column">
            <h2>Create</h2>
            <Link href="/create">Make a card</Link>
            <Link href="/templates">Templates</Link>
            <Link href="/bingo-games">Bingo games</Link>
          </div>
          <div className="footer-column">
            <h2>Learn</h2>
            <Link href="/how-to-play-bingo">How to play</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/features">Features</Link>
          </div>
          <div className="footer-column">
            <h2>Company</h2>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/pricing">Pricing</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
