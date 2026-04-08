"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  planType: string;
  subscriptionStatus: string;
  createdAt: string;
  lastActive: string;
  image?: string;
  cardCount: number;
  trialEndsAt: string | null;
  requiresCheckout: boolean;
  stripeCustomerId: string | null;
  customerType?: string;
}

interface UsersResponse {
  users: AdminUser[];
  totalUsers: number;
  page: number;
  limit: number;
  totalPages: number;
}

const PLAN_OPTIONS = [
  { value: "", label: "All Plans" },
  { value: "premium", label: "Premium" },
  { value: "free", label: "Free" },
  { value: "trialing", label: "Trialing" },
  { value: "lifetime", label: "Lifetime" },
  { value: "past_due", label: "Past Due" },
  { value: "canceled", label: "Canceled" },
] as const;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "last_active", label: "Last Active" },
  { value: "most_cards", label: "Most Cards" },
] as const;

function getCustomerTypeBadge(customerType?: string): {
  label: string;
  bgColor: string;
  textColor: string;
} | null {
  switch (customerType) {
    case "admin":
      return { label: "Admin", bgColor: "bg-rose-50", textColor: "text-rose-700" };
    case "complimentary":
      return { label: "Comp", bgColor: "bg-cyan-50", textColor: "text-cyan-700" };
    case "test":
      return { label: "Test", bgColor: "bg-orange-50", textColor: "text-orange-700" };
    default:
      return null;
  }
}

function getPlanBadge(user: AdminUser): {
  label: string;
  dotColor: string;
  bgColor: string;
  textColor: string;
} {
  const { planType, subscriptionStatus, trialEndsAt, requiresCheckout } = user;

  if (subscriptionStatus === "trialing" && trialEndsAt) {
    const trialEndMs = new Date(trialEndsAt).getTime();
    const trialStartMs = trialEndMs - 7 * 24 * 60 * 60 * 1000;
    const trialDay = Math.max(
      1,
      Math.ceil((Date.now() - trialStartMs) / (24 * 60 * 60 * 1000))
    );
    return {
      label: `Trial Day ${trialDay}`,
      dotColor: "bg-amber-500",
      bgColor: "bg-amber-50",
      textColor: "text-amber-700",
    };
  }

  if (subscriptionStatus === "lifetime" || planType === "LIFETIME") {
    return {
      label: "Lifetime",
      dotColor: "bg-purple-500",
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
    };
  }

  if (planType === "PREMIUM" && subscriptionStatus === "active") {
    return {
      label: "Premium",
      dotColor: "bg-emerald-500",
      bgColor: "bg-indigo-50",
      textColor: "text-indigo-700",
    };
  }

  if (subscriptionStatus === "past_due") {
    return {
      label: "Past Due",
      dotColor: "bg-red-500",
      bgColor: "bg-red-50",
      textColor: "text-red-700",
    };
  }

  if (subscriptionStatus === "canceled") {
    return {
      label: "Canceled",
      dotColor: "bg-slate-400",
      bgColor: "bg-slate-100",
      textColor: "text-slate-600",
    };
  }

  if (requiresCheckout) {
    return {
      label: "No Card",
      dotColor: "bg-red-400",
      bgColor: "bg-red-50",
      textColor: "text-red-600",
    };
  }

  return {
    label: "Free",
    dotColor: "bg-slate-400",
    bgColor: "bg-slate-100",
    textColor: "text-slate-600",
  };
}

export default function AdminUsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [plan, setPlan] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(
    async (pageNum: number, searchVal: string, planVal: string, sortVal: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: "50",
        });
        if (searchVal) params.set("search", searchVal);
        if (planVal) params.set("plan", planVal);
        if (sortVal && sortVal !== "newest") params.set("sort", sortVal);

        const res = await fetch(`/api/admin/users?${params}`);
        if (!res.ok) throw new Error("Failed to fetch users");
        const json: UsersResponse = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchUsers(page, debouncedSearch, plan, sortBy);
  }, [page, debouncedSearch, plan, sortBy, fetchUsers]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 350);
  };

  const handlePlanChange = (value: string) => {
    setPlan(value);
    setPage(1);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setPage(1);
  };

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="text-slate-500 mt-1">
          {data
            ? `${data.totalUsers.toLocaleString()} total users`
            : "Loading users..."}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Search, Filter, Sort Controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <select
          value={plan}
          onChange={(e) => handlePlanChange(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          {PLAN_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => handleSortChange(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3 text-sm text-slate-400">Loading users...</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
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
                      Cards
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Last Active
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data?.users.map((user) => (
                    <tr
                      key={user._id}
                      className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-6">
                        <Link
                          href={`/admin/users/${user._id}`}
                          className="flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                            {(user.name || user.email || "?")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-slate-900 hover:text-indigo-600 transition-colors">
                            {user.name}
                          </span>
                        </Link>
                      </td>
                      <td className="py-3.5 px-6 text-sm text-slate-500">
                        {user.email}
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(() => {
                            const badge = getPlanBadge(user);
                            return (
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${badge.bgColor} ${badge.textColor}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`}
                                ></span>
                                {badge.label}
                              </span>
                            );
                          })()}
                          {(() => {
                            const ctBadge = getCustomerTypeBadge(user.customerType);
                            if (!ctBadge) return null;
                            return (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${ctBadge.bgColor} ${ctBadge.textColor}`}
                              >
                                {ctBadge.label}
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-sm text-slate-600 font-medium">
                        {user.cardCount}
                      </td>
                      <td className="py-3.5 px-6 text-sm text-slate-400">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )
                          : "N/A"}
                      </td>
                      <td className="py-3.5 px-6 text-sm text-slate-400">
                        {user.lastActive
                          ? new Date(user.lastActive).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                  {data?.users.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-12 text-center text-sm text-slate-400"
                      >
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {data?.users.map((user) => (
                <Link
                  key={user._id}
                  href={`/admin/users/${user._id}`}
                  className="block px-4 py-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                      {(user.name || user.email || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {user.name || "No name"}
                          </p>
                          <p className="mt-1 break-all text-xs text-slate-500">
                            {user.email}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {(() => {
                            const badge = getPlanBadge(user);
                            return (
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.bgColor} ${badge.textColor}`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${badge.dotColor}`}
                                ></span>
                                {badge.label}
                              </span>
                            );
                          })()}
                          {(() => {
                            const ctBadge = getCustomerTypeBadge(user.customerType);
                            if (!ctBadge) return null;
                            return (
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${ctBadge.bgColor} ${ctBadge.textColor}`}
                              >
                                {ctBadge.label}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
                        <span>{user.cardCount} cards</span>
                        <span>
                          Joined{" "}
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            : "N/A"}
                        </span>
                        <span className="col-span-2">
                          Last active{" "}
                          {user.lastActive
                            ? new Date(user.lastActive).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              {data?.users.length === 0 && (
                <div className="py-12 text-center text-sm text-slate-400">
                  No users found.
                </div>
              )}
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-sm text-slate-400">
                  Page {data.page} of {data.totalPages} ({data.totalUsers} total)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(data.totalPages, p + 1))
                    }
                    disabled={page >= data.totalPages}
                    className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
