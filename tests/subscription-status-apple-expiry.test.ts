import { describe, expect, test } from "bun:test";
import { hasPremiumAccess } from "@/lib/subscription-status";

describe("Apple subscription access expiry", () => {
  test("fails closed after a verified Apple monthly period ends", () => {
    expect(hasPremiumAccess({
      planType: "PREMIUM",
      subscriptionStatus: "active",
      trialEndsAt: null,
      purchaseProvider: "apple",
      currentPeriodEnd: new Date(Date.now() - 60_000),
    })).toBe(false);
  });

  test("keeps access before period end and for lifetime Apple purchases", () => {
    expect(hasPremiumAccess({
      planType: "PREMIUM",
      subscriptionStatus: "active",
      trialEndsAt: null,
      purchaseProvider: "apple",
      currentPeriodEnd: new Date(Date.now() + 60_000),
    })).toBe(true);
    expect(hasPremiumAccess({
      planType: "PREMIUM",
      subscriptionStatus: "lifetime",
      trialEndsAt: null,
      purchaseProvider: "apple",
      currentPeriodEnd: null,
    })).toBe(true);
  });
});
