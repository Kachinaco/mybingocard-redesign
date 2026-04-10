import { auth } from "@/auth";
import PlaySoloButton from "@/components/PlaySoloButton";
import StartGameButton from "@/components/StartGameButton";
import SignOutButton from "@/components/SignOutButton";
import { redirect } from "next/navigation";
import { getUserByEmail } from "@/lib/db/users";
import { getUserCards } from "@/lib/db/cards";
import { PLANS } from "@/lib/stripe/config";
import ManageSubscriptionButton from "@/components/ManageSubscriptionButton";
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
  const isSubscribed = currentPlan !== "FREE";
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

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900">
      <DashboardTracker cardCount={recentCards.length} planType={currentPlan} />
      {/* Header */}
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
          
          <div className="flex items-center gap-4">
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
              className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors px-3 py-2"
            >
              Settings
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <DashboardFunnelTracker cardCount={allCards.length} />

      {/* Main Content */}
      <main className="pt-32 pb-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-10 animate-fade-in-up">
            <h1 className="text-3xl font-bold text-slate-900">
              {isNewUser ? "Welcome" : "Welcome back"}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">{session.user.name?.split(" ")[0] || "Friend"}</span>!
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              {isNewUser ? "Let's create your first bingo card — it takes less than 2 minutes." : "Here's what's happening with your bingo cards today."}
            </p>
          </div>

          {recentCards.length === 0 && (
            <div className="mb-8 rounded-2xl overflow-hidden border border-indigo-100 shadow-lg animate-fade-in-up">
              <div className="bg-gradient-to-br from-violet-600 to-indigo-600 px-8 py-10 text-white text-center">
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="text-2xl font-bold mb-2">Create your first bingo card</h3>
                <p className="text-indigo-100 mb-6 max-w-md mx-auto">
                  Pick a theme, add your words, and you&apos;ll have a ready-to-print bingo card in under 2 minutes.
                </p>
                <Link
                  href="/create"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold text-lg hover:bg-indigo-50 transition-all shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Start Creating
                </Link>
              </div>
              <div className="bg-white px-8 py-6 grid grid-cols-3 gap-6 text-center">
                {[
                  { icon: "🎨", title: "Pick a theme", desc: "Wedding, classroom, baby shower & more" },
                  { icon: "✏️", title: "Add your words", desc: "Type your items or use a template" },
                  { icon: "🖨️", title: "Print & play", desc: "Download PDF and share with everyone" },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="flex flex-col items-center">
                    <div className="text-2xl mb-2">{icon}</div>
                    <div className="font-bold text-slate-900 text-sm mb-1">{title}</div>
                    <div className="text-slate-500 text-xs">{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}



          {currentPlan === "FREE" && recentCards.length >= 1 && (
            <UpgradeBanner />
          )}

          <OnboardingChecklist />

          <div className="grid lg:grid-cols-3 gap-8 mb-10">
             {/* Subscription Status Card */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 animate-fade-in-up animation-delay-100 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 pointer-events-none group-hover:opacity-80 transition-opacity duration-500"></div>
               
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">
                      Current Plan: <span className="text-indigo-600">{plan.name}</span>
                    </h2>
                    {isSubscribed ? (
                      <div className="flex items-center gap-3 text-sm">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                            cancelPending
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : user?.subscriptionStatus === "active"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cancelPending ? "bg-amber-500" : user?.subscriptionStatus === "active" ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                          {cancelPending ? "scheduled to end" : user?.subscriptionStatus || "active"}
                        </span>
                        {subscriptionEndsOn && (
                          <span className="text-slate-500">
                            {cancelPending ? `Ends ${subscriptionEndsOn}` : `Renews ${subscriptionEndsOn}`}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm">
                        Unlock premium features and unlimited cards.
                      </p>
                    )}
                  </div>
                  
                  <div>
                    {!isSubscribed ? (
                      <UpgradeButton>Subscribe Now</UpgradeButton>
                    ) : (
                      <div className="flex">
                         <ManageSubscriptionButton />
                      </div>
                    )}
                  </div>
                </div>

                {/* Plan Features Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-100">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Monthly Limit</p>
                    <p className="text-lg font-bold text-slate-900">
                      {plan.limits.maxCards === -1 ? "Unlimited" : `${plan.limits.maxCards} Card${plan.limits.maxCards !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Grid Size</p>
                    <p className="text-lg font-bold text-slate-900">
                      Up to {plan.limits.maxSize}x{plan.limits.maxSize}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Templates</p>
                    <p className="text-lg font-bold text-slate-900">
                      {plan.limits.canUseAdvancedTemplates ? "All 30+" : "5 Starter"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Export</p>
                    <p className="text-lg font-bold text-slate-900">
                      {plan.limits.canExportPNG ? "PDF + PNG" : "PDF Only"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

             {/* Quick Actions Panel */}
             <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-xl shadow-slate-200 text-white p-6 md:p-8 flex flex-col justify-between animate-fade-in-up animation-delay-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500 opacity-20 rounded-full -ml-10 -mb-10 blur-2xl"></div>
                
                <div className="relative z-10">
                   <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
                   <div className="space-y-3">
                      <Link href="/create" className="flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors border border-white/5 group">
                         <span className="font-medium">Create New Card</span>
                         <svg className="w-5 h-5 text-indigo-300 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                         </svg>
                      </Link>
                      <Link href="/templates" className="flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors border border-white/5 group">
                         <span className="font-medium">Browse Templates</span>
                         <svg className="w-5 h-5 text-indigo-300 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                         </svg>
                      </Link>
                   </div>
                </div>

                <div className="mt-8 relative z-10">
                   <Link href="/dashboard/cards" className="text-sm text-indigo-300 hover:text-white transition-colors flex items-center gap-1">
                      View all my cards
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                   </Link>
                </div>
             </div>
          </div>

          {/* Recent Cards Preview — moved up as primary content */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 mb-10 animate-fade-in-up animation-delay-150">
            <div className="flex items-center justify-between mb-8">
               <h2 className="text-xl font-bold text-slate-900">My Cards</h2>
               {recentCards.length > 0 && (
                 <Link href="/dashboard/cards" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline">
                    View All
                 </Link>
               )}
            </div>

            {recentCards.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                Your cards will appear here once you create one.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentCards.map((card) => (
                  <div key={card._id.toString()} className="group p-4 bg-slate-50 hover:bg-indigo-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-all">
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
                    <div className="grid grid-cols-2 gap-2">
                      <PlaySoloButton cardId={card._id.toString()} />
                      <StartGameButton cardId={card._id.toString()} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Game Stats + History combined */}
          {gameStats.total > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 mb-10 animate-fade-in-up animation-delay-200">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Game Activity</h2>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  <p className="text-2xl font-black text-indigo-600">{gameStats.total}</p>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">Played</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  <p className="text-2xl font-black text-emerald-600">{gameStats.wins}</p>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">Wins</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
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
                              {g.won ? "🎉 Win" : "Played"}
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
            </div>
          )}

          {/* Recently Played (client component with localStorage) */}
          <DashboardEngagement />

          {/* Favorites */}
          {favoriteCards.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 mb-10 animate-fade-in-up animation-delay-400">
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
                  <div key={card._id.toString()} className="group p-4 bg-slate-50 hover:bg-indigo-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-all">
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
                    <div className="grid grid-cols-2 gap-2">
                      <PlaySoloButton cardId={card._id.toString()} />
                      <StartGameButton cardId={card._id.toString()} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Referral Section */}
          {(user as any)?.referralCode && (
            <div className="mb-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 md:p-8 text-white shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold mb-1">Share MyBingoCard</h2>
                  <p className="text-white/80 text-sm">Share your link with friends. When they sign up, you both win.</p>
                </div>
                <div className="flex items-center gap-3">
                  <CopyReferralCode code={(user as any).referralCode} />
                  <Link href="/dashboard/referrals" className="px-5 py-2.5 bg-white text-emerald-700 font-bold rounded-xl text-sm hover:shadow-lg transition-all shrink-0">
                    View Referrals
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Live Games Section */}
          <div className="mb-8 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 md:p-8 text-white shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🎮</span>
                  <h2 className="text-xl font-bold">Live Bingo Games</h2>
                  <span className="px-2 py-0.5 bg-white/20 text-white text-xs font-bold rounded-full">NEW</span>
                </div>
                <p className="text-white/80 text-sm">Host a live game from any of your cards — friends join with a room code and play together in real time.</p>
              </div>
              <div className="flex gap-3 shrink-0">
                <Link href="/game/join" className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold rounded-xl text-sm transition-all">
                  Join a Game
                </Link>
                <Link href="/dashboard/cards" className="px-5 py-2.5 bg-white text-violet-700 font-bold rounded-xl text-sm hover:shadow-lg transition-all">
                  Host a Game →
                </Link>
              </div>
            </div>
          </div>

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
            <div className="flex gap-6 text-sm text-slate-500">
              <Link href="/templates" className="hover:text-indigo-600 transition-colors">Templates</Link>
              <Link href="/pricing" className="hover:text-indigo-600 transition-colors">Pricing</Link>
              <Link href="/privacy" className="hover:text-indigo-600 transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-indigo-600 transition-colors">Terms</Link>
              <Link href="/contact" className="hover:text-indigo-600 transition-colors">Contact</Link>
            </div>
            <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} MyBingoCard</p>
          </div>
        </div>
      </footer>
      <NpsWidget />
    </div>
  );
}
