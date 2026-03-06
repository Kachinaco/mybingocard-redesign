import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { toggleFavorite, isFavorited, getUserFavorites } from "@/lib/favorites";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cardId = req.nextUrl.searchParams.get("cardId");

  if (cardId) {
    const favorited = await isFavorited(session.user.id, cardId);
    return NextResponse.json({ favorited });
  }

  const favorites = await getUserFavorites(session.user.id);
  return NextResponse.json({ favorites });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cardId } = await req.json();
  if (!cardId) {
    return NextResponse.json({ error: "cardId required" }, { status: 400 });
  }

  const isFav = await toggleFavorite(session.user.id, cardId);
  return NextResponse.json({ favorited: isFav });
}
