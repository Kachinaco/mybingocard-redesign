import clientPromise from "@/lib/mongodb";
import { getSqliteStore, useSqliteDb } from "@/lib/db/sqlite";

const DB_NAME = "mybingocard";

export type ClientErrorSeverity = "low" | "medium" | "high";

export type ClientErrorEventRecord = {
  fingerprint: string;
  type: string;
  message: string;
  source: string | null;
  lineno: number | null;
  colno: number | null;
  stack: string | null;
  symbolicatedStack: string | null;
  sourceMappedFrames: unknown[];
  pageUrl: string | null;
  pathname: string | null;
  userAgent: string | null;
  userId: string | null;
  email: string | null;
  sessionId: string | null;
  anonymousId: string | null;
  buildId: string | null;
  release: string | null;
  breadcrumbs: unknown[];
  clientContext: Record<string, unknown>;
  ipAddress: string;
  domain: string | null;
  createdAt: Date;
  severity: ClientErrorSeverity;
  errorCategory: string;
  impactArea: string;
  alertSuppressed: boolean;
  suppressionReason: string | null;
  resourceHost: string | null;
};

export type ClientErrorFingerprintRecord = {
  _id: string;
  totalCount?: number;
  status?: string;
  [key: string]: unknown;
};

export type MarketingTrackingFailureRecord = {
  fingerprint: string;
  message: string;
  source: string | null;
  pageUrl: string | null;
  pathname: string | null;
  userAgent: string | null;
  sessionId: string | null;
  anonymousId: string | null;
  buildId: string | null;
  createdAt: Date;
};

export type ClientErrorRecentStats = {
  count: number;
  sessionCount: number;
};

export type AdminErrorStatus = "open" | "watching" | "fixed" | "ignored";

export type AdminErrorFingerprintDoc = ClientErrorFingerprintRecord & {
  _id: string;
  type?: string;
  message?: string;
  source?: string | null;
  latestPageUrl?: string | null;
  latestPathname?: string | null;
  latestBuildId?: string | null;
  latestStack?: string | null;
  latestSymbolicatedStack?: string | null;
  latestSourceMappedFrames?: Array<{
    source?: string;
    line?: number;
    column?: number;
    name?: string | null;
    contextLine?: string | null;
  }>;
  latestBreadcrumbs?: Array<{
    type?: string;
    message?: string;
    timestamp?: string;
    href?: string;
    data?: Record<string, unknown>;
  }>;
  severity?: ClientErrorSeverity;
  errorCategory?: string;
  impactArea?: string;
  alertSuppressed?: boolean;
  resourceHost?: string | null;
  status?: AdminErrorStatus | string;
  statusUpdatedAt?: Date;
  statusUpdatedBy?: string | null;
  firstSeenAt?: Date;
  lastSeenAt?: Date;
  lastAlertedAt?: Date;
  lastAlertRecentCount?: number;
  lastAlertRecentSessions?: number;
  sessionIds?: Array<string | null>;
  anonymousIds?: Array<string | null>;
  pageUrls?: Array<string | null>;
  buildIds?: Array<string | null>;
};

export type AdminErrorEventDoc = {
  _id: unknown;
  fingerprint?: string;
  type?: string;
  message?: string;
  pageUrl?: string | null;
  pathname?: string | null;
  buildId?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
  anonymousId?: string | null;
  symbolicatedStack?: string | null;
  sourceMappedFrames?: AdminErrorFingerprintDoc["latestSourceMappedFrames"];
  errorCategory?: string;
  impactArea?: string;
  alertSuppressed?: boolean;
  resourceHost?: string | null;
  createdAt?: Date;
};

export type AdminErrorStatusCount = {
  _id: string | null;
  count: number;
};

export interface AdminErrorPageData {
  groups: AdminErrorFingerprintDoc[];
  groups24h: number;
  events24h: number;
  currentBuildEvents24h: number;
  eventsAfterDeploy: number;
  highGroups24h: number;
  newSinceDeployGroups: number;
  statusCountsRaw: AdminErrorStatusCount[];
  selectedEvents: AdminErrorEventDoc[];
  selectedGroup: AdminErrorFingerprintDoc | null;
}

async function mongoDb() {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

export async function insertClientErrorEvent(doc: ClientErrorEventRecord): Promise<void> {
  if (useSqliteDb()) {
    getSqliteStore().insertOne("error_events", doc);
    return;
  }

  const db = await mongoDb();
  await db.collection<ClientErrorEventRecord>("error_events").insertOne(doc);
}

export async function upsertMarketingTrackingFailure(
  doc: MarketingTrackingFailureRecord,
  signal: {
    resourceHost: string | null;
    suppressionReason: string | null;
  }
): Promise<void> {
  const update = {
    $setOnInsert: {
      firstSeenAt: doc.createdAt,
    },
    $set: {
      message: doc.message,
      source: doc.source,
      resourceHost: signal.resourceHost,
      latestPageUrl: doc.pageUrl,
      latestPathname: doc.pathname,
      latestUserAgent: doc.userAgent,
      latestBuildId: doc.buildId,
      suppressionReason: signal.suppressionReason,
      lastSeenAt: doc.createdAt,
      updatedAt: doc.createdAt,
    },
    $inc: { totalCount: 1 },
    $addToSet: {
      pageUrls: doc.pageUrl,
      pathnames: doc.pathname,
      buildIds: doc.buildId,
      anonymousIds: doc.anonymousId,
      sessionIds: doc.sessionId,
    },
  };

  if (useSqliteDb()) {
    getSqliteStore().updateOne("marketing_tracking_failures", { _id: doc.fingerprint }, update, { upsert: true });
    return;
  }

  const db = await mongoDb();
  await db.collection<{ _id: string }>("marketing_tracking_failures").updateOne(
    { _id: doc.fingerprint },
    update,
    { upsert: true }
  );
}

export async function upsertClientErrorFingerprint(
  doc: ClientErrorEventRecord
): Promise<ClientErrorFingerprintRecord | null> {
  const update = {
    $setOnInsert: {
      firstSeenAt: doc.createdAt,
      status: "open",
    },
    $set: {
      type: doc.type,
      message: doc.message,
      source: doc.source,
      latestStack: doc.stack,
      latestSymbolicatedStack: doc.symbolicatedStack,
      latestSourceMappedFrames: doc.sourceMappedFrames,
      latestPageUrl: doc.pageUrl,
      latestPathname: doc.pathname,
      latestUserAgent: doc.userAgent,
      latestBuildId: doc.buildId,
      latestRelease: doc.release,
      latestBreadcrumbs: doc.breadcrumbs,
      severity: doc.severity,
      errorCategory: doc.errorCategory,
      impactArea: doc.impactArea,
      alertSuppressed: doc.alertSuppressed,
      suppressionReason: doc.suppressionReason,
      resourceHost: doc.resourceHost,
      lastSeenAt: doc.createdAt,
      updatedAt: doc.createdAt,
    },
    $inc: { totalCount: 1 },
    $addToSet: {
      pageUrls: doc.pageUrl,
      pathnames: doc.pathname,
      buildIds: doc.buildId,
      userIds: doc.userId,
      anonymousIds: doc.anonymousId,
      sessionIds: doc.sessionId,
    },
  };

  if (useSqliteDb()) {
    return getSqliteStore().findOneAndUpdate<ClientErrorFingerprintRecord>(
      "error_fingerprints",
      { _id: doc.fingerprint },
      update,
      { upsert: true, returnDocument: "after" }
    );
  }

  const db = await mongoDb();
  return db.collection<ClientErrorFingerprintRecord>("error_fingerprints").findOneAndUpdate(
    { _id: doc.fingerprint },
    update as any,
    { upsert: true, returnDocument: "after" }
  );
}

export async function reopenFixedClientErrorFingerprint(
  fingerprint: string,
  recurredAt: Date
): Promise<void> {
  const update = {
    $set: {
      status: "open",
      regressedAt: recurredAt,
      updatedAt: recurredAt,
    },
    $push: {
      statusHistory: {
        status: "open",
        updatedAt: recurredAt,
        updatedBy: "error-monitor",
        reason: "fixed fingerprint recurred",
      },
    },
  };

  if (useSqliteDb()) {
    getSqliteStore().updateOne("error_fingerprints", { _id: fingerprint, status: "fixed" }, update);
    return;
  }

  const db = await mongoDb();
  await db.collection("error_fingerprints").updateOne(
    { _id: fingerprint, status: "fixed" } as any,
    update as any
  );
}

export async function getRecentClientErrorStats(
  fingerprint: string,
  since: Date
): Promise<ClientErrorRecentStats> {
  const query = { fingerprint, createdAt: { $gte: since } };

  if (useSqliteDb()) {
    return statsFromEvents(getSqliteStore().findMany<Partial<ClientErrorEventRecord>>("error_events", query));
  }

  const db = await mongoDb();
  const events = await db
    .collection<Partial<ClientErrorEventRecord>>("error_events")
    .find(query, { projection: { sessionId: 1 } })
    .toArray();
  return statsFromEvents(events);
}

export async function claimClientErrorSpikeAlert(input: {
  fingerprint: string;
  cooldownBefore: Date;
  now: Date;
  recentCount: number;
  recentSessions: number;
}): Promise<boolean> {
  const query = {
    _id: input.fingerprint,
    $or: [
      { lastAlertedAt: { $exists: false } },
      { lastAlertedAt: { $lt: input.cooldownBefore } },
    ],
  };
  const update = {
    $set: {
      lastAlertedAt: input.now,
      lastAlertRecentCount: input.recentCount,
      lastAlertRecentSessions: input.recentSessions,
    },
  };

  if (useSqliteDb()) {
    return Boolean(
      getSqliteStore().findOneAndUpdate<ClientErrorFingerprintRecord>(
        "error_fingerprints",
        query,
        update,
        { returnDocument: "after" }
      )
    );
  }

  const db = await mongoDb();
  return Boolean(
    await db.collection<ClientErrorFingerprintRecord>("error_fingerprints").findOneAndUpdate(
      query,
      update,
      { returnDocument: "after" }
    )
  );
}

export async function claimClientErrorCaptureNotification(input: {
  fingerprint: string;
  cooldownBefore: Date;
  now: Date;
}): Promise<boolean> {
  const query = {
    _id: input.fingerprint,
    $or: [
      { lastCapturedNotificationAt: { $exists: false } },
      { lastCapturedNotificationAt: { $lt: input.cooldownBefore } },
    ],
  };
  const update = {
    $set: {
      lastCapturedNotificationAt: input.now,
    },
  };

  if (useSqliteDb()) {
    return Boolean(
      getSqliteStore().findOneAndUpdate<ClientErrorFingerprintRecord>(
        "error_fingerprints",
        query,
        update,
        { returnDocument: "after" }
      )
    );
  }

  const db = await mongoDb();
  return Boolean(
    await db.collection<ClientErrorFingerprintRecord>("error_fingerprints").findOneAndUpdate(
      query,
      update,
      { returnDocument: "after" }
    )
  );
}

export async function updateAdminErrorFingerprintStatus(input: {
  fingerprint: string;
  status: AdminErrorStatus;
  updatedAt: Date;
  updatedBy: string | null;
}): Promise<void> {
  const update = {
    $set: {
      status: input.status,
      statusUpdatedAt: input.updatedAt,
      statusUpdatedBy: input.updatedBy,
      updatedAt: input.updatedAt,
    },
    $push: {
      statusHistory: {
        status: input.status,
        updatedAt: input.updatedAt,
        updatedBy: input.updatedBy,
      },
    },
  };

  if (useSqliteDb()) {
    getSqliteStore().updateOne("error_fingerprints", { _id: input.fingerprint }, update);
    return;
  }

  const db = await mongoDb();
  await db.collection("error_fingerprints").updateOne(
    { _id: input.fingerprint } as any,
    update as any
  );
}

export async function getAdminErrorPageData(input: {
  selectedFingerprint: string | null;
  selectedStatusFilter: string;
  currentBuild: {
    buildId?: string | null;
    buildCreatedAt?: Date | string | null;
  };
}): Promise<AdminErrorPageData> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const currentBuildCreatedAt = asDate(input.currentBuild.buildCreatedAt);
  const unresolvedQuery = adminErrorStatusQuery("unresolved");
  const activeStatusQuery = adminErrorStatusQuery(input.selectedStatusFilter);

  if (useSqliteDb()) {
    const store = getSqliteStore();
    const groups = store.findMany<AdminErrorFingerprintDoc>(
      "error_fingerprints",
      activeStatusQuery,
      { sort: { lastSeenAt: -1 }, limit: 50 }
    );
    const selectedEvents = input.selectedFingerprint
      ? store.findMany<AdminErrorEventDoc>(
          "error_events",
          { fingerprint: input.selectedFingerprint },
          { sort: { createdAt: -1 }, limit: 25 }
        )
      : [];
    const selectedGroup = input.selectedFingerprint
      ? groups.find((group) => group._id === input.selectedFingerprint) ||
        store.findOne<AdminErrorFingerprintDoc>("error_fingerprints", { _id: input.selectedFingerprint })
      : null;

    return {
      groups,
      groups24h: store.count("error_fingerprints", andAdminErrorQuery(
        unresolvedQuery,
        { lastSeenAt: { $gte: since24h } }
      )),
      events24h: store.count("error_events", { createdAt: { $gte: since24h } }),
      currentBuildEvents24h: input.currentBuild.buildId
        ? store.count("error_events", { createdAt: { $gte: since24h }, buildId: input.currentBuild.buildId })
        : 0,
      eventsAfterDeploy: currentBuildCreatedAt
        ? store.count("error_events", { createdAt: { $gte: currentBuildCreatedAt } })
        : 0,
      highGroups24h: store.count("error_fingerprints", andAdminErrorQuery(
        unresolvedQuery,
        { lastSeenAt: { $gte: since24h }, severity: "high" }
      )),
      newSinceDeployGroups: currentBuildCreatedAt
        ? store.count("error_fingerprints", andAdminErrorQuery(
            unresolvedQuery,
            { firstSeenAt: { $gte: currentBuildCreatedAt } }
          ))
        : 0,
      statusCountsRaw: buildAdminErrorStatusCounts(store.findMany<AdminErrorFingerprintDoc>("error_fingerprints")),
      selectedEvents,
      selectedGroup,
    };
  }

  const db = await mongoDb();
  const [
    groups,
    groups24h,
    events24h,
    currentBuildEvents24h,
    eventsAfterDeploy,
    highGroups24h,
    newSinceDeployGroups,
    statusCountsRaw,
    selectedEvents,
  ] = await Promise.all([
    db.collection<AdminErrorFingerprintDoc>("error_fingerprints")
      .find(activeStatusQuery as any)
      .sort({ lastSeenAt: -1 })
      .limit(50)
      .toArray(),
    db.collection("error_fingerprints").countDocuments(andAdminErrorQuery(
      unresolvedQuery,
      { lastSeenAt: { $gte: since24h } }
    ) as any),
    db.collection("error_events").countDocuments({ createdAt: { $gte: since24h } }),
    input.currentBuild.buildId
      ? db.collection("error_events").countDocuments({ createdAt: { $gte: since24h }, buildId: input.currentBuild.buildId })
      : Promise.resolve(0),
    currentBuildCreatedAt
      ? db.collection("error_events").countDocuments({ createdAt: { $gte: currentBuildCreatedAt } })
      : Promise.resolve(0),
    db.collection("error_fingerprints").countDocuments(andAdminErrorQuery(
      unresolvedQuery,
      { lastSeenAt: { $gte: since24h }, severity: "high" }
    ) as any),
    currentBuildCreatedAt
      ? db.collection("error_fingerprints").countDocuments(andAdminErrorQuery(
          unresolvedQuery,
          { firstSeenAt: { $gte: currentBuildCreatedAt } }
        ) as any)
      : Promise.resolve(0),
    db.collection("error_fingerprints").aggregate<AdminErrorStatusCount>([
      { $group: { _id: { $ifNull: ["$status", "open"] }, count: { $sum: 1 } } },
    ]).toArray(),
    input.selectedFingerprint
      ? db.collection<AdminErrorEventDoc>("error_events")
          .find({ fingerprint: input.selectedFingerprint })
          .sort({ createdAt: -1 })
          .limit(25)
          .toArray()
      : Promise.resolve([]),
  ]);

  const selectedGroup = input.selectedFingerprint
    ? groups.find((group) => group._id === input.selectedFingerprint) ||
      await db.collection<AdminErrorFingerprintDoc>("error_fingerprints").findOne({ _id: input.selectedFingerprint })
    : null;

  return {
    groups,
    groups24h,
    events24h,
    currentBuildEvents24h,
    eventsAfterDeploy,
    highGroups24h,
    newSinceDeployGroups,
    statusCountsRaw,
    selectedEvents,
    selectedGroup,
  };
}

export function normalizeAdminErrorStatus(status?: string | null): AdminErrorStatus {
  return status === "watching" || status === "fixed" || status === "ignored" ? status : "open";
}

function statsFromEvents(events: Array<Partial<ClientErrorEventRecord>>): ClientErrorRecentStats {
  const sessions = new Set(
    events
      .map((event) => event.sessionId)
      .filter((sessionId): sessionId is string => typeof sessionId === "string" && sessionId.length > 0)
  );

  return {
    count: events.length,
    sessionCount: sessions.size,
  };
}

function adminErrorStatusQuery(filter: string) {
  if (filter === "all") return {};
  if (filter === "open") {
    return { $or: [{ status: "open" }, { status: { $exists: false } }, { status: null }] };
  }
  if (filter === "watching" || filter === "fixed" || filter === "ignored") {
    return { status: filter };
  }
  return {
    $or: [
      { status: { $exists: false } },
      { status: null },
      { status: { $nin: ["fixed", "ignored"] } },
    ],
  };
}

function andAdminErrorQuery(...parts: Array<Record<string, unknown>>) {
  const active = parts.filter((part) => Object.keys(part).length > 0);
  if (active.length === 0) return {};
  if (active.length === 1) return active[0];
  return { $and: active };
}

function buildAdminErrorStatusCounts(groups: AdminErrorFingerprintDoc[]): AdminErrorStatusCount[] {
  const counts = new Map<string, number>();
  for (const group of groups) {
    const status = group.status || "open";
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  return [...counts.entries()].map(([status, count]) => ({ _id: status, count }));
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}
