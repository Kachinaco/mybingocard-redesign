"use client";

import { useEffect, useState, useCallback } from "react";
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
  trialEndsAt?: string | null;
  createdAt: string;
  updatedAt: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
  totalCardsCreated?: number;
  lastCardCreatedAt?: string;
  totalExports?: number;
  lastExportAt?: string;
  featuresUsed?: string[];
  loginCount?: number;
  lastLoginAt?: string;
  signupMethod?: string;
  signupDevice?: string;
  signupLanguage?: string;
  signupCountry?: string;
  anonymousId?: string;
  createdByIp?: string;
  referrerDomain?: string;
  customerType?: string;
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

interface ActivityEvent {
  _id: string;
  event: string;
  source?: string;
  metadata?: Record<string, unknown>;
  pathname?: string;
  sessionId?: string;
  anonymousId?: string;
  domain?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

const EVENT_LABELS: Record<string, string> = {
  signup_completed: "Signed up",
  login_succeeded: "Logged in",
  magic_link_requested: "Requested magic link",
  magic_link_opened: "Opened magic link",
  card_created: "Created a card",
  first_card_created: "Created first card",
  card_updated: "Updated a card",
  card_deleted: "Deleted a card",
  card_create_failed: "Card creation failed",
  card_creation_check: "Checked card limit",
  batch_cards_created: "Created batch cards",
  export_pdf: "Exported PDF",
  export_pdf_blocked: "PDF export blocked",
  export_png: "Exported PNG",
  export_bulk_pdf: "Exported bulk PDF",
  batch_pdf_exported: "Exported batch PDF",
  batch_pdf_export_blocked: "Batch PDF blocked",
  batch_pdf_export_started: "Started batch PDF",
  batch_pdf_export_succeeded: "Generated batch PDF",
  batch_pdf_export_failed: "Batch PDF failed",
  export_button_clicked: "Clicked export",
  batch_button_clicked: "Clicked batch",
  batch_primary_clicked: "Clicked batch CTA",
  share_link_generated: "Generated share link",
  share_link_reused: "Reused share link",
  shared_card_viewed: "Shared card viewed",
  shared_card_password_attempt: "Share password attempt",
  ai_cells_generated: "Generated AI cells",
  first_ai_generation: "First AI generation",
  template_used: "Used a template",
  favorite_toggled: "Toggled favorite",
  profile_updated: "Updated profile",
  password_updated: "Changed password",
  password_reset_requested: "Requested password reset",
  password_reset_completed: "Reset password",
  email_verification_completed: "Verified email",
  email_verification_failed: "Email verification failed",
  email_preferences_updated: "Updated email preferences",
  email_captured: "Email captured",
  email_unsubscribed: "Unsubscribed from emails",
  account_deleted: "Deleted account",
  onboarding_step_completed: "Completed onboarding step",
  onboarding_dismissed: "Dismissed onboarding",
  coupon_validation_attempted: "Tried a coupon",
  cancellation_survey_submitted: "Submitted cancel survey",
  referral_dashboard_accessed: "Viewed referral dashboard",
  game_auto_ended: "Game auto-ended",
  api_error: "API error",
};

function getEventDotColor(event: string): string {
  if (
    event.includes("created") ||
    event.includes("generated") ||
    event.includes("export") ||
    event === "template_used" ||
    event === "ai_cells_generated" ||
    event === "first_ai_generation"
  )
    return "bg-emerald-500";
  if (
    event.includes("login") ||
    event.includes("signup") ||
    event.includes("magic_link") ||
    event.includes("password") ||
    event.includes("verification") ||
    event === "profile_updated"
  )
    return "bg-blue-500";
  if (
    event.includes("coupon") ||
    event.includes("cancel") ||
    event.includes("subscription") ||
    event === "account_deleted"
  )
    return "bg-amber-500";
  return "bg-slate-400";
}

function formatEventLabel(event: string): string {
  return (
    EVENT_LABELS[event] ||
    event
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function getEventMeta(evt: ActivityEvent): string | null {
  const m = evt.metadata;
  if (!m) return null;
  if (typeof m.title === "string") return m.title;
  if (typeof m.card_title === "string") return m.card_title;
  if (typeof m.format === "string") return m.format.toUpperCase();
  if (typeof m.size === "number") return `${m.size}x${m.size}`;
  if (typeof m.step === "string") return m.step;
  if (typeof m.coupon_code === "string") return m.coupon_code;
  if (typeof m.count === "number") return `${m.count} cards`;
  if (typeof m.error === "string") return m.error.slice(0, 80);
  return null;
}

function getEventDetails(evt: ActivityEvent): Record<string, unknown> {
  return {
    event: evt.event,
    source: evt.source || null,
    pathname: evt.pathname || null,
    sessionId: evt.sessionId || null,
    anonymousId: evt.anonymousId || null,
    domain: evt.domain || null,
    ipAddress: evt.ipAddress || null,
    userAgent: evt.userAgent || null,
    metadata: evt.metadata || {},
    createdAt: evt.createdAt,
  };
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
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
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [impersonating, setImpersonating] = useState(false);
  const [extendingTrial, setExtendingTrial] = useState(false);
  const [cancelingSub, setCancelingSub] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const deleteCard = useCallback(async (cardId: string, cardTitle: string) => {
    if (!confirm(`Delete "${cardTitle || "Untitled"}"? This cannot be undone.`)) return;
    setDeletingCardId(cardId);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/cards", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete card");
      setCards((prev) => prev.filter((c) => c._id !== cardId));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete card");
    } finally {
      setDeletingCardId(null);
    }
  }, []);

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
        setActivityEvents(json.activityEvents || []);
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

  // Trial lifecycle calculations
  const trialEnd = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const now = new Date();
  const trialDaysRemaining = trialEnd
    ? Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const trialIsActive = trialDaysRemaining !== null && trialDaysRemaining > 0;
  const trialIsExpired = trialDaysRemaining !== null && trialDaysRemaining <= 0;

  // Figure out which day of the trial the user is on (assumes 7-day trial)
  const trialDayNumber = trialEnd
    ? Math.max(1, 8 - Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))))
    : null;

  const infoFields = [
    { label: "Email", value: user.email },
    { label: "Customer Type", value: user.customerType || "real" },
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

  const extendTrial = async () => {
    if (!confirm("Extend this user's trial by 7 days?")) return;
    setExtendingTrial(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}/extend-trial`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to extend trial");
      setUser((prev) =>
        prev
          ? { ...prev, trialEndsAt: data.trialEndsAt, subscriptionStatus: "trialing" }
          : prev
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to extend trial");
    } finally {
      setExtendingTrial(false);
    }
  };

  const cancelSubscription = async () => {
    if (
      !confirm(
        "Cancel this user's subscription at the end of the current billing period? This cannot be undone from this panel."
      )
    )
      return;
    setCancelingSub(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}/cancel-subscription`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to cancel subscription");
      setUser((prev) => (prev ? { ...prev, cancelAtPeriodEnd: true } : prev));
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to cancel subscription"
      );
    } finally {
      setCancelingSub(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) return;
    setSendingEmail(true);
    setEmailStatus(null);
    try {
      const res = await fetch(`/api/admin/users/${id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: emailSubject, message: emailBody }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send email");
      setEmailStatus({ type: "success", message: `Email sent to ${user?.email}` });
      setEmailSubject("");
      setEmailBody("");
      setTimeout(() => setShowEmailModal(false), 1500);
    } catch (err) {
      setEmailStatus({ type: "error", message: err instanceof Error ? err.message : "Failed to send email" });
    } finally {
      setSendingEmail(false);
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
              {user.customerType && user.customerType !== "real" && (
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    user.customerType === "admin"
                      ? "bg-rose-50 text-rose-700 border-rose-100"
                      : user.customerType === "complimentary"
                        ? "bg-cyan-50 text-cyan-700 border-cyan-100"
                        : user.customerType === "test"
                          ? "bg-orange-50 text-orange-700 border-orange-100"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  {user.customerType.charAt(0).toUpperCase() + user.customerType.slice(1)}
                </span>
              )}
              <span className="text-xs text-slate-400">
                {cards.length} card{cards.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { setShowEmailModal(true); setEmailStatus(null); }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Send Email
              </button>
              <button
                type="button"
                onClick={startImpersonation}
                disabled={impersonating || isViewingAsThisUser}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isViewingAsThisUser
                  ? "Already Impersonating"
                  : impersonating
                    ? "Starting..."
                    : "View as User"}
              </button>
              <button
                type="button"
                onClick={extendTrial}
                disabled={extendingTrial}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {extendingTrial ? "Extending..." : "Extend Trial"}
              </button>
              {user.stripeCustomerId && (
                <a
                  href={`https://dashboard.stripe.com/customers/${user.stripeCustomerId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
                >
                  View in Stripe
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
              {user.stripeSubscriptionId && !user.cancelAtPeriodEnd && (
                <button
                  type="button"
                  onClick={cancelSubscription}
                  disabled={cancelingSub}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cancelingSub ? "Canceling..." : "Cancel Subscription"}
                </button>
              )}
            </div>
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

            {/* Trial End Date */}
            <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <span className="text-sm text-slate-400">Trial End Date</span>
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                {trialEnd
                  ? trialEnd.toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "N/A"}
                {trialDaysRemaining !== null && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      trialDaysRemaining >= 3
                        ? "bg-emerald-50 text-emerald-700"
                        : trialDaysRemaining >= 1
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                    }`}
                  >
                    {trialDaysRemaining > 0
                      ? `${trialDaysRemaining}d left`
                      : "Expired"}
                  </span>
                )}
              </span>
            </div>

            {/* Trial Status */}
            <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <span className="text-sm text-slate-400">Trial Status</span>
              <span className="text-sm font-medium text-slate-700">
                {trialIsActive
                  ? `Active Trial (Day ${trialDayNumber} of 7)`
                  : trialIsExpired
                    ? "Trial Expired"
                    : "Never Trialed"}
              </span>
            </div>

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

      {/* Activity & Engagement */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Activity &amp; Engagement
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3">
          <div className="px-6 py-4 border-b border-slate-50">
            <p className="text-xs text-slate-400">Login Count</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {user.loginCount ?? 0}{" "}
              <span className="text-sm font-normal text-slate-400">logins</span>
            </p>
          </div>
          <div className="px-6 py-4 border-b border-slate-50">
            <p className="text-xs text-slate-400">Last Login</p>
            <p className="mt-1 text-sm font-medium text-slate-700">
              {user.lastLoginAt
                ? new Date(user.lastLoginAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "Never"}
            </p>
          </div>
          <div className="px-6 py-4 border-b border-slate-50">
            <p className="text-xs text-slate-400">Cards Created</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {user.totalCardsCreated ?? 0}
            </p>
          </div>
          <div className="px-6 py-4 border-b border-slate-50">
            <p className="text-xs text-slate-400">Last Card Created</p>
            <p className="mt-1 text-sm font-medium text-slate-700">
              {user.lastCardCreatedAt
                ? new Date(user.lastCardCreatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "Never"}
            </p>
          </div>
          <div className="px-6 py-4 border-b border-slate-50">
            <p className="text-xs text-slate-400">Total Exports</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {user.totalExports ?? 0}
            </p>
          </div>
          <div className="px-6 py-4 border-b border-slate-50">
            <p className="text-xs text-slate-400">Last Export</p>
            <p className="mt-1 text-sm font-medium text-slate-700">
              {user.lastExportAt
                ? new Date(user.lastExportAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "Never"}
            </p>
          </div>
        </div>
        {user.featuresUsed && user.featuresUsed.length > 0 && (
          <div className="border-t border-slate-100 px-6 py-4">
            <p className="text-xs text-slate-400 mb-2">Features Used</p>
            <div className="flex flex-wrap gap-2">
              {user.featuresUsed.map((feature) => (
                <span
                  key={feature}
                  className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700 border border-violet-100"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Signup Context */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Signup Context
          </h2>
        </div>
        {(user.signupMethod || user.signupDevice || user.signupLanguage || user.signupCountry || user.createdByIp || user.referrerDomain || user.anonymousId) ? (
          <div className="divide-y divide-slate-50">
            {user.signupMethod && (
              <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <span className="text-sm text-slate-400">Signup Method</span>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  {user.signupMethod === "google" && (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  {user.signupMethod === "credentials" && (
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  )}
                  {user.signupMethod === "email" && (
                    <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  )}
                  {user.signupMethod === "google" ? "Google" : user.signupMethod === "credentials" ? "Credentials" : user.signupMethod === "email" ? "Magic Link" : user.signupMethod}
                </span>
              </div>
            )}
            {user.signupDevice && (
              <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <span className="text-sm text-slate-400">Device</span>
                <span className="max-w-full break-all text-sm font-medium text-slate-700 sm:max-w-[60%] sm:text-right sm:truncate">
                  {user.signupDevice}
                </span>
              </div>
            )}
            {user.signupLanguage && (
              <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <span className="text-sm text-slate-400">Language</span>
                <span className="text-sm font-medium text-slate-700">{user.signupLanguage}</span>
              </div>
            )}
            {user.signupCountry && (
              <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <span className="text-sm text-slate-400">Country</span>
                <span className="text-sm font-medium text-slate-700">{user.signupCountry}</span>
              </div>
            )}
            {user.createdByIp && (
              <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <span className="text-sm text-slate-400">IP Address</span>
                <span className="text-sm font-medium text-slate-700 font-mono">{user.createdByIp}</span>
              </div>
            )}
            {user.referrerDomain && (
              <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <span className="text-sm text-slate-400">Referrer Domain</span>
                <span className="text-sm font-medium text-slate-700">{user.referrerDomain}</span>
              </div>
            )}
            {user.anonymousId && (
              <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <span className="text-sm text-slate-400">Anonymous ID</span>
                <span className="text-xs font-mono text-slate-400">{user.anonymousId}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-sm text-slate-400">
            No signup context data available.
          </div>
        )}
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
                    <th className="text-right py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Actions
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
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`/cards/${card._id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            View
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                          <button
                            type="button"
                            onClick={() => deleteCard(card._id, card.title)}
                            disabled={deletingCardId === card._id}
                            className="inline-flex items-center rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            {deletingCardId === card._id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
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
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      Created{" "}
                      {card.createdAt
                        ? new Date(card.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "N/A"}
                    </p>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/cards/${card._id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        View
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                      <button
                        type="button"
                        onClick={() => deleteCard(card._id, card.title)}
                        disabled={deletingCardId === card._id}
                        className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {deletingCardId === card._id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
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


      {/* Recent Activity Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mt-6">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Recent Activity
            </h2>
            <span className="text-xs text-slate-400">Latest {activityEvents.length} events</span>
          </div>
        </div>
        {activityEvents.length > 0 ? (
          <div className="px-6 py-4">
            <div className="relative">
              {activityEvents.map((evt, i) => {
                const meta = getEventMeta(evt);
                const details = getEventDetails(evt);
                return (
                  <div key={evt._id} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < activityEvents.length - 1 && (
                      <div className="absolute left-[7px] top-4 bottom-0 w-px bg-slate-100" />
                    )}
                    <div className="relative flex-shrink-0 mt-1.5">
                      <div className={`w-[15px] h-[15px] rounded-full border-2 border-white ring-1 ring-slate-100 ${getEventDotColor(evt.event)}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {formatEventLabel(evt.event)}
                        </p>
                        <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0" title={new Date(evt.createdAt).toLocaleString()}>
                          {timeAgo(evt.createdAt)}
                        </span>
                      </div>
                      {meta && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{meta}</p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-400">
                        {evt.source && <span className="rounded bg-slate-100 px-1.5 py-0.5">{evt.source}</span>}
                        {evt.pathname && <span className="max-w-full truncate rounded bg-slate-100 px-1.5 py-0.5">{evt.pathname}</span>}
                        {evt.sessionId && <span className="rounded bg-slate-100 px-1.5 py-0.5">session {evt.sessionId.slice(0, 16)}</span>}
                      </div>
                      <details className="mt-2 rounded-lg border border-slate-100 bg-slate-50/70">
                        <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700">
                          Raw event data
                        </summary>
                        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words border-t border-slate-100 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
                          {JSON.stringify(details, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-sm text-slate-400">
            No activity events recorded yet.
          </div>
        )}
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-bold text-slate-900">
                Send Email to {user.name || user.email}
              </h3>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="rounded-md p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-slate-500">
                To: <span className="font-medium text-slate-700">{user.email}</span>
              </p>
              <div>
                <label htmlFor="email-subject" className="block text-sm font-medium text-slate-700 mb-1">
                  Subject
                </label>
                <input
                  id="email-subject"
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="email-body" className="block text-sm font-medium text-slate-700 mb-1">
                  Message
                </label>
                <textarea
                  id="email-body"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Write your message..."
                  rows={6}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
                />
              </div>
              {emailStatus && (
                <p className={`text-sm font-medium ${emailStatus.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
                  {emailStatus.message}
                </p>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailSubject.trim() || !emailBody.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingEmail ? "Sending..." : "Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
