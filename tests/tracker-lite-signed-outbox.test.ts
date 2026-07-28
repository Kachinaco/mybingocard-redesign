import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { ObjectId } from "bson";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  claimNextTrackerOutcome,
  enqueueTrackerOutcome,
  TRACKER_OUTCOME_OUTBOX_COLLECTION,
  type TrackerOutcomeOutboxRecord,
} from "@/lib/db/tracker-outcomes";
import { closeSqliteStoreForTests, setSqliteStoreForTests } from "@/lib/db/sqlite";
import { deliverTrackerOutcomeClaim, signTrackerOutcomeRequest } from "@/lib/server/tracker-outcomes";
import {
  calculateIncrementalStripeRefundAmount,
  enqueueApplePaymentOutcome,
  enqueueAppleRefundOutcome,
  enqueueStripeDisputeOutcome,
  enqueueStripePaymentOutcome,
  enqueueStripeRefundOutcome,
  enqueueVerifiedAccountOutcome,
  tryEnqueueVerifiedAccountOutcome,
} from "@/lib/server/tracker-outcome-events";
import { markUserEmailVerified, type User } from "@/lib/db/users";
import { SqliteDocumentStore } from "@/lib/sqlite-document-store";
import { reconcileTrackerOutcomes } from "@/lib/server/tracker-outcome-reconciliation";
import type { BatchPurchase } from "@/lib/db/batchPurchases";
import type { AppleIapTransactionRecord } from "@/lib/db/apple-iap";

const cleanups: Array<() => void> = [];
const config = {
  endpoint: "http://127.0.0.1:3098/api/v1/outcomes",
  keyId: "tls_test_key",
  secret: Buffer.alloc(32, 7).toString("base64url"),
};

function fixture() {
  const previousBackend = process.env.MYBINGOCARD_DB_BACKEND;
  const previousPath = process.env.MYBINGOCARD_SQLITE_PATH;
  const dir = mkdtempSync(join(tmpdir(), "mybingocard-tracker-outbox-"));
  const db = new Database(join(dir, "app.sqlite"));
  db.exec(`
    CREATE TABLE collections (name TEXT PRIMARY KEY, source_count INTEGER NOT NULL, exported_count INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE documents (collection TEXT NOT NULL, object_id TEXT NOT NULL, ejson TEXT NOT NULL, PRIMARY KEY (collection, object_id));
  `);
  const store = new SqliteDocumentStore(db);
  setSqliteStoreForTests(store);
  cleanups.push(() => {
    closeSqliteStoreForTests();
    if (previousBackend === undefined) delete process.env.MYBINGOCARD_DB_BACKEND;
    else process.env.MYBINGOCARD_DB_BACKEND = previousBackend;
    if (previousPath === undefined) delete process.env.MYBINGOCARD_SQLITE_PATH;
    else process.env.MYBINGOCARD_SQLITE_PATH = previousPath;
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return store;
}

function outcome(eventId = "signup-provider-123") {
  return {
    schemaVersion: 1 as const,
    eventId,
    type: "signup_completed" as const,
    occurredAt: "2026-07-14T18:00:00.000Z",
    entity: { type: "account", id: "account_opaque_123" },
    attribution: { anonymousId: "anon_123", sessionId: "session_123" },
    properties: { source: "account_verified" },
  };
}

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
});

describe("Tracker Lite signed outcome outbox", () => {
  test("deduplicates immutable bodies and rejects event-id conflicts", () => {
    const store = fixture();
    expect(enqueueTrackerOutcome(outcome()).inserted).toBe(true);
    expect(enqueueTrackerOutcome(outcome()).inserted).toBe(false);
    expect(store.count(TRACKER_OUTCOME_OUTBOX_COLLECTION)).toBe(1);
    expect(() => enqueueTrackerOutcome({ ...outcome(), entity: { type: "account", id: "different_account" } }))
      .toThrow("different content");
  });

  test("converges every verified-account path on one durable outcome", async () => {
    const store = fixture();
    const userId = new ObjectId();
    const createdAt = new Date("2026-07-14T17:00:00.000Z");
    store.insertOne<User>("users", {
      _id: userId,
      email: "verified@example.com",
      name: "Verified User",
      planType: "FREE",
      createdAt,
      updatedAt: createdAt,
    });

    const first = await markUserEmailVerified(
      userId.toString(),
      new Date("2026-07-14T18:00:00.000Z")
    );
    const second = await markUserEmailVerified(
      userId.toString(),
      new Date("2026-07-14T19:00:00.000Z")
    );
    expect(first.emailVerified).toEqual(
      new Date("2026-07-14T18:00:00.000Z")
    );
    expect(second.emailVerified).toEqual(first.emailVerified);

    expect(enqueueVerifiedAccountOutcome({
      userId: userId.toString(),
      verifiedAt: first.emailVerified!,
    }).inserted).toBe(true);
    expect(enqueueVerifiedAccountOutcome({
      userId: userId.toString(),
      verifiedAt: second.emailVerified!,
    }).inserted).toBe(false);

    const record = store.findOne<TrackerOutcomeOutboxRecord>(
      TRACKER_OUTCOME_OUTBOX_COLLECTION,
      { _id: `account_completed:${userId}` }
    );
    expect(record?.body).not.toContain("verified@example.com");
    expect(record?.body).not.toContain("Verified User");
  });

  test("derives exact incremental Stripe refund amounts from cumulative totals", () => {
    expect(calculateIncrementalStripeRefundAmount(400, 0)).toBe(400);
    expect(calculateIncrementalStripeRefundAmount(1000, 400)).toBe(600);
    expect(calculateIncrementalStripeRefundAmount(1000, undefined)).toBeNull();
    expect(calculateIncrementalStripeRefundAmount(1000, 1000)).toBeNull();
    expect(calculateIncrementalStripeRefundAmount(400, 1000)).toBeNull();
  });

  test("records provider payments and lifecycle changes without private data", () => {
    const store = fixture();
    const occurredAt = new Date("2026-07-14T18:00:00.000Z");

    expect(enqueueStripePaymentOutcome({
      paymentId: "cs_paid_123",
      occurredAt,
      product: "stripe_batch_pack",
      amountMinor: 1500,
      currency: "usd",
    }).inserted).toBe(true);
    expect(enqueueStripePaymentOutcome({
      paymentId: "cs_paid_123",
      occurredAt,
      product: "stripe_batch_pack",
      amountMinor: 1500,
      currency: "usd",
    }).inserted).toBe(false);
    enqueueStripeRefundOutcome({
      eventId: "evt_refund_123",
      chargeId: "ch_123",
      occurredAt,
      amountMinor: 1500,
      currency: "usd",
    });
    enqueueStripeDisputeOutcome({
      eventId: "evt_dispute_123",
      disputeId: "dp_123",
      occurredAt,
      amountMinor: 1500,
      currency: "usd",
      recovered: false,
    });
    enqueueStripeDisputeOutcome({
      eventId: "evt_dispute_won_123",
      disputeId: "dp_123",
      occurredAt,
      amountMinor: 1500,
      currency: "usd",
      recovered: true,
    });

    expect(enqueueApplePaymentOutcome({
      transactionId: "2000000123456789",
      occurredAt,
      product: "apple_premium",
    }).inserted).toBe(true);
    expect(enqueueApplePaymentOutcome({
      transactionId: "2000000123456789",
      occurredAt,
      product: "apple_premium",
    }).inserted).toBe(false);
    enqueueAppleRefundOutcome({
      transactionId: "2000000123456789",
      refundedAt: new Date("2026-07-15T18:00:00.000Z"),
    });

    const records = store.findMany<TrackerOutcomeOutboxRecord>(
      TRACKER_OUTCOME_OUTBOX_COLLECTION
    );
    expect(records).toHaveLength(6);
    const bodies = records.map((record) => JSON.parse(record.body));
    expect(bodies.map((body) => body.type).sort()).toEqual([
      "payment_completed",
      "payment_completed",
      "payment_dispute_recovered",
      "payment_disputed",
      "payment_refunded",
      "payment_refunded",
    ]);
    const applePayment = bodies.find(
      (body) => body.eventId === "apple:2000000123456789"
    );
    expect(applePayment?.entity).toEqual({
      type: "apple_transaction",
      id: "apple_tx:2000000123456789",
    });
    expect(applePayment?.revenue).toBeUndefined();
    expect(records.map((record) => record.body).join("\n"))
      .not.toContain("example.com");
  });

  test("audits historical outcomes without writes and apply reruns converge", () => {
    const store = fixture();
    const verifiedAt = new Date("2026-07-14T18:00:00.000Z");
    const userId = new ObjectId();
    store.insertOne<User>("users", {
      _id: userId,
      email: "private-account@example.com",
      name: "Private Account",
      emailVerified: verifiedAt,
      signupMethod: "google",
      customerType: "real",
      planType: "FREE",
      createdAt: verifiedAt,
      updatedAt: verifiedAt,
    });
    store.insertOne<BatchPurchase>("batch_purchases", {
      _id: new ObjectId(),
      userId: userId.toString(),
      email: "private-payment@example.com",
      batchCount: 30,
      amount: 199,
      currency: "usd",
      purchaseProvider: "stripe",
      stripeSessionId: "cs_reconcile_123",
      status: "paid",
      generatedCardIds: [],
      purchasedAt: verifiedAt,
      updatedAt: verifiedAt,
    });
    store.insertOne<AppleIapTransactionRecord>("apple_iap_transactions", {
      _id: new ObjectId(),
      transactionId: "apple_reconcile_123",
      userId: userId.toString(),
      email: "private-apple@example.com",
      productId: "com.coryanalla.MyBingoCardApp.batch.30",
      purchaseType: "batch_pack",
      purchaseDate: verifiedAt,
      status: "revoked",
      revocationDate: new Date("2026-07-15T18:00:00.000Z"),
      appAccountToken: "private-app-account-token",
    });

    enqueueStripePaymentOutcome({
      paymentId: "cs_reconcile_123",
      occurredAt: verifiedAt,
      product: "stripe_batch_pack",
      amountMinor: 199,
      currency: "usd",
    });

    const audit = reconcileTrackerOutcomes({ store });
    expect(audit.mode).toBe("audit");
    expect(audit.candidates).toBe(4);
    expect(audit.existing).toBe(1);
    expect(audit.missing).toBe(3);
    expect(audit.inserted).toBe(0);
    expect(store.count(TRACKER_OUTCOME_OUTBOX_COLLECTION)).toBe(1);

    const applied = reconcileTrackerOutcomes({ store, apply: true });
    expect(applied.inserted).toBe(3);
    expect(store.count(TRACKER_OUTCOME_OUTBOX_COLLECTION)).toBe(4);

    const converged = reconcileTrackerOutcomes({ store, apply: true });
    expect(converged.existing).toBe(4);
    expect(converged.missing).toBe(0);
    expect(converged.inserted).toBe(0);
    const receipt = JSON.stringify(converged);
    for (const forbidden of [
      "private-account@example.com",
      "Private Account",
      "private-payment@example.com",
      "private-apple@example.com",
      "private-app-account-token",
      userId.toString(),
      "cs_reconcile_123",
      "apple_reconcile_123",
    ]) {
      expect(receipt).not.toContain(forbidden);
    }
  });

  test("blocks reconciliation apply writes when any immutable body conflicts", () => {
    const store = fixture();
    const verifiedAt = new Date("2026-07-14T18:00:00.000Z");
    const userId = new ObjectId();
    store.insertOne<User>("users", {
      _id: userId,
      email: "conflict@example.com",
      emailVerified: verifiedAt,
      signupMethod: "google",
      customerType: "real",
      planType: "FREE",
      createdAt: verifiedAt,
      updatedAt: verifiedAt,
    });
    store.insertOne<BatchPurchase>("batch_purchases", {
      _id: new ObjectId(),
      userId: userId.toString(),
      email: "conflict@example.com",
      batchCount: 30,
      amount: 199,
      currency: "usd",
      purchaseProvider: "stripe",
      stripeSessionId: "cs_blocked_by_conflict",
      status: "paid",
      generatedCardIds: [],
      purchasedAt: verifiedAt,
      updatedAt: verifiedAt,
    });

    const conflictingBody = JSON.stringify({
      ...outcome(`account_completed:${userId}`),
      entity: { type: "account", id: "different_account" },
    });
    store.insertOne<TrackerOutcomeOutboxRecord>(
      TRACKER_OUTCOME_OUTBOX_COLLECTION,
      {
        _id: `account_completed:${userId}`,
        outcomeId: `account_completed:${userId}`,
        body: conflictingBody,
        bodyHash: "conflicting-hash",
        status: "pending",
        attempts: 0,
        createdAt: verifiedAt,
        updatedAt: verifiedAt,
        availableAt: verifiedAt,
      }
    );

    const summary = reconcileTrackerOutcomes({ store, apply: true });
    expect(summary.conflicts).toBe(1);
    expect(summary.missing).toBe(1);
    expect(summary.inserted).toBe(0);
    expect(summary.skipped.apply_blocked_by_conflicts).toBe(1);
    expect(store.count(TRACKER_OUTCOME_OUTBOX_COLLECTION)).toBe(1);
  });

  test("does not block account completion when enqueue fails", () => {
    const originalError = console.error;
    console.error = () => {};
    try {
      expect(tryEnqueueVerifiedAccountOutcome({
        userId: "account_opaque_123",
        verifiedAt: new Date("2026-07-14T18:00:00.000Z"),
      }, () => {
        throw new Error("simulated enqueue failure");
      })).toBe(false);
    } finally {
      console.error = originalError;
    }
  });

  test("uses an explicit privacy allowlist", () => {
    const store = fixture();
    enqueueTrackerOutcome({
      ...outcome("privacy-event"),
      properties: {
        source: "verified_server",
        email: "private@example.com",
        token: "secret-token",
      } as never,
      email: "private@example.com",
      ipAddress: "203.0.113.9",
      userAgent: "private-agent",
      metadata: { note: "private-note" },
    } as never);
    const record = store.findOne<TrackerOutcomeOutboxRecord>(TRACKER_OUTCOME_OUTBOX_COLLECTION, { _id: "privacy-event" });
    expect(record?.body).toContain('"source":"verified_server"');
    for (const forbidden of ["private@example.com", "secret-token", "203.0.113.9", "private-agent", "private-note"]) {
      expect(record?.body).not.toContain(forbidden);
    }
  });

  test("rejects unsupported outcome types and private identifiers or property codes", () => {
    fixture();
    expect(() => enqueueTrackerOutcome({ ...outcome("bad-type"), type: "account_created" } as never))
      .toThrow("type is invalid");
    for (const id of ["alice@example.com", "https://example.com/account/1", "+1.480.555.1212"]) {
      expect(() => enqueueTrackerOutcome({ ...outcome(`private-${id.length}`), entity: { type: "account", id } }))
        .toThrow("entity contains private data");
    }
    for (const source of ["email_verification", "Alice.Smith", "https://example.com", "480.555.1212", "123.Main.Street"]) {
      expect(() => enqueueTrackerOutcome({ ...outcome(`property-${source.length}`), properties: { source } }))
        .toThrow();
    }
  });

  test("keeps body bytes stable while refreshing nonce and signature", async () => {
    fixture();
    enqueueTrackerOutcome(outcome("retry-event"), new Date("2026-07-14T18:00:00.000Z"));
    const first = claimNextTrackerOutcome({ workerId: "worker-a", now: new Date("2026-07-14T18:01:00.000Z"), maxAttempts: 3 });
    expect(first).not.toBeNull();
    const requests: Array<{ body: string; nonce: string; signature: string; redirect: RequestRedirect | undefined }> = [];
    const failingFetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      requests.push({
        body: String(init?.body),
        nonce: headers.get("x-tracker-nonce") || "",
        signature: headers.get("x-tracker-signature") || "",
        redirect: init?.redirect,
      });
      return new Response("", { status: 503 });
    }) as typeof fetch;
    expect(await deliverTrackerOutcomeClaim(first!, {
      config,
      fetcher: failingFetch,
      now: new Date("2026-07-14T18:01:00.000Z"),
      nonce: "nonce_attempt_000000000001",
      maxAttempts: 3,
    })).toBe("retried");

    const second = claimNextTrackerOutcome({ workerId: "worker-b", now: new Date("2026-07-14T18:02:00.000Z"), maxAttempts: 3 });
    expect(second).not.toBeNull();
    const successFetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      requests.push({
        body: String(init?.body),
        nonce: headers.get("x-tracker-nonce") || "",
        signature: headers.get("x-tracker-signature") || "",
        redirect: init?.redirect,
      });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as typeof fetch;
    expect(await deliverTrackerOutcomeClaim(second!, {
      config,
      fetcher: successFetch,
      now: new Date("2026-07-14T18:02:00.000Z"),
      nonce: "nonce_attempt_000000000002",
      maxAttempts: 3,
    })).toBe("delivered");

    expect(requests).toHaveLength(2);
    expect(requests[0]?.body).toBe(requests[1]?.body);
    expect(requests[0]?.nonce).not.toBe(requests[1]?.nonce);
    expect(requests[0]?.signature).not.toBe(requests[1]?.signature);
    expect(requests.every((request) => request.redirect === "manual")).toBe(true);
    expect(requests[0]?.signature).toBe(signTrackerOutcomeRequest({
      body: requests[0]!.body,
      secret: config.secret,
      timestamp: String(Date.parse("2026-07-14T18:01:00.000Z") / 1000),
      nonce: requests[0]!.nonce,
    }));
  });

  test("rejects active duplicate leases and recovers an expired lease", () => {
    fixture();
    enqueueTrackerOutcome(outcome("lease-event"), new Date("2026-07-14T18:00:00.000Z"));
    const first = claimNextTrackerOutcome({ workerId: "worker-a", now: new Date("2026-07-14T18:01:00.000Z") });
    expect(first?.attempts).toBe(1);
    expect(claimNextTrackerOutcome({ workerId: "worker-b", now: new Date("2026-07-14T18:02:00.000Z") })).toBeNull();
    const recovered = claimNextTrackerOutcome({ workerId: "worker-b", now: new Date("2026-07-14T18:07:00.000Z") });
    expect(recovered?.attempts).toBe(2);
    expect(recovered?.leaseOwner).toBe("worker-b");
    expect(recovered?.leaseToken).not.toBe(first?.leaseToken);
  });

  test("terminalizes an expired lease after the final claimed attempt", () => {
    const store = fixture();
    enqueueTrackerOutcome(
      outcome("exhausted-lease-event"),
      new Date("2026-07-14T18:00:00.000Z")
    );
    const claim = claimNextTrackerOutcome({
      workerId: "worker-a",
      now: new Date("2026-07-14T18:01:00.000Z"),
      leaseMs: 60_000,
      maxAttempts: 1,
    });
    expect(claim?.attempts).toBe(1);

    expect(claimNextTrackerOutcome({
      workerId: "worker-b",
      now: new Date("2026-07-14T18:03:00.000Z"),
      maxAttempts: 1,
    })).toBeNull();

    const record = store.findOne<TrackerOutcomeOutboxRecord>(
      TRACKER_OUTCOME_OUTBOX_COLLECTION,
      { _id: "exhausted-lease-event" }
    );
    expect(record?.status).toBe("failed");
    expect(record?.attempts).toBe(1);
    expect(record?.failedAt).toEqual(
      new Date("2026-07-14T18:03:00.000Z")
    );
    expect(record?.leaseOwner).toBeUndefined();
    expect(record?.leaseToken).toBeUndefined();
    expect(record?.leaseExpiresAt).toBeUndefined();
  });

  test("rejects invalid lease durations", () => {
    fixture();
    enqueueTrackerOutcome(outcome("lease-validation"), new Date("2026-07-14T18:00:00.000Z"));
    for (const leaseMs of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => claimNextTrackerOutcome({
        workerId: "worker",
        now: new Date("2026-07-14T18:01:00.000Z"),
        leaseMs,
      })).toThrow("lease duration is invalid");
    }
  });

  test("bounds retry attempts and terminates non-retryable responses", async () => {
    const store = fixture();
    enqueueTrackerOutcome(outcome("terminal-event"), new Date("2026-07-14T18:00:00.000Z"));
    const claim = claimNextTrackerOutcome({ workerId: "worker", now: new Date("2026-07-14T18:01:00.000Z"), maxAttempts: 2 });
    const status = await deliverTrackerOutcomeClaim(claim!, {
      config,
      fetcher: (async () => new Response("", { status: 400 })) as unknown as typeof fetch,
      now: new Date("2026-07-14T18:01:00.000Z"),
      nonce: "nonce_terminal_000000000001",
      maxAttempts: 2,
    });
    expect(status).toBe("failed");
    const record = store.findOne<TrackerOutcomeOutboxRecord>(TRACKER_OUTCOME_OUTBOX_COLLECTION, { _id: "terminal-event" });
    expect(record?.status).toBe("failed");
    expect(record?.responseStatus).toBe(400);
    expect(claimNextTrackerOutcome({ workerId: "worker-2", now: new Date("2026-07-15T18:01:00.000Z"), maxAttempts: 2 })).toBeNull();
  });

  test("keeps the sender server-only and the worker audit-first", () => {
    const sender = readFileSync(join(process.cwd(), "lib/server/tracker-outcomes.ts"), "utf8");
    const worker = readFileSync(join(process.cwd(), "scripts/deliver-tracker-outcomes.ts"), "utf8");
    const scheduler = readFileSync(join(process.cwd(), "scripts/install-tracker-outcomes-cron.cjs"), "utf8");
    const reconciliation = readFileSync(
      join(process.cwd(), "scripts/reconcile-tracker-outcomes.ts"),
      "utf8"
    );
    const appleTransactionRoute = readFileSync(
      join(process.cwd(), "app/api/native/iap/apple/transaction/route.ts"),
      "utf8"
    );
    const appleNotificationService = readFileSync(
      join(process.cwd(), "lib/apple-iap-notification-service.ts"),
      "utf8"
    );
    for (const browserGlobal of ["window.", "document.", "localStorage", "sessionStorage"]) {
      expect(sender).not.toContain(browserGlobal);
    }
    expect(sender).not.toContain("activity-client");
    expect(worker).toContain('process.argv.includes("--deliver")');
    expect(worker).toContain('mode: "audit"');
    expect(scheduler).toContain('process.argv.includes("--install")');
    expect(scheduler).toContain("/usr/bin/flock -n");
    expect(scheduler).toContain("reconcile-tracker-outcomes.ts --apply");
    expect(scheduler).toContain("deliver-tracker-outcomes.ts --deliver --limit");
    expect(scheduler.indexOf("reconcile-tracker-outcomes.ts --apply"))
      .toBeLessThan(scheduler.indexOf("deliver-tracker-outcomes.ts --deliver"));
    expect(reconciliation).toContain('process.argv.includes("--apply")');
    expect(reconciliation).toContain("readonly: true");
    expect(reconciliation).toContain("store: auditStore || getSqliteStore()");
    expect(appleTransactionRoute).toContain(
      'error: "Apple transaction is missing purchaseDate"'
    );
    expect(appleTransactionRoute).not.toContain(
      "dateFromMs(transaction.purchaseDate) || now"
    );
    expect(appleNotificationService).toContain(
      'throw new Error("Apple notification transaction is missing purchaseDate.")'
    );
    expect(appleNotificationService).not.toContain(
      "dateFromMs(transaction.purchaseDate) || signedDate"
    );
  });
});
