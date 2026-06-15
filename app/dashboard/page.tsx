import { auth } from "@/auth";
import PlaySoloButton from "@/components/PlaySoloButton";
import StartGameButton from "@/components/StartGameButton";
import SignOutButton from "@/components/SignOutButton";
import { redirect } from "next/navigation";
import { getUserByEmail } from "@/lib/db/users";
import { getUserCards } from "@/lib/db/cards";
import { PLANS } from "@/lib/stripe/config";
import ManageSubscriptionButton from "@/components/ManageSubscriptionButton";
import PremiumCheckoutButton from "@/components/PremiumCheckoutButton";
import UpgradeButton from "@/components/UpgradeButton";
import Link from "next/link";
import { getGameHistory, getGameStats } from "@/lib/gameHistory";
import { getUserFavorites } from "@/lib/favorites";
import DashboardEngagement from "./DashboardEngagement";
import DashboardFunnelTracker from "./DashboardFunnelTracker";
import CopyReferralCode from "@/components/CopyReferralCode";
import DashboardTracker from "./DashboardTracker";
import FavCardPreview from "./FavCardPreview";
import UpgradeBanner from "@/components/UpgradeBanner";
import NpsWidget from "@/components/NpsWidget";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import { FACEBOOK_PAGE_URL, IOS_APP_STORE_URL, REDDIT_COMMUNITY_URL } from "@/lib/social-links";
import { getEffectiveCardLimit, hasPremiumAccess } from "@/lib/subscription-status";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user.email
    ? await getUserByEmail(session.user.email)
    : null;

  const currentPlan = user?.planType || "FREE";
  const plan = PLANS[currentPlan as keyof typeof PLANS] || PLANS.FREE;
  const isSubscribed = hasPremiumAccess(user);
  const isNewUser = user?.createdAt && (Date.now() - new Date(user.createdAt).getTime()) < 60000;
  const cancelPending = Boolean(user?.cancelAtPeriodEnd && user?.currentPeriodEnd);
  const subscriptionEndsOn = user?.currentPeriodEnd
    ? new Date(user.currentPeriodEnd).toLocaleDateString()
    : null;

  const recentCards = session.user.id
    ? (await getUserCards(session.user.id)).slice(0, 6)
    : [];

  // Fetch engagement data
  const [gameHistory, gameStats, favorites] = await Promise.all([
    session.user.id ? getGameHistory(session.user.id, 10) : Promise.resolve([]),
    session.user.id ? getGameStats(session.user.id) : Promise.resolve({ total: 0, wins: 0, winRate: 0 }),
    session.user.id ? getUserFavorites(session.user.id, 10) : Promise.resolve([]),
  ]);

  // Resolve favorite card names
  const allCards = session.user.id ? await getUserCards(session.user.id) : [];
  const cardMap = new Map(allCards.map((c) => [c._id.toString(), c]));
  const favoriteCards = favorites
    .map((f) => cardMap.get(f.cardId))
    .filter(Boolean);
  const latestCard = recentCards[0];
  const totalCards = allCards.length;
  const monthlyLimit = isSubscribed ? Number(PLANS.PREMIUM.limits.maxCards) : getEffectiveCardLimit(user);
  const usagePercent = monthlyLimit > 0
    ? Math.min(100, Math.round((totalCards / monthlyLimit) * 100))
    : isSubscribed ? 18 : 0;
  const usageLabel = monthlyLimit === -1
    ? `${totalCards} saved cards`
    : `${totalCards} of ${monthlyLimit} cards used`;
  const firstName = session.user.name?.split(" ")[0] || "Friend";

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900">
      <DashboardTracker cardCount={recentCards.length} planType={currentPlan} />
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 w-[100dvw] max-w-[100dvw] z-50 overflow-hidden bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="w-[100dvw] max-w-[100dvw] px-3 sm:px-4 lg:px-8 h-16 md:h-20 flex items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-2 group">
            <div className="w-9 h-9 md:w-10 md:h-10 shrink-0 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:shadow-indigo-300 transition-all duration-300">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <span className="truncate text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
              MyBingoCard
            </span>
          </Link>
          
          <div className="flex shrink-0 items-center gap-1 sm:gap-2 md:gap-4">
             <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200">
                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                    {session.user.name?.charAt(0) || session.user.email?.charAt(0)}
                </div>
                <span className="text-sm font-medium text-slate-600 max-w-[100px] truncate">
                  {session.user.name || session.user.email}
                </span>
             </div>

            <Link
              href="/dashboard/share-links"
              className="hidden md:inline text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors px-3 py-2"
            >
              Share Links
            </Link>
            <Link
              href="/settings"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors md:h-auto md:w-auto md:px-3 md:py-2 md:text-sm md:font-medium"
              aria-label="Settings"
              title="Settings"
            >
              <svg className="h-5 w-5 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="hidden md:inline">Settings</span>
            </Link>
            {currentPlan === "FREE" && (
              <PremiumCheckoutButton
                source="dashboard_header"
                className="hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold hover:shadow-lg transition-all"
                label="Free tools"
              />
            )}
            <div className="hidden md:block">
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      <DashboardFunnelTracker cardCount={allCards.length} />

      {/* Main Content */}
      <main className="pt-24 md:pt-28 pb-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <section className="mb-6 overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm shadow-indigo-100/60">
            <div className="grid gap-0 lg:grid-cols-[1.55fr_0.95fr]">
              <div className="p-5 sm:p-7 md:p-8">
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {plan.name}
                  </span>
                  {cancelPending && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
                      Ending soon
                    </span>
                  )}
                </div>
                <h1 className="max-w-2xl text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                  {isNewUser ? "Build your first bingo card" : `Welcome back, ${firstName}`}
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                  {isNewUser
                    ? "Start with a template, customize the card, then play, share, or download a printable batch."
                    : "Create cards, manage downloads, share player links, and pick up where you left off."}
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/create"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:shadow-indigo-300"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.3} d="M12 5v14m7-7H5" />
                    </svg>
                    Create card
                  </Link>
                  <Link
                    href="/dashboard/cards"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.3} d="M4 5h16M4 12h16M4 19h16" />
                    </svg>
                    Saved cards
                  </Link>
                  <Link
                    href="/dashboard/share-links"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.3} d="M7 8a3 3 0 100-6 3 3 0 000 6zm10 7a3 3 0 100-6 3 3 0 000 6zM7 22a3 3 0 100-6 3 3 0 000 6zm2.6-5.4l4.8-3.2M9.6 7.4l4.8 3.2" />
                    </svg>
                    Share links
                  </Link>
                </div>
              </div>
              <aside className="border-t border-indigo-200 bg-gradient-to-br from-violet-600 to-indigo-700 p-5 text-white sm:p-7 md:p-8 lg:border-l lg:border-t-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-indigo-100">Plan usage</p>
                    <p className="mt-2 text-2xl font-black">{usageLabel}</p>
                  </div>
                  {!isSubscribed ? (
                    <UpgradeButton>Use free tools</UpgradeButton>
                  ) : (
                    <div className="[&_button]:border-white/30 [&_button]:text-white [&_button]:hover:bg-white/10">
                      <ManageSubscriptionButton />
                    </div>
                  )}
                </div>
                <div className="mt-6">
                  <div className="h-2 overflow-hidden rounded-full bg-white/20">
                    <div className="h-full rounded-full bg-white" style={{ width: `${usagePercent}%` }} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/20 bg-white/10 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-100">Templates</p>
                      <p className="mt-1 text-sm font-bold">{plan.limits.canUseAdvancedTemplates ? "All premium" : "Starter set"}</p>
                    </div>
                    <div className="rounded-xl border border-white/20 bg-white/10 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-100">Downloads</p>
                      <p className="mt-1 text-sm font-bold">Included</p>
                    </div>
                  </div>
                  {subscriptionEndsOn && (
                    <p className="mt-4 text-sm text-indigo-100">
                      {cancelPending ? `Access ends ${subscriptionEndsOn}` : `Renews ${subscriptionEndsOn}`}
                    </p>
                  )}
                </div>
              </aside>
            </div>
          </section>

          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Mobile app</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">MyBingoCard for iPhone</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">Open your cards from the iPhone app.</p>
              </div>
              <a
                href={IOS_APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Download MyBingoCard on the App Store"
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-lg px-1 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <img
                  src="/badges/download-on-the-app-store.svg"
                  alt="Download on the App Store"
                  width={120}
                  height={40}
                  className="h-10 w-auto"
                />
              </a>
            </div>
          </section>

          <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Saved cards", value: totalCards.toString(), tone: "text-indigo-700", sub: latestCard ? "Latest ready" : "Start creating" },
              { label: "Games played", value: gameStats.total.toString(), tone: "text-violet-700", sub: `${gameStats.wins} wins` },
              { label: "Favorites", value: favoriteCards.length.toString(), tone: "text-rose-700", sub: "Pinned cards" },
              { label: "Max grid", value: `${plan.limits.maxSize}x${plan.limits.maxSize}`, tone: "text-emerald-700", sub: "Current plan" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className={`mt-2 text-2xl font-black ${item.tone}`}>{item.value}</p>
                <p className="mt-1 text-xs text-slate-500">{item.sub}</p>
              </div>
            ))}
          </section>

          {recentCards.length === 0 && (
            <section className="mb-8 rounded-2xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm md:p-7">
              <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">Create your first card</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Pick a template, add your words or images, then print or share the cards with players.
                  </p>
                  <Link href="/create" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:shadow-indigo-300">
                    Start creating
                  </Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { title: "Choose", desc: "Start from a use-case template." },
                    { title: "Customize", desc: "Edit words, images, free space, and style." },
                    { title: "Play", desc: "Export a card, generate batch packs, or add player links." },
                  ].map((step, index) => (
                    <div key={step.title} className="rounded-xl border border-white/70 bg-white p-4">
                      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-sm font-black text-indigo-700">
                        {index + 1}
                      </div>
                      <p className="font-bold text-slate-950">{step.title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{step.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {currentPlan === "FREE" && recentCards.length >= 1 && (
            <UpgradeBanner />
          )}

          <OnboardingChecklist />

          <section className="mb-8 grid gap-4 lg:grid-cols-3">
            {[
              {
                href: "/create",
                title: "Create card",
                desc: "Build a new card from scratch or AI prompts.",
                color: "border-slate-200 hover:border-slate-300",
                icon: "M12 5v14m7-7H5",
              },
              {
                href: "/templates",
                title: "Browse templates",
                desc: "Start faster with ready-made card categories.",
                color: "border-indigo-200 hover:border-indigo-300",
                icon: "M4 5h7v7H4V5zm9 0h7v7h-7V5zM4 14h7v5H4v-5zm9 0h7v5h-7v-5z",
              },
              {
                href: "/dashboard/share-links",
                title: "Share player links",
                desc: "Send monetized email batches or copy links.",
                color: "border-emerald-200 hover:border-emerald-300",
                icon: "M7 8a3 3 0 100-6 3 3 0 000 6zm10 7a3 3 0 100-6 3 3 0 000 6zM7 22a3 3 0 100-6 3 3 0 000 6zm2.6-5.4l4.8-3.2M9.6 7.4l4.8 3.2",
              },
            ].map((action) => (
              <Link key={action.title} href={action.href} className={`group rounded-2xl border bg-white p-5 shadow-sm transition ${action.color}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-black text-slate-950">{action.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{action.desc}</p>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 transition group-hover:bg-indigo-600 group-hover:text-white">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d={action.icon} />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </section>

          {latestCard && (
            <section className="mb-8 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Continue working</p>
                  <h2 className="mt-1 truncate text-xl font-black text-slate-900">{latestCard.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {latestCard.size}x{latestCard.size} card created {new Date(latestCard.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                  <Link href={`/cards/${latestCard._id.toString()}?next=play`} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:shadow-lg hover:shadow-indigo-200">
                    Play
                  </Link>
                  <Link href={`/cards/${latestCard._id.toString()}?next=share`} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700">
                    Share
                  </Link>
                  <Link href={`/cards/${latestCard._id.toString()}?next=export`} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                    PDF
                  </Link>
                  <Link href={`/create?cardId=${latestCard._id.toString()}`} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                    Edit
                  </Link>
                </div>
              </div>
            </section>
          )}

          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
               <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Library</p>
               <h2 className="mt-1 text-xl font-black text-slate-950">My cards</h2>
              </div>
               {recentCards.length > 0 && (
                 <Link href="/dashboard/cards" className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                    View All
                 </Link>
               )}
            </div>

            {recentCards.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center text-sm text-slate-500">
                Your cards will appear here once you create one.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentCards.map((card) => (
                  <div key={card._id.toString()} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
                    <Link href={`/cards/${card._id.toString()}`} className="block">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {card.title}
                        </h3>
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">
                          {card.size}x{card.size}
                        </span>
                      </div>
                      <FavCardPreview card={card} />
                      <p className="text-xs text-slate-400 mb-3">
                        {new Date(card.createdAt).toLocaleDateString()}
                      </p>
                    </Link>
                    <div className="grid grid-cols-3 gap-2">
                      <PlaySoloButton cardId={card._id.toString()} />
                      <StartGameButton cardId={card._id.toString()} label="Friends" compact />
                      <Link href={`/cards/${card._id.toString()}?next=share`} className="text-center px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg hover:bg-emerald-100 hover:border-emerald-200 transition-colors text-sm font-semibold">
                        Share
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {gameStats.total > 0 && (
            <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Activity</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">Game history</h2>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <p className="text-2xl font-black text-indigo-600">{gameStats.total}</p>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">Played</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <p className="text-2xl font-black text-emerald-600">{gameStats.wins}</p>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">Wins</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <p className="text-2xl font-black text-amber-600">{gameStats.winRate}%</p>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">Win Rate</p>
                </div>
              </div>
              {gameHistory.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-3 px-2 font-semibold text-slate-500 uppercase tracking-wide text-xs">Card</th>
                        <th className="text-left py-3 px-2 font-semibold text-slate-500 uppercase tracking-wide text-xs">Result</th>
                        <th className="text-left py-3 px-2 font-semibold text-slate-500 uppercase tracking-wide text-xs">Duration</th>
                        <th className="text-left py-3 px-2 font-semibold text-slate-500 uppercase tracking-wide text-xs">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gameHistory.map((g) => (
                        <tr key={g._id?.toString()} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-2">
                            <Link href={`/cards/${g.cardId}`} className="text-indigo-600 hover:underline font-medium">
                              {g.cardName}
                            </Link>
                          </td>
                          <td className="py-3 px-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                              g.won ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                            }`}>
                              {g.won ? "Win" : "Played"}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-slate-600">
                            {g.duration < 60 ? `${g.duration}s` : `${Math.floor(g.duration / 60)}m ${g.duration % 60}s`}
                          </td>
                          <td className="py-3 px-2 text-slate-500">
                            {new Date(g.datePlayed).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* Recently Played (client component with localStorage) */}
          <DashboardEngagement />

          {/* Favorites */}
          {favoriteCards.length > 0 && (
            <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  Favorites
                </h2>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favoriteCards.map((card: any) => (
                  <div key={card._id.toString()} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
                    <Link href={`/cards/${card._id.toString()}`} className="block">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {card.title}
                        </h3>
                        <span className="text-xs font-medium text-slate-400 bg-white px-2 py-0.5 rounded">
                          {card.size}x{card.size}
                        </span>
                      </div>
                      <FavCardPreview card={card} />
                      <p className="text-xs text-slate-400 mb-3">
                        {new Date(card.createdAt).toLocaleDateString()}
                      </p>
                    </Link>
                    <div className="grid grid-cols-3 gap-2">
                      <PlaySoloButton cardId={card._id.toString()} />
                      <StartGameButton cardId={card._id.toString()} label="Friends" compact />
                      <Link href={`/cards/${card._id.toString()}?next=share`} className="text-center px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg hover:bg-emerald-100 hover:border-emerald-200 transition-colors text-sm font-semibold">
                        Share
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Referral Section */}
          {(user as any)?.referralCode && (
            <div className="mb-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 md:p-8 text-white shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold mb-1">Share MyBingoCard</h2>
                  <p className="text-white/80 text-sm">Share your link with friends. When they sign up, you both win.</p>
                </div>
                <div className="flex w-full min-w-0 flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                  <CopyReferralCode code={(user as any).referralCode} />
                  <Link href="/dashboard/referrals" className="w-full shrink-0 rounded-xl bg-white px-5 py-2.5 text-center text-sm font-bold text-emerald-700 transition-all hover:shadow-lg sm:w-auto">
                    View Referrals
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Live Games Section */}
          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 10l4.55-2.28A1 1 0 0121 8.62v6.76a1 1 0 01-1.45.9L15 14M5 18h10a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <h2 className="text-xl font-black text-slate-950">Live bingo games</h2>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">New</span>
                </div>
                <p className="text-sm leading-6 text-slate-600">Host a live game from any saved card. Players join with a room code and play together in real time.</p>
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                <Link href="/game/join" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                  Join a Game
                </Link>
                <Link href="/dashboard/cards" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700">
                  Host a Game
                </Link>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="container mx-auto px-4 lg:px-8 max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-slate-700">MyBingoCard</span>
            </div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-slate-500">
              <Link href="/templates" className="hover:text-indigo-600 transition-colors">Templates</Link>
              <Link href="/pricing" className="hover:text-indigo-600 transition-colors">Pricing</Link>
              <Link href="/privacy" className="hover:text-indigo-600 transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-indigo-600 transition-colors">Terms</Link>
              <Link href="/contact" className="hover:text-indigo-600 transition-colors">Contact</Link>
              <a href={FACEBOOK_PAGE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors">
                Facebook
              </a>
              <a href={REDDIT_COMMUNITY_URL} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors">
                Reddit
              </a>
            </div>
            <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} MyBingoCard</p>
          </div>
        </div>
      </footer>
      <NpsWidget />
    </div>
  );
}
