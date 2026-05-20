import type { Metadata } from "next";
import { Suspense } from "react";
import PlayClient from "./PlayClient";
import { getSharedLinkByLinkId } from "@/lib/db/sharedLinks";
import { getCardById } from "@/lib/db/cards";

interface PageProps {
  params: Promise<{ linkId: string }>;
}

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "https://mybingocard.com"
  ).replace(/\/+$/, "");
}

function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = getBaseUrl();
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { linkId } = await params;

  let cardTitle = "Bingo Card";
  let description = "You've been invited to play a private bingo card on MyBingoCard.";
  let ogImagePath = "/og-default.png";

  // Guard against malformed IDs before touching the database.
  if (/^[a-zA-Z0-9]{6,32}$/.test(linkId)) {
    try {
      const link = await getSharedLinkByLinkId(linkId);
      if (link && link.status !== "refunded") {
        const card = await getCardById(link.cardId);
        if (card) {
          if (card.title?.trim()) cardTitle = card.title.trim();
          if (card.description?.trim()) description = card.description.trim();
          ogImagePath = `/api/cards/${encodeURIComponent(card._id.toString())}/og-image`;
        }
      }
    } catch {
      // Fall back to defaults — metadata should never throw.
    }
  }

  const title = `Play ${cardTitle} - MyBingoCard`;
  const ogImage = absoluteUrl(ogImagePath);

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function PlayLinkPage({ params }: PageProps) {
  const { linkId } = await params;
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-500">Loading your bingo card...</p>
          </div>
        </div>
      }
    >
      <PlayClient linkId={linkId} />
    </Suspense>
  );
}
