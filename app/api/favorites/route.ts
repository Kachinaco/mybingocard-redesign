import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { toggleFavorite, isFavorited, getUserFavorites } from "@/lib/favorites";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";

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
  const requestContext = getRequestActivityContext(req);

  await trackActivity({
    event: "favorite_toggled",
    source: "server",
    userId: session.user.id,
    email: session.user.email || null,
    pathname: requestContext.pathname,
    domain: requestContext.domain,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: {
      cardId,
      favorited: isFav,
    },
  });
  return NextResponse.json({ favorited: isFav });
}
