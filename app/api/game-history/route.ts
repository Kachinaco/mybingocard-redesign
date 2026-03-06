import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveGameHistory, getGameHistory, getGameStats } from "@/lib/gameHistory";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [history, stats] = await Promise.all([
    getGameHistory(session.user.id),
    getGameStats(session.user.id),
  ]);

  return NextResponse.json({ history, stats });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { cardId, cardName, won, duration } = body;

  if (!cardId || !cardName || typeof won !== "boolean" || typeof duration !== "number") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const id = await saveGameHistory({
    userId: session.user.id,
    cardId,
    cardName,
    won,
    datePlayed: new Date(),
    duration,
  });

  return NextResponse.json({ id });
}
