import { NextResponse } from "next/server";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";
import { sendDiscordNotification } from "@/lib/discord";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ show: false });
    }

    const client = await clientPromise;
    const db = client.db("mybingocard");

    const user = await db
      .collection("users")
      .findOne({ email: session.user.email });
    if (!user || user.npsShownAt) {
      return NextResponse.json({ show: false });
    }

    const cardCount = await db
      .collection("cards")
      .countDocuments({ userId: user._id.toString() });

    return NextResponse.json({ show: cardCount >= 2 });
  } catch (error) {
    console.error("NPS GET error:", error);
    return NextResponse.json({ show: false });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { score, comment } = await request.json();

    const client = await clientPromise;
    const db = client.db("mybingocard");

    await db.collection("nps_responses").insertOne({
      userId: session.user.id,
      email: session.user.email,
      score: Number(score),
      comment: comment || "",
      createdAt: new Date(),
    });

    // Mark as shown so the widget doesn't appear again
    await db.collection("users").updateOne(
      { email: session.user.email },
      { $set: { npsShownAt: new Date() } }
    );

    // Send to Discord
    const emoji =
      score >= 9 ? "\u{1F389}" : score >= 7 ? "\u{1F60A}" : score >= 5 ? "\u{1F610}" : "\u{1F61F}";
    sendDiscordNotification("", [
      {
        title: `${emoji} NPS Response: ${score}/10`,
        color:
          score >= 9
            ? 0x22c55e
            : score >= 7
              ? 0x3b82f6
              : score >= 5
                ? 0xf59e0b
                : 0xef4444,
        fields: [
          { name: "User", value: session.user.email, inline: true },
          { name: "Score", value: `${score}/10`, inline: true },
          ...(comment
            ? [
                {
                  name: "Comment",
                  value: comment.substring(0, 500),
                  inline: false,
                },
              ]
            : []),
        ],
        timestamp: new Date().toISOString(),
      },
    ]).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("NPS POST error:", error);
    return NextResponse.json({ error: "Failed to submit NPS response" }, { status: 500 });
  }
}
