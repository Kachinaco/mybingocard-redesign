import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("first-card milestone guardrails", () => {
  const cardsRouteSource = readSource("app/api/cards/route.ts");
  const usersSource = readSource("lib/db/users.ts");
  const subscriptionsSource = readSource("lib/db/subscriptions.ts");

  test("first-card Discord alert is lifetime-gated instead of active-card-count gated", () => {
    expect(cardsRouteSource).toContain("hasPriorCardCreationActivity");
    expect(cardsRouteSource).toContain("claimFirstCardMilestone");
    expect(cardsRouteSource).toContain("shouldTrackFirstCard");
    expect(cardsRouteSource).toContain("existingCardCount === 0");
    expect(cardsRouteSource).toContain("lifetimeCardCount === 0");
    expect(cardsRouteSource).toContain("!user?.firstCardCreatedAt");
    expect(cardsRouteSource).toContain("!hadPriorCardActivity");
    expect(cardsRouteSource).toContain("claimedFirstCard");
    expect(cardsRouteSource).not.toContain("if (cardCount === 1)");
  });

  test("users keep a durable first-card milestone claim", () => {
    expect(usersSource).toContain("firstCardCreatedAt?: Date");
    expect(usersSource).toContain("export async function claimFirstCardMilestone");
    expect(usersSource).toContain("firstCardCreatedAt: { $exists: false }");
    expect(usersSource).toContain("return result.modifiedCount === 1");
  });

  test("prior card history includes single-card, first-card, and batch creation events", () => {
    expect(usersSource).toContain("export async function hasPriorCardCreationActivity");
    expect(usersSource).toContain('"first_card_created"');
    expect(usersSource).toContain('"card_created"');
    expect(usersSource).toContain('"batch_cards_created"');
    expect(usersSource).toContain("activity_events");
  });

  test("card counting handles legacy ObjectId and current string user IDs", () => {
    expect(subscriptionsSource).toContain("let objectId: ObjectId | null = null");
    expect(subscriptionsSource).toContain("$or: [{ userId }, { userId: objectId }]");
    expect(subscriptionsSource).not.toContain("userId: userId");
  });
});
