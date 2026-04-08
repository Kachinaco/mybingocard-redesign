import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveGameHistory } from "@/lib/gameHistory";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cardId, cardTitle, shareLink, duration } = body;

    if (!cardId || !cardTitle || typeof duration !== "number") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Use authenticated userId if available, otherwise "anonymous"
    let userId = "anonymous";
    try {
      const session = await auth();
      if (session?.user?.id) userId = session.user.id;
    } catch {}

    const id = await saveGameHistory({
      userId,
      cardId,
      cardName: cardTitle,
      won: true,
      datePlayed: new Date(),
      duration,
      ...(shareLink ? { shareLink } : {}),
    } as any);

    return NextResponse.json({ id });
  } catch (error) {
    console.error("Shared game history POST error:", error);
    return NextResponse.json({ error: "Failed to save game history" }, { status: 500 });
  }
}
