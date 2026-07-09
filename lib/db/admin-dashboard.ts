import { getAdminStats } from "@/lib/db/admin-stats";
import { getSqliteStore } from "@/lib/db/sqlite";

type RenderableId = string | { toString(): string };

export interface AdminLayoutBadges {
  openTickets: number;
  pastDueUsers: number;
  recentErrorGroups: number;
  mrr: number;
  activeUsers: number;
}

export interface AdminOverviewUser {
  _id: RenderableId;
  name?: string | null;
  email?: string | null;
  planType?: string | null;
  createdAt?: Date | string | null;
}

export interface AdminOverviewActivityEvent {
  _id: RenderableId;
  event?: string | null;
  email?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date | string | null;
}

export interface AdminCanceledUser {
  _id: RenderableId;
  name?: string | null;
  email?: string | null;
  subscriptionStatus?: string | null;
  cancelAtPeriodEnd?: boolean | null;
  cancelAt?: Date | string | null;
  cancellationReason?: string | null;
  cancellationFeedback?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  totalCardsCreated?: number | null;
  totalExports?: number | null;
}

export async function getAdminLayoutBadges(): Promise<AdminLayoutBadges> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const unresolvedRecentErrorQuery = {
    lastSeenAt: { $gte: since },
    $or: [
      { status: { $exists: false } },
      { status: null },
      { status: { $nin: ["fixed", "ignored"] } },
    ],
  };
    const store = getSqliteStore();
    const paidUsers = store.count("users", { subscriptionStatus: "active" });
    return {
      openTickets: store.count("support_tickets", { status: "open" }),
      pastDueUsers: store.count("users", { subscriptionStatus: "past_due" }),
      recentErrorGroups: store.count("error_fingerprints", unresolvedRecentErrorQuery),
      mrr: paidUsers * 7.99,
      activeUsers: paidUsers,
    };
  }

export async function getAdminOverviewData(highValueEvents: readonly string[]) {
  const [shared, recentUsers, recentActivity, canceledUsers] = await Promise.all([
    getAdminStats(),
    getRecentAdminUsers(),
    getRecentAdminActivity(highValueEvents),
    getCanceledAdminUsers(),
  ]);

  const signupMethods = Object.entries(shared.signupsByMethod)
    .map(([method, count]) => ({ method, count }))
    .sort((a, b) => b.count - a.count);
  const signupMethodTotal = signupMethods.reduce((sum, row) => sum + row.count, 0);

  const utmSources = Object.entries(shared.signupsBySource)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const utmSourceTotal = utmSources.reduce((sum, row) => sum + row.count, 0);

  return {
    ...shared,
    recentUsers,
    signupMethods,
    signupMethodTotal,
    utmSources,
    utmSourceTotal,
    recentActivity,
    canceledUsers,
    generatedAt: new Date(),
  };
}

async function getRecentAdminUsers(): Promise<AdminOverviewUser[]> {
    return getSqliteStore()
      .findMany<Record<string, unknown>>("users", {}, { sort: { createdAt: -1 }, limit: 10 })
      .map(toOverviewUser);
  }

async function getRecentAdminActivity(highValueEvents: readonly string[]): Promise<AdminOverviewActivityEvent[]> {
  const query = { event: { $in: [...highValueEvents] } };
    return getSqliteStore()
      .findMany<Record<string, unknown>>("activity_events", query, { sort: { createdAt: -1 }, limit: 15 })
      .map(toOverviewActivity);
  }

async function getCanceledAdminUsers(): Promise<AdminCanceledUser[]> {
  const query = {
    $or: [
      { subscriptionStatus: "canceled" },
      { cancelAtPeriodEnd: true },
    ],
  };
    return getSqliteStore()
      .findMany<Record<string, unknown>>("users", query, { sort: { updatedAt: -1 }, limit: 5 })
      .map(toCanceledUser);
  }

function toOverviewUser(document: Record<string, unknown>): AdminOverviewUser {
  return {
    _id: renderableId(document._id),
    name: stringOrNull(document.name),
    email: stringOrNull(document.email),
    planType: stringOrNull(document.planType),
    createdAt: dateLikeOrNull(document.createdAt),
  };
}

function toOverviewActivity(document: Record<string, unknown>): AdminOverviewActivityEvent {
  return {
    _id: renderableId(document._id),
    event: stringOrNull(document.event),
    email: stringOrNull(document.email),
    metadata: plainRecordOrNull(document.metadata),
    createdAt: dateLikeOrNull(document.createdAt),
  };
}

function toCanceledUser(document: Record<string, unknown>): AdminCanceledUser {
  return {
    _id: renderableId(document._id),
    name: stringOrNull(document.name),
    email: stringOrNull(document.email),
    subscriptionStatus: stringOrNull(document.subscriptionStatus),
    cancelAtPeriodEnd: typeof document.cancelAtPeriodEnd === "boolean" ? document.cancelAtPeriodEnd : null,
    cancelAt: dateLikeOrNull(document.cancelAt),
    cancellationReason: stringOrNull(document.cancellationReason),
    cancellationFeedback: stringOrNull(document.cancellationFeedback),
    createdAt: dateLikeOrNull(document.createdAt),
    updatedAt: dateLikeOrNull(document.updatedAt),
    totalCardsCreated: numberOrNull(document.totalCardsCreated),
    totalExports: numberOrNull(document.totalExports),
  };
}

function stringOrNull(value: unknown) {
  return typeof value === "string" ? value : null;
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function dateLikeOrNull(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value === "string") return value;
  return null;
}

function plainRecordOrNull(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function renderableId(value: unknown): RenderableId {
  if (
    value &&
    typeof value === "object" &&
    "toString" in value &&
    typeof (value as { toString?: unknown }).toString === "function"
  ) {
    return value as RenderableId;
  }
  return String(value ?? "");
}
