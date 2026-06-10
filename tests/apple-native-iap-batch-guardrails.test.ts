import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Apple native IAP batch guardrails", () => {
  const nativeAppleIapRoute = readFileSync(
    resolve(process.cwd(), "app/api/native/iap/apple/transaction/route.ts"),
    "utf8"
  );
  const batchPurchasesSource = readFileSync(resolve(process.cwd(), "lib/db/batchPurchases.ts"), "utf8");

  test("Apple StoreKit batch products grant paid batch-pack entitlements", () => {
    for (const productId of [
      "com.coryanalla.MyBingoCardApp.batch.30",
      "com.coryanalla.MyBingoCardApp.batch.100",
      "com.coryanalla.MyBingoCardApp.batch.250",
      "com.coryanalla.MyBingoCardApp.batch.500",
    ]) {
      expect(nativeAppleIapRoute).toContain(productId);
    }

    expect(nativeAppleIapRoute).toContain("upsertBatchPurchaseFromAppleTransaction");
    expect(nativeAppleIapRoute).toContain('purchaseType: "batch_pack"');
    expect(nativeAppleIapRoute).toContain("batchPurchaseId");
    expect(nativeAppleIapRoute).not.toContain("Apple product is not a MyBingoCard Premium product");
  });

  test("Apple batch purchases are idempotent by transaction ID", () => {
    expect(batchPurchasesSource).toContain("upsertBatchPurchaseFromAppleTransaction");
    expect(batchPurchasesSource).toContain("{ appleTransactionId: data.appleTransactionId }");
    expect(batchPurchasesSource).toContain('purchaseProvider: "apple"');
    expect(batchPurchasesSource).toContain("stripeSessionId: `apple:${data.appleTransactionId}`");
  });
});
