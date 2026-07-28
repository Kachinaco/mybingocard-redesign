import { createHash, randomUUID } from "node:crypto";
import { getSqliteStore } from "@/lib/db/sqlite";

export const TRACKER_OUTCOME_OUTBOX_COLLECTION = "tracker_outcome_outbox";
export const TRACKER_OUTCOME_MAX_ATTEMPTS = 8;

export type TrackerOutcomeType =
  | "lead_accepted"
  | "lead_rejected"
  | "signup_completed"
  | "signup_rejected"
  | "order_created"
  | "payment_completed"
  | "payment_refunded"
  | "payment_disputed"
  | "payment_dispute_recovered";

export interface TrackerOutcomeBody {
  schemaVersion: 1;
  eventId: string;
  type: TrackerOutcomeType;
  occurredAt: string;
  entity: { type: string; id: string };
  attribution?: {
    anonymousId?: string;
    sessionId?: string;
    visitorId?: string;
    sourceEventId?: string;
  };
  properties?: Partial<Record<"form" | "plan" | "product" | "reasonCode" | "sku" | "source" | "status", string>>;
  revenue?: { amountMinor: number; currency: string };
}

export interface TrackerOutcomeOutboxRecord {
  _id: string;
  outcomeId: string;
  body: string;
  bodyHash: string;
  status: "pending" | "processing" | "delivered" | "failed";
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
  availableAt: Date;
  leaseOwner?: string;
  leaseToken?: string;
  leasedAt?: Date;
  leaseExpiresAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  lastError?: string | null;
  responseStatus?: number;
}

export interface TrackerOutcomeClaim extends TrackerOutcomeOutboxRecord {
  leaseOwner: string;
  leaseToken: string;
  leasedAt: Date;
  leaseExpiresAt: Date;
}

const OUTCOME_TYPES = new Set<TrackerOutcomeType>([
  "lead_accepted",
  "lead_rejected",
  "signup_completed",
  "signup_rejected",
  "order_created",
  "payment_completed",
  "payment_refunded",
  "payment_disputed",
  "payment_dispute_recovered",
]);
const IDENTIFIER = /^[a-zA-Z0-9][a-zA-Z0-9._:@/-]*$/;
const OPAQUE_IDENTIFIER = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/;
const PROPERTY_VALUE = /^[a-zA-Z0-9](?:[a-zA-Z0-9._:-]{0,62}[a-zA-Z0-9])?$/;
const PRIVATE_CODE_HINT = /(?:^|[._:-])(?:address|card|comment|email|message|name|note|password|phone|secret|ssn|street|token)(?:$|[._:-])/i;
const HUMAN_NAME_CODE_PATTERN = /^[A-Z][a-z]{1,30}(?:[._:-][A-Z][a-z]{1,30}){1,3}$/;
const PROPERTY_KEYS = ["form", "plan", "product", "reasonCode", "sku", "source", "status"] as const;

function cleanIdentifier(value: unknown, max: number, pattern = IDENTIFIER): string {
  if (typeof value !== "string") throw new Error("Tracker outcome identifier must be a string");
  const cleaned = value.replace(/[\r\n\t]/g, "").trim();
  if (!cleaned || cleaned.length > max || !pattern.test(cleaned)) {
    throw new Error("Tracker outcome contains an invalid identifier");
  }
  return cleaned;
}

function cleanOpaqueIdentifier(value: unknown, max: number, label: "entity" | "attribution"): string {
  if (typeof value === "string") {
    const candidate = value.replace(/[\r\n\t]/g, "").trim();
    if (/@|https?:|www\./i.test(candidate) || /^\+?[\d().-]{7,}$/.test(candidate)) {
      throw new Error(`Tracker ${label} contains private data`);
    }
  }
  return cleanIdentifier(value, max, OPAQUE_IDENTIFIER);
}

function cleanAttribution(value: unknown): string | undefined {
  return value === undefined ? undefined : cleanOpaqueIdentifier(value, 128, "attribution");
}

function cleanProperty(key: typeof PROPERTY_KEYS[number], value: unknown): string {
  if (typeof value !== "string" || value.length > 64 || value !== value.trim() || !PROPERTY_VALUE.test(value)) {
    throw new Error(`Tracker outcome property ${key} is invalid`);
  }
  if (PRIVATE_CODE_HINT.test(value) || HUMAN_NAME_CODE_PATTERN.test(value) || value.split(/[._:-]/).length > 4) {
    throw new Error(`Tracker outcome property ${key} contains private data`);
  }
  if (/@|https?:|www\.|\+?\d[\d().-]{6,}/i.test(value)) {
    throw new Error(`Tracker outcome property ${key} contains private data`);
  }
  if (/^\d{1,6}[._:-](?:[a-z]+[._:-])*(?:ave|avenue|blvd|court|ct|dr|drive|lane|ln|rd|road|st|street|way)(?:[._:-]|$)/i.test(value)) {
    throw new Error(`Tracker outcome property ${key} contains private data`);
  }
  return value;
}

export function buildTrackerOutcomeBody(input: TrackerOutcomeBody): TrackerOutcomeBody {
  const occurredAt = new Date(input.occurredAt);
  if (!Number.isFinite(occurredAt.getTime())) throw new Error("Tracker outcome occurredAt is invalid");

  if (!OUTCOME_TYPES.has(input.type)) throw new Error("Tracker outcome type is invalid");

  const body: TrackerOutcomeBody = {
    schemaVersion: 1,
    eventId: cleanOpaqueIdentifier(input.eventId, 128, "attribution"),
    type: input.type,
    occurredAt: occurredAt.toISOString(),
    entity: {
      type: cleanOpaqueIdentifier(input.entity?.type, 64, "entity"),
      id: cleanOpaqueIdentifier(input.entity?.id, 256, "entity"),
    },
  };

  const attribution = {
    anonymousId: cleanAttribution(input.attribution?.anonymousId),
    sessionId: cleanAttribution(input.attribution?.sessionId),
    visitorId: cleanAttribution(input.attribution?.visitorId),
    sourceEventId: cleanAttribution(input.attribution?.sourceEventId),
  };
  if (Object.values(attribution).some(Boolean)) {
    body.attribution = Object.fromEntries(
      Object.entries(attribution).filter(([, value]) => value !== undefined)
    ) as TrackerOutcomeBody["attribution"];
  }

  if (input.properties) {
    const properties: NonNullable<TrackerOutcomeBody["properties"]> = {};
    for (const key of PROPERTY_KEYS) {
      const value = input.properties[key];
      if (value === undefined) continue;
      properties[key] = cleanProperty(key, value);
    }
    if (Object.keys(properties).length > 0) body.properties = properties;
  }

  if (input.revenue) {
    if (!Number.isSafeInteger(input.revenue.amountMinor) || input.revenue.amountMinor <= 0) {
      throw new Error("Tracker outcome revenue amount is invalid");
    }
    const currency = input.revenue.currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Tracker outcome currency is invalid");
    body.revenue = { amountMinor: input.revenue.amountMinor, currency };
  }

  return body;
}

export function enqueueTrackerOutcome(input: TrackerOutcomeBody, now = new Date()): { inserted: boolean; record: TrackerOutcomeOutboxRecord } {
  const store = getSqliteStore();
  const body = JSON.stringify(buildTrackerOutcomeBody(input));
  if (Buffer.byteLength(body) > 16 * 1024) throw new Error("Tracker outcome body exceeds 16 KB");
  const bodyHash = createHash("sha256").update(body).digest("hex");
  const eventId = JSON.parse(body).eventId as string;
  const existing = store.findOne<TrackerOutcomeOutboxRecord>(TRACKER_OUTCOME_OUTBOX_COLLECTION, { _id: eventId });
  if (existing) {
    if (existing.bodyHash !== bodyHash || existing.body !== body) {
      throw new Error("Tracker outcome eventId already exists with different content");
    }
    return { inserted: false, record: existing };
  }

  const record: TrackerOutcomeOutboxRecord = {
    _id: eventId,
    outcomeId: eventId,
    body,
    bodyHash,
    status: "pending",
    attempts: 0,
    createdAt: now,
    updatedAt: now,
    availableAt: now,
  };
  try {
    store.insertOne(TRACKER_OUTCOME_OUTBOX_COLLECTION, record);
    return { inserted: true, record };
  } catch (error) {
    const concurrent = store.findOne<TrackerOutcomeOutboxRecord>(TRACKER_OUTCOME_OUTBOX_COLLECTION, { _id: eventId });
    if (concurrent?.bodyHash === bodyHash && concurrent.body === body) {
      return { inserted: false, record: concurrent };
    }
    throw error;
  }
}

export function claimNextTrackerOutcome(input: {
  workerId: string;
  now?: Date;
  leaseMs?: number;
  maxAttempts?: number;
}): TrackerOutcomeClaim | null {
  const store = getSqliteStore();
  const now = input.now ?? new Date();
  const leaseMs = input.leaseMs ?? 5 * 60 * 1000;
  const maxAttempts = input.maxAttempts ?? TRACKER_OUTCOME_MAX_ATTEMPTS;
  if (!Number.isFinite(now.getTime())) throw new Error("Tracker outcome claim time is invalid");
  if (!Number.isSafeInteger(leaseMs) || leaseMs <= 0) throw new Error("Tracker outcome lease duration is invalid");
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts <= 0) throw new Error("Tracker outcome max attempts is invalid");
  cleanIdentifier(input.workerId, 128, OPAQUE_IDENTIFIER);

  const exhaustedLeases = store.findMany<TrackerOutcomeOutboxRecord>(
    TRACKER_OUTCOME_OUTBOX_COLLECTION,
    {
      status: "processing",
      attempts: { $gte: maxAttempts },
      leaseExpiresAt: { $lte: now },
    }
  );
  for (const exhausted of exhaustedLeases) {
    store.findOneAndUpdateAtomic<TrackerOutcomeOutboxRecord>(
      TRACKER_OUTCOME_OUTBOX_COLLECTION,
      {
        _id: exhausted._id,
        status: "processing",
        attempts: { $gte: maxAttempts },
        leaseExpiresAt: { $lte: now },
      },
      {
        $set: {
          status: "failed",
          failedAt: now,
          updatedAt: now,
          lastError: "Tracker outcome delivery lease expired after the final attempt",
        },
        $unset: {
          leaseOwner: "",
          leaseToken: "",
          leasedAt: "",
          leaseExpiresAt: "",
        },
      },
      { returnDocument: "after" }
    );
  }

  const due = store.findMany<TrackerOutcomeOutboxRecord>(TRACKER_OUTCOME_OUTBOX_COLLECTION, {
    attempts: { $lt: maxAttempts },
    $or: [
      { status: "pending", availableAt: { $lte: now } },
      { status: "processing", leaseExpiresAt: { $lte: now } },
    ],
  }, { sort: { availableAt: 1, createdAt: 1 } });

  for (const candidate of due) {
    const leaseToken = randomUUID();
    const claimed = store.findOneAndUpdateAtomic<TrackerOutcomeOutboxRecord>(
      TRACKER_OUTCOME_OUTBOX_COLLECTION,
      {
        _id: candidate._id,
        attempts: { $lt: maxAttempts },
        $or: [
          { status: "pending", availableAt: { $lte: now } },
          { status: "processing", leaseExpiresAt: { $lte: now } },
        ],
      },
      {
        $set: {
          status: "processing",
          leaseOwner: input.workerId,
          leaseToken,
          leasedAt: now,
          leaseExpiresAt: new Date(now.getTime() + leaseMs),
          updatedAt: now,
          lastError: null,
        },
        $inc: { attempts: 1 },
        $unset: { failedAt: "" },
      },
      { returnDocument: "after" }
    );
    if (claimed) return claimed as TrackerOutcomeClaim;
  }
  return null;
}

function leaseFilter(claim: TrackerOutcomeClaim) {
  return {
    _id: claim._id,
    status: "processing",
    leaseOwner: claim.leaseOwner,
    leaseToken: claim.leaseToken,
  };
}

export function completeTrackerOutcome(claim: TrackerOutcomeClaim, responseStatus: number, now = new Date()): boolean {
  return Boolean(getSqliteStore().findOneAndUpdateAtomic(
    TRACKER_OUTCOME_OUTBOX_COLLECTION,
    leaseFilter(claim),
    {
      $set: { status: "delivered", deliveredAt: now, updatedAt: now, responseStatus, lastError: null },
      $unset: { leaseOwner: "", leaseToken: "", leasedAt: "", leaseExpiresAt: "", failedAt: "" },
    },
    { returnDocument: "after" }
  ));
}

export function rescheduleTrackerOutcome(
  claim: TrackerOutcomeClaim,
  error: unknown,
  input: { now?: Date; responseStatus?: number; retryable: boolean; maxAttempts?: number } = { retryable: true }
): boolean {
  const now = input.now ?? new Date();
  const maxAttempts = input.maxAttempts ?? TRACKER_OUTCOME_MAX_ATTEMPTS;
  const terminal = !input.retryable || claim.attempts >= maxAttempts;
  const message = (error instanceof Error ? error.message : String(error || "Tracker outcome delivery failed"))
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 500);
  const backoffMs = Math.min(60 * 60 * 1000, 15_000 * 2 ** Math.max(0, claim.attempts - 1));
  const set: Record<string, unknown> = {
    status: terminal ? "failed" : "pending",
    updatedAt: now,
    lastError: message,
  };
  if (input.responseStatus !== undefined) set.responseStatus = input.responseStatus;
  if (terminal) set.failedAt = now;
  else set.availableAt = new Date(now.getTime() + backoffMs);

  return Boolean(getSqliteStore().findOneAndUpdateAtomic(
    TRACKER_OUTCOME_OUTBOX_COLLECTION,
    leaseFilter(claim),
    {
      $set: set,
      $unset: { leaseOwner: "", leaseToken: "", leasedAt: "", leaseExpiresAt: "" },
    },
    { returnDocument: "after" }
  ));
}

export function getTrackerOutcomeQueueCounts() {
  const store = getSqliteStore();
  return {
    pending: store.count(TRACKER_OUTCOME_OUTBOX_COLLECTION, { status: "pending" }),
    processing: store.count(TRACKER_OUTCOME_OUTBOX_COLLECTION, { status: "processing" }),
    delivered: store.count(TRACKER_OUTCOME_OUTBOX_COLLECTION, { status: "delivered" }),
    failed: store.count(TRACKER_OUTCOME_OUTBOX_COLLECTION, { status: "failed" }),
  };
}
