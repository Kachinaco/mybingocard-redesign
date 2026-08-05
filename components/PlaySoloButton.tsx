"use client";

import Link from "next/link";

export default function PlaySoloButton({ cardId }: { cardId: string }) {
  return (
    <Link
      href={`/cards/${cardId}`}
      className="w-full flex items-center justify-center gap-2 py-2 bg-[#fff7ed] hover:bg-[#a39a88] text-[#33312e] text-xs font-bold rounded-lg transition-colors"
    >
      ▶ Play Solo
    </Link>
  );
}
