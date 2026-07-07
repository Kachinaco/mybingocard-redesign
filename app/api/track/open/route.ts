import { NextRequest } from "next/server";
import { recordEmailOpen } from "@/lib/db/email-marketing";

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
      const openedAt = new Date();
      await recordEmailOpen({
        email: decodedEmail,
        campaignId: campaign,
        emailId,
        ip,
        userAgent: ua,
        openedAt,
      });
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
