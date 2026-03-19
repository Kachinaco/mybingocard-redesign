export type BatchCount = 30 | 100 | 250 | 500;

export const VALID_BATCH_COUNTS: BatchCount[] = [30, 100, 250, 500];

export const BATCH_PACKS: Record<
  BatchCount,
  {
    count: BatchCount;
    amount: number;
    currency: "usd";
    label: string;
  }
> = {
  30: { count: 30, amount: 0, currency: "usd", label: "Free" },
  100: { count: 100, amount: 999, currency: "usd", label: "$9.99" },
  250: { count: 250, amount: 1999, currency: "usd", label: "$19.99" },
  500: { count: 500, amount: 2999, currency: "usd", label: "$29.99" },
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
