export type ShareEmailPackSize = 10 | 30 | 100 | 250 | 500;

export const SHARE_EMAIL_PACKS: Record<
  ShareEmailPackSize,
  {
    size: ShareEmailPackSize;
    amount: number;
    currency: "usd";
    label: string;
  }
> = {
  10: { size: 10, amount: 199, currency: "usd", label: "$1.99" },
  30: { size: 30, amount: 499, currency: "usd", label: "$4.99" },
  100: { size: 100, amount: 999, currency: "usd", label: "$9.99" },
  250: { size: 250, amount: 1999, currency: "usd", label: "$19.99" },
  500: { size: 500, amount: 2999, currency: "usd", label: "$29.99" },
};

export function getShareEmailPack(recipientCount: number) {
  if (recipientCount <= 10) return SHARE_EMAIL_PACKS[10];
  if (recipientCount <= 30) return SHARE_EMAIL_PACKS[30];
  if (recipientCount <= 100) return SHARE_EMAIL_PACKS[100];
  if (recipientCount <= 250) return SHARE_EMAIL_PACKS[250];
  if (recipientCount <= 500) return SHARE_EMAIL_PACKS[500];
  return null;
}

export function formatShareEmailPackPrice(recipientCount: number): string {
  return getShareEmailPack(recipientCount)?.label || "";
}
