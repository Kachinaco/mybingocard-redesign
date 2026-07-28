import type { BatchCount } from "@/lib/batchPacks";

export const APPLE_MONTHLY_PRODUCT_ID = "com.coryanalla.MyBingoCardApp.premium.monthly";
export const APPLE_LIFETIME_PRODUCT_ID = "com.coryanalla.MyBingoCardApp.premium.lifetime";
export const APPLE_BATCH_PRODUCT_IDS: Record<string, BatchCount> = {
  "com.coryanalla.MyBingoCardApp.batch.30": 30,
  "com.coryanalla.MyBingoCardApp.batch.100": 100,
  "com.coryanalla.MyBingoCardApp.batch.250": 250,
  "com.coryanalla.MyBingoCardApp.batch.500": 500,
};

export function isApplePremiumProduct(productId: string): boolean {
  return productId === APPLE_MONTHLY_PRODUCT_ID || productId === APPLE_LIFETIME_PRODUCT_ID;
}
