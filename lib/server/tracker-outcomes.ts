import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import {
  claimNextTrackerOutcome,
  completeTrackerOutcome,
  getTrackerOutcomeQueueCounts,
  rescheduleTrackerOutcome,
  TRACKER_OUTCOME_MAX_ATTEMPTS,
  type TrackerOutcomeClaim,
} from "@/lib/db/tracker-outcomes";

export interface TrackerOutcomeDeliveryConfig {
  endpoint: string;
  keyId: string;
  secret: string;
}

export interface DrainTrackerOutcomeResult {
  claimed: number;
  delivered: number;
  retried: number;
  failed: number;
  queue: ReturnType<typeof getTrackerOutcomeQueueCounts>;
}

function validateDeliveryConfig(config: TrackerOutcomeDeliveryConfig): TrackerOutcomeDeliveryConfig {
  const endpoint = config.endpoint.trim();
  const keyId = config.keyId.trim();
  const secret = config.secret.trim();
  const url = new URL(endpoint);
  const local = url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "::1";
  if (url.protocol !== "https:" && !local) {
    throw new Error("Tracker outcome endpoint must use HTTPS or loopback HTTP");
  }
  if (url.pathname !== "/api/v1/outcomes" || url.search || url.hash || url.username || url.password) {
    throw new Error("Tracker outcome endpoint must be the exact /api/v1/outcomes URL");
  }
  if (!/^tls_[a-zA-Z0-9._:-]+$/.test(keyId)) throw new Error("Tracker outcome key id is invalid");
  const decoded = Buffer.from(secret, "base64url");
  if (decoded.length !== 32 || decoded.toString("base64url") !== secret) {
    throw new Error("Tracker outcome secret is invalid");
  }
  return { endpoint: url.toString(), keyId, secret };
}

function requireRuntimeConfig(): TrackerOutcomeDeliveryConfig {
  const endpoint = process.env.MYBINGOCARD_TRACKER_OUTCOME_URL?.trim();
  const keyId = process.env.MYBINGOCARD_TRACKER_OUTCOME_KEY_ID?.trim();
  const secret = process.env.MYBINGOCARD_TRACKER_OUTCOME_SECRET?.trim();
  if (!endpoint || !keyId || !secret) {
    throw new Error("Tracker outcome delivery is not configured");
  }
  return validateDeliveryConfig({ endpoint, keyId, secret });
}

export function signTrackerOutcomeRequest(input: {
  body: string;
  secret: string;
  timestamp: string;
  nonce: string;
}): string {
  const bodyHash = createHash("sha256").update(input.body).digest("hex");
  const signingInput = `v1\nPOST\n/api/v1/outcomes\n${input.timestamp}\n${input.nonce}\n${bodyHash}`;
  return `v1=${createHmac("sha256", Buffer.from(input.secret, "base64url"))
    .update(signingInput)
    .digest("base64url")}`;
}

function retryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

export async function deliverTrackerOutcomeClaim(
  claim: TrackerOutcomeClaim,
  input: {
    config?: TrackerOutcomeDeliveryConfig;
    fetcher?: typeof fetch;
    now?: Date;
    nonce?: string;
    maxAttempts?: number;
  } = {}
): Promise<"delivered" | "retried" | "failed"> {
  const config = input.config ? validateDeliveryConfig(input.config) : requireRuntimeConfig();
  const now = input.now ?? new Date();
  const timestamp = String(Math.floor(now.getTime() / 1000));
  const nonce = input.nonce ?? randomBytes(24).toString("base64url");
  const signature = signTrackerOutcomeRequest({ body: claim.body, secret: config.secret, timestamp, nonce });

  try {
    const response = await (input.fetcher ?? fetch)(config.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tracker-key-id": config.keyId,
        "x-tracker-timestamp": timestamp,
        "x-tracker-nonce": nonce,
        "x-tracker-signature": signature,
      },
      body: claim.body,
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 200 || response.status === 201) {
      if (!completeTrackerOutcome(claim, response.status, now)) {
        throw new Error("Tracker outcome lease was lost after delivery");
      }
      return "delivered";
    }

    const retryable = retryableStatus(response.status);
    rescheduleTrackerOutcome(claim, `Tracker outcome endpoint returned HTTP ${response.status}`, {
      now,
      responseStatus: response.status,
      retryable,
      maxAttempts: input.maxAttempts,
    });
    return retryable && claim.attempts < (input.maxAttempts ?? TRACKER_OUTCOME_MAX_ATTEMPTS)
      ? "retried"
      : "failed";
  } catch (error) {
    rescheduleTrackerOutcome(claim, error, {
      now,
      retryable: true,
      maxAttempts: input.maxAttempts,
    });
    return claim.attempts < (input.maxAttempts ?? TRACKER_OUTCOME_MAX_ATTEMPTS)
      ? "retried"
      : "failed";
  }
}

export async function drainTrackerOutcomes(input: {
  limit?: number;
  workerId?: string;
  config?: TrackerOutcomeDeliveryConfig;
  fetcher?: typeof fetch;
  now?: () => Date;
  nonce?: () => string;
  maxAttempts?: number;
} = {}): Promise<DrainTrackerOutcomeResult> {
  const limit = Math.min(100, Math.max(1, Math.floor(input.limit ?? 25)));
  const workerId = input.workerId ?? `tracker-outcomes-${randomUUID()}`;
  const result = { claimed: 0, delivered: 0, retried: 0, failed: 0 };

  for (let index = 0; index < limit; index += 1) {
    const now = input.now?.() ?? new Date();
    const claim = claimNextTrackerOutcome({ workerId, now, maxAttempts: input.maxAttempts });
    if (!claim) break;
    result.claimed += 1;
    const status = await deliverTrackerOutcomeClaim(claim, {
      config: input.config,
      fetcher: input.fetcher,
      now,
      nonce: input.nonce?.(),
      maxAttempts: input.maxAttempts,
    });
    result[status] += 1;
  }

  return { ...result, queue: getTrackerOutcomeQueueCounts() };
}
