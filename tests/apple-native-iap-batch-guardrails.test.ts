import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Apple native IAP batch guardrails", () => {
  const nativeAppleIapRoute = readFileSync(
    resolve(process.cwd(), "app/api/native/iap/apple/transaction/route.ts"),
    "utf8"
  );
  const batchPurchasesSource = readFileSync(resolve(process.cwd(), "lib/db/batchPurchases.ts"), "utf8");
  const verifierSource = readFileSync(resolve(process.cwd(), "lib/apple-app-store-verifier.ts"), "utf8");
  const productSource = readFileSync(resolve(process.cwd(), "lib/apple-iap-products.ts"), "utf8");
  const accountTokenRoute = readFileSync(
    resolve(process.cwd(), "app/api/native/iap/apple/account-token/route.ts"),
    "utf8",
  );
  const notificationRoute = readFileSync(
    resolve(process.cwd(), "app/api/native/iap/apple/notifications/route.ts"),
    "utf8",
  );
  const notificationService = readFileSync(
    resolve(process.cwd(), "lib/apple-iap-notification-service.ts"),
    "utf8",
  );

  test("Apple StoreKit batch products grant paid batch-pack entitlements", () => {
    for (const productId of [
      "com.coryanalla.MyBingoCardApp.batch.30",
      "com.coryanalla.MyBingoCardApp.batch.100",
      "com.coryanalla.MyBingoCardApp.batch.250",
      "com.coryanalla.MyBingoCardApp.batch.500",
    ]) {
      expect(productSource).toContain(productId);
    }

    expect(nativeAppleIapRoute).toContain("upsertBatchPurchaseFromAppleTransaction");
    expect(nativeAppleIapRoute).toContain("upsertAppleIapTransaction");
    expect(nativeAppleIapRoute).toContain("applyApplePremiumEntitlement");
    expect(nativeAppleIapRoute).toContain('purchaseType: "batch_pack"');
    expect(nativeAppleIapRoute).toContain("batchPurchaseId");
    expect(nativeAppleIapRoute).not.toContain("Apple product is not a MyBingoCard Premium product");
    expect(nativeAppleIapRoute).not.toContain(".collection(");
  });

  test("Apple batch purchases are idempotent by transaction ID", () => {
    expect(batchPurchasesSource).toContain("upsertBatchPurchaseFromAppleTransaction");
    expect(batchPurchasesSource).toContain("{ appleTransactionId: data.appleTransactionId }");
    expect(batchPurchasesSource).toContain('purchaseProvider: "apple"');
    expect(batchPurchasesSource).toContain("stripeSessionId: `apple:${data.appleTransactionId}`");
  });

  test("Apple transactions enforce account ownership and revocation before grants", () => {
    expect(nativeAppleIapRoute).toContain("claimAppleIapTransactionOwnership");
    expect(nativeAppleIapRoute).toContain("already linked to another MyBingoCard account");
    expect(nativeAppleIapRoute).toContain("if (revocationDate)");
    expect(nativeAppleIapRoute).toContain("revokeApplePremiumEntitlement");
    expect(nativeAppleIapRoute).toContain("markAppleBatchPurchaseRevoked");
    expect(nativeAppleIapRoute.indexOf("if (revocationDate)")).toBeLessThan(
      nativeAppleIapRoute.indexOf("if (isExpiredSubscription)"),
    );
    expect(nativeAppleIapRoute).toContain("staleTransactionIgnored");
    expect(nativeAppleIapRoute).toContain('status: "expired"');
  });

  test("Apple outcomes follow verified durable entitlement and lineage state", () => {
    expect(nativeAppleIapRoute.indexOf("verifyAndDecodeAppleTransaction"))
      .toBeLessThan(nativeAppleIapRoute.lastIndexOf("enqueueApplePaymentOutcome({"));
    expect(nativeAppleIapRoute.indexOf("upsertAppleIapTransaction({"))
      .toBeLessThan(nativeAppleIapRoute.lastIndexOf("enqueueApplePaymentOutcome({"));
    expect(notificationService.indexOf("recordAppleIapLineageState({"))
      .toBeLessThan(notificationService.indexOf("return {\n    userId,"));
    expect(notificationRoute.indexOf("applyVerifiedAppleNotification(notification)"))
      .toBeLessThan(notificationRoute.indexOf("enqueueApplePaymentOutcome({"));
    expect(notificationRoute.indexOf("enqueueApplePaymentOutcome({"))
      .toBeLessThan(notificationRoute.indexOf("finishAppleIapNotification({"));
    expect(notificationRoute).toContain('result.state === "paid"');
    expect(notificationRoute).toContain('result.state === "active"');
    expect(notificationRoute).toContain('result.state === "lifetime"');
    expect(notificationRoute).not.toContain('result.state === "trialing"');
    expect(notificationRoute).not.toContain('result.state === "refund_reversed"');
  });

  test("Apple signatures are anchored to bundled Apple roots by the official verifier", () => {
    expect(verifierSource).toContain("SignedDataVerifier");
    expect(verifierSource).toContain("APPLE_ROOT_CERTIFICATES");
    expect(verifierSource).toContain("verifyAndDecodeTransaction");
    expect(nativeAppleIapRoute).not.toContain("X509Certificate");
    expect(nativeAppleIapRoute).not.toContain("createVerify");
  });

  test("new StoreKit purchases bind to a stable authenticated account token", () => {
    expect(accountTokenRoute).toContain("getOrCreateAppleAppAccountToken");
    expect(accountTokenRoute).toContain("session.user.id");
    expect(nativeAppleIapRoute).toContain("transaction.appAccountToken");
    expect(nativeAppleIapRoute).toContain("expectedAppAccountToken");
  });
});
