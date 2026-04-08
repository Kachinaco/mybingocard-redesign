import { auth } from "@/auth";
import { redirect } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import Link from "next/link";
import { isAdminSession } from "@/lib/admin";

async function getAdminStats() {
  const client = await clientPromise;
  const db = client.db("mybingocard");

  const [totalUsers, paidUsers, trialingUsers, totalCards, recentSignups, recentUsers] =
    await Promise.all([
      db.collection("users").countDocuments(),
      db.collection("users").countDocuments({
        planType: "PREMIUM",
        subscriptionStatus: "active",
      }),
      db.collection("users").countDocuments({
        planType: "PREMIUM",
        subscriptionStatus: "trialing",
      }),
      db.collection("cards").countDocuments(),
      db.collection("users").countDocuments({
        createdAt: {
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      }),
      db
        .collection("users")
        .find(
          {},
          { projection: { name: 1, email: 1, planType: 1, createdAt: 1 } }
        )
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray(),
    ]);

  return {
    totalUsers,
    paidUsers,
    trialingUsers,
    totalCards,
    revenueEstimate: paidUsers * 4.99,
    recentSignups,
    recentUsers,
  };
}

export default async function AdminOverviewPage() {
  const session = await auth();

  if (!isAdminSession(session)) {
    redirect("/dashboard");
  }

  const stats = await getAdminStats();

  const statCards = [
    {
      label: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      description: "All registered accounts",
      color: "indigo",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      label: "Paid Users",
      value: stats.paidUsers.toLocaleString(),
      description: "Active Premium subscriptions",
      color: "emerald",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
    },
    {
      label: "Trialing",
      value: stats.trialingUsers.toLocaleString(),
      description: "Free trial (not yet paying)",
      color: "sky",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Total Cards",
      value: stats.totalCards.toLocaleString(),
      description: "Bingo cards created",
      color: "violet",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      label: "MRR",
      value: `$${stats.revenueEstimate.toFixed(2)}`,
      description: `${stats.paidUsers} paying subscribers x $4.99`,
      color: "amber",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Recent Signups",
      value: stats.recentSignups.toLocaleString(),
      description: "Last 7 days",
      color: "rose",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string; iconBg: string }> = {
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600", iconBg: "bg-indigo-100" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", iconBg: "bg-emerald-100" },
    violet: { bg: "bg-violet-50", text: "text-violet-600", iconBg: "bg-violet-100" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", iconBg: "bg-amber-100" },
    sky: { bg: "bg-sky-50", text: "text-sky-600", iconBg: "bg-sky-100" },
    rose: { bg: "bg-rose-50", text: "text-rose-600", iconBg: "bg-rose-100" },
  };

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-slate-500 mt-1">
          Key metrics and recent activity for MyBingoCard.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-10">
        {statCards.map((stat) => {
          const colors = colorClasses[stat.color];
          if (!colors) return null;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {stat.label}
                </span>
                <div className={`w-9 h-9 rounded-lg ${colors.iconBg} ${colors.text} flex items-center justify-center`}>
                  {stat.icon}
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-1">{stat.description}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Users */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
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
    </div>
  );
}
