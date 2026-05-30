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
  const emailId = searchParams.get("mid");

  if (email && campaign) {
    try {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "";
      const ua = req.headers.get("user-agent") || "";
      const decodedEmail = decodeURIComponent(email);
      const client = await clientPromise;
      const db = client.db("mybingocard");
      const openedAt = new Date();

      const update: Record<string, unknown> = {
        $set: { lastOpenedAt: openedAt, lastHumanOpenAt: openedAt },
        $inc: { openCount: 1, humanOpenCount: 1 },
        $setOnInsert: {
          email: decodedEmail,
          campaignId: campaign,
          firstOpenedAt: openedAt,
          firstHumanOpenAt: openedAt,
        },
      };

      await db.collection("drip_opens").updateOne(
        { email: decodedEmail, campaignId: campaign },
        update,
        { upsert: true }
      );

      if (emailId) {
        await db.collection("email_messages").updateOne(
          { emailId },
          {
            $set: {
              email: decodedEmail,
              campaignId: campaign,
              status: "opened",
              lastOpenedAt: openedAt,
              updatedAt: openedAt,
              lastOpenIp: ip || null,
              lastOpenUserAgent: ua || null,
              lastOpenWasBot: false,
            },
            $inc: { openCount: 1, humanOpenCount: 1 },
            $setOnInsert: {
              emailId,
              createdAt: openedAt,
            },
            $min: {
              firstOpenedAt: openedAt,
              firstHumanOpenAt: openedAt,
            },
          },
          { upsert: true }
        );
      }
    } catch {
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
