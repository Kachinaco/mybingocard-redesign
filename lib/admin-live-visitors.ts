import { getSqliteStore } from "@/lib/db/sqlite";
import type {
  AdminVisitorEvent,
  AdminVisitorSummary,
  AdminVisitorsData,
  AdminVisitorsStats,
} from "@/app/admin/visitors/types";

const DOMAIN = "mybingocard.com";
const ENGAGED_WINDOW_MS = 30 * 1000;
const DEFAULT_TRACKER_LIVE_URL = "http://127.0.0.1:3098/api/live/events";

type VisitorFilters = {
  anonymousId: string | null;
  sessionId: string | null;
  visitorKey: string | null;
};

type TrackerEvent = {
  anonymousId?: unknown;
  eventGroup?: unknown;
  eventType?: unknown;
  isAuthProbe?: unknown;
  label?: unknown;
  metadata?: unknown;
  pathname?: unknown;
  receivedAt?: unknown;
  sessionId?: unknown;
  visitorId?: unknown;
  visitorName?: unknown;
};

type TrackerKnownVisitor = {
  anonymousId?: unknown;
  anonymousIds?: unknown;
  displayName?: unknown;
  durationSeconds?: unknown;
  events?: unknown;
  firstSeenAt?: unknown;
  lastEventType?: unknown;
  lastPath?: unknown;
  lastSeenAt?: unknown;
  pageviews?: unknown;
  sessions?: unknown;
  visitorId?: unknown;
  visitorKey?: unknown;
  visitorName?: unknown;
};

type TrackerLivePayload = {
  events?: unknown;
  knownVisitors?: unknown;
  siteSummary?: unknown;
};

type VisitorProfile = {
  anonymousId?: unknown;
  domain?: unknown;
  email?: unknown;
  myBingoCardUserId?: unknown;
  name?: unknown;
  sessionId?: unknown;
};

type VisitorAggregate = {
  visitorKey: string;
  anonymousId: string | null;
  sessionIds: Set<string>;
  tabIds: Set<string>;
  firstSeenAt: Date | null;
  lastSeenAt: Date | null;
  lastPresenceAt: Date | null;
  lastInteractionAt: Date | null;
  lastPathname: string | null;
  lastEvent: string | null;
  eventCount: number;
  pageViews: number;
  uniquePages: Set<string>;
  isVisible: boolean | null;
  isFocused: boolean | null;
  trackerName: string | null;
  recentEvents: AdminVisitorEvent[];
};

function clampNumber(value: number | undefined, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value as number)));
}

function cleanString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function cleanStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => cleanString(item)).filter(Boolean) : [];
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

function dateValue(value: unknown): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function toIso(value: Date | null): string {
  return (value || new Date(0)).toISOString();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function eventName(event: TrackerEvent): string {
  return cleanString(event.eventType) || cleanString(event.label) || cleanString(event.eventGroup) || "event";
}

function isPageView(event: string): boolean {
  return event === "pageview" || event === "page_view";
}

function isInteraction(event: string): boolean {
  return !["pageview", "page_view", "session_end", "tab_hidden", "visitor_presence"].includes(event);
}

function visitorKeyFor(event: TrackerEvent): { visitorKey: string; anonymousId: string | null } | null {
  const anonymousId = cleanString(event.anonymousId);
  const visitorKey = anonymousId || cleanString(event.visitorId) || cleanString(event.sessionId);
  return visitorKey ? { visitorKey, anonymousId: anonymousId || null } : null;
}

function createAggregate(visitorKey: string, anonymousId: string | null): VisitorAggregate {
  return {
    visitorKey,
    anonymousId,
    sessionIds: new Set(),
    tabIds: new Set(),
    firstSeenAt: null,
    lastSeenAt: null,
    lastPresenceAt: null,
    lastInteractionAt: null,
    lastPathname: null,
    lastEvent: null,
    eventCount: 0,
    pageViews: 0,
    uniquePages: new Set(),
    isVisible: null,
    isFocused: null,
    trackerName: null,
    recentEvents: [],
  };
}

function updateRange(aggregate: VisitorAggregate, value: Date) {
  if (!aggregate.firstSeenAt || value < aggregate.firstSeenAt) aggregate.firstSeenAt = value;
  if (!aggregate.lastSeenAt || value >= aggregate.lastSeenAt) aggregate.lastSeenAt = value;
}

function addTrackerEvent(aggregate: VisitorAggregate, event: TrackerEvent) {
  const createdAt = dateValue(event.receivedAt);
  if (!createdAt) return;

  const name = eventName(event);
  const pathname = cleanString(event.pathname) || null;
  const sessionId = cleanString(event.sessionId) || null;
  const metadata = asRecord(event.metadata);
  const tabId = cleanString(metadata.tabId) || null;
  const visible = typeof metadata.visible === "boolean" ? metadata.visible : null;
  const focused = typeof metadata.focused === "boolean" ? metadata.focused : null;

  updateRange(aggregate, createdAt);
  aggregate.eventCount += 1;
  if (isPageView(name)) aggregate.pageViews += 1;
  if (pathname) aggregate.uniquePages.add(pathname);
  if (sessionId) aggregate.sessionIds.add(sessionId);
  if (tabId) aggregate.tabIds.add(tabId);
  if (name === "visitor_presence") aggregate.lastPresenceAt = createdAt;
  if (isInteraction(name) && (!aggregate.lastInteractionAt || createdAt >= aggregate.lastInteractionAt)) {
    aggregate.lastInteractionAt = createdAt;
  }

  if (!aggregate.lastSeenAt || createdAt >= aggregate.lastSeenAt) {
    aggregate.lastPathname = pathname;
    aggregate.lastEvent = name;
    aggregate.isVisible = visible;
    aggregate.isFocused = focused;
  }

  aggregate.trackerName = aggregate.trackerName || cleanString(event.visitorName) || null;
  aggregate.recentEvents.push({
    event: name,
    pathname,
    createdAt: toIso(createdAt),
    sessionId,
    tabId,
    trafficClass: null,
    isHuman: event.isAuthProbe === true ? false : true,
  });
}

function mergeKnownVisitor(aggregate: VisitorAggregate, visitor: TrackerKnownVisitor) {
  const firstSeenAt = dateValue(visitor.firstSeenAt);
  const lastSeenAt = dateValue(visitor.lastSeenAt);
  if (firstSeenAt) updateRange(aggregate, firstSeenAt);
  if (lastSeenAt) updateRange(aggregate, lastSeenAt);
  aggregate.eventCount = Math.max(aggregate.eventCount, numberValue(visitor.events));
  aggregate.pageViews = Math.max(aggregate.pageViews, numberValue(visitor.pageviews));
  aggregate.trackerName =
    aggregate.trackerName || cleanString(visitor.visitorName) || cleanString(visitor.displayName) || null;
  if (lastSeenAt && (!aggregate.lastSeenAt || lastSeenAt >= aggregate.lastSeenAt)) {
    aggregate.lastPathname = cleanString(visitor.lastPath) || aggregate.lastPathname;
    aggregate.lastEvent = cleanString(visitor.lastEventType) || aggregate.lastEvent;
  }
}

function profileMap(): Map<string, VisitorProfile> {
  const profiles = getSqliteStore().findMany<VisitorProfile>("visitor_profiles", {});
  return new Map(
    profiles
      .filter((profile) => {
        const domain = cleanString(profile.domain);
        return !domain || domain === DOMAIN;
      })
      .map((profile) => [cleanString(profile.anonymousId), profile] as const)
      .filter(([anonymousId]) => Boolean(anonymousId))
  );
}

function profileValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && "toString" in value) {
    const converted = String(value);
    return converted && converted !== "[object Object]" ? converted : null;
  }
  return null;
}

function displayNameFor(profile: VisitorProfile | undefined, aggregate: VisitorAggregate): string {
  const name = cleanString(profile?.name);
  const email = cleanString(profile?.email);
  if (name && email) return `${name} <${email}>`;
  if (name) return name;
  if (email) return email;
  if (aggregate.trackerName) return aggregate.trackerName;
  return aggregate.anonymousId || aggregate.sessionIds.values().next().value || aggregate.visitorKey || "Unknown visitor";
}

function matchesFilters(visitor: AdminVisitorSummary, filters: VisitorFilters): boolean {
  if (filters.anonymousId && visitor.anonymousId !== filters.anonymousId) return false;
  if (filters.sessionId && !visitor.sessionIds.includes(filters.sessionId)) return false;
  if (
    filters.visitorKey &&
    visitor.visitorKey !== filters.visitorKey &&
    visitor.anonymousId !== filters.visitorKey &&
    !visitor.sessionIds.includes(filters.visitorKey)
  ) {
    return false;
  }
  return true;
}

function serializeVisitor(aggregate: VisitorAggregate, profiles: Map<string, VisitorProfile>, activeSince: Date): AdminVisitorSummary {
  const profile = profiles.get(aggregate.anonymousId || "") || profiles.get(aggregate.visitorKey);
  const visitorName = cleanString(profile?.name) || aggregate.trackerName || null;
  const visitorEmail = cleanString(profile?.email) || null;
  const myBingoCardUserId = profileValue(profile?.myBingoCardUserId);
  const lastSeenAt = aggregate.lastSeenAt || aggregate.firstSeenAt || new Date(0);
  const lastEvent = aggregate.lastEvent || "";
  const isActive =
    lastSeenAt >= activeSince &&
    !["session_end", "tab_hidden"].includes(lastEvent) &&
    aggregate.isVisible !== false;
  const isEngaged = isActive && Boolean(aggregate.lastInteractionAt && aggregate.lastInteractionAt.getTime() >= Date.now() - ENGAGED_WINDOW_MS);

  return {
    visitorKey: aggregate.visitorKey,
    identityType: visitorName || visitorEmail ? "known" : aggregate.anonymousId ? "anonymous" : "session",
    visitorLabel: displayNameFor(profile, aggregate),
    visitorName,
    visitorEmail,
    myBingoCardUserId,
    anonymousId: aggregate.anonymousId,
    sessionIds: Array.from(aggregate.sessionIds).slice(0, 20),
    tabIds: Array.from(aggregate.tabIds).slice(0, 20),
    firstSeenAt: toIso(aggregate.firstSeenAt || lastSeenAt),
    lastSeenAt: toIso(lastSeenAt),
    lastPresenceAt: aggregate.lastPresenceAt ? toIso(aggregate.lastPresenceAt) : null,
    lastInteractionAt: aggregate.lastInteractionAt ? toIso(aggregate.lastInteractionAt) : null,
    lastPathname: aggregate.lastPathname,
    lastEvent: aggregate.lastEvent,
    eventCount: aggregate.eventCount,
    pageViews: aggregate.pageViews,
    uniquePages: Array.from(aggregate.uniquePages).slice(0, 12),
    isActive,
    isEngaged,
    isVisible: aggregate.isVisible,
    isFocused: aggregate.isFocused,
    recentEvents: [...aggregate.recentEvents]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 12),
  };
}

async function fetchTrackerPayload(periodHours: number, limit: number): Promise<TrackerLivePayload> {
  const url = new URL(process.env.MYBINGOCARD_TRACKER_LIVE_URL || DEFAULT_TRACKER_LIVE_URL);
  url.searchParams.set("domain", DOMAIN);
  url.searchParams.set("period_minutes", String(periodHours * 60));
  url.searchParams.set("limit", String(Math.min(2000, Math.max(250, limit * 12))));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(`Tracker Lite returned ${response.status}`);
    return (await response.json()) as TrackerLivePayload;
  } finally {
    clearTimeout(timeout);
  }
}

function summaryCount(payload: TrackerLivePayload, key: "events" | "sessions"): number {
  return numberValue(asRecord(payload.siteSummary)[key]);
}

export async function getAdminVisitorsData(options?: {
  liveWindowMinutes?: number;
  periodHours?: number;
  limit?: number;
  anonymousId?: string | null;
  sessionId?: string | null;
  visitorKey?: string | null;
}): Promise<AdminVisitorsData> {
  const liveWindowMinutes = clampNumber(options?.liveWindowMinutes, 5, 1, 60);
  const periodHours = clampNumber(options?.periodHours, 24, 1, 168);
  const limit = clampNumber(options?.limit, 100, 10, 250);
  const filters: VisitorFilters = {
    anonymousId: cleanString(options?.anonymousId) || null,
    sessionId: cleanString(options?.sessionId) || null,
    visitorKey: cleanString(options?.visitorKey) || null,
  };
  const activeSince = new Date(Date.now() - liveWindowMinutes * 60 * 1000);
  const payload = await fetchTrackerPayload(periodHours, limit);
  const profiles = profileMap();
  const aggregates = new Map<string, VisitorAggregate>();

  for (const rawEvent of Array.isArray(payload.events) ? payload.events : []) {
    const event = asRecord(rawEvent) as TrackerEvent;
    if (event.isAuthProbe === true) continue;
    const identity = visitorKeyFor(event);
    if (!identity) continue;
    const aggregate = aggregates.get(identity.visitorKey) || createAggregate(identity.visitorKey, identity.anonymousId);
    if (!aggregate.anonymousId && identity.anonymousId) aggregate.anonymousId = identity.anonymousId;
    addTrackerEvent(aggregate, event);
    aggregates.set(identity.visitorKey, aggregate);
  }

  for (const rawKnownVisitor of Array.isArray(payload.knownVisitors) ? payload.knownVisitors : []) {
    const visitor = asRecord(rawKnownVisitor) as TrackerKnownVisitor;
    const anonymousIds = cleanStringArray(visitor.anonymousIds);
    const anonymousId = cleanString(visitor.anonymousId) || anonymousIds[0] || null;
    const visitorKey = anonymousId || cleanString(visitor.visitorKey) || cleanString(visitor.visitorId);
    if (!visitorKey) continue;
    const aggregate = aggregates.get(visitorKey) || createAggregate(visitorKey, anonymousId);
    if (!aggregate.anonymousId && anonymousId) aggregate.anonymousId = anonymousId;
    mergeKnownVisitor(aggregate, visitor);
    aggregates.set(visitorKey, aggregate);
  }

  const allVisitors = Array.from(aggregates.values())
    .map((aggregate) => serializeVisitor(aggregate, profiles, activeSince))
    .filter((visitor) => matchesFilters(visitor, filters))
    .sort((left, right) => new Date(right.lastSeenAt).getTime() - new Date(left.lastSeenAt).getTime());
  const activeVisitors = allVisitors.filter((visitor) => visitor.isActive);
  const uniqueSessions = new Set(allVisitors.flatMap((visitor) => visitor.sessionIds));
  const knownVisitors24h = allVisitors.filter((visitor) => visitor.identityType === "known").length;
  const stats: AdminVisitorsStats = {
    activeVisitors: activeVisitors.length,
    activeKnownVisitors: activeVisitors.filter((visitor) => visitor.identityType === "known").length,
    activeAnonymousVisitors: activeVisitors.filter((visitor) => visitor.identityType !== "known").length,
    engagedVisitors: activeVisitors.filter((visitor) => visitor.isEngaged).length,
    visibleVisitors: activeVisitors.filter((visitor) => visitor.isVisible === true).length,
    visitors24h: allVisitors.length,
    knownVisitors24h,
    anonymousVisitors24h: allVisitors.length - knownVisitors24h,
    sessions24h: summaryCount(payload, "sessions") || uniqueSessions.size,
    events24h: summaryCount(payload, "events") || allVisitors.reduce((sum, visitor) => sum + visitor.eventCount, 0),
  };

  return {
    domain: DOMAIN,
    generatedAt: new Date().toISOString(),
    liveWindowMinutes,
    periodHours,
    filters,
    stats,
    activeVisitors,
    visitors: allVisitors.slice(0, limit),
  };
}
