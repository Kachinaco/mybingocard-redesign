import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { EJSON, ObjectId } from "bson";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createPasswordResetToken,
  getEmailForValidResetToken,
  markResetTokenUsed,
} from "@/lib/db/password-resets";
import { deleteGameState, getGameState, saveGameState } from "@/lib/db/game-state";
import {
  createCoupon,
  getAllCoupons,
  getCouponByCode,
  incrementCouponUsage,
  toggleCoupon,
} from "@/lib/db/coupons";
import {
  createReferral,
  ensureUserReferralCode,
  getReferralByCode,
  getReferralStats,
  getUserReferrals,
} from "@/lib/db/referrals";
import {
  claimBatchPurchase,
  findGeneratedBatchPurchaseForCards,
  getAvailableBatchPurchases,
  getBatchPurchaseById,
  getGeneratedBatchIdMapForCards,
  markBatchPurchaseGenerated,
  releaseBatchPurchase,
  upsertBatchPurchaseFromCheckout,
} from "@/lib/db/batchPurchases";
import {
  bulkCreateSharedLinks,
  claimSharedLink,
  countSharedLinksByStripeSession,
  createSharedLink,
  deleteShareEmailCheckoutRefById,
  deleteShareLinkCheckoutRefsByIds,
  expireOldLinks,
  findExistingSharedLinkIds,
  getShareEmailCheckoutRefForCheckout,
  getShareGroupInviteTarget,
  getShareLinkCheckoutRefById,
  insertShareEmailCheckoutRef,
  getSharedLinkByLinkId,
  getSharedLinkByStripeSession,
  getSharedLinksByOwner,
  insertPreparedSharedLinks,
  insertShareLinkCheckoutRef,
  revertSharedLinkClaim,
  revokeSharedLinksByStripeSession,
} from "@/lib/db/sharedLinks";
import { getCardTitlesByIds, getOwnedCardIds } from "@/lib/db/cards";
import {
  getOrCreateAppleAppAccountToken,
  getUserByAppleAppAccountToken,
  updateUserBillingRecoveryState,
} from "@/lib/db/users";
import {
  claimStripeWebhookEvent,
  completeStripeWebhookEvent,
  failStripeWebhookEvent,
  insertWebhookPartialFailure,
} from "@/lib/db/stripe-webhooks";
import {
  getGameCount,
  getGameHistory,
  getGameStats,
  getRecentlyPlayed,
  getWinCount,
  recordGame,
} from "@/lib/db/gameHistory";
import {
  callItem,
  callSequentialItem,
  claimBingo,
  createGameRoom,
  endGame,
  getGameRoom,
  joinGameRoom,
  markCell,
  startGame,
  updateGameSettings,
  verifyPlayerToken,
} from "@/lib/db/games";
import { getAdminStats } from "@/lib/db/admin-stats";
import { trackActivity } from "@/lib/activity";
import {
  claimClientErrorCaptureNotification,
  claimClientErrorSpikeAlert,
  getAdminErrorPageData,
  getRecentClientErrorStats,
  insertClientErrorEvent,
  reopenFixedClientErrorFingerprint,
  releaseClientErrorCaptureNotification,
  releaseClientErrorSpikeAlert,
  updateAdminErrorFingerprintStatus,
  upsertClientErrorFingerprint,
  upsertMarketingTrackingFailure,
  type ClientErrorEventRecord,
} from "@/lib/db/client-errors";
import { notifyClientErrorCaptured } from "@/lib/discord";
import {
  getAdminLayoutBadges,
  getAdminOverviewData,
} from "@/lib/db/admin-dashboard";
import { upsertVisitorProfileIdentification } from "@/lib/db/analytics-identify";
import {
  applyApplePremiumEntitlement,
  claimAppleIapTransactionOwnership,
  getAppleIapTransaction,
  isAppleIapLineageStateStale,
  recordAppleIapLineageState,
  revokeApplePremiumEntitlement,
  upsertAppleIapTransaction,
} from "@/lib/db/apple-iap";
import {
  beginAppleIapNotification,
  finishAppleIapNotification,
} from "@/lib/db/apple-iap-notifications";
import { closeSqliteStoreForTests, setSqliteStoreForTests } from "@/lib/db/sqlite";
import { SqliteDocumentStore, type SqliteDocument } from "@/lib/sqlite-document-store";

const cleanupCallbacks: Array<() => void> = [];

afterEach(() => {
  closeSqliteStoreForTests();
  delete process.env.MYBINGOCARD_DB_BACKEND;
  delete process.env.MYBINGOCARD_SQLITE_PATH;

  while (cleanupCallbacks.length > 0) {
    cleanupCallbacks.pop()?.();
  }
});

function createFixture() {
  const dir = mkdtempSync(join(tmpdir(), "mybingocard-sqlite-db-modules-"));
  const db = new Database(join(dir, "shadow.sqlite"));

  db.exec(`
    CREATE TABLE collections (
      name TEXT PRIMARY KEY,
      source_count INTEGER NOT NULL,
      exported_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE documents (
      collection TEXT NOT NULL,
      object_id TEXT NOT NULL,
      ejson TEXT NOT NULL,
      PRIMARY KEY (collection, object_id),
      FOREIGN KEY (collection) REFERENCES collections(name) ON DELETE CASCADE
    );

    CREATE INDEX documents_collection_idx ON documents(collection);
  `);

  const insertCollection = db.prepare(
    "INSERT INTO collections (name, source_count, exported_count) VALUES (?, 0, 0) ON CONFLICT(name) DO NOTHING"
  );
  const insertDocument = db.prepare(
    "INSERT INTO documents (collection, object_id, ejson) VALUES (?, ?, ?)"
  );
  const updateCollectionCount = db.prepare(
    `UPDATE collections
     SET exported_count = (SELECT COUNT(*) FROM documents WHERE collection = ?)
     WHERE name = ?`
  );

  const insertShadowDocument = (collection: string, document: SqliteDocument) => {
    insertCollection.run(collection);
    insertDocument.run(collection, String(document._id), EJSON.stringify(document, { relaxed: false }));
    updateCollectionCount.run(collection, collection);
  };

  const store = new SqliteDocumentStore(db);
  setSqliteStoreForTests(store);

  cleanupCallbacks.push(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  return { insertShadowDocument, store };
}

describe("SQLite-backed DB modules", () => {
  test("password reset tokens can be created, read, replaced, and consumed", async () => {
    createFixture();

    const firstToken = await createPasswordResetToken("reset@example.com");
    expect(await getEmailForValidResetToken(firstToken)).toBe("reset@example.com");

    const secondToken = await createPasswordResetToken("reset@example.com");
    expect(await getEmailForValidResetToken(firstToken)).toBeNull();
    expect(await getEmailForValidResetToken(secondToken)).toBe("reset@example.com");

    await markResetTokenUsed(secondToken);
    expect(await getEmailForValidResetToken(secondToken)).toBeNull();
  });

  test("game state upserts and deletes by card/user identity", async () => {
    createFixture();

    await saveGameState("card-1", "user-1", [1, 3], false);
    expect((await getGameState("card-1", "user-1"))?.markedCells).toEqual([1, 3]);

    await saveGameState("card-1", "user-1", [1, 3, 5], true);
    const updated = await getGameState("card-1", "user-1");
    expect(updated?.markedCells).toEqual([1, 3, 5]);
    expect(updated?.hasBingo).toBe(true);

    await deleteGameState("card-1", "user-1");
    expect(await getGameState("card-1", "user-1")).toBeNull();
  });

  test("coupons support case-normalized lookup, usage increments, and toggles", async () => {
    createFixture();

    const coupon = await createCoupon({
      code: "save20",
      discountPercent: 20,
      maxUses: 10,
    });

    expect((await getCouponByCode("save20"))?.code).toBe("SAVE20");
    await incrementCouponUsage("save20");
    expect((await getCouponByCode("SAVE20"))?.usedCount).toBe(1);

    await toggleCoupon(coupon._id.toString(), false);
    expect(await getCouponByCode("save20")).toBeNull();
    expect((await getAllCoupons()).map((row) => row.code)).toEqual(["SAVE20"]);
  });

  test("referrals read users by referral code and aggregate referral stats", async () => {
    const { insertShadowDocument } = createFixture();
    insertShadowDocument("users", {
      _id: new ObjectId("64f000000000000000001001"),
      email: "owner@example.com",
      referralCode: "abc123",
    });

    const user = await getReferralByCode("abc123");
    await createReferral({ referrerId: "owner-1", referredEmail: "a@example.com" });
    await createReferral({ referrerId: "owner-1", referredEmail: "b@example.com" });

    const referrals = await getUserReferrals("owner-1");
    const stats = await getReferralStats("owner-1");

    expect(user?.email).toBe("owner@example.com");
    expect(referrals).toHaveLength(2);
    expect(stats).toEqual({ total: 2, signedUp: 2, rewarded: 0 });
  });

  test("referrals create and preserve user referral codes by email", async () => {
    const { insertShadowDocument } = createFixture();
    insertShadowDocument("users", {
      _id: new ObjectId("64f000000000000000001101"),
      email: "needs-code@example.com",
    });
    insertShadowDocument("users", {
      _id: new ObjectId("64f000000000000000001102"),
      email: "has-code@example.com",
      referralCode: "existing1",
    });

    const created = await ensureUserReferralCode("needs-code@example.com");
    const preserved = await ensureUserReferralCode("has-code@example.com");
    const secondRead = await ensureUserReferralCode("needs-code@example.com");

    expect(created).toMatch(/^[a-f0-9]{8}$/);
    expect(secondRead).toBe(created);
    expect(preserved).toBe("existing1");
  });

  test("batch purchases can be claimed, released, generated, and mapped to cards", async () => {
    createFixture();

    const purchase = await upsertBatchPurchaseFromCheckout({
      userId: "user-1",
      email: "buyer@example.com",
      batchCount: 30,
      amount: 199,
      currency: "usd",
      stripeSessionId: "cs_test_batch",
      stripePaymentIntentId: "pi_test",
    });

    expect(purchase?.status).toBe("paid");
    expect(await getAvailableBatchPurchases("user-1")).toHaveLength(1);

    const claimed = await claimBatchPurchase("user-1", 30);
    expect(claimed?.status).toBe("processing");

    const released = await releaseBatchPurchase(claimed?._id.toString() || "");
    expect(released?.status).toBe("paid");

    const claimedAgain = await claimBatchPurchase("user-1", 30);
    const generated = await markBatchPurchaseGenerated(claimedAgain?._id.toString() || "", ["card-a", "card-b"]);
    const found = await findGeneratedBatchPurchaseForCards("user-1", ["card-a", "card-b"]);
    const map = await getGeneratedBatchIdMapForCards("user-1", ["card-b"]);
    const byId = await getBatchPurchaseById(generated?._id.toString() || "");

    expect(generated?.status).toBe("generated");
    expect(found?._id.toString()).toBe(generated?._id.toString());
    expect(map["card-a"]).toBe(generated?._id.toString());
    expect(map["card-b"]).toBe(generated?._id.toString());
    expect(byId?.stripeSessionId).toBe("cs_test_batch");
  });

  test("shared links support create, claim, expiry, lookup, bulk insert, and refund", async () => {
    const { store } = createFixture();

    const first = await createSharedLink({
      batchId: "batch-1",
      cardId: "card-1",
      ownerUserId: "owner-1",
      ownerEmail: "owner@example.com",
      stripeSessionId: "cs_share",
      amountCents: 199,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const expired = await createSharedLink({
      batchId: "batch-1",
      cardId: "card-2",
      ownerUserId: "owner-1",
      ownerEmail: "owner@example.com",
      amountCents: 199,
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
    });
    const bulk = await bulkCreateSharedLinks([
      {
        batchId: "batch-2",
        cardId: "card-3",
        ownerUserId: "owner-1",
        ownerEmail: "owner@example.com",
        amountCents: 199,
      },
      {
        batchId: "batch-2",
        cardId: "card-4",
        ownerUserId: "owner-2",
        ownerEmail: "other@example.com",
        amountCents: 199,
      },
    ]);

    expect((await getSharedLinkByLinkId(first.linkId))?.cardId).toBe("card-1");
    expect(await claimSharedLink(first.linkId, "claimer-1")).toMatchObject({
      status: "claimed",
      claimedByUserId: "claimer-1",
    });
    expect(await revertSharedLinkClaim(first.linkId, "claimer-1")).toBe(true);
    expect((await getSharedLinkByLinkId(first.linkId))?.status).toBe("pending");
    expect(await claimSharedLink(expired.linkId, "claimer-2")).toBeNull();
    expect(await expireOldLinks()).toBe(1);
    expect(await getSharedLinkByStripeSession("cs_share")).toHaveLength(1);
    expect(await revokeSharedLinksByStripeSession("cs_share")).toBe(1);
    expect(await getSharedLinksByOwner("owner-1")).toHaveLength(3);
    expect(bulk).toHaveLength(2);
    expect((await getShareGroupInviteTarget(bulk[0]!.linkId))?.pending?.linkId).toBe(bulk[0]!.linkId);

    const preparedInsert = await insertPreparedSharedLinks([
      {
        linkId: "manual01",
        batchId: "batch-3",
        cardId: "card-5",
        ownerUserId: "owner-1",
        ownerEmail: "owner@example.com",
        status: "pending",
        stripeSessionId: "cs_prepared",
        amountCents: 199,
        createdAt: new Date("2026-07-02T23:00:00.000Z"),
        updatedAt: new Date("2026-07-02T23:00:00.000Z"),
      },
    ]);
    const duplicatePreparedInsert = await insertPreparedSharedLinks([
      {
        linkId: "manual01",
        batchId: "batch-3",
        cardId: "card-6",
        ownerUserId: "owner-1",
        ownerEmail: "owner@example.com",
        status: "pending",
        stripeSessionId: "cs_prepared",
        amountCents: 199,
        createdAt: new Date("2026-07-02T23:01:00.000Z"),
        updatedAt: new Date("2026-07-02T23:01:00.000Z"),
      },
    ]);

    expect(preparedInsert.insertedIndexes).toEqual([0]);
    expect(duplicatePreparedInsert.failed[0]).toMatchObject({ index: 0 });
    expect(await countSharedLinksByStripeSession("cs_prepared")).toBe(1);
    expect(await findExistingSharedLinkIds(["manual01", "missing"])).toEqual(["manual01"]);

    const checkoutRefId = new ObjectId("64f000000000000000004001");
    await insertShareLinkCheckoutRef({
      _id: checkoutRefId,
      userId: "owner-1",
      createdAt: new Date("2026-07-02T22:30:00.000Z"),
      cardIds: ["card-1", "card-2"],
      recipientEmails: ["player@example.com"],
    });
    expect(
      store.findOne<{ cardIds?: string[] }>("share_link_checkout_refs", { _id: checkoutRefId })?.cardIds
    ).toEqual(["card-1", "card-2"]);
    expect((await getShareLinkCheckoutRefById(checkoutRefId.toString()))?.cardIds).toEqual(["card-1", "card-2"]);
    expect(await deleteShareLinkCheckoutRefsByIds([checkoutRefId.toString()])).toBe(1);
    expect(await getShareLinkCheckoutRefById(checkoutRefId.toString())).toBeNull();

    const emailCheckoutRefId = new ObjectId("64f000000000000000004002");
    await insertShareEmailCheckoutRef({
      _id: emailCheckoutRefId,
      userId: "owner-1",
      userEmail: "owner@example.com",
      cardId: "card-1",
      emails: ["first@example.com", "second@example.com"],
      createdAt: new Date("2026-07-02T22:45:00.000Z"),
    });
    expect(
      store.findOne<{ emails?: string[] }>("share_email_checkout_refs", { _id: emailCheckoutRefId })?.emails
    ).toEqual(["first@example.com", "second@example.com"]);
    expect(
      (await getShareEmailCheckoutRefForCheckout({
        id: emailCheckoutRefId.toString(),
        userId: "owner-1",
        cardId: "card-1",
      }))?.emails
    ).toEqual(["first@example.com", "second@example.com"]);
    expect(await deleteShareEmailCheckoutRefById(emailCheckoutRefId.toString())).toBe(1);
    expect(
      await getShareEmailCheckoutRefForCheckout({
        id: emailCheckoutRefId.toString(),
        userId: "owner-1",
        cardId: "card-1",
      })
    ).toBeNull();
  });

  test("Stripe webhook helpers claim events and persist partial failures through SQLite", async () => {
    const { store } = createFixture();

    expect(await claimStripeWebhookEvent({ eventId: "evt_test_1", type: "checkout.session.completed" })).toBe("claimed");
    expect(await claimStripeWebhookEvent({ eventId: "evt_test_1", type: "checkout.session.completed" })).toBe("processing");

    await failStripeWebhookEvent("evt_test_1", new Error("temporary database outage"));
    expect(await claimStripeWebhookEvent({ eventId: "evt_test_1", type: "checkout.session.completed" })).toBe("claimed");

    await completeStripeWebhookEvent("evt_test_1");
    expect(await claimStripeWebhookEvent({ eventId: "evt_test_1", type: "checkout.session.completed" })).toBe("completed");

    expect(await claimStripeWebhookEvent({ eventId: "evt_stale", type: "checkout.session.completed" })).toBe("claimed");
    store.updateOne("webhook_events", { eventId: "evt_stale" }, {
      $set: { claimedAt: new Date(Date.now() - 11 * 60 * 1000) },
    });
    expect(await claimStripeWebhookEvent({ eventId: "evt_stale", type: "checkout.session.completed" })).toBe("claimed");

    await insertWebhookPartialFailure({
      type: "share_links",
      stripeSessionId: "cs_partial",
      ownerUserId: "owner-1",
      ownerEmail: "owner@example.com",
      batchId: "batch-1",
      requestedCount: 2,
      successfulCount: 1,
      failedCount: 1,
      failedLinks: [{ cardId: "card-2", recipientEmail: "fail@example.com", error: "send failed" }],
      createdAt: new Date("2026-07-02T23:05:00.000Z"),
    });

    expect(store.count("webhook_events", { eventId: "evt_test_1" })).toBe(1);
    expect(
      store.findOne<{ failedCount?: number }>(
        "webhook_partial_failures",
        { stripeSessionId: "cs_partial" }
      )?.failedCount
    ).toBe(1);
  });

  test("user billing recovery and card webhook helpers run through SQLite", async () => {
    const { insertShadowDocument, store } = createFixture();
    const ownerId = new ObjectId("64f000000000000000004101");
    const cardId = new ObjectId("64f000000000000000004102");
    const otherCardId = new ObjectId("64f000000000000000004103");

    insertShadowDocument("users", {
      _id: ownerId,
      email: "owner@example.com",
      subscriptionStatus: "active",
      createdAt: new Date("2026-07-02T23:10:00.000Z"),
      updatedAt: new Date("2026-07-02T23:10:00.000Z"),
    });
    insertShadowDocument("cards", {
      _id: cardId,
      userId: ownerId.toString(),
      batchId: "batch-1",
      title: "Owner Card",
      createdAt: new Date("2026-07-02T23:11:00.000Z"),
    });
    insertShadowDocument("cards", {
      _id: otherCardId,
      userId: "other-user",
      batchId: "batch-1",
      title: "Other Card",
      createdAt: new Date("2026-07-02T23:12:00.000Z"),
    });

    await updateUserBillingRecoveryState("owner@example.com", {
      status: "failed",
      invoiceId: "in_failed",
      attemptCount: 2,
      nextPaymentAttempt: new Date("2026-07-03T00:00:00.000Z"),
    });
    expect(
      store.findOne<{ billingLastInvoiceId?: string }>(
        "users",
        { email: "owner@example.com" }
      )?.billingLastInvoiceId
    ).toBe("in_failed");

    await updateUserBillingRecoveryState("owner@example.com", { status: "recovered" });
    const recoveredUser = store.findOne<{
      billingRecoveredAt?: Date;
      billingPastDueSince?: Date;
    }>("users", { email: "owner@example.com" });
    expect(recoveredUser?.billingRecoveredAt).toBeInstanceOf(Date);
    expect(recoveredUser?.billingPastDueSince).toBeUndefined();

    expect(
      new Set(await getOwnedCardIds(ownerId.toString(), [cardId.toString(), otherCardId.toString()]))
    ).toEqual(new Set([cardId.toString()]));
    expect(await getCardTitlesByIds([cardId.toString(), otherCardId.toString()])).toEqual({
      [cardId.toString()]: { title: "Owner Card" },
      [otherCardId.toString()]: { title: "Other Card" },
    });
  });

  test("game history records stats and recently played unique cards", async () => {
    createFixture();
    const base = {
      userId: "user-1",
      cardSize: 5,
      result: "won" as const,
      markedCells: [1, 2, 3],
      startedAt: new Date("2026-01-01T00:00:00.000Z"),
      completedAt: new Date("2026-01-01T00:01:00.000Z"),
    };

    await recordGame({ ...base, cardId: "card-1", cardTitle: "First", timePlayedMs: 1000 });
    await recordGame({ ...base, cardId: "card-2", cardTitle: "Second", timePlayedMs: 2000, result: "abandoned" });
    await recordGame({ ...base, cardId: "card-1", cardTitle: "First replay", timePlayedMs: 500 });

    const history = await getGameHistory("user-1", 2, 0);
    const recent = await getRecentlyPlayed("user-1", 6);
    const stats = await getGameStats("user-1");

    expect(history.total).toBe(3);
    expect(history.games).toHaveLength(2);
    expect([...new Set(recent.map((row) => row.cardId))].sort()).toEqual(["card-1", "card-2"]);
    expect(stats).toMatchObject({ totalGames: 3, wins: 2, winRate: 67, fastestWinMs: 500 });
    expect(await getGameCount("user-1")).toBe(3);
    expect(await getWinCount("user-1")).toBe(2);
  });

  test("live game rooms support host/player flow through SQLite", async () => {
    createFixture();

    const room = await createGameRoom(
      "host-1",
      "card-1",
      "Live room",
      ["A", "B", "C", "D", "E", "F", "G", "H", "I"],
      3,
      true,
      {}
    );
    const join = await joinGameRoom(room.roomCode, "Player", "user-1", "player@example.com");

    expect(join).not.toBeNull();
    expect(await verifyPlayerToken(room.roomCode, join!.player.playerId, join!.playerToken)).toBe(true);

    expect(await updateGameSettings(room.roomCode, "host-1", { allowMultipleWinners: true })).toBe(true);
    const started = await startGame(room.roomCode, "host-1");
    expect(started.started).toBe(true);

    const firstCall = await callSequentialItem(room.roomCode, "host-1");
    expect(firstCall?.item).toBe("A");

    for (const cell of join!.player.cells) {
      if (cell !== "FREE") {
        await callItem(room.roomCode, "host-1", cell);
      }
    }
    for (const index of join!.player.cells.keys()) {
      expect(await markCell(room.roomCode, join!.player.playerId, index, "", true)).toBe(true);
    }

    const claim = await claimBingo(room.roomCode, join!.player.playerId, "", true);
    const wonRoom = await getGameRoom(room.roomCode);

    expect(claim.valid).toBe(true);
    expect(claim.gameEnded).toBe(false);
    expect(wonRoom?.winners).toHaveLength(1);
    expect(wonRoom?.players.find((player) => player.playerId === join!.player.playerId)?.hasBingo).toBe(true);

    expect(await endGame(room.roomCode, "host-1")).toBe(true);
    expect((await getGameRoom(room.roomCode))?.status).toBe("finished");
  });

  test("admin stats aggregate users, cards, revenue, and dead clicks through SQLite", async () => {
    const { insertShadowDocument } = createFixture();
    const originalMonthlyPriceId = process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID;
    process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID = "price_monthly";
    cleanupCallbacks.push(() => {
      if (typeof originalMonthlyPriceId === "undefined") {
        delete process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID;
      } else {
        process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID = originalMonthlyPriceId;
      }
    });

    const now = Date.now();
    const daysAgo = (days: number) => new Date(now - days * 24 * 60 * 60 * 1000);
    const users = [
      {
        _id: new ObjectId("64f000000000000000002001"),
        email: "paid@example.com",
        subscriptionStatus: "active",
        stripeSubscriptionId: "sub_real",
        stripePriceId: "price_monthly",
        customerType: "real",
        trialEndsAt: daysAgo(1),
        signupMethod: "google",
        utm_source: "google",
        createdAt: daysAgo(1),
      },
      {
        _id: new ObjectId("64f000000000000000002002"),
        email: "test@example.com",
        subscriptionStatus: "active",
        stripeSubscriptionId: "sub_test",
        stripePriceId: "price_monthly",
        customerType: "test",
        signupMethod: "credentials",
        utm_source: "google",
        createdAt: daysAgo(2),
      },
      {
        _id: new ObjectId("64f000000000000000002003"),
        email: "trial@example.com",
        subscriptionStatus: "trialing",
        trialEndsAt: new Date(now + 3 * 24 * 60 * 60 * 1000),
        signupMethod: "magic",
        utm_source: "bing",
        createdAt: daysAgo(3),
      },
      {
        _id: new ObjectId("64f000000000000000002004"),
        email: "canceled@example.com",
        subscriptionStatus: "canceled",
        createdAt: daysAgo(40),
      },
      {
        _id: new ObjectId("64f000000000000000002005"),
        email: "life@example.com",
        subscriptionStatus: "lifetime",
        signupMethod: "google",
        createdAt: daysAgo(4),
      },
      {
        _id: new ObjectId("64f000000000000000002006"),
        email: "pastdue@example.com",
        subscriptionStatus: "past_due",
        signupMethod: "google",
        createdAt: daysAgo(5),
      },
    ];

    for (const user of users) insertShadowDocument("users", user);
    for (let index = 0; index < 3; index += 1) {
      insertShadowDocument("cards", {
        _id: new ObjectId(),
        userId: "user-1",
        createdAt: daysAgo(index),
      });
    }
    insertShadowDocument("activity_events", {
      _id: new ObjectId("64f000000000000000004001"),
      event: "billing_payment_succeeded",
      metadata: { amount: 799 },
      createdAt: daysAgo(1),
    });
    insertShadowDocument("activity_events", {
      _id: new ObjectId("64f000000000000000004002"),
      event: "billing_payment_succeeded",
      metadata: { amount: 2999 },
      createdAt: daysAgo(2),
    });
    for (let index = 0; index < 10; index += 1) {
      insertShadowDocument("activity_events", {
        _id: new ObjectId(),
        event: "dead_click",
        pathname: "/create",
        sessionId: index % 2 === 0 ? "session-a" : "session-b",
        metadata: { tag: "button", text: "Save", className: "save-button" },
        createdAt: new Date(now - index * 60_000),
      });
    }
    insertShadowDocument("activity_events", {
      _id: new ObjectId("64f000000000000000004999"),
      event: "dead_click",
      pathname: "/old",
      sessionId: "old-session",
      metadata: { tag: "a", text: "Old", className: "old-link" },
      createdAt: daysAgo(20),
    });

    const stats = await getAdminStats();

    expect(stats.totalUsers).toBe(6);
    expect(stats.paidUsers).toBe(1);
    expect(stats.totalCards).toBe(3);
    expect(stats.recentSignups).toBe(5);
    expect(stats.signupsLast30Days).toBe(5);
    expect(stats.trialingUsers).toBe(1);
    expect(stats.canceledUsers).toBe(1);
    expect(stats.lifetimeUsers).toBe(1);
    expect(stats.pastDueUsers).toBe(1);
    expect(stats.totalTrialsEver).toBe(2);
    expect(stats.convertedTrials).toBe(1);
    expect(stats.unconvertedTrials).toBe(1);
    expect(stats.trialConversionRate).toBe(50);
    expect(stats.mrr).toBe(7.99);
    expect(stats.revenueEstimate).toBe(7.99);
    expect(stats.totalNetRevenue).toBe(37.98);
    expect(stats.subscriptionStatusBreakdown).toMatchObject({
      active: 2,
      trialing: 1,
      canceled: 1,
      lifetime: 1,
      past_due: 1,
    });
    expect(stats.signupsByMethod).toMatchObject({ google: 3, credentials: 1, magic: 1, unknown: 1 });
    expect(stats.signupsBySource).toMatchObject({ google: 2, bing: 1 });
    expect(stats.paidBySource).toEqual({ google: 1 });
    expect(stats.deadClickHotspots[0]).toMatchObject({
      page: "/create",
      tag: "button",
      text: "Save",
      className: "save-button",
      count: 10,
      uniqueSessions: 2,
      popularity: "very_popular",
    });
    expect(stats.recentSignupsTrend.reduce((sum, entry) => sum + entry.count, 0)).toBe(5);
  });

  test("admin dashboard helpers read layout badges and overview lists through SQLite", async () => {
    const { insertShadowDocument } = createFixture();
    const now = Date.now();
    const minutesAgo = (minutes: number) => new Date(now - minutes * 60 * 1000);
    const daysAgo = (days: number) => new Date(now - days * 24 * 60 * 60 * 1000);

    insertShadowDocument("users", {
      _id: new ObjectId("64f000000000000000002101"),
      email: "active@example.com",
      name: "Active User",
      planType: "PREMIUM",
      subscriptionStatus: "active",
      password: "must-not-leak",
      createdAt: minutesAgo(5),
      updatedAt: minutesAgo(5),
    });
    insertShadowDocument("users", {
      _id: new ObjectId("64f000000000000000002102"),
      email: "pastdue@example.com",
      name: "Past Due",
      planType: "PREMIUM",
      subscriptionStatus: "past_due",
      createdAt: minutesAgo(10),
      updatedAt: minutesAgo(10),
    });
    insertShadowDocument("users", {
      _id: new ObjectId("64f000000000000000002103"),
      email: "canceled@example.com",
      subscriptionStatus: "canceled",
      cancelAt: minutesAgo(30),
      cancellationReason: "too_expensive",
      cancellationFeedback: "Need cheaper batches",
      createdAt: daysAgo(10),
      updatedAt: minutesAgo(30),
      totalCardsCreated: 8,
      totalExports: 2,
    });
    insertShadowDocument("users", {
      _id: new ObjectId("64f000000000000000002104"),
      email: "pending@example.com",
      subscriptionStatus: "active",
      cancelAtPeriodEnd: true,
      createdAt: daysAgo(20),
      updatedAt: minutesAgo(2),
    });
    insertShadowDocument("support_tickets", {
      _id: new ObjectId("64f000000000000000002105"),
      status: "open",
      createdAt: minutesAgo(20),
    });
    insertShadowDocument("support_tickets", {
      _id: new ObjectId("64f000000000000000002106"),
      status: "closed",
      createdAt: minutesAgo(20),
    });
    insertShadowDocument("error_fingerprints", {
      _id: "admin_recent_error",
      status: "open",
      lastSeenAt: minutesAgo(15),
    });
    insertShadowDocument("error_fingerprints", {
      _id: "admin_fixed_error",
      status: "fixed",
      lastSeenAt: minutesAgo(15),
    });
    insertShadowDocument("activity_events", {
      _id: new ObjectId("64f000000000000000002107"),
      event: "checkout_completed",
      email: "active@example.com",
      metadata: { userName: "Active User", amount: 799 },
      createdAt: minutesAgo(1),
    });

    const badges = await getAdminLayoutBadges();
    expect(badges).toMatchObject({
      openTickets: 1,
      pastDueUsers: 1,
      recentErrorGroups: 1,
      activeUsers: 2,
    });
    expect(badges.mrr).toBe(15.98);

    const overview = await getAdminOverviewData(["signup_completed", "checkout_completed"]);
    expect(overview.recentUsers[0]?.email).toBe("active@example.com");
    expect("password" in (overview.recentUsers[0] as unknown as Record<string, unknown>)).toBe(false);
    expect(overview.recentActivity).toHaveLength(1);
    expect(overview.recentActivity[0]?.metadata).toMatchObject({ userName: "Active User" });
    expect(overview.canceledUsers.map((user) => user.email)).toEqual([
      "pending@example.com",
      "canceled@example.com",
    ]);
  });

  test("activity tracking writes sanitized events through SQLite", async () => {
    const { store } = createFixture();

    await trackActivity({
      event: "signup_completed",
      source: "client",
      userId: "user-1",
      email: "person@example.com",
      pathname: "/signup",
      sessionId: "session-1",
      anonymousId: "anon-1",
      domain: "mybingocard.com",
      ipAddress: "203.0.113.10",
      userAgent: "TestAgent",
      metadata: {
        plan: "premium",
        password: "secret",
        nested: {
          csrfToken: "token-value",
          kept: "yes",
        },
        at: new Date("2026-01-01T00:00:00.000Z"),
      },
    });
    await trackActivity({ event: "" });

    const rows = store.findMany<{
      event: string;
      source: string;
      userId: string;
      email: string;
      pathname: string;
      metadata: Record<string, unknown>;
      createdAt: Date;
    }>("activity_events");

    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(row).toBeDefined();
    expect(row!).toMatchObject({
      event: "signup_completed",
      source: "client",
      userId: "user-1",
      email: "person@example.com",
      pathname: "/signup",
    });
    expect(row!.createdAt).toBeInstanceOf(Date);
    expect(row!.metadata).toMatchObject({
      plan: "premium",
      password: "[redacted]",
      nested: {
        csrfToken: "[redacted]",
        kept: "yes",
      },
      at: "2026-01-01T00:00:00.000Z",
    });
  });

  test("client error helpers group events and claim alert cooldowns through SQLite", async () => {
    const { store } = createFixture();
    const createdAt = new Date("2026-07-02T21:30:00.000Z");
    const fingerprint = "client_sqlite_error";
    const doc: ClientErrorEventRecord = {
      fingerprint,
      type: "unhandledrejection",
      message: "Render failed",
      source: "/_next/static/chunks/app.js",
      lineno: 10,
      colno: 20,
      stack: "Error: Render failed",
      symbolicatedStack: "Error: Render failed\n    at page.tsx:1:1",
      sourceMappedFrames: [{ source: "app/page.tsx" }],
      pageUrl: "https://mybingocard.com/create",
      pathname: "/create",
      userAgent: "TestAgent",
      userId: "user-1",
      email: "person@example.com",
      sessionId: "session-1",
      anonymousId: "anon-1",
      buildId: "build-1",
      release: "release-1",
      breadcrumbs: [{ type: "click", message: "Save" }],
      clientContext: { viewport: "desktop" },
      ipAddress: "203.0.113.10",
      domain: "mybingocard.com",
      createdAt,
      severity: "medium",
      errorCategory: "app_error",
      impactArea: "application",
      alertSuppressed: false,
      suppressionReason: null,
      resourceHost: null,
    };

    await insertClientErrorEvent(doc);
    await insertClientErrorEvent({
      ...doc,
      sessionId: "session-2",
      anonymousId: "anon-2",
      createdAt: new Date("2026-07-02T21:31:00.000Z"),
    });

    expect((await upsertClientErrorFingerprint(doc))?.totalCount).toBe(1);
    expect((await upsertClientErrorFingerprint({ ...doc, sessionId: "session-2" }))?.totalCount).toBe(2);
    expect(await getRecentClientErrorStats(fingerprint, new Date("2026-07-02T21:00:00.000Z"))).toEqual({
      count: 2,
      sessionCount: 2,
    });

    const capturedAt = new Date("2026-07-02T21:32:00.000Z");
    expect(await claimClientErrorCaptureNotification({
      fingerprint,
      cooldownBefore: new Date("2026-07-02T21:00:00.000Z"),
      now: capturedAt,
    })).toBe(true);
    expect(await claimClientErrorCaptureNotification({
      fingerprint,
      cooldownBefore: new Date("2026-07-02T21:00:00.000Z"),
      now: new Date("2026-07-02T21:33:00.000Z"),
    })).toBe(false);
    expect(await releaseClientErrorCaptureNotification({
      fingerprint,
      claimedAt: new Date("2026-07-02T21:31:59.000Z"),
    })).toBe(false);
    expect(await releaseClientErrorCaptureNotification({ fingerprint, claimedAt: capturedAt })).toBe(true);

    const retryCapturedAt = new Date("2026-07-02T21:33:00.000Z");
    expect(await claimClientErrorCaptureNotification({
      fingerprint,
      cooldownBefore: new Date("2026-07-02T21:00:00.000Z"),
      now: retryCapturedAt,
    })).toBe(true);

    process.env.MYBINGOCARD_ERRORS_WEBHOOK_URL = "https://discord.invalid/no-send-test";
    process.env.MYBINGOCARD_DISCORD_MAX_ATTEMPTS = "1";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response("failed", { status: 500 })) as unknown as typeof fetch;
    try {
      const delivered = await notifyClientErrorCaptured({
        fingerprint,
        type: doc.type,
        message: doc.message,
        pageUrl: doc.pageUrl,
        source: doc.source,
        buildId: doc.buildId,
        sessionId: doc.sessionId,
        anonymousId: doc.anonymousId,
        severity: doc.severity,
        breadcrumbs: doc.breadcrumbs as Array<{
          type?: string;
          message?: string;
          timestamp?: string;
        }>,
      });
      expect(delivered).toBe(false);
      expect(await releaseClientErrorCaptureNotification({
        fingerprint,
        claimedAt: retryCapturedAt,
      })).toBe(true);
      expect(await claimClientErrorCaptureNotification({
        fingerprint,
        cooldownBefore: new Date("2026-07-02T21:00:00.000Z"),
        now: new Date("2026-07-02T21:34:00.000Z"),
      })).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.MYBINGOCARD_ERRORS_WEBHOOK_URL;
      delete process.env.MYBINGOCARD_DISCORD_MAX_ATTEMPTS;
    }

    const spikeClaimedAt = new Date("2026-07-02T21:34:00.000Z");
    expect(await claimClientErrorSpikeAlert({
      fingerprint,
      cooldownBefore: new Date("2026-07-02T21:00:00.000Z"),
      now: spikeClaimedAt,
      recentCount: 3,
      recentSessions: 2,
    })).toBe(true);
    expect(await releaseClientErrorSpikeAlert({
      fingerprint,
      claimedAt: new Date("2026-07-02T21:33:59.000Z"),
    })).toBe(false);
    expect(await releaseClientErrorSpikeAlert({ fingerprint, claimedAt: spikeClaimedAt })).toBe(true);
    expect(await claimClientErrorSpikeAlert({
      fingerprint,
      cooldownBefore: new Date("2026-07-02T21:00:00.000Z"),
      now: new Date("2026-07-02T21:34:30.000Z"),
      recentCount: 3,
      recentSessions: 2,
    })).toBe(true);

    store.updateOne("error_fingerprints", { _id: fingerprint }, { $set: { status: "fixed" } });
    await reopenFixedClientErrorFingerprint(fingerprint, new Date("2026-07-02T21:35:00.000Z"));
    const reopened = store.findOne<{
      status?: string;
      statusHistory?: Array<{ reason?: string }>;
    }>("error_fingerprints", { _id: fingerprint });
    expect(reopened?.status).toBe("open");
    expect(reopened?.statusHistory?.[0]?.reason).toBe("fixed fingerprint recurred");

    await upsertMarketingTrackingFailure(
      {
        fingerprint: "tracking_noise",
        message: "Failed to load https://s.pinimg.com/pixel.js",
        source: "https://s.pinimg.com/pixel.js",
        pageUrl: "https://mybingocard.com/",
        pathname: "/",
        userAgent: "TestAgent",
        sessionId: "session-1",
        anonymousId: "anon-1",
        buildId: "build-1",
        createdAt,
      },
      {
        resourceHost: "s.pinimg.com",
        suppressionReason: "third-party marketing pixel resource failure",
      }
    );
    await upsertMarketingTrackingFailure(
      {
        fingerprint: "tracking_noise",
        message: "Failed to load https://s.pinimg.com/pixel.js",
        source: "https://s.pinimg.com/pixel.js",
        pageUrl: "https://mybingocard.com/pricing",
        pathname: "/pricing",
        userAgent: "TestAgent",
        sessionId: "session-2",
        anonymousId: "anon-2",
        buildId: "build-1",
        createdAt: new Date("2026-07-02T21:40:00.000Z"),
      },
      {
        resourceHost: "s.pinimg.com",
        suppressionReason: "third-party marketing pixel resource failure",
      }
    );

    const marketing = store.findOne<{
      totalCount?: number;
      pathnames?: string[];
      sessionIds?: string[];
    }>("marketing_tracking_failures", { _id: "tracking_noise" });
    expect(marketing?.totalCount).toBe(2);
    expect(marketing?.pathnames).toEqual(["/", "/pricing"]);
    expect(marketing?.sessionIds).toEqual(["session-1", "session-2"]);
  });

  test("admin error page helpers read grouped errors and update status through SQLite", async () => {
    const { insertShadowDocument, store } = createFixture();
    const now = Date.now();
    const minutesAgo = (minutes: number) => new Date(now - minutes * 60 * 1000);
    const buildCreatedAt = minutesAgo(90);

    insertShadowDocument("error_fingerprints", {
      _id: "error_open_high",
      status: "open",
      severity: "high",
      type: "error",
      message: "High priority crash",
      latestPageUrl: "https://mybingocard.com/create",
      latestPathname: "/create",
      latestBuildId: "build-admin",
      latestSymbolicatedStack: "Error: High priority crash\n    at app/page.tsx:1:1",
      latestSourceMappedFrames: [{ source: "app/page.tsx", line: 1, column: 1 }],
      latestBreadcrumbs: [{ type: "click", message: "Save" }],
      totalCount: 3,
      firstSeenAt: minutesAgo(30),
      lastSeenAt: minutesAgo(5),
      sessionIds: ["session-a", "session-b"],
      anonymousIds: ["anon-a"],
    });
    insertShadowDocument("error_fingerprints", {
      _id: "error_status_missing",
      severity: "low",
      message: "Missing status still open",
      firstSeenAt: minutesAgo(20),
      lastSeenAt: minutesAgo(10),
    });
    insertShadowDocument("error_fingerprints", {
      _id: "error_fixed",
      status: "fixed",
      severity: "medium",
      message: "Already fixed",
      firstSeenAt: minutesAgo(60),
      lastSeenAt: minutesAgo(5),
    });
    insertShadowDocument("error_events", {
      _id: new ObjectId("64f000000000000000002201"),
      fingerprint: "error_open_high",
      type: "error",
      pageUrl: "https://mybingocard.com/create",
      pathname: "/create",
      buildId: "build-admin",
      sessionId: "session-a",
      anonymousId: "anon-a",
      impactArea: "application",
      createdAt: minutesAgo(4),
    });
    insertShadowDocument("error_events", {
      _id: new ObjectId("64f000000000000000002202"),
      fingerprint: "error_open_high",
      type: "error",
      pageUrl: "https://mybingocard.com/pricing",
      pathname: "/pricing",
      buildId: "build-admin",
      sessionId: "session-b",
      anonymousId: "anon-b",
      impactArea: "application",
      createdAt: minutesAgo(3),
    });

    const pageData = await getAdminErrorPageData({
      selectedFingerprint: "error_open_high",
      selectedStatusFilter: "unresolved",
      currentBuild: {
        buildId: "build-admin",
        buildCreatedAt,
      },
    });

    expect(pageData.groups.map((group) => group._id)).toEqual([
      "error_open_high",
      "error_status_missing",
    ]);
    expect(pageData.groups24h).toBe(2);
    expect(pageData.events24h).toBe(2);
    expect(pageData.currentBuildEvents24h).toBe(2);
    expect(pageData.eventsAfterDeploy).toBe(2);
    expect(pageData.highGroups24h).toBe(1);
    expect(pageData.newSinceDeployGroups).toBe(2);
    expect(pageData.selectedGroup?.latestBreadcrumbs?.[0]?.message).toBe("Save");
    expect(pageData.selectedEvents.map((event) => event.pathname)).toEqual(["/pricing", "/create"]);
    expect(pageData.statusCountsRaw.find((row) => row._id === "open")?.count).toBe(2);
    expect(pageData.statusCountsRaw.find((row) => row._id === "fixed")?.count).toBe(1);

    const updatedAt = minutesAgo(1);
    await updateAdminErrorFingerprintStatus({
      fingerprint: "error_open_high",
      status: "ignored",
      updatedAt,
      updatedBy: "admin@example.com",
    });

    const updated = store.findOne<{
      status?: string;
      statusUpdatedBy?: string | null;
      statusHistory?: Array<{ status?: string; updatedBy?: string | null }>;
    }>("error_fingerprints", { _id: "error_open_high" });
    expect(updated?.status).toBe("ignored");
    expect(updated?.statusUpdatedBy).toBe("admin@example.com");
    expect(updated?.statusHistory?.[0]).toMatchObject({
      status: "ignored",
      updatedBy: "admin@example.com",
    });
  });

  test("analytics identify upserts visitor profiles through SQLite", async () => {
    const { store } = createFixture();
    const firstSeenAt = new Date("2026-07-02T22:45:00.000Z");
    const lastSeenAt = new Date("2026-07-02T22:50:00.000Z");

    await upsertVisitorProfileIdentification({
      anonymousId: "anon_sqlite_1234",
      domain: "mybingocard.com",
      client: "mybingocard",
      name: "Profile User",
      email: "profile@example.com",
      sessionId: "session-1",
      lastPathname: "/create",
      lastReferrer: "",
      matchedRecords: [
        {
          collection: "mybingocard.users",
          id: "64f000000000000000005001",
          client: "mybingocard",
          status: "FREE",
          source: "mybingocard.com",
          createdAt: new Date("2026-07-01T00:00:00.000Z"),
          matchedOn: "authenticated_session",
          confidence: 100,
        },
      ],
      myBingoCardUserId: "64f000000000000000005001",
      legacyAnonymousId: "anon_old",
      landingUrl: "/",
      now: firstSeenAt,
    });

    await upsertVisitorProfileIdentification({
      anonymousId: "anon_sqlite_1234",
      domain: "mybingocard.com",
      client: "mybingocard",
      name: "Profile User",
      email: "profile@example.com",
      sessionId: "session-2",
      lastPathname: "/dashboard",
      lastReferrer: "/create",
      matchedRecords: [
        {
          collection: "mybingocard.users",
          id: "64f000000000000000005001",
          client: "mybingocard",
          status: "FREE",
          source: "mybingocard.com",
          createdAt: new Date("2026-07-01T00:00:00.000Z"),
          matchedOn: "authenticated_session",
          confidence: 100,
        },
      ],
      myBingoCardUserId: "64f000000000000000005001",
      legacyAnonymousId: "anon_old",
      landingUrl: "/",
      now: lastSeenAt,
    });

    const profile = store.findOne<{
      firstSeenAt?: Date;
      lastIdentifiedAt?: Date;
      identifyCount?: number;
      internalMatchCount?: number;
      lastPathname?: string;
      sessionId?: string;
      sources?: string[];
    }>("visitor_profiles", { anonymousId: "anon_sqlite_1234" });

    expect(profile?.firstSeenAt?.toISOString()).toBe(firstSeenAt.toISOString());
    expect(profile?.lastIdentifiedAt?.toISOString()).toBe(lastSeenAt.toISOString());
    expect(profile?.identifyCount).toBe(2);
    expect(profile?.internalMatchCount).toBe(2);
    expect(profile?.lastPathname).toBe("/dashboard");
    expect(profile?.sessionId).toBe("session-2");
    expect(profile?.sources).toEqual(["mybingocard_login"]);
  });

  test("Apple IAP helpers store transactions and premium entitlements through SQLite", async () => {
    const { store } = createFixture();
    const userId = new ObjectId("64f000000000000000006001");
    const now = new Date("2026-07-02T23:00:00.000Z");
    const expiresDate = new Date("2026-08-02T23:00:00.000Z");

    store.insertOne("users", {
      _id: userId,
      email: "iap@example.com",
      planType: "FREE",
      subscriptionStatus: "inactive",
      createdAt: now,
      updatedAt: now,
    });

    await upsertAppleIapTransaction({
      transactionId: "apple-batch-1",
      userId: userId.toHexString(),
      email: "iap@example.com",
      productId: "com.coryanalla.MyBingoCardApp.batch.30",
      purchaseType: "batch_pack",
      batchCount: 30,
      batchPurchaseId: "batch-purchase-1",
      originalTransactionId: "apple-original-1",
      environment: "Sandbox",
      purchaseDate: now,
      expiresDate: null,
      status: "paid",
      now,
    });

    await applyApplePremiumEntitlement({
      userId,
      subscriptionStatus: "trialing",
      purchaseDate: now,
      expiresDate,
      isLifetime: false,
      productId: "com.coryanalla.MyBingoCardApp.premium.monthly",
      transactionId: "apple-premium-1",
      originalTransactionId: "apple-original-premium-1",
      environment: "Sandbox",
      now,
    });

    await upsertAppleIapTransaction({
      transactionId: "apple-premium-1",
      userId: userId.toHexString(),
      email: "iap@example.com",
      productId: "com.coryanalla.MyBingoCardApp.premium.monthly",
      purchaseType: "premium",
      originalTransactionId: "apple-original-premium-1",
      environment: "Sandbox",
      purchaseDate: now,
      expiresDate,
      status: "trialing",
      now,
    });

    const batchTransaction = store.findOne<{
      purchaseType?: string;
      batchCount?: number;
      batchPurchaseId?: string;
      status?: string;
    }>("apple_iap_transactions", { transactionId: "apple-batch-1" });
    expect(batchTransaction).toMatchObject({
      purchaseType: "batch_pack",
      batchCount: 30,
      batchPurchaseId: "batch-purchase-1",
      status: "paid",
    });

    const premiumTransaction = store.findOne<{
      purchaseType?: string;
      status?: string;
      expiresDate?: Date;
    }>("apple_iap_transactions", { transactionId: "apple-premium-1" });
    expect(premiumTransaction?.purchaseType).toBe("premium");
    expect(premiumTransaction?.status).toBe("trialing");
    expect(premiumTransaction?.expiresDate?.toISOString()).toBe(expiresDate.toISOString());

    const user = store.findOne<{
      planType?: string;
      subscriptionStatus?: string;
      trialEndsAt?: Date;
      appleProductId?: string;
      appleTransactionId?: string;
    }>("users", { _id: userId });
    expect(user).toMatchObject({
      planType: "PREMIUM",
      subscriptionStatus: "trialing",
      appleProductId: "com.coryanalla.MyBingoCardApp.premium.monthly",
      appleTransactionId: "apple-premium-1",
    });
    expect(user?.trialEndsAt?.toISOString()).toBe(expiresDate.toISOString());

    const revokedAt = new Date("2026-07-03T01:00:00.000Z");
    expect(await revokeApplePremiumEntitlement({
      userId,
      transactionId: "apple-premium-1",
      originalTransactionId: "apple-original-premium-1",
      revokedAt,
    })).toBe(true);
    expect(store.findOne("users", { _id: userId })).toMatchObject({
      planType: "FREE",
      subscriptionStatus: "canceled",
      currentPeriodEnd: revokedAt,
    });
  });

  test("Apple app-account tokens are stable and resolve to exactly one local user", async () => {
    const { store } = createFixture();
    const userId = new ObjectId("64f000000000000000006009");
    store.insertOne("users", {
      _id: userId,
      email: "apple-token@example.com",
      planType: "FREE",
      subscriptionStatus: "inactive",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const first = await getOrCreateAppleAppAccountToken(userId.toHexString());
    const second = await getOrCreateAppleAppAccountToken(userId.toHexString());
    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect((await getUserByAppleAppAccountToken(first))?._id.toHexString()).toBe(userId.toHexString());
  });

  test("Apple transaction ownership cannot move between users", async () => {
    createFixture();
    const firstUserId = new ObjectId("64f000000000000000006011").toHexString();
    const secondUserId = new ObjectId("64f000000000000000006012").toHexString();
    const now = new Date("2026-07-02T23:30:00.000Z");

    expect(await claimAppleIapTransactionOwnership({
      transactionId: "apple-owned-transaction",
      originalTransactionId: "apple-owned-original",
      userId: firstUserId,
      email: "first@example.com",
      now,
    })).toBe(true);

    expect(await claimAppleIapTransactionOwnership({
      transactionId: "apple-owned-transaction",
      originalTransactionId: "apple-owned-original",
      userId: secondUserId,
      email: "second@example.com",
      now,
    })).toBe(false);

    expect(await claimAppleIapTransactionOwnership({
      transactionId: "apple-renewal-transaction",
      originalTransactionId: "apple-owned-original",
      userId: secondUserId,
      email: "second@example.com",
      now,
    })).toBe(false);

    await expect(upsertAppleIapTransaction({
      transactionId: "apple-owned-transaction",
      userId: secondUserId,
      email: "second@example.com",
      productId: "com.coryanalla.MyBingoCardApp.premium.lifetime",
      purchaseType: "premium",
      originalTransactionId: "apple-owned-original",
      environment: "Sandbox",
      purchaseDate: now,
      expiresDate: null,
      status: "lifetime",
      now,
    })).rejects.toThrow("already associated with another account");
  });

  test("Apple revocation ledger state is terminal against stale active replay", async () => {
    createFixture();
    const userId = new ObjectId("64f000000000000000006021").toHexString();
    const purchaseDate = new Date("2026-07-01T00:00:00.000Z");
    const revokedAt = new Date("2026-07-02T00:00:00.000Z");
    const base = {
      transactionId: "apple-revoked-terminal",
      userId,
      email: "revoked@example.com",
      productId: "com.coryanalla.MyBingoCardApp.premium.lifetime",
      purchaseType: "premium" as const,
      originalTransactionId: "apple-revoked-terminal",
      environment: "Sandbox",
      purchaseDate,
      expiresDate: null,
    };

    await upsertAppleIapTransaction({
      ...base,
      status: "revoked",
      revocationDate: revokedAt,
      now: revokedAt,
    });
    await upsertAppleIapTransaction({
      ...base,
      status: "lifetime",
      now: new Date("2026-07-03T00:00:00.000Z"),
    });

    const persisted = await getAppleIapTransaction(base.transactionId);
    expect(persisted?.status).toBe("revoked");
    expect(persisted?.revocationDate?.toISOString()).toBe(revokedAt.toISOString());
  });

  test("Apple notification receipts are idempotent and lineage state rejects older events", async () => {
    createFixture();
    const notificationUUID = "notification-0001";
    expect(await beginAppleIapNotification({
      notificationUUID,
      notificationType: "DID_RENEW",
      signedDate: new Date("2026-07-03T00:00:00.000Z"),
      environment: "Sandbox",
      signedPayload: "signed-payload",
    })).toBe("process");
    await finishAppleIapNotification({
      notificationUUID,
      status: "completed",
      userId: "64f000000000000000006099",
      transactionId: "renewal-2",
      originalTransactionId: "original-1",
    });
    expect(await beginAppleIapNotification({
      notificationUUID,
      signedPayload: "signed-payload",
    })).toBe("duplicate");

    await recordAppleIapLineageState({
      originalTransactionId: "original-1",
      userId: "64f000000000000000006099",
      signedDate: new Date("2026-07-03T00:00:00.000Z"),
      transactionId: "renewal-2",
      status: "active",
      notificationType: "DID_RENEW",
      notificationUUID,
    });
    expect(await isAppleIapLineageStateStale({
      originalTransactionId: "original-1",
      signedDate: new Date("2026-07-02T23:59:59.000Z"),
    })).toBe(true);
    expect(await isAppleIapLineageStateStale({
      originalTransactionId: "original-1",
      signedDate: new Date("2026-07-04T00:00:00.000Z"),
    })).toBe(false);
  });
});
