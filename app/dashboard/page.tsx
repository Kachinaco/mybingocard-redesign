import { auth } from "@/auth";
import SignOutButton from "@/components/SignOutButton";
import { redirect } from "next/navigation";
import { getUserByEmail } from "@/lib/db/users";
import { getUserCards } from "@/lib/db/cards";
import { PLANS } from "@/lib/stripe/config";
import ManageSubscriptionButton from "@/components/ManageSubscriptionButton";
import Link from "next/link";
import { getGameHistory, getGameStats } from "@/lib/gameHistory";
import { getUserFavorites } from "@/lib/favorites";
import DashboardEngagement from "./DashboardEngagement";
import FavCardPreview from "./FavCardPreview";

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
              href="/settings"
              className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors px-3 py-2"
            >
              Settings
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-32 pb-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-10 animate-fade-in-up">
            <h1 className="text-3xl font-bold text-slate-900">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">{session.user.name?.split(" ")[0] || "Friend"}</span>!
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              Here&apos;s what&apos;s happening with your bingo cards today.
            </p>
          </div>

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
                            user?.subscriptionStatus === "active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user?.subscriptionStatus === "active" ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                          {user?.subscriptionStatus || "active"}
                        </span>
                        {user?.currentPeriodEnd && (
                          <span className="text-slate-500">
                            Renews {new Date(user.currentPeriodEnd).toLocaleDateString()}
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
                      <Link
                        href="/pricing"
                        className="inline-flex items-center justify-center px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-200 transition-all font-semibold text-sm"
                      >
                        Upgrade Now
                      </Link>
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
                      {plan.limits.maxCards === -1 ? "Unlimited" : `${plan.limits.maxCards} Cards`}
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
                      {plan.limits.canUseAdvancedTemplates ? "Full Access" : "Basic"}
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

          {/* Game Stats Summary */}
          {gameStats.total > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-10 animate-fade-in-up animation-delay-150">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 text-center">
                <p className="text-3xl font-black text-indigo-600">{gameStats.total}</p>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">Games Played</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 text-center">
                <p className="text-3xl font-black text-emerald-600">{gameStats.wins}</p>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">Wins</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 text-center">
                <p className="text-3xl font-black text-amber-600">{gameStats.winRate}%</p>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">Win Rate</p>
              </div>
            </div>
          )}

          {/* Recently Played (client component with localStorage) */}
          <DashboardEngagement />

          {/* Game History */}
          {gameHistory.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 mb-10 animate-fade-in-up animation-delay-300">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Game History</h2>
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
            </div>
          )}

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
                  <Link
                    key={card._id.toString()}
                    href={`/cards/${card._id.toString()}`}
                    className="group p-4 bg-slate-50 hover:bg-indigo-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {card.title}
                      </h3>
                      <span className="text-xs font-medium text-slate-400 bg-white px-2 py-0.5 rounded">
                        {card.size}x{card.size}
                      </span>
                    </div>
                    <FavCardPreview card={card} />
                    <p className="text-xs text-slate-400">
                      {new Date(card.createdAt).toLocaleDateString()}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent Cards Preview */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 animate-fade-in-up animation-delay-300">
            <div className="flex items-center justify-between mb-8">
               <h2 className="text-xl font-bold text-slate-900">Recent Cards</h2>
               {recentCards.length > 0 && (
                 <Link href="/dashboard/cards" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline">
                    View All
                 </Link>
               )}
            </div>

            {recentCards.length === 0 ? (
              <div className="text-center py-16 bg-slate-50/50 rounded-xl border border-slate-100 border-dashed">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                  <svg
                    className="w-8 h-8 text-slate-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-1">No cards created yet</h3>
                <p className="text-slate-500 text-sm mb-6">
                  Your recently created bingo cards will appear here.
                </p>
                <Link
                  href="/create"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Your First Card
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentCards.map((card) => (
                  <Link
                    key={card._id.toString()}
                    href={`/cards/${card._id.toString()}`}
                    className="group p-4 bg-slate-50 hover:bg-indigo-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {card.title}
                      </h3>
                      <span className="text-xs font-medium text-slate-400 bg-white px-2 py-0.5 rounded">
                        {card.size}x{card.size}
                      </span>
                    </div>
                    <FavCardPreview card={card} />
                    <p className="text-xs text-slate-400">
                      {new Date(card.createdAt).toLocaleDateString()}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
