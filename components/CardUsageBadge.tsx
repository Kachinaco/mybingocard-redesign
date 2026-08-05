"use client";

export default function CardUsageBadge({ cardsCreated, cardsLimit, planType }: { cardsCreated: number; cardsLimit: number; planType: string }) {
  if (planType !== "FREE" || cardsLimit === -1) return null;

  const remaining = Math.max(0, cardsLimit - cardsCreated);

  if (cardsLimit === 0) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#ffb800]/10 border border-[#ffb800] rounded-full text-sm">
        <span className="text-[#ffb800] font-medium">No saved cards included</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#ffb800]/10 border border-[#ffb800] rounded-full text-sm">
      <span className="text-[#ffb800] font-medium">{cardsCreated} of {cardsLimit} saved cards used</span>
      {remaining === 0 && (
        <span className="text-xs text-[#ff5d8f] font-semibold">Limit reached</span>
      )}
    </div>
  );
}
