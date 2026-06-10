import { NextResponse } from "next/server";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";
import { getUserByEmail } from "@/lib/db/users";
import {
  createSubscription,
  getSubscriptionByUserId,
  PLAN_LIMITS,
  updateSubscription,
} from "@/lib/db/subscriptions";
import { getBatchPack, isBatchCount, type BatchCount } from "@/lib/batchPacks";
import { upsertBatchPurchaseFromAppleTransaction } from "@/lib/db/batchPurchases";
import { createVerify, X509Certificate } from "node:crypto";

export const runtime = "nodejs";

const APPLE_BUNDLE_ID = "com.coryanalla.MyBingoCardApp";
const APPLE_MONTHLY_PRODUCT_ID = "com.coryanalla.MyBingoCardApp.premium.monthly";
const APPLE_LIFETIME_PRODUCT_ID = "com.coryanalla.MyBingoCardApp.premium.lifetime";
const APPLE_BATCH_PRODUCT_IDS: Record<string, BatchCount> = {
  "com.coryanalla.MyBingoCardApp.batch.30": 30,
  "com.coryanalla.MyBingoCardApp.batch.100": 100,
  "com.coryanalla.MyBingoCardApp.batch.250": 250,
  "com.coryanalla.MyBingoCardApp.batch.500": 500,
};

type AppleTransactionPayload = {
  bundleId?: string;
  productId?: string;
  transactionId?: string;
  originalTransactionId?: string;
  purchaseDate?: number;
  expiresDate?: number;
  offerType?: number;
  environment?: string;
  type?: string;
};

function base64UrlDecode(value: string): Buffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="), "base64");
}

function readJsonPart<T>(value: string): T {
  return JSON.parse(base64UrlDecode(value).toString("utf8")) as T;
}

function encodeDerLength(length: number): Buffer {
  if (length < 128) return Buffer.from([length]);
  const bytes: number[] = [];
  let next = length;
  while (next > 0) {
    bytes.unshift(next & 0xff);
    next >>= 8;
  }
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}

function encodeDerInteger(bytes: Buffer): Buffer {
  let value = bytes;
  while (value.length > 1 && value[0] === 0 && (value[1]! & 0x80) === 0) {
    value = value.subarray(1);
  }
  if ((value[0]! & 0x80) !== 0) {
    value = Buffer.concat([Buffer.from([0]), value]);
  }
  return Buffer.concat([Buffer.from([0x02]), encodeDerLength(value.length), value]);
}

function rawEcdsaSignatureToDer(signature: Buffer): Buffer {
  if (signature.length !== 64) {
    throw new Error("Unexpected Apple transaction signature length.");
  }

  const r = encodeDerInteger(signature.subarray(0, 32));
  const s = encodeDerInteger(signature.subarray(32));
  const body = Buffer.concat([r, s]);
  return Buffer.concat([Buffer.from([0x30]), encodeDerLength(body.length), body]);
}

function verifyAndDecodeAppleTransaction(jws: string): AppleTransactionPayload {
  const parts = jws.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid Apple transaction token.");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts as [string, string, string];
  const header = readJsonPart<{ alg?: string; x5c?: string[] }>(encodedHeader);
  if (header.alg !== "ES256" || !Array.isArray(header.x5c) || !header.x5c[0]) {
    throw new Error("Apple transaction token is missing signing certificate.");
  }

  const cert = new X509Certificate(Buffer.from(header.x5c[0], "base64"));
  const verifier = createVerify("SHA256");
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();

  const signature = rawEcdsaSignatureToDer(base64UrlDecode(encodedSignature));
  if (!verifier.verify(cert.publicKey, signature)) {
    throw new Error("Apple transaction signature verification failed.");
  }

  return readJsonPart<AppleTransactionPayload>(encodedPayload);
}

function dateFromMs(value?: number): Date | null {
  if (!Number.isFinite(value)) return null;
  return new Date(Number(value));
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const signedTransactionInfo =
      typeof body?.signedTransactionInfo === "string" ? body.signedTransactionInfo : "";
    if (!signedTransactionInfo) {
      return NextResponse.json({ error: "signedTransactionInfo is required" }, { status: 400 });
    }

    const transaction = verifyAndDecodeAppleTransaction(signedTransactionInfo);
    if (transaction.bundleId !== APPLE_BUNDLE_ID) {
      return NextResponse.json({ error: "Apple transaction bundle does not match this app" }, { status: 400 });
    }

    const productId = transaction.productId || "";
    const batchCount = APPLE_BATCH_PRODUCT_IDS[productId];
    const isPremiumProduct = productId === APPLE_MONTHLY_PRODUCT_ID || productId === APPLE_LIFETIME_PRODUCT_ID;
    if (!isPremiumProduct && !isBatchCount(batchCount)) {
      return NextResponse.json({ error: "Apple product is not a MyBingoCard product" }, { status: 400 });
    }

    const now = new Date();
    const purchaseDate = dateFromMs(transaction.purchaseDate) || now;
    const expiresDate = dateFromMs(transaction.expiresDate);
    const isLifetime = productId === APPLE_LIFETIME_PRODUCT_ID;
    const isExpiredSubscription = !isLifetime && expiresDate !== null && expiresDate.getTime() <= now.getTime();
    if (isExpiredSubscription) {
      return NextResponse.json({ error: "Apple subscription transaction is expired" }, { status: 402 });
    }

    const subscriptionStatus = isLifetime
      ? "lifetime"
      : transaction.offerType === 1
        ? "trialing"
        : "active";

    const user = await getUserByEmail(session.user.email);
    if (!user?._id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const client = await clientPromise;
    const db = client.db("mybingocard");

    if (isBatchCount(batchCount)) {
      if (!transaction.transactionId) {
        return NextResponse.json({ error: "Apple batch transaction is missing transactionId" }, { status: 400 });
      }

      const batchPack = getBatchPack(batchCount);
      if (!batchPack) {
        return NextResponse.json({ error: "Apple batch product is not configured" }, { status: 400 });
      }

      const batchPurchase = await upsertBatchPurchaseFromAppleTransaction({
        userId: user._id.toString(),
        email: session.user.email,
        batchCount,
        amount: batchPack.amount,
        currency: batchPack.currency,
        appleTransactionId: transaction.transactionId,
        appleOriginalTransactionId: transaction.originalTransactionId || transaction.transactionId,
        appleProductId: productId,
        appleEnvironment: transaction.environment || null,
      });

      await db.collection("apple_iap_transactions").updateOne(
        { transactionId: transaction.transactionId },
        {
          $set: {
            userId: user._id.toString(),
            email: session.user.email,
            productId,
            purchaseType: "batch_pack",
            batchCount,
            batchPurchaseId: batchPurchase?._id?.toString?.() || null,
            originalTransactionId: transaction.originalTransactionId || null,
            environment: transaction.environment || null,
            purchaseDate,
            expiresDate: null,
            status: "paid",
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        { upsert: true }
      );

      return NextResponse.json({
        success: true,
        purchaseType: "batch_pack",
        productId,
        batchCount,
        batchPurchaseId: batchPurchase?._id?.toString?.() || null,
      });
    }

    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          planType: "PREMIUM",
          subscriptionStatus,
          currentPeriodStart: purchaseDate,
          currentPeriodEnd: isLifetime ? null : expiresDate,
          trialEndsAt: subscriptionStatus === "trialing" ? expiresDate : null,
          cancelAtPeriodEnd: false,
          purchaseProvider: "apple",
          appleProductId: productId,
          appleTransactionId: transaction.transactionId || null,
          appleOriginalTransactionId: transaction.originalTransactionId || transaction.transactionId || null,
          appleEnvironment: transaction.environment || null,
          updatedAt: now,
        },
      }
    );

    const existingSubscription = await getSubscriptionByUserId(user._id.toString());
    const subscriptionUpdate = {
      plan: "unlimited" as const,
      status: subscriptionStatus === "trialing" ? "trialing" as const : "active" as const,
      stripeCustomerId: undefined,
      stripeSubscriptionId: undefined,
      stripePriceId: undefined,
      limits: PLAN_LIMITS.unlimited,
      currentPeriodStart: purchaseDate,
      currentPeriodEnd: isLifetime ? undefined : expiresDate || undefined,
      cancelAtPeriodEnd: false,
    };

    if (existingSubscription) {
      await updateSubscription(user._id.toString(), subscriptionUpdate);
    } else {
      await createSubscription({
        userId: user._id.toString(),
        plan: "unlimited",
      });
      await updateSubscription(user._id.toString(), subscriptionUpdate);
    }

    await db.collection("apple_iap_transactions").updateOne(
      { transactionId: transaction.transactionId || signedTransactionInfo },
      {
        $set: {
          userId: user._id.toString(),
          email: session.user.email,
          productId,
          purchaseType: "premium",
          originalTransactionId: transaction.originalTransactionId || null,
          environment: transaction.environment || null,
          purchaseDate,
          expiresDate,
          status: subscriptionStatus,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      planType: "PREMIUM",
      subscriptionStatus,
      productId,
      currentPeriodEnd: isLifetime ? null : expiresDate,
    });
  } catch (error) {
    console.error("Apple IAP transaction error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify Apple purchase" },
      { status: 500 }
    );
  }
}
