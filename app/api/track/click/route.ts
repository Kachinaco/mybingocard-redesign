import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("e");
  const campaign = searchParams.get("c");
  const url = searchParams.get("u");
  const linkId = searchParams.get("l");

  if (!url) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (email && campaign) {
    try {
      const client = await clientPromise;
      const db = client.db("mybingocard");
      await db.collection("drip_clicks").updateOne(
        { email: decodeURIComponent(email), campaignId: campaign, url: decodeURIComponent(url) },
        {
          $set: { lastClickedAt: new Date() },
          $inc: { clickCount: 1 },
          $setOnInsert: {
            email: decodeURIComponent(email),
            campaignId: campaign,
            url: decodeURIComponent(url),
            linkId: linkId || null,
            firstClickedAt: new Date(),
          },
        },
        { upsert: true }
      );
    } catch {
      // Don't block redirect on DB errors
    }
  }

  return NextResponse.redirect(decodeURIComponent(url));
}
