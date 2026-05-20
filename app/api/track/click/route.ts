import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const ALLOWED_DOMAINS = [
  "mybingocard.com",
  "www.mybingocard.com",
];
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://mybingocard.com").replace(/\/$/, "");
const FALLBACK_URL = `${APP_URL}/`;

function isAllowedRedirect(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return ALLOWED_DOMAINS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("e");
  const campaign = searchParams.get("c");
  const url = searchParams.get("u");
  const linkId = searchParams.get("l");
  const emailId = searchParams.get("mid");

  if (!url) {
    return NextResponse.redirect(FALLBACK_URL);
  }

  const decodedUrl = decodeURIComponent(url);
  if (!isAllowedRedirect(decodedUrl)) {
    return NextResponse.redirect(FALLBACK_URL);
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

      if (emailId) {
        await db.collection("email_messages").updateOne(
          { emailId },
          {
            $set: {
              email: decodeURIComponent(email),
              campaignId: campaign,
              status: "clicked",
              lastClickedAt: new Date(),
              updatedAt: new Date(),
              lastClickedUrl: decodeURIComponent(url),
              lastClickedLinkId: linkId || null,
            },
            $inc: { clickCount: 1 },
            $setOnInsert: {
              emailId,
              createdAt: new Date(),
            },
            $min: { firstClickedAt: new Date() },
          },
          { upsert: true }
        );
      }
    } catch {
      // Don't block redirect on DB errors
    }
  }

  return NextResponse.redirect(decodedUrl);
}
