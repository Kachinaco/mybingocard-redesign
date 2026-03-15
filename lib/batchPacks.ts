export type BatchCount = 10 | 25 | 50 | 100;

export const VALID_BATCH_COUNTS: BatchCount[] = [10, 25, 50, 100];

export const BATCH_PACKS: Record<
  BatchCount,
  {
    count: BatchCount;
    amount: number;
    currency: "usd";
    label: string;
  }
> = {
  10: { count: 10, amount: 999, currency: "usd", label: "$9.99" },
  25: { count: 25, amount: 1499, currency: "usd", label: "$14.99" },
  50: { count: 50, amount: 1999, currency: "usd", label: "$19.99" },
  100: { count: 100, amount: 2999, currency: "usd", label: "$29.99" },
};

export function isBatchCount(value: unknown): value is BatchCount {
  return VALID_BATCH_COUNTS.includes(Number(value) as BatchCount);
}

export function getBatchPack(value: unknown) {
  if (!isBatchCount(value)) {
    return null;
  }

  return BATCH_PACKS[value];
}

export function formatBatchPackPrice(value: unknown): string {
  return getBatchPack(value)?.label || "";
}
