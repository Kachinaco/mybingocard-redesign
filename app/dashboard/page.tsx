import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { BingoCard } from "@/lib/db/cards";
import { getUserByEmail } from "@/lib/db/users";
import { getUserCards } from "@/lib/db/cards";
import { PLANS } from "@/lib/stripe/config";
import { getGameHistory, getGameStats } from "@/lib/gameHistory";
import { getUserFavorites } from "@/lib/favorites";
import { getEffectiveCardLimit, hasPremiumAccess } from "@/lib/subscription-status";
import PremiumCheckoutButton from "@/components/PremiumCheckoutButton";
import UpgradeButton from "@/components/UpgradeButton";
import ManageSubscriptionButton from "@/components/ManageSubscriptionButton";
import DashboardTracker from "./DashboardTracker";
import DashboardFunnelTracker from "./DashboardFunnelTracker";
import NpsWidget from "@/components/NpsWidget";
import WorkspaceShell, { WorkspacePageHead } from "@/components/WorkspaceShell";

function cardId(card: BingoCard) {
  return card._id.toString();
}

function formatDate(value: Date | string | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function MiniCardPreview({ card }: { card: BingoCard }) {
  return (
    <div className="saved-card-preview" aria-hidden="true">
      <div className="mini-grid">
        {Array.from({ length: card.size * card.size }, (_, index) => (
          <span key={index} className={card.freeSpace && index === Math.floor((card.size * card.size) / 2) ? "is-free" : undefined} />
        ))}
      </div>
    </div>
  );
}

function SavedCardRow({ card }: { card: BingoCard }) {
  const id = cardId(card);
  return (
    <article className="card-soft saved-card">
      <MiniCardPreview card={card} />
      <div className="saved-card-copy">
        <h3>{card.title}</h3>
        <div className="saved-card-meta">
          <span>{card.size}×{card.size}</span>
          <span>{formatDate(card.updatedAt)}</span>
          <span>{card.isPublic ? "Shared" : "Ready to play"}</span>
        </div>
      </div>
      <div className="saved-card-actions">
        <Link href={`/cards/${id}`} className="button button-primary button-small">Open</Link>
        <Link href={`/cards/${id}?next=share`} className="button button-icon button-small" aria-label={`Share ${card.title}`}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.5-4.5M8.2 13.2l7.5 4.5" />
          </svg>
        </Link>
      </div>
    </article>
  );
}

function ActivityRow({ title, copy, trailing }: { title: string; copy: string; trailing: string }) {
  return (
    <div className="activity-item">
      <div className="activity-copy">
        <strong>{title}</strong>
        <span className="caption">{copy}</span>
      </div>
      <span className="caption">{trailing}</span>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const user = session.user.email ? await getUserByEmail(session.user.email) : null;
  const currentPlan = user?.planType || "FREE";
  const plan = PLANS[currentPlan as keyof typeof PLANS] || PLANS.FREE;
  const isSubscribed = hasPremiumAccess(user);
  const allCards = session.user.id ? await getUserCards(session.user.id) : [];
  const recentCards = allCards.slice(0, 4);
  const latestCard = recentCards[0];
  const [gameHistory, gameStats, favorites] = await Promise.all([
    session.user.id ? getGameHistory(session.user.id, 3) : Promise.resolve([]),
    session.user.id ? getGameStats(session.user.id) : Promise.resolve({ total: 0, wins: 0, winRate: 0 }),
    session.user.id ? getUserFavorites(session.user.id, 10) : Promise.resolve([]),
  ]);
  const cardMap = new Map(allCards.map((card) => [card._id.toString(), card]));
  const favoriteCards = favorites.map((favorite) => cardMap.get(favorite.cardId)).filter(Boolean);
  const monthlyLimit = isSubscribed ? Number(PLANS.PREMIUM.limits.maxCards) : getEffectiveCardLimit(user);
  const usageLabel = monthlyLimit === -1 ? `${allCards.length} saved cards` : `${allCards.length} of ${monthlyLimit} cards used`;
  const usagePercent = monthlyLimit === -1 ? Math.min(100, Math.max(12, allCards.length > 0 ? 18 : 0)) : monthlyLimit > 0 ? Math.min(100, Math.round((allCards.length / monthlyLimit) * 100)) : 0;
  const firstName = session.user.name?.split(" ")[0] || "Friend";
  const planLabel = `${currentPlan === "PREMIUM" ? "Premium" : "Free"} plan`;

  return (
    <>
      <WorkspaceShell current="/dashboard" planLabel={planLabel}>
        <DashboardTracker cardCount={recentCards.length} planType={currentPlan} />
        <DashboardFunnelTracker cardCount={allCards.length} />
        <WorkspacePageHead
          title="Dashboard"
          description="An account overview with recent cards, plan status, and useful next actions."
          action={<Link href="/create" className="button button-primary">＋ Create card</Link>}
        />

        <div className="dashboard-grid">
          <div className="dashboard-section">
            <section className="card card-body surface-yellow">
              <div className="section-title-row">
                <div className="stack-tight">
                  <span className="eyebrow">Continue working</span>
                  <h2>{latestCard?.title || `Welcome back, ${firstName}`}</h2>
                  <p className="muted">
                    {latestCard
                      ? `${latestCard.cells.filter(Boolean).length} of ${latestCard.size * latestCard.size} squares ready · updated ${formatDate(latestCard.updatedAt)}`
                      : "Create your first card to start your workspace."}
                  </p>
                </div>
                <Link href={latestCard ? `/cards/${cardId(latestCard)}` : "/create"} className="button button-primary">
                  {latestCard ? "Open card" : "Create card"}
                </Link>
              </div>
            </section>

            <section className="dashboard-section">
              <div className="section-title-row">
                <h2>Recent cards</h2>
                <Link href="/dashboard/cards">View all cards</Link>
              </div>
              {recentCards.length > 0 ? (
                <div className="card-list">
                  {recentCards.slice(0, 3).map((card) => <SavedCardRow key={cardId(card)} card={card} />)}
                </div>
              ) : (
                <section className="card empty-state">
                  <div className="empty-state-inner">
                    <span className="empty-icon" aria-hidden="true">✏️</span>
                    <h2>No saved cards yet</h2>
                    <p className="muted">Create a card and it will appear here with its play, share, and export actions.</p>
                    <Link href="/create" className="button button-primary">Create your first card</Link>
                  </div>
                </section>
              )}
            </section>

            <section className="dashboard-section">
              <div className="section-title-row"><h2>Recent activity</h2></div>
              <div className="card-soft card-body activity-list">
                {gameHistory.length > 0 ? gameHistory.map((game) => (
                  <ActivityRow
                    key={game._id?.toString() || `${game.cardId}-${game.datePlayed}`}
                    title={game.cardName}
                    copy={game.won ? "Won a game" : "Played a game"}
                    trailing={formatDate(game.datePlayed)}
                  />
                )) : (
                  <ActivityRow title="Your workspace is ready" copy="Create a card to start tracking activity." trailing="Next" />
                )}
              </div>
            </section>
          </div>

          <aside className="dashboard-section">
            <section className="card-soft card-body">
              <div className="section-title-row">
                <h2>Plan</h2>
                <span className="pill pill-purple">{currentPlan === "PREMIUM" ? "Premium" : "Free"}</span>
              </div>
              <p className="muted">{isSubscribed ? "Unlimited cards, sharing tools, and hosted games are available." : "You have everything needed to make and preview individual cards."}</p>
              <div className="usage-summary">
                <div className="section-title-row"><strong>Cards saved</strong><span className="tabular-nums">{usageLabel}</span></div>
                <div className="progress-track" aria-label={`${usagePercent}% of card capacity used`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={usagePercent}><span style={{ width: `${usagePercent}%` }} /></div>
              </div>
              {isSubscribed ? <ManageSubscriptionButton /> : <UpgradeButton>Compare upgrades</UpgradeButton>}
            </section>

            <section className="card-soft card-body">
              <h2>Getting started</h2>
              <div className="activity-list">
                <ActivityRow title="Create a card" copy={allCards.length > 0 ? "Complete" : "Try next"} trailing={allCards.length > 0 ? "✓" : "1"} />
                <ActivityRow title="Save your first card" copy={allCards.length > 0 ? "Complete" : "Waiting"} trailing={allCards.length > 0 ? "✓" : "2"} />
                <ActivityRow title="Share with a player" copy={allCards.some((card) => card.isPublic) ? "Complete" : "Try next"} trailing={allCards.some((card) => card.isPublic) ? "✓" : "3"} />
              </div>
              <Link href="/dashboard/share-links" className="button button-small">Set up sharing</Link>
            </section>

            <section className="card-soft card-body surface-teal">
              <span className="eyebrow">Live game</span>
              <h2>Host from any card</h2>
              <p>Invite players with a room code, then call and verify winners from the host screen.</p>
              <Link href={latestCard ? `/cards/${cardId(latestCard)}?next=play` : "/dashboard/cards"} className="button button-small">Open a card</Link>
            </section>

            <section className="card-soft card-body">
              <div className="section-title-row"><h2>Account snapshot</h2><span className="pill pill-local">{allCards.length} cards</span></div>
              <div className="compact-metrics">
                <div><strong className="stat-value">{gameStats.total}</strong><span className="stat-label">Games played</span></div>
                <div><strong className="stat-value">{gameStats.wins}</strong><span className="stat-label">Wins</span></div>
                <div><strong className="stat-value">{favoriteCards.length}</strong><span className="stat-label">Favorites</span></div>
              </div>
              {!isSubscribed && <PremiumCheckoutButton source="dashboard_plan" className="button button-small button-primary" label="Compare plans" />}
            </section>
          </aside>
        </div>
      </WorkspaceShell>
      <NpsWidget />
    </>
  );
}
