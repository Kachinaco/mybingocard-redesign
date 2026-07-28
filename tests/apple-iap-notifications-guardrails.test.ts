import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const routeSource = readFileSync(
  resolve(process.cwd(), "app/api/native/iap/apple/notifications/route.ts"),
  "utf8",
);
const serviceSource = readFileSync(
  resolve(process.cwd(), "lib/apple-iap-notification-service.ts"),
  "utf8",
);

describe("Apple IAP server-notification guardrails", () => {
  test("verifies the outer payload before creating an idempotency receipt", () => {
    expect(routeSource).toContain("verifyAndDecodeAppleNotification");
    expect(routeSource).toContain("beginAppleIapNotification");
    expect(routeSource.indexOf("verifyAndDecodeAppleNotification")).toBeLessThan(
      routeSource.indexOf("beginAppleIapNotification"),
    );
    expect(routeSource).toContain('"pending_owner"');
    expect(routeSource).not.toContain("auth()");
  });

  test("verifies inner transaction and renewal signatures and orders lineage state", () => {
    expect(serviceSource).toContain("verifyAndDecodeAppleTransaction");
    expect(serviceSource).toContain("verifyAndDecodeAppleRenewalInfo");
    expect(serviceSource).toContain("isAppleIapLineageStateStale");
    expect(serviceSource).toContain("recordAppleIapLineageState");
    expect(serviceSource).toContain("getUserByAppleAppAccountToken");
    expect(serviceSource).toContain("findAppleIapTransactionOwner");
    expect(serviceSource).toContain("getUserByAppleTransactionIdentity");
  });

  test("covers active, grace, expired, retry, revoked, and refund-reversal states", () => {
    for (const state of [
      "Status.ACTIVE",
      "Status.BILLING_GRACE_PERIOD",
      "Status.EXPIRED",
      "Status.BILLING_RETRY",
      "Status.REVOKED",
      "NotificationTypeV2.REFUND_REVERSED",
    ]) {
      expect(serviceSource).toContain(state);
    }
  });
});
