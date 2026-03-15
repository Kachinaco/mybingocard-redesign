"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

interface UserDetail {
  _id: string;
  name?: string;
  email: string;
  image?: string;
  planType: string;
  subscriptionStatus?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  createdAt: string;
  updatedAt: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
}

interface CardDetail {
  _id: string;
  title: string;
  size: number;
  isPublic: boolean;
  views: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: session } = useSession();
  const impersonation = (session as typeof session & {
    impersonation?: { active: boolean; targetUserId: string };
  })?.impersonation;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [cards, setCards] = useState<CardDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [impersonating, setImpersonating] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/users/${id}`);
        if (!res.ok) {
          throw new Error("Failed to fetch user");
        }
        const json = await res.json();
        setUser(json.user);
        setCards(json.cards || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="ml-3 text-sm text-slate-400">Loading user...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 mb-4">{error || "User not found"}</p>
        <Link
          href="/admin/users"
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          Back to users
        </Link>
      </div>
    );
  }

  const infoFields = [
    { label: "Email", value: user.email },
    { label: "Plan", value: user.planType || "FREE" },
    {
      label: "Subscription Status",
      value: user.subscriptionStatus || "inactive",
    },
    {
      label: "Stripe Customer",
      value: user.stripeCustomerId || "None",
    },
    {
      label: "Joined",
      value: user.createdAt
        ? new Date(user.createdAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : "N/A",
    },
    {
      label: "Last Active",
      value: user.updatedAt
        ? new Date(user.updatedAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : "N/A",
    },
    {
      label: "Subscription Ends",
      value: user.currentPeriodEnd
        ? new Date(user.currentPeriodEnd).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : "N/A",
    },
    {
      label: "Cancel at Period End",
      value: user.cancelAtPeriodEnd ? "Yes" : "No",
    },
  ];

  const attributionFields = [
    { label: "UTM Source", value: user.utm_source },
    { label: "UTM Medium", value: user.utm_medium },
    { label: "UTM Campaign", value: user.utm_campaign },
    { label: "Referrer", value: user.referrer },
  ].filter((f) => f.value);

  const isViewingAsThisUser =
    impersonation?.active && impersonation.targetUserId === id;

  const startImpersonation = async () => {
    setImpersonating(true);
    setActionError(null);

    try {
      const response = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: id,
          redirectTo: "/dashboard",
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to start impersonation");
      }

      window.location.href = data.redirectTo || "/dashboard";
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to start impersonation"
      );
      setImpersonating(false);
    }
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <Link
          href="/admin/users"
          className="text-slate-400 hover:text-indigo-600 transition-colors"
        >
          Users
        </Link>
        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-slate-700 font-medium">
          {user.name || user.email}
        </span>
      </div>

      {/* User Header */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {(user.name || user.email || "?").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900">
              {user.name || "No name"}
            </h1>
            <p className="text-slate-500 mt-0.5">{user.email}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  user.planType === "PREMIUM"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    user.planType === "PREMIUM"
                      ? user.subscriptionStatus === "active"
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                      : "bg-slate-400"
                  }`}
                ></span>
                {user.planType || "FREE"}
              </span>
              <span className="text-xs text-slate-400">
                {cards.length} card{cards.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <button
              type="button"
              onClick={startImpersonation}
              disabled={impersonating || isViewingAsThisUser}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {isViewingAsThisUser
                ? "Already Impersonating"
                : impersonating
                  ? "Starting..."
                  : "View as User"}
            </button>
            <p className="text-xs text-slate-400 sm:text-right">
              Opens the regular app as this user.
            </p>
            {actionError ? (
              <p className="max-w-xs text-xs text-red-600 sm:text-right">
                {actionError}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* User Info */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Account Details
            </h2>
          </div>
          <div className="divide-y divide-slate-50">
            {infoFields.map((field) => (
              <div
                key={field.label}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <span className="text-sm text-slate-400">{field.label}</span>
                <span className="max-w-full break-all text-sm font-medium text-slate-700 sm:max-w-[60%] sm:text-right sm:truncate">
                  {field.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Attribution */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Attribution
            </h2>
          </div>
          {attributionFields.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {attributionFields.map((field) => (
                <div
                  key={field.label}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <span className="text-sm text-slate-400">{field.label}</span>
                  <span className="max-w-full break-all text-sm font-medium text-slate-700 sm:max-w-[60%] sm:text-right sm:truncate">
                    {field.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-sm text-slate-400">
              No attribution data available.
            </div>
          )}
        </div>
      </div>

      {/* User's Cards */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Cards ({cards.length})
          </h2>
        </div>
        {cards.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Public
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Views
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map((card) => (
                    <tr
                      key={card._id}
                      className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3.5 px-6">
                        <span className="text-sm font-medium text-slate-900">
                          {card.title || "Untitled"}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-sm text-slate-500">
                        {card.size}x{card.size}
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            card.isPublic
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {card.isPublic ? "Public" : "Private"}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-sm text-slate-500">
                        {card.views || 0}
                      </td>
                      <td className="py-3.5 px-6 text-sm text-slate-400">
                        {card.createdAt
                          ? new Date(card.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-slate-100 sm:hidden">
              {cards.map((card) => (
                <div key={card._id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {card.title || "Untitled"}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            card.isPublic
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {card.isPublic ? "Public" : "Private"}
                        </span>
                        <span className="text-xs text-slate-400">{card.size}x{card.size}</span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">{card.views || 0} views</span>
                  </div>
                  <p className="mt-3 text-xs text-slate-400">
                    Created{" "}
                    {card.createdAt
                      ? new Date(card.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "N/A"}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="px-6 py-12 text-center text-sm text-slate-400">
            This user has not created any cards yet.
          </div>
        )}
      </div>
    </div>
  );
}
