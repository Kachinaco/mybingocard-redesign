"use client";

import Link from "next/link";

export default function PlaySoloButton({ cardId }: { cardId: string }) {
  return (
    <Link
      href={`/cards/${cardId}`}
      className="w-full flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
    >
      ▶ Play Solo
    </Link>
  );
}
