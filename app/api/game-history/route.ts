import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveGameHistory, getGameHistory, getGameStats } from "@/lib/gameHistory";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [history, stats] = await Promise.all([
      getGameHistory(session.user.id),
      getGameStats(session.user.id),
    ]);

    return NextResponse.json({ history, stats });
  } catch (error) {
    console.error("Game history GET error:", error);
    return NextResponse.json({ error: "Failed to fetch game history" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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
  } catch (error) {
    console.error("Game history POST error:", error);
    return NextResponse.json({ error: "Failed to save game history" }, { status: 500 });
  }
}
