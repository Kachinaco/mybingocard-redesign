import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { ObjectId } from "bson";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  countPriorUserAiGenerations,
  countRecentAiGenerations,
  hasUserActivityEvent,
} from "@/lib/db/activity-events";
import { getConnectedAuthProviders } from "@/lib/db/auth-data";
import {
  countUserCards,
  deleteCard,
  getAdminCardsPage,
  getCommunityTemplateCards,
  getSharedCardForShareLink,
  incrementSharedCardViews,
} from "@/lib/db/cards";
import { createCancellationSurvey } from "@/lib/db/cancellation-surveys";
import {
  getLiveGameWaitlist,
  upsertLiveGameWaitlistEntry,
} from "@/lib/db/live-game-waitlist";
import {
  isImageReferencedByPublicCard,
  updateImagePaths,
} from "@/lib/db/images";
import { createNpsResponse } from "@/lib/db/nps";
import {
  appendSupportTicketReply,
  getRecentSupportTickets,
  getSupportTicketById,
  updateSupportTicketStatus,
} from "@/lib/db/support-tickets";
import {
  createGuestShareLinkUser,
  deleteUserAccountData,
  extendAdminUserTrialById,
  getActiveGuestClaimUser,
  getAdminUserDetail,
  getAdminUsersPage,
  getUsersForExport,
  markAdminUserCancelAtPeriodEndById,
  markUserNpsShownByEmail,
  markUserOnboardingStepCompletedByEmail,
  recordNativeOAuthLogin,
  setUserOnboardingDismissedByEmail,
  updateMissingUserSignupContext,
  updateUserLastSeenByEmail,
} from "@/lib/db/users";
import { closeSqliteStoreForTests, setSqliteStoreForTests } from "@/lib/db/sqlite";
import { SqliteDocumentStore } from "@/lib/sqlite-document-store";

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
  const dir = mkdtempSync(join(tmpdir(), "mybingocard-sqlite-user-api-data-"));
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

  const store = new SqliteDocumentStore(db);
  setSqliteStoreForTests(store);

  cleanupCallbacks.push(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  return { store };
}

describe("SQLite user API data helpers", () => {
  test("updates user last-seen by email", async () => {
    const { store } = createFixture();
    const lastSeen = new Date("2026-07-02T20:00:00.000Z");

    store.insertOne("users", {
      _id: new ObjectId("64f200000000000000000001"),
      email: "ping@example.com",
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    });

    await updateUserLastSeenByEmail("ping@example.com", lastSeen);

    const user = store.findOne<{ lastSeen?: Date }>("users", { email: "ping@example.com" });
    expect(user?.lastSeen?.toISOString()).toBe(lastSeen.toISOString());
  });

  test("fills missing signup context without overwriting existing values", async () => {
    const { store } = createFixture();
    const userId = new ObjectId("64f200000000000000000002");

    store.insertOne("users", {
      _id: userId,
      email: "device@example.com",
      signupDevice: "Safari / macOS",
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    });

    await updateMissingUserSignupContext(userId.toHexString(), {
      signupDevice: "Chrome / Windows",
      signupLanguage: "en-US",
    });
    await updateMissingUserSignupContext(userId.toHexString(), {
      signupLanguage: "fr-FR",
    });

    const user = store.findOne<{
      signupDevice?: string;
      signupLanguage?: string;
    }>("users", { _id: userId });

    expect(user?.signupDevice).toBe("Safari / macOS");
    expect(user?.signupLanguage).toBe("en-US");
  });

  test("records native OAuth logins with SQLite increments", async () => {
    const { store } = createFixture();
    const userId = new ObjectId("64f200000000000000000102");
    const now = new Date("2026-07-02T21:00:00.000Z");

    store.insertOne("users", {
      _id: userId,
      email: "native-login@example.com",
      planType: "FREE",
      subscriptionStatus: "inactive",
      loginCount: 2,
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    });

    const current = store.findOne<any>("users", { _id: userId });
    const updated = await recordNativeOAuthLogin(current, {
      signupMethod: "apple",
      name: "Native Login",
      now,
    });

    expect(updated?.loginCount).toBe(3);
    expect(updated?.signupMethod).toBe("apple");
    expect(updated?.name).toBe("Native Login");
    expect(updated?.emailVerified?.toISOString()).toBe(now.toISOString());
    expect(updated?.lastLoginAt?.toISOString()).toBe(now.toISOString());
  });

  test("deletes account-owned data across SQLite collections", async () => {
    const { store } = createFixture();
    const userId = new ObjectId("64f200000000000000000302");
    const userIdString = userId.toHexString();
    const email = "delete-me@example.com";
    const now = new Date("2026-07-02T22:55:00.000Z");
    const user = {
      _id: userId,
      email,
      planType: "FREE" as const,
      subscriptionStatus: "inactive" as const,
      createdAt: now,
      updatedAt: now,
    };

    store.insertOne("users", user);
    store.insertOne("cards", { _id: new ObjectId(), userId: userIdString });
    store.insertOne("gameHistory", { _id: new ObjectId(), userId: userIdString });
    store.insertOne("game_states", { _id: new ObjectId(), userId: userIdString });
    store.insertOne("favorites", { _id: new ObjectId(), userId: userIdString });
    store.insertOne("batch_purchases", { _id: new ObjectId(), userId: "other-user", email });
    store.insertOne("accounts", { _id: new ObjectId(), userId, provider: "google" });
    store.insertOne("accounts", { _id: new ObjectId(), userId: userIdString, provider: "apple" });
    store.insertOne("sessions", { _id: new ObjectId(), userId, sessionToken: "session-1" });
    store.insertOne("sessions", { _id: new ObjectId(), userId: userIdString, sessionToken: "session-2" });
    store.insertOne("email_preferences", { _id: new ObjectId(), email });
    store.insertOne("drip_opens", { _id: new ObjectId(), email });
    store.insertOne("drip_log", { _id: new ObjectId(), userId: userIdString });

    await deleteUserAccountData(user);

    for (const collection of [
      "users",
      "cards",
      "gameHistory",
      "game_states",
      "favorites",
      "batch_purchases",
      "accounts",
      "sessions",
      "email_preferences",
      "drip_opens",
      "drip_log",
    ]) {
      expect(store.count(collection)).toBe(0);
    }
  });

  test("reads connected auth providers from ObjectId and string account user IDs", async () => {
    const { store } = createFixture();
    const userId = new ObjectId("64f200000000000000000003");

    store.insertOne("accounts", {
      _id: new ObjectId("64f200000000000000000103"),
      userId,
      provider: "google",
      providerAccountId: "google-1",
      type: "oauth",
    });
    store.insertOne("accounts", {
      _id: new ObjectId("64f200000000000000000104"),
      userId: userId.toHexString(),
      provider: "apple",
      providerAccountId: "apple-1",
      type: "oauth",
    });

    expect(await getConnectedAuthProviders(userId)).toEqual(["google", "apple"]);
  });

  test("stores cancellation surveys through SQLite", async () => {
    const { store } = createFixture();
    const createdAt = new Date("2026-07-02T20:30:00.000Z");

    await createCancellationSurvey({
      email: "cancel@example.com",
      userId: "64f200000000000000000004",
      reason: "missing_feature",
      details: "Needed a print option",
      createdAt,
    });

    const survey = store.findOne<{
      email?: string;
      reason?: string;
      details?: string;
      createdAt?: Date;
    }>("cancellation_surveys", { email: "cancel@example.com" });

    expect(survey).toMatchObject({
      email: "cancel@example.com",
      reason: "missing_feature",
      details: "Needed a print option",
    });
    expect(survey?.createdAt?.toISOString()).toBe(createdAt.toISOString());
  });

  test("counts user cards stored with string or ObjectId user IDs", async () => {
    const { store } = createFixture();
    const userId = new ObjectId("64f200000000000000000005");

    store.insertOne("cards", {
      _id: new ObjectId("64f200000000000000000205"),
      userId: userId.toHexString(),
      title: "String card",
      updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    });
    store.insertOne("cards", {
      _id: new ObjectId("64f200000000000000000206"),
      userId,
      title: "ObjectId card",
      updatedAt: new Date("2026-07-01T00:01:00.000Z"),
    });
    store.insertOne("cards", {
      _id: new ObjectId("64f200000000000000000207"),
      userId: "someone-else",
      title: "Other card",
      updatedAt: new Date("2026-07-01T00:02:00.000Z"),
    });

    expect(await countUserCards(userId.toHexString())).toBe(2);
  });

  test("upserts and lists live-game waitlist entries", async () => {
    createFixture();

    await upsertLiveGameWaitlistEntry({
      email: "first@example.com",
      name: "First",
      userId: "user-1",
      now: new Date("2026-07-02T18:00:00.000Z"),
    });
    await upsertLiveGameWaitlistEntry({
      email: "second@example.com",
      name: "Second",
      userId: "user-2",
      now: new Date("2026-07-02T19:00:00.000Z"),
    });
    await upsertLiveGameWaitlistEntry({
      email: "first@example.com",
      name: "First Updated",
      userId: "user-1",
      now: new Date("2026-07-02T20:00:00.000Z"),
    });

    const list = await getLiveGameWaitlist();
    expect(list.map((entry) => entry.email)).toEqual(["second@example.com", "first@example.com"]);
    expect(list.find((entry) => entry.email === "first@example.com")?.name).toBe("First Updated");
    expect(list.find((entry) => entry.email === "first@example.com")?.createdAt?.toISOString())
      .toBe("2026-07-02T18:00:00.000Z");
  });

  test("returns user export rows sorted newest first", async () => {
    const { store } = createFixture();

    store.insertOne("users", {
      _id: new ObjectId("64f200000000000000000006"),
      email: "old@example.com",
      name: "Old User",
      planType: "FREE",
      subscriptionStatus: "inactive",
      signupMethod: "credentials",
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      totalCardsCreated: 2,
      totalExports: 1,
      password: "should-not-be-exported",
    });
    store.insertOne("users", {
      _id: new ObjectId("64f200000000000000000007"),
      email: "new@example.com",
      name: "New User",
      planType: "PREMIUM",
      subscriptionStatus: "active",
      signupMethod: "google",
      createdAt: new Date("2026-07-02T00:00:00.000Z"),
      totalCardsCreated: 5,
      totalExports: 3,
      stripeCustomerId: "cus_private",
    });

    const rows = await getUsersForExport();

    expect(rows.map((row) => row.email)).toEqual(["new@example.com", "old@example.com"]);
    expect(rows[0]).toEqual({
      email: "new@example.com",
      name: "New User",
      planType: "PREMIUM",
      subscriptionStatus: "active",
      signupMethod: "google",
      createdAt: new Date("2026-07-02T00:00:00.000Z"),
      totalCardsCreated: 5,
      totalExports: 3,
    });
    expect(rows[0]).not.toHaveProperty("stripeCustomerId");
  });

  test("stores NPS responses and marks user prompt state", async () => {
    const { store } = createFixture();
    const npsShownAt = new Date("2026-07-02T21:00:00.000Z");

    store.insertOne("users", {
      _id: new ObjectId("64f200000000000000000008"),
      email: "nps@example.com",
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    });

    await createNpsResponse({
      userId: "64f200000000000000000008",
      email: "nps@example.com",
      score: 9,
      comment: "Useful for class events",
      createdAt: npsShownAt,
    });
    await markUserNpsShownByEmail("nps@example.com", npsShownAt);

    const response = store.findOne<{ score?: number; comment?: string }>(
      "nps_responses",
      { email: "nps@example.com" }
    );
    const user = store.findOne<{ npsShownAt?: Date }>("users", { email: "nps@example.com" });

    expect(response).toMatchObject({ score: 9, comment: "Useful for class events" });
    expect(user?.npsShownAt?.toISOString()).toBe(npsShownAt.toISOString());
  });

  test("updates onboarding dismissal and nested completed steps", async () => {
    const { store } = createFixture();

    store.insertOne("users", {
      _id: new ObjectId("64f200000000000000000009"),
      email: "onboarding@example.com",
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    });

    await setUserOnboardingDismissedByEmail("onboarding@example.com", true);
    await markUserOnboardingStepCompletedByEmail("onboarding@example.com", "tryGame");

    const user = store.findOne<{
      onboardingDismissed?: boolean;
      onboardingCompleted?: Record<string, boolean>;
    }>("users", { email: "onboarding@example.com" });

    expect(user?.onboardingDismissed).toBe(true);
    expect(user?.onboardingCompleted?.tryGame).toBe(true);
  });

  test("queries activity-event AI quotas and onboarding completion probes", async () => {
    const { store } = createFixture();

    store.insertOne("activity_events", {
      _id: new ObjectId("64f200000000000000000301"),
      event: "ai_cells_generated",
      userId: "user-ai",
      metadata: {},
      createdAt: new Date("2026-07-02T20:00:00.000Z"),
    });
    store.insertOne("activity_events", {
      _id: new ObjectId("64f200000000000000000302"),
      event: "ai_cells_generated",
      userId: "user-ai",
      metadata: {},
      createdAt: new Date("2026-07-01T19:00:00.000Z"),
    });
    store.insertOne("activity_events", {
      _id: new ObjectId("64f200000000000000000303"),
      event: "ai_cells_generated",
      userId: null,
      metadata: { aiQuotaKey: "anon-key" },
      createdAt: new Date("2026-07-02T20:30:00.000Z"),
    });
    store.insertOne("activity_events", {
      _id: new ObjectId("64f200000000000000000304"),
      event: "game_created",
      userId: "user-ai",
      createdAt: new Date("2026-07-02T20:35:00.000Z"),
    });

    const since = new Date("2026-07-02T00:00:00.000Z");

    expect(await countRecentAiGenerations({ userId: "user-ai", since })).toBe(1);
    expect(await countRecentAiGenerations({ anonymousQuotaKey: "anon-key", since })).toBe(1);
    expect(await countPriorUserAiGenerations("user-ai")).toBe(2);
    expect(await hasUserActivityEvent("user-ai", ["game_created", "game_joined"])).toBe(true);
    expect(await hasUserActivityEvent("user-ai", ["card_exported"])).toBe(false);
  });

  test("returns community template cards sorted by views", async () => {
    const { store } = createFixture();

    store.insertOne("cards", {
      _id: new ObjectId("64f200000000000000000401"),
      userId: "owner-1",
      title: "Low views",
      isPublic: true,
      views: 2,
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    });
    store.insertOne("cards", {
      _id: new ObjectId("64f200000000000000000402"),
      userId: "owner-1",
      title: "Popular",
      isPublic: true,
      views: 10,
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    });
    store.insertOne("cards", {
      _id: new ObjectId("64f200000000000000000403"),
      userId: "owner-2",
      title: "Also popular",
      isPublic: true,
      views: 6,
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    });
    store.insertOne("cards", {
      _id: new ObjectId("64f200000000000000000404"),
      userId: "owner-3",
      title: "Private",
      isPublic: false,
      views: 99,
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    });

    expect((await getCommunityTemplateCards(10)).map((card) => card.title)).toEqual([
      "Popular",
      "Also popular",
    ]);
  });

  test("lists admin cards with owner lookup and deletes through SQLite", async () => {
    const { store } = createFixture();
    const ownerA = new ObjectId("64f200000000000000000501");
    const ownerB = new ObjectId("64f200000000000000000502");
    const publicCard = new ObjectId("64f200000000000000000601");
    const privateCard = new ObjectId("64f200000000000000000602");

    store.insertOne("users", {
      _id: ownerA,
      email: "owner-a@example.com",
      name: "Owner A",
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    });
    store.insertOne("users", {
      _id: ownerB,
      email: "owner-b@example.com",
      name: "Owner B",
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    });

    store.insertOne("cards", {
      _id: publicCard,
      userId: ownerA.toHexString(),
      title: "Teacher Icebreaker",
      size: 5,
      cells: ["A", "B"],
      isPublic: true,
      views: 12,
      createdAt: new Date("2026-07-02T10:00:00.000Z"),
      updatedAt: new Date("2026-07-02T10:00:00.000Z"),
    });
    store.insertOne("cards", {
      _id: privateCard,
      userId: ownerB.toHexString(),
      title: "Private Staff Board",
      size: 4,
      cells: ["C", "D"],
      isPublic: false,
      views: 3,
      createdAt: new Date("2026-07-02T11:00:00.000Z"),
      updatedAt: new Date("2026-07-02T11:00:00.000Z"),
    });

    const emailSearch = await getAdminCardsPage({
      page: 1,
      limit: 10,
      search: "owner-a@example.com",
      visibility: "public",
    });
    expect(emailSearch.totalCards).toBe(1);
    expect(emailSearch.cards[0]).toMatchObject({
      title: "Teacher Icebreaker",
      owner: { name: "Owner A", email: "owner-a@example.com" },
    });

    const privateSearch = await getAdminCardsPage({
      page: 1,
      limit: 10,
      search: "Private Staff",
      visibility: "private",
    });
    expect(privateSearch.cards.map((card) => card.title)).toEqual(["Private Staff Board"]);

    expect(await deleteCard(publicCard.toHexString())).toBe(true);
    expect(store.findOne("cards", { _id: publicCard })).toBeNull();
  });

  test("lists admin users with filters and most-card sorting through SQLite", async () => {
    const { store } = createFixture();
    const paidUser = new ObjectId("64f200000000000000000701");
    const freeUser = new ObjectId("64f200000000000000000702");
    const trialUser = new ObjectId("64f200000000000000000703");

    store.insertOne("users", {
      _id: paidUser,
      email: "paid@example.com",
      name: "Paid User",
      planType: "PREMIUM",
      subscriptionStatus: "active",
      stripeCustomerId: "cus_paid",
      createdAt: new Date("2026-07-02T00:00:00.000Z"),
      updatedAt: new Date("2026-07-02T02:00:00.000Z"),
    });
    store.insertOne("users", {
      _id: freeUser,
      email: "free@example.com",
      name: "Free User",
      planType: "FREE",
      subscriptionStatus: "inactive",
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      updatedAt: new Date("2026-07-02T03:00:00.000Z"),
    });
    store.insertOne("users", {
      _id: trialUser,
      email: "trial@example.com",
      name: "Trial User",
      planType: "FREE",
      subscriptionStatus: "trialing",
      trialEndsAt: new Date("2026-07-09T00:00:00.000Z"),
      createdAt: new Date("2026-07-03T00:00:00.000Z"),
      updatedAt: new Date("2026-07-02T01:00:00.000Z"),
    });

    store.insertOne("cards", {
      _id: new ObjectId("64f200000000000000000801"),
      userId: paidUser.toHexString(),
      title: "Paid Card",
      createdAt: new Date("2026-07-02T04:00:00.000Z"),
    });
    store.insertOne("cards", {
      _id: new ObjectId("64f200000000000000000802"),
      userId: freeUser.toHexString(),
      title: "Free Card 1",
      createdAt: new Date("2026-07-02T05:00:00.000Z"),
    });
    store.insertOne("cards", {
      _id: new ObjectId("64f200000000000000000803"),
      userId: freeUser.toHexString(),
      title: "Free Card 2",
      createdAt: new Date("2026-07-02T06:00:00.000Z"),
    });

    const mostCards = await getAdminUsersPage({ page: 1, limit: 2, sortBy: "most_cards" });
    expect(mostCards.users.map((user) => [user.email, user.cardCount])).toEqual([
      ["free@example.com", 2],
      ["paid@example.com", 1],
    ]);
    expect(mostCards.totalUsers).toBe(3);
    expect(mostCards.totalPages).toBe(2);

    const premiumSearch = await getAdminUsersPage({
      page: 1,
      limit: 10,
      search: "paid",
      plan: "premium",
    });
    expect(premiumSearch.users.map((user) => user.email)).toEqual(["paid@example.com"]);
    const premiumUser = premiumSearch.users[0];
    expect(premiumUser).toBeDefined();
    expect(premiumUser?.stripeCustomerId).toBe("cus_paid");

    const trialing = await getAdminUsersPage({ page: 1, limit: 10, plan: "trialing" });
    expect(trialing.users.map((user) => user.email)).toEqual(["trial@example.com"]);
  });

  test("returns admin user detail without password and with recent cards/activity", async () => {
    const { store } = createFixture();
    const userId = new ObjectId("64f200000000000000000901");

    store.insertOne("users", {
      _id: userId,
      email: "detail@example.com",
      name: "Detail User",
      password: "hashed-password",
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    });
    store.insertOne("cards", {
      _id: new ObjectId("64f200000000000000000902"),
      userId: userId.toHexString(),
      title: "Older Detail Card",
      createdAt: new Date("2026-07-02T09:00:00.000Z"),
    });
    store.insertOne("cards", {
      _id: new ObjectId("64f200000000000000000903"),
      userId,
      title: "Newer Detail Card",
      createdAt: new Date("2026-07-02T10:00:00.000Z"),
    });
    store.insertOne("activity_events", {
      _id: new ObjectId("64f200000000000000000904"),
      userId: userId.toHexString(),
      event: "card_created",
      metadata: { title: "Older Detail Card" },
      createdAt: new Date("2026-07-02T10:30:00.000Z"),
    });
    store.insertOne("activity_events", {
      _id: new ObjectId("64f200000000000000000905"),
      email: "detail@example.com",
      event: "login",
      ipAddress: "127.0.0.1",
      createdAt: new Date("2026-07-02T11:00:00.000Z"),
    });
    store.insertOne("activity_events", {
      _id: new ObjectId("64f200000000000000000906"),
      userId: "someone-else",
      event: "ignored",
      createdAt: new Date("2026-07-02T12:00:00.000Z"),
    });

    const detail = await getAdminUserDetail(userId.toHexString());

    expect(detail?.user.email).toBe("detail@example.com");
    expect(detail?.user).not.toHaveProperty("password");
    expect(detail?.cards.map((card) => card.title)).toEqual([
      "Newer Detail Card",
      "Older Detail Card",
    ]);
    expect(detail?.activityEvents.map((event) => event.event)).toEqual([
      "login",
      "card_created",
    ]);
    expect(detail?.activityEvents[0]?.ipAddress).toBe("127.0.0.1");
  });

  test("extends admin trials and marks subscription cancellation through SQLite", async () => {
    const { store } = createFixture();
    const userId = new ObjectId("64f200000000000000000907");

    store.insertOne("users", {
      _id: userId,
      email: "billing-admin@example.com",
      name: "Billing User",
      planType: "PREMIUM",
      subscriptionStatus: "active",
      stripeSubscriptionId: "sub_admin",
      trialEndsAt: new Date("2026-07-10T00:00:00.000Z"),
      cancelAtPeriodEnd: false,
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    });

    const extension = await extendAdminUserTrialById(
      userId.toHexString(),
      new Date("2026-07-02T00:00:00.000Z")
    );
    expect(extension?.newTrialEnd.toISOString()).toBe("2026-07-17T00:00:00.000Z");

    const extended = store.findOne<{
      subscriptionStatus?: string;
      trialEndsAt?: Date;
    }>("users", { _id: userId });
    expect(extended?.subscriptionStatus).toBe("trialing");
    expect(extended?.trialEndsAt?.toISOString()).toBe("2026-07-17T00:00:00.000Z");

    const cancellationUser = await markAdminUserCancelAtPeriodEndById(userId.toHexString());
    expect(cancellationUser?.stripeSubscriptionId).toBe("sub_admin");

    const canceled = store.findOne<{ cancelAtPeriodEnd?: boolean }>("users", { _id: userId });
    expect(canceled?.cancelAtPeriodEnd).toBe(true);
  });

  test("manages admin support ticket list, status, and replies through SQLite", async () => {
    const { store } = createFixture();
    const olderTicketId = new ObjectId("64f200000000000000000a01");
    const newerTicketId = new ObjectId("64f200000000000000000a02");

    store.insertOne("support_tickets", {
      _id: olderTicketId,
      email: "Older User <older@example.com>",
      subject: "Older issue",
      preview: "Older preview",
      status: "open",
      receivedAt: new Date("2026-07-02T08:00:00.000Z"),
      updatedAt: new Date("2026-07-02T08:00:00.000Z"),
    });
    store.insertOne("support_tickets", {
      _id: newerTicketId,
      email: "newer@example.com",
      subject: "Newer issue",
      messageId: "message-newer",
      status: "open",
      receivedAt: new Date("2026-07-02T10:00:00.000Z"),
      updatedAt: new Date("2026-07-02T10:00:00.000Z"),
    });

    const tickets = await getRecentSupportTickets(10);
    expect(tickets.map((ticket) => ticket.subject)).toEqual([
      "Newer issue",
      "Older issue",
    ]);

    expect(await updateSupportTicketStatus(newerTicketId.toHexString(), "resolved")).toBe(true);
    const resolved = await getSupportTicketById(newerTicketId.toHexString());
    expect(resolved?.status).toBe("resolved");

    expect(await appendSupportTicketReply(newerTicketId.toHexString(), {
      from: "admin@example.com",
      message: "Thanks, we fixed this.",
      sentAt: new Date("2026-07-02T11:00:00.000Z"),
    })).toBe(true);
    const replied = await getSupportTicketById(newerTicketId.toHexString());
    expect(replied?.replies?.[0]).toMatchObject({
      from: "admin@example.com",
      message: "Thanks, we fixed this.",
    });
    expect(replied?.replies?.[0]?.sentAt?.toISOString()).toBe("2026-07-02T11:00:00.000Z");
  });

  test("updates image paths and detects public-card image references through SQLite", async () => {
    const { store } = createFixture();
    const imageId = new ObjectId("64f200000000000000000b01");
    const ownerId = new ObjectId("64f200000000000000000b02");

    store.insertOne("images", {
      _id: imageId,
      userId: ownerId.toHexString(),
      filename: "test.webp",
      mimeType: "image/webp",
      size: 100,
      width: 50,
      height: 50,
      storagePath: "",
      thumbnailPath: "",
      isSystem: false,
      createdAt: new Date("2026-07-02T12:00:00.000Z"),
    });
    store.insertOne("cards", {
      _id: new ObjectId("64f200000000000000000b03"),
      userId: ownerId,
      isPublic: true,
      title: "Public image card",
      cells: [
        `__IMG__:${JSON.stringify({ imageId: imageId.toHexString(), imageUrl: `/api/images/${imageId.toHexString()}` })}`,
      ],
      createdAt: new Date("2026-07-02T12:30:00.000Z"),
    });
    store.insertOne("cards", {
      _id: new ObjectId("64f200000000000000000b04"),
      userId: ownerId.toHexString(),
      isPublic: false,
      title: "Private image card",
      cells: [
        `__IMG__:${JSON.stringify({ imageId: "private-image", imageUrl: "/api/images/private-image" })}`,
      ],
      createdAt: new Date("2026-07-02T12:31:00.000Z"),
    });

    expect(await updateImagePaths(imageId.toHexString(), {
      storagePath: "/tmp/main.webp",
      thumbnailPath: "/tmp/thumb.webp",
    })).toBe(true);
    const image = store.findOne<{ storagePath?: string; thumbnailPath?: string }>(
      "images",
      { _id: imageId }
    );
    expect(image?.storagePath).toBe("/tmp/main.webp");
    expect(image?.thumbnailPath).toBe("/tmp/thumb.webp");
    expect(await isImageReferencedByPublicCard(imageId.toHexString(), ownerId.toHexString())).toBe(true);
    expect(await isImageReferencedByPublicCard("private-image", ownerId.toHexString())).toBe(false);
  });

  test("fetches shared cards and legacy public cards with SQLite view increments", async () => {
    const { store } = createFixture();
    const cardId = new ObjectId("64f200000000000000000c01");
    const legacyId = new ObjectId("64f200000000000000000c02");

    store.insertOne("cards", {
      _id: cardId,
      userId: "owner-share",
      title: "Public card",
      shareLink: "public-share",
      isPublic: true,
      cells: ["A", "B", "C"],
      size: 3,
      views: 4,
      createdAt: new Date("2026-07-02T22:00:00.000Z"),
      updatedAt: new Date("2026-07-02T22:00:00.000Z"),
    });
    store.insertOne("bingocards", {
      _id: legacyId,
      userId: "legacy-owner",
      title: "Legacy share",
      shareId: "legacy-share",
      cells: [{ text: "One" }, "Two"],
      size: "bad",
      isPublic: true,
      views: 2,
    });

    const publicShare = await getSharedCardForShareLink("public-share");
    expect(publicShare?.collectionName).toBe("cards");
    await incrementSharedCardViews(publicShare!);
    expect(store.findOne<{ views?: number }>("cards", { _id: cardId })?.views).toBe(5);

    const legacyShare = await getSharedCardForShareLink("legacy-share");
    expect(legacyShare?.collectionName).toBe("bingocards");
    expect(legacyShare?.card.cells).toEqual(["One", "Two"]);
    expect(legacyShare?.card.size).toBe(5);
    await incrementSharedCardViews(legacyShare!);
    expect(store.findOne<{ views?: number }>("bingocards", { _id: legacyId })?.views).toBe(3);
  });

  test("creates and reads active guest share-link users through SQLite", async () => {
    const { store } = createFixture();
    const userId = new ObjectId("64f200000000000000000d01");
    const expiresAt = new Date("2026-07-02T23:00:00.000Z");

    await createGuestShareLinkUser({
      _id: userId,
      email: "guest-share@example.com",
      guestClaimToken: "guest-token",
      guestClaimTokenExpiresAt: expiresAt,
      now: new Date("2026-07-02T22:00:00.000Z"),
    });

    const active = await getActiveGuestClaimUser(
      userId.toHexString(),
      new Date("2026-07-02T22:30:00.000Z")
    );
    const expired = await getActiveGuestClaimUser(
      userId.toHexString(),
      new Date("2026-07-03T00:00:00.000Z")
    );

    expect(active).toMatchObject({
      email: "guest-share@example.com",
      customerType: "guest",
      signupMethod: "share_link",
      guestClaimToken: "guest-token",
    });
    expect(active?.guestClaimTokenExpiresAt?.toISOString()).toBe(expiresAt.toISOString());
    expect(expired).toBeNull();
    expect(store.findOne<{ name?: string }>("users", { _id: userId })?.name).toBe("Guest Player");
  });
});
