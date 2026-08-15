import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Terms & Privacy — MyBingoCard",
};

export default function Page() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `



<header class="page-head">
  <span class="k">The fine print</span>
  <h1>Terms & Privacy</h1>
  <p>Plain-language versions. Last updated July 2026.</p>
</header>

<div class="legal-wrap">
  <div class="legal-card" id="terms">
    <h2>Terms of Service</h2>
    <h3>The short version</h3>
    <p>MyBingoCard lets you create, print, and share custom bingo cards. Free accounts cover small games; paid plans unlock bigger batches and hosting features.</p>
    <h3>Your content</h3>
    <p>Words and images you add to cards are yours. You give us permission to store and display them only as needed to run the service. Don't upload content you don't have rights to use.</p>
    <h3>Fair use</h3>
    <p>Don't abuse the free tier with automated scraping, don't resell access, and don't use the service for anything unlawful. We may suspend accounts that do.</p>
    <h3>Paid plans</h3>
    <p>One-time event purchases cover a single event. Subscriptions renew until cancelled; you can cancel anytime and keep access through the paid period. Refunds are handled case by case — just ask.</p>
    <h3>No warranty</h3>
    <p>The service is provided as-is. We work hard to keep it reliable, but we can't promise perfection. Liability is limited to the amount you've paid us in the past 12 months.</p>
  </div>

  <div class="legal-card" id="privacy">
    <h2>Privacy Policy</h2>
    <h3>What we collect</h3>
    <p>Account email and password (hashed), the cards and games you create, and basic usage analytics. That's it. Players joining a game don't need accounts and aren't tracked beyond what's needed to serve their card.</p>
    <h3>What we never do</h3>
    <p>We don't sell your data, we don't run third-party ad trackers, and we don't read your card content for advertising. Your baby shower word list is your business.</p>
    <h3>Cookies</h3>
    <p>We use a session cookie to keep you logged in and a preference cookie for settings. No advertising cookies.</p>
    <h3>Your choices</h3>
    <p>Export or delete your account and cards anytime from Settings. Deletion is permanent within 30 days, including backups.</p>
    <h3>Contact</h3>
    <p>Questions about privacy? <a href="/contact">Contact us</a> — a human replies.</p>
  </div>
</div>



`,
      }} />
      <style dangerouslySetInnerHTML={{__html: `
  .legal-wrap { max-width:720px; margin:0 auto; padding:clamp(24px,5vw,44px) clamp(16px,4vw,24px) 64px; }
  .legal-card { background:#fff; border:2.5px solid var(--ink); border-radius:16px; box-shadow:var(--shadow); padding:clamp(18px,4vw,28px); margin-bottom:18px; }
  .legal-card h2 { font-size:clamp(18px,3.5vw,22px); margin-bottom:12px; }
  .legal-card h3 { font-size:clamp(14px,2.5vw,16px); margin:16px 0 6px; }
  .legal-card p { font-size:13.5px; font-weight:600; color:var(--mut); margin-bottom:10px; }
`}} />
    </PlayfulShell>
  );
}
