import { NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";

// 1x1 transparent PNG
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQI12P4z8BQDwAEgAF/QualzQAAAABJRU5ErkJggg==",
  "base64"
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("e");
  const campaign = searchParams.get("c");

  if (email && campaign) {
    try {
      const client = await clientPromise;
      const db = client.db("mybingocard");
      await db.collection("drip_opens").updateOne(
        { email: decodeURIComponent(email), campaignId: campaign },
        {
          $set: { lastOpenedAt: new Date() },
          $inc: { openCount: 1 },
          $setOnInsert: {
            email: decodeURIComponent(email),
            campaignId: campaign,
            firstOpenedAt: new Date(),
          },
        },
        { upsert: true }
      );
    } catch (e) {
      // Don't block pixel response on DB errors
    }
  }

  return new Response(PIXEL, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}
