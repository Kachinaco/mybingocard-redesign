"use client";

export default function CardUsageBadge({ cardsCreated, cardsLimit, planType }: { cardsCreated: number; cardsLimit: number; planType: string }) {
  if (planType !== "FREE" || cardsLimit === -1) return null;

  const remaining = Math.max(0, cardsLimit - cardsCreated);

  if (cardsLimit === 0) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-sm">
        <span className="text-amber-700 font-medium">No saved cards included</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-sm">
      <span className="text-amber-700 font-medium">{cardsCreated} of {cardsLimit} draft saves used</span>
      {remaining === 0 && (
        <span className="text-xs text-red-600 font-semibold">Limit reached</span>
      )}
    </div>
  );
}
