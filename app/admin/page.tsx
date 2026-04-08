import { auth } from "@/auth";
import { redirect } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import Link from "next/link";
import { isAdminSession } from "@/lib/admin";
import { getAdminStats as getSharedAdminStats } from "@/lib/db/admin-stats";

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const HIGH_VALUE_EVENTS = [
  "signup_completed",
  "first_card_created",
  "first_ai_generation",
  "checkout_completed",
  "subscription_activated",
  "subscription_canceled",
  "trial_ending_soon",
  "trial_churn_risk_detected",
  "billing_payment_failed",
] as const;

type HighValueEvent = (typeof HIGH_VALUE_EVENTS)[number];

const EVENT_CONFIG: Record<HighValueEvent, { icon: string; label: string }> = {
  signup_completed: { icon: "\u{1F389}", label: "signed up" },
  first_card_created: { icon: "\u{1F0CF}", label: "created their first card" },
  first_ai_generation: { icon: "\u2728", label: "used AI generation for the first time" },
  checkout_completed: { icon: "\u{1F4B3}", label: "completed checkout" },
  subscription_activated: { icon: "\u{1F680}", label: "activated their subscription" },
  subscription_canceled: { icon: "\u274C", label: "canceled their subscription" },
  trial_ending_soon: { icon: "\u23F0", label: "trial ending soon" },
  trial_churn_risk_detected: { icon: "\u26A0\uFE0F", label: "flagged as churn risk" },
  billing_payment_failed: { icon: "\u{1F534}", label: "payment failed" },
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

interface ActivityEvent {
  _id: { toString(): string };
  event: string;
  email: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

const SUBSCRIPTION_STATUSES: {
  key: string;
  label: string;
  barClass: string;
  dotClass: string;
}[] = [
  { key: "active", label: "Active", barClass: "bg-emerald-500", dotClass: "bg-emerald-500" },
  { key: "trialing", label: "Trialing", barClass: "bg-amber-400", dotClass: "bg-amber-400" },
  { key: "lifetime", label: "Lifetime", barClass: "bg-violet-500", dotClass: "bg-violet-500" },
  { key: "past_due", label: "Past Due", barClass: "bg-orange-500", dotClass: "bg-orange-500" },
  { key: "canceled", label: "Canceled", barClass: "bg-red-500", dotClass: "bg-red-500" },
  { key: "none", label: "Free / Inactive", barClass: "bg-slate-300", dotClass: "bg-slate-400" },
];

async function getPageData() {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const [shared, recentUsers, recentActivity] = await Promise.all([
    getSharedAdminStats(),
    db
      .collection("users")
      .find(
        {},
        { projection: { name: 1, email: 1, planType: 1, createdAt: 1 } }
      )
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray(),
    db
      .collection("activity_events")
      .find(
        { event: { $in: [...HIGH_VALUE_EVENTS] } },
        { projection: { event: 1, email: 1, metadata: 1, createdAt: 1 } }
      )
      .sort({ createdAt: -1 })
      .limit(15)
      .toArray() as unknown as Promise<ActivityEvent[]>,
  ]);

  // Derive signup method display data from shared stats
  const signupMethods = Object.entries(shared.signupsByMethod)
    .map(([method, count]) => ({ method, count }))
    .sort((a, b) => b.count - a.count);
  const signupMethodTotal = signupMethods.reduce((s, r) => s + r.count, 0);

  // Derive UTM source display data from shared stats
  const utmSources = Object.entries(shared.signupsBySource)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const utmSourceTotal = utmSources.reduce((s, r) => s + r.count, 0);

  return {
    ...shared,
    recentUsers,
    signupMethods,
    signupMethodTotal,
    utmSources,
    utmSourceTotal,
    recentActivity,
    generatedAt: new Date(),
  };
}

export default async function AdminOverviewPage() {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect("/dashboard");
  }

  const stats = await getPageData();

  const statCards = [
    {
      label: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      description: "All registered accounts",
      color: "indigo" as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      label: "Paid Users",
      value: stats.paidUsers.toLocaleString(),
      description: "Active Premium subscriptions",
      color: "emerald" as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
    },
    {
      label: "Trialing",
      value: stats.trialingUsers.toLocaleString(),
      description: "Free trial (not yet paying)",
      color: "sky" as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Total Cards",
      value: stats.totalCards.toLocaleString(),
      description: "Bingo cards created",
      color: "violet" as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      label: "Recent Signups",
      value: stats.recentSignups.toLocaleString(),
      description: "Last 7 days",
      color: "rose" as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      label: "Conversion Rate",
      value: `${stats.trialConversionRate}%`,
      description: `${stats.convertedTrials} of ${stats.totalTrialsEver} trials`,
      color: "teal" as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
      ),
    },
    {
      label: "Lifetime Users",
      value: stats.lifetimeUsers.toLocaleString(),
      description: "Lifetime plan holders",
      color: "purple" as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
    },
    {
      label: "Past Due",
      value: stats.pastDueUsers.toLocaleString(),
      description: "Failed payment, not yet canceled",
      color: "orange" as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      label: "Canceled",
      value: stats.canceledUsers.toLocaleString(),
      description: "Previously subscribed, now canceled",
      color: "red" as const,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
    },
  ];

  const colorClasses = {
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600", iconBg: "bg-indigo-100" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", iconBg: "bg-emerald-100" },
    violet: { bg: "bg-violet-50", text: "text-violet-600", iconBg: "bg-violet-100" },
    sky: { bg: "bg-sky-50", text: "text-sky-600", iconBg: "bg-sky-100" },
    rose: { bg: "bg-rose-50", text: "text-rose-600", iconBg: "bg-rose-100" },
    teal: { bg: "bg-teal-50", text: "text-teal-600", iconBg: "bg-teal-100" },
    purple: { bg: "bg-purple-50", text: "text-purple-600", iconBg: "bg-purple-100" },
    orange: { bg: "bg-orange-50", text: "text-orange-600", iconBg: "bg-orange-100" },
    red: { bg: "bg-red-50", text: "text-red-600", iconBg: "bg-red-100" },
  } as const;

  const animationDelays = [
    "animation-delay-100",
    "animation-delay-200",
    "animation-delay-300",
    "animation-delay-400",
    "animation-delay-500",
    "animation-delay-100",
    "animation-delay-200",
    "animation-delay-300",
    "animation-delay-400",
  ];

  const updatedAt = stats.generatedAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Phoenix",
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-8 sm:mb-10 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="text-slate-500 mt-1">
            Key metrics and recent activity for MyBingoCard.
          </p>
        </div>
        <p className="text-xs text-slate-400 mt-2 sm:mt-0">
          Last updated {updatedAt} MST
        </p>
      </div>

      {/* MRR Hero Card */}
      <div className="mb-8 opacity-0 animate-fade-in-up">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-400 p-6 sm:p-8 shadow-lg shadow-amber-200/50">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/3" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                  Monthly Recurring Revenue
                </span>
              </div>
              <p className="text-4xl sm:text-5xl font-extrabold text-white">
                ${formatCurrency(stats.revenueEstimate)}
              </p>
            </div>
            <div className="text-sm text-white/80 sm:text-right">
              <p>{stats.paidUsers.toLocaleString()} paying subscribers</p>
              <p>$4.99/mo per user</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards -- 9 cards: 3 rows of 3 on lg+, 2 on sm, 1 on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {statCards.map((stat, i) => {
          const colors = colorClasses[stat.color];
          return (
            <div
              key={stat.label}
              className={`bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow opacity-0 animate-fade-in-up ${animationDelays[i] ?? ""}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {stat.label}
                </span>
                <div className={`w-8 h-8 rounded-lg ${colors.iconBg} ${colors.text} flex items-center justify-center`}>
                  {stat.icon}
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-1">{stat.description}</p>
            </div>
          );
        })}
      </div>

      {/* Subscription Overview */}
      {(() => {
        const breakdown = stats.subscriptionStatusBreakdown;
        const total = Object.values(breakdown).reduce((s, n) => s + n, 0);
        if (total === 0) return null;

        const segments = SUBSCRIPTION_STATUSES
          .map((s) => ({ ...s, count: breakdown[s.key] ?? 0 }))
          .filter((s) => s.count > 0);

        // Catch any statuses not in our config
        const knownKeys = new Set(SUBSCRIPTION_STATUSES.map((s) => s.key));
        for (const [key, count] of Object.entries(breakdown)) {
          if (!knownKeys.has(key) && count > 0) {
            segments.push({
              key,
              label: key.charAt(0).toUpperCase() + key.slice(1),
              barClass: "bg-slate-400",
              dotClass: "bg-slate-400",
              count,
            });
          }
        }

        return (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-10 opacity-0 animate-fade-in-up animation-delay-600">
            <div className="border-b border-slate-100 p-4 sm:p-6">
              <h2 className="text-lg font-bold text-slate-900">Subscription Overview</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                {total.toLocaleString()} total users by subscription status
              </p>
            </div>
            <div className="p-4 sm:p-6">
              {/* Stacked bar */}
              <div className="flex h-6 rounded-full overflow-hidden bg-slate-100">
                {segments.map((seg) => (
                  <div
                    key={seg.key}
                    className={`${seg.barClass} transition-all`}
                    style={{ width: `${(seg.count / total) * 100}%` }}
                    title={`${seg.label}: ${seg.count.toLocaleString()}`}
                  />
                ))}
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                {segments.map((seg) => {
                  const pct = Math.round((seg.count / total) * 1000) / 10;
                  return (
                    <div key={seg.key} className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${seg.dotClass}`} />
                      <span className="text-sm text-slate-700">
                        {seg.label}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {seg.count.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400">
                        ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-10 opacity-0 animate-fade-in-up animation-delay-600">
        <div className="border-b border-slate-100 p-4 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">Quick Actions</h2>
          <p className="text-sm text-slate-400 mt-0.5">Common admin tasks</p>
        </div>
        <div className="p-4 sm:p-6 flex flex-wrap gap-3">
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-violet-50 text-violet-700 text-sm font-medium hover:bg-violet-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            View Stripe Dashboard
          </a>
          <a
            href="https://discord.com/channels/@me"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            View Discord Channel
          </a>
          <Link
            href="/api/admin/export-users"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Users CSV
          </Link>
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 text-amber-700 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Trial Expiry Check
            <span className="text-xs text-amber-500 font-normal ml-1">
              via <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">scripts/expire-trials.cjs</code>
            </span>
          </div>
        </div>
      </div>

      {/* Trial Funnel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-10 opacity-0 animate-fade-in-up animation-delay-600">
        <div className="border-b border-slate-100 p-4 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">Trial Funnel</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Lifetime trial starts, current status, and conversion
          </p>
        </div>
        <div className="p-4 sm:p-6">
          {/* Conversion rate hero */}
          <div className="text-center mb-8">
            <p className="text-5xl font-extrabold text-emerald-600">
              {stats.trialConversionRate}%
            </p>
            <p className="text-sm text-slate-400 mt-1">Trial-to-Paid Conversion Rate</p>
          </div>

          {/* Funnel steps */}
          <div className="max-w-lg mx-auto space-y-3">
            {/* Total trials */}
            <div className="relative">
              <div className="w-full bg-indigo-50 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-indigo-700">Started a Trial</span>
                <span className="text-lg font-bold text-indigo-700">
                  {stats.totalTrialsEver.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center text-slate-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>

            {/* Currently trialing */}
            <div className="relative">
              <div className="w-[90%] mx-auto bg-sky-50 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-sky-700">Currently Trialing</span>
                <span className="text-lg font-bold text-sky-700">
                  {stats.trialingUsers.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center text-slate-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>

            {/* Converted + Churned side by side */}
            <div className="flex gap-3">
              <div className="flex-1 bg-emerald-50 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-emerald-700">Converted to Paid</span>
                <span className="text-lg font-bold text-emerald-700">
                  {stats.convertedTrials.toLocaleString()}
                </span>
              </div>
              <div className="flex-1 bg-rose-50 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-rose-700">Churned</span>
                <span className="text-lg font-bold text-rose-700">
                  {stats.unconvertedTrials.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Signup Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        {/* By Method */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm opacity-0 animate-fade-in-up animation-delay-600">
          <div className="border-b border-slate-100 p-4 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">Signup Sources</h2>
            <p className="text-sm text-slate-400 mt-0.5">By authentication method</p>
          </div>
          <div className="p-4 sm:p-6 space-y-3">
            {stats.signupMethods
              .sort((a, b) => b.count - a.count)
              .map((m) => {
                const pct =
                  stats.signupMethodTotal > 0
                    ? Math.round((m.count / stats.signupMethodTotal) * 100)
                    : 0;
                const label =
                  m.method === "google"
                    ? "Google"
                    : m.method === "credentials"
                      ? "Credentials"
                      : m.method === "magic-link"
                        ? "Magic Link"
                        : m.method.charAt(0).toUpperCase() + m.method.slice(1);
                const barColor =
                  m.method === "google"
                    ? "bg-blue-500"
                    : m.method === "credentials"
                      ? "bg-emerald-500"
                      : m.method === "magic-link"
                        ? "bg-violet-500"
                        : "bg-slate-400";
                return (
                  <div key={m.method}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">
                        {label}
                      </span>
                      <span className="text-sm text-slate-500">
                        {m.count.toLocaleString()} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                      <div
                        className={`${barColor} h-2.5 rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            {stats.signupMethods.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">
                No signup method data available.
              </p>
            )}
          </div>
        </div>

        {/* By UTM Source */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm opacity-0 animate-fade-in-up animation-delay-600">
          <div className="border-b border-slate-100 p-4 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">Top Traffic Sources</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Top 5 UTM sources by signup count
            </p>
          </div>
          <div className="p-4 sm:p-6 space-y-3">
            {stats.utmSources.map((s) => {
              const pct =
                stats.utmSourceTotal > 0
                  ? Math.round((s.count / stats.utmSourceTotal) * 100)
                  : 0;
              const label =
                s.source === "direct"
                  ? "Direct (no UTM)"
                  : s.source;
              return (
                <div key={s.source}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">
                      {label}
                    </span>
                    <span className="text-sm text-slate-500">
                      {s.count.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div
                      className="bg-indigo-500 h-2.5 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {stats.utmSources.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">
                No UTM source data available.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Users */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-10 opacity-0 animate-fade-in-up animation-delay-600">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Recent Signups</h2>
            <p className="text-sm text-slate-400 mt-0.5">Newest registered users</p>
          </div>
          <Link
            href="/admin/users"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            View all users
          </Link>
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  User
                </th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Plan
                </th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.recentUsers.map((user) => (
                <tr
                  key={user._id.toString()}
                  className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3.5 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                        {(user.name || user.email || "?").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-slate-900">
                        {user.name || "No name"}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-6 text-sm text-slate-500">
                    {user.email}
                  </td>
                  <td className="py-3.5 px-6">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        user.planType === "PREMIUM"
                          ? "bg-indigo-50 text-indigo-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {user.planType || "FREE"}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-sm text-slate-400">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "N/A"}
                  </td>
                </tr>
              ))}
              {stats.recentUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-12 text-center text-sm text-slate-400"
                  >
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 sm:hidden">
          {stats.recentUsers.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-slate-400">
              No users found.
            </div>
          ) : (
            stats.recentUsers.map((user) => (
              <div key={user._id.toString()} className="px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                    {(user.name || user.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {user.name || "No name"}
                      </p>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          user.planType === "PREMIUM"
                            ? "bg-indigo-50 text-indigo-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {user.planType || "FREE"}
                      </span>
                    </div>
                    <p className="mt-1 break-all text-xs text-slate-500">{user.email}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      Joined{" "}
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm opacity-0 animate-fade-in-up animation-delay-600">
        <div className="border-b border-slate-100 p-4 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">Recent Activity</h2>
          <p className="text-sm text-slate-400 mt-0.5">Last 15 high-value events</p>
        </div>
        <div className="divide-y divide-slate-100">
          {stats.recentActivity.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-slate-400">
              No activity events yet.
            </div>
          ) : (
            stats.recentActivity.map((evt) => {
              const config = EVENT_CONFIG[evt.event as HighValueEvent];
              const userName =
                (evt.metadata?.userName as string) ||
                (evt.metadata?.name as string) ||
                evt.email?.split("@")[0] ||
                "Someone";
              const description = config
                ? `${userName} ${config.label}`
                : `${userName} triggered ${evt.event}`;
              const icon = config?.icon || "\u{1F4AC}";

              return (
                <div
                  key={evt._id.toString()}
                  className="flex items-center gap-3 px-4 py-3 sm:px-6 hover:bg-slate-50 transition-colors"
                >
                  <span className="text-lg shrink-0 w-8 text-center">{icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700 truncate">{description}</p>
                    <p className="text-xs text-slate-400 truncate">{evt.email || "unknown"}</p>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                    {evt.createdAt ? timeAgo(new Date(evt.createdAt)) : "N/A"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
