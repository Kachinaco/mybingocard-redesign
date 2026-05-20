import { MongoClient } from "mongodb";
import { readFileSync } from "node:fs";
import type {
  AdminVisitorSummary,
  AdminVisitorsData,
  AdminVisitorsStats,
} from "@/app/admin/visitors/types";

const DOMAIN = "mybingocard.com";
const ENGAGED_WINDOW_MS = 30 * 1000;
const HUMAN_TRAFFIC_FILTER = {
  isBot: { $ne: true },
  trafficClass: { $ne: "internal" },
};

let analyticsClientPromise: Promise<MongoClient> | null = null;

type RawVisitorSummary = Omit<
  AdminVisitorSummary,
  "firstSeenAt" | "lastSeenAt" | "recentEvents"
> & {
  firstSeenAt: Date;
  lastSeenAt: Date;
  lastPresenceAt?: Date | null;
  lastInteractionAt?: Date | null;
  recentEvents: Array<{
    event?: string;
    pathname?: string | null;
    createdAt?: Date;
    sessionId?: string | null;
    tabId?: string | null;
    trafficClass?: string | null;
    isHuman?: boolean | null;
  }>;
};

function readEnvFile(filePath: string): Record<string, string> {
  try {
    const env: Record<string, string> = {};
    for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1).replace(/^['"]|['"]$/g, "");
    }
    return env;
  } catch {
    return {};
  }
}

function getAnalyticsMongoUri(): string {
  if (process.env.ANALYTICS_MONGODB_URI) return process.env.ANALYTICS_MONGODB_URI;
  if (process.env.TOWNRANKER_ANALYTICS_MONGODB_URI) return process.env.TOWNRANKER_ANALYTICS_MONGODB_URI;
  const analyticsEnv = readEnvFile("/opt/saas/analytics-tracker/.env");
  return analyticsEnv.MONGODB_URI || "mongodb://localhost:27017/analytics";
}

async function getAnalyticsClient(): Promise<MongoClient> {
  if (!analyticsClientPromise) {
    analyticsClientPromise = new MongoClient(getAnalyticsMongoUri(), {
      maxPoolSize: 5,
      minPoolSize: 0,
      maxIdleTimeMS: 30000,
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    }).connect();
  }

  return analyticsClientPromise;
}

function clampNumber(value: number | undefined, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value as number)));
}

function toIso(value: Date | string | null | undefined): string {
  if (!value) return new Date(0).toISOString();
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function cleanString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function cleanStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => cleanString(item)).filter(Boolean)
    : [];
}

function isRecentDate(value: Date | string | null | undefined, sinceMs: number): boolean {
  if (!value) return false;
  return new Date(value).getTime() >= sinceMs;
}

function displayNameFor(visitor: {
  visitorName?: string | null;
  visitorEmail?: string | null;
  anonymousId?: string | null;
  sessionIds?: string[];
}): string {
  if (visitor.visitorName && visitor.visitorEmail) {
    return `${visitor.visitorName} <${visitor.visitorEmail}>`;
  }
  if (visitor.visitorName) return visitor.visitorName;
  if (visitor.visitorEmail) return visitor.visitorEmail;
  if (visitor.anonymousId) return visitor.anonymousId;
  return visitor.sessionIds?.[0] || "Unknown visitor";
}

function sortEvents(events: RawVisitorSummary["recentEvents"]): RawVisitorSummary["recentEvents"] {
  return [...(events || [])].sort((a, b) => {
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
}

function serializeVisitor(visitor: RawVisitorSummary, activeSince: Date): AdminVisitorSummary {
  const visitorName = cleanString(visitor.visitorName, "");
  const visitorEmail = cleanString(visitor.visitorEmail, "");
  const anonymousId = cleanString(visitor.anonymousId, "");
  const sessionIds = cleanStringArray(visitor.sessionIds);
  const tabIds = cleanStringArray(visitor.tabIds);
  const identityType = visitorName || visitorEmail ? "known" : anonymousId ? "anonymous" : "session";
  const lastEvent = cleanString(visitor.lastEvent, "");
  const hasEnded = ["session_end", "tab_hidden"].includes(lastEvent);
  const lastSeenMs = new Date(visitor.lastSeenAt).getTime();
  const isActive = Boolean(lastSeenMs >= activeSince.getTime() && !hasEnded && visitor.isVisible !== false);
  const isEngaged = isActive && isRecentDate(visitor.lastInteractionAt, Date.now() - ENGAGED_WINDOW_MS);

  return {
    ...visitor,
    identityType,
    visitorName: visitorName || null,
    visitorEmail: visitorEmail || null,
    myBingoCardUserId: cleanString(visitor.myBingoCardUserId, "") || null,
    anonymousId: anonymousId || null,
    sessionIds,
    tabIds,
    visitorLabel: displayNameFor({
      visitorName,
      visitorEmail,
      anonymousId,
      sessionIds,
    }),
    firstSeenAt: toIso(visitor.firstSeenAt),
    lastSeenAt: toIso(visitor.lastSeenAt),
    lastPresenceAt: visitor.lastPresenceAt ? toIso(visitor.lastPresenceAt) : null,
    lastInteractionAt: visitor.lastInteractionAt ? toIso(visitor.lastInteractionAt) : null,
    isActive,
    isEngaged,
    isVisible: typeof visitor.isVisible === "boolean" ? visitor.isVisible : null,
    isFocused: typeof visitor.isFocused === "boolean" ? visitor.isFocused : null,
    recentEvents: sortEvents(visitor.recentEvents).slice(0, 12).map((event) => ({
      event: cleanString(event.event, "unknown"),
      pathname: cleanString(event.pathname, "") || null,
      createdAt: toIso(event.createdAt),
      sessionId: cleanString(event.sessionId, "") || null,
      tabId: cleanString(event.tabId, "") || null,
      trafficClass: cleanString(event.trafficClass, "") || null,
      isHuman: typeof event.isHuman === "boolean" ? event.isHuman : null,
    })),
  };
}

function visitorFilter(options?: {
  anonymousId?: string | null;
  sessionId?: string | null;
  visitorKey?: string | null;
}) {
  const anonymousId = cleanString(options?.anonymousId, "");
  const sessionId = cleanString(options?.sessionId, "");
  const visitorKey = cleanString(options?.visitorKey, "");
  const filters = [];

  if (anonymousId) filters.push({ anonymousId });
  if (sessionId) filters.push({ sessionId });
  if (sessionId) filters.push({ sessionIds: sessionId });
  if (visitorKey) filters.push({ visitorKey });

  return filters.length ? { $or: filters } : {};
}

async function getProjectedVisitors(
  db: ReturnType<MongoClient["db"]>,
  since: Date,
  activeSince: Date,
  options?: { anonymousId?: string | null; sessionId?: string | null; visitorKey?: string | null }
): Promise<AdminVisitorSummary[]> {
  const docs = await db
    .collection("live_visitors")
    .find({
      domain: DOMAIN,
      lastSeenAt: { $gte: since },
      ...HUMAN_TRAFFIC_FILTER,
      ...visitorFilter(options),
    })
    .sort({ lastSeenAt: -1 })
    .toArray();

  return docs.map((doc) =>
    serializeVisitor(
      {
        visitorKey: cleanString(doc.visitorKey, cleanString(doc.anonymousId, cleanString(doc.sessionId))),
        identityType: "anonymous",
        visitorLabel: cleanString(doc.visitorLabel, ""),
        visitorName: cleanString(doc.visitorName, "") || null,
        visitorEmail: cleanString(doc.visitorEmail, "") || null,
        myBingoCardUserId: cleanString(doc.myBingoCardUserId, "") || null,
        anonymousId: cleanString(doc.anonymousId, "") || null,
        sessionIds: cleanStringArray(doc.sessionIds).length ? cleanStringArray(doc.sessionIds) : [cleanString(doc.sessionId)].filter(Boolean),
        tabIds: cleanStringArray(doc.tabIds).length ? cleanStringArray(doc.tabIds) : [cleanString(doc.tabId)].filter(Boolean),
        firstSeenAt: doc.firstSeenAt || doc.createdAt || doc.lastSeenAt,
        lastSeenAt: doc.lastSeenAt,
        lastPresenceAt: doc.lastPresenceAt || null,
        lastInteractionAt: doc.lastInteractionAt || null,
        lastPathname: cleanString(doc.currentPathname, "") || null,
        lastEvent: cleanString(doc.lastEvent, "") || null,
        eventCount: typeof doc.eventCount === "number" ? doc.eventCount : 0,
        pageViews: typeof doc.pageViews === "number" ? doc.pageViews : 0,
        uniquePages: cleanString(doc.currentPathname, "") ? [cleanString(doc.currentPathname)] : [],
        isActive: false,
        isEngaged: false,
        isVisible: typeof doc.visible === "boolean" ? doc.visible : null,
        isFocused: typeof doc.focused === "boolean" ? doc.focused : null,
        recentEvents: Array.isArray(doc.recentEvents) ? doc.recentEvents : [],
      },
      activeSince
    )
  );
}

async function getRawVisitors(
  db: ReturnType<MongoClient["db"]>,
  since: Date,
  activeSince: Date,
  options?: { anonymousId?: string | null; sessionId?: string | null; visitorKey?: string | null }
): Promise<AdminVisitorSummary[]> {
  const anonymousId = cleanString(options?.anonymousId, "");
  const sessionId = cleanString(options?.sessionId, "");
  const visitorKey = cleanString(options?.visitorKey, "");
  const identityClauses = [];
  if (anonymousId) identityClauses.push({ anonymousId });
  if (sessionId) identityClauses.push({ sessionId });
  if (visitorKey) identityClauses.push({ anonymousId: visitorKey }, { sessionId: visitorKey });

  const visitors = await db
    .collection("events")
    .aggregate<RawVisitorSummary>([
      {
        $match: {
          domain: DOMAIN,
          createdAt: { $gte: since },
          ...HUMAN_TRAFFIC_FILTER,
          ...(identityClauses.length ? { $or: identityClauses } : {}),
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $addFields: {
          visitorKey: {
            $ifNull: ["$anonymousId", "$sessionId"],
          },
        },
      },
      { $match: { visitorKey: { $type: "string", $ne: "" } } },
      {
        $group: {
          _id: "$visitorKey",
          visitorKey: { $first: "$visitorKey" },
          anonymousId: { $first: "$anonymousId" },
          sessionIds: { $addToSet: "$sessionId" },
          tabIds: { $addToSet: "$metadata.tabId" },
          firstSeenAt: { $min: "$createdAt" },
          lastSeenAt: { $max: "$createdAt" },
          lastPresenceAt: {
            $max: {
              $cond: [{ $eq: ["$event", "visitor_presence"] }, "$createdAt", null],
            },
          },
          lastInteractionAt: {
            $max: {
              $cond: [
                {
                  $or: [
                    { $eq: ["$metadata.recentlyInteracted", true] },
                    { $in: ["$event", ["page_view", "click", "cta_click", "phone_click", "email_click", "form_submit", "tab_returned"]] },
                  ],
                },
                "$createdAt",
                null,
              ],
            },
          },
          lastPathname: { $first: "$pathname" },
          lastEvent: { $first: "$event" },
          eventCount: { $sum: 1 },
          pageViews: {
            $sum: {
              $cond: [{ $eq: ["$event", "page_view"] }, 1, 0],
            },
          },
          isVisible: { $first: "$metadata.visible" },
          isFocused: { $first: "$metadata.focused" },
          uniquePages: { $addToSet: "$pathname" },
          recentEvents: {
            $push: {
              event: "$event",
              pathname: "$pathname",
              createdAt: "$createdAt",
              sessionId: "$sessionId",
              tabId: "$metadata.tabId",
              trafficClass: "$trafficClass",
              isHuman: "$isHuman",
            },
          },
        },
      },
      {
        $lookup: {
          from: "visitor_profiles",
          localField: "anonymousId",
          foreignField: "anonymousId",
          as: "profiles",
        },
      },
      {
        $addFields: {
          profile: { $first: "$profiles" },
        },
      },
      {
        $project: {
          _id: 0,
          visitorKey: 1,
          anonymousId: 1,
          sessionIds: {
            $slice: [
              {
                $filter: {
                  input: "$sessionIds",
                  as: "sessionId",
                  cond: { $and: [{ $ne: ["$$sessionId", null] }, { $ne: ["$$sessionId", ""] }] },
                },
              },
              20,
            ],
          },
          tabIds: {
            $slice: [
              {
                $filter: {
                  input: "$tabIds",
                  as: "tabId",
                  cond: { $and: [{ $ne: ["$$tabId", null] }, { $ne: ["$$tabId", ""] }] },
                },
              },
              20,
            ],
          },
          visitorName: "$profile.name",
          visitorEmail: "$profile.email",
          myBingoCardUserId: "$profile.myBingoCardUserId",
          firstSeenAt: 1,
          lastSeenAt: 1,
          lastPresenceAt: 1,
          lastInteractionAt: 1,
          lastPathname: 1,
          lastEvent: 1,
          eventCount: 1,
          pageViews: 1,
          isVisible: 1,
          isFocused: 1,
          uniquePages: {
            $slice: [
              {
                $filter: {
                  input: "$uniquePages",
                  as: "page",
                  cond: { $and: [{ $ne: ["$$page", null] }, { $ne: ["$$page", ""] }] },
                },
              },
              12,
            ],
          },
          recentEvents: { $slice: ["$recentEvents", 12] },
        },
      },
      { $sort: { lastSeenAt: -1 } },
    ])
    .toArray();

  return visitors.map((visitor) => serializeVisitor(visitor, activeSince));
}

function mergeVisitors(projected: AdminVisitorSummary[], raw: AdminVisitorSummary[]): AdminVisitorSummary[] {
  const merged = new Map<string, AdminVisitorSummary>();
  for (const visitor of raw) {
    merged.set(visitor.visitorKey, visitor);
  }
  for (const visitor of projected) {
    merged.set(visitor.visitorKey, {
      ...(merged.get(visitor.visitorKey) || {}),
      ...visitor,
      uniquePages: Array.from(new Set([...visitor.uniquePages, ...(merged.get(visitor.visitorKey)?.uniquePages || [])])).slice(0, 12),
      recentEvents: visitor.recentEvents.length ? visitor.recentEvents : (merged.get(visitor.visitorKey)?.recentEvents || []),
    });
  }

  return Array.from(merged.values()).sort((a, b) => {
    return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
  });
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
  const filters = {
    anonymousId: cleanString(options?.anonymousId, "") || null,
    sessionId: cleanString(options?.sessionId, "") || null,
    visitorKey: cleanString(options?.visitorKey, "") || null,
  };
  const activeSince = new Date(Date.now() - liveWindowMinutes * 60 * 1000);
  const since = new Date(Date.now() - periodHours * 60 * 60 * 1000);

  const client = await getAnalyticsClient();
  const db = client.db();

  const [projectedVisitors, rawVisitors, events24h] = await Promise.all([
    getProjectedVisitors(db, since, activeSince, filters),
    getRawVisitors(db, since, activeSince, filters),
    db.collection("events").countDocuments({
      domain: DOMAIN,
      createdAt: { $gte: since },
      ...HUMAN_TRAFFIC_FILTER,
      ...(filters.anonymousId || filters.sessionId || filters.visitorKey
        ? {
            $or: [
              ...(filters.anonymousId ? [{ anonymousId: filters.anonymousId }] : []),
              ...(filters.sessionId ? [{ sessionId: filters.sessionId }] : []),
              ...(filters.visitorKey ? [{ anonymousId: filters.visitorKey }, { sessionId: filters.visitorKey }] : []),
            ],
          }
        : {}),
    }),
  ]);

  const allVisitors = mergeVisitors(projectedVisitors, rawVisitors);
  const visitors = allVisitors.slice(0, limit);
  const activeVisitors = allVisitors.filter((visitor) => visitor.isActive);
  const knownVisitors24h = allVisitors.filter((visitor) => visitor.identityType === "known").length;
  const anonymousVisitors24h = allVisitors.filter((visitor) => visitor.identityType !== "known").length;
  const uniqueSessions = new Set(allVisitors.flatMap((visitor) => visitor.sessionIds));

  const stats: AdminVisitorsStats = {
    activeVisitors: activeVisitors.length,
    activeKnownVisitors: activeVisitors.filter((visitor) => visitor.identityType === "known").length,
    activeAnonymousVisitors: activeVisitors.filter((visitor) => visitor.identityType !== "known").length,
    engagedVisitors: activeVisitors.filter((visitor) => visitor.isEngaged).length,
    visibleVisitors: activeVisitors.filter((visitor) => visitor.isVisible === true).length,
    visitors24h: allVisitors.length,
    knownVisitors24h,
    anonymousVisitors24h,
    sessions24h: uniqueSessions.size,
    events24h,
  };

  return {
    domain: DOMAIN,
    generatedAt: new Date().toISOString(),
    liveWindowMinutes,
    periodHours,
    filters,
    stats,
    activeVisitors,
    visitors,
  };
}
