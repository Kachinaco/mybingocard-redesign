import { NextRequest, NextResponse } from "next/server";
import { recordEmailClick } from "@/lib/db/email-marketing";

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
      await recordEmailClick({
        email: decodeURIComponent(email),
        campaignId: campaign,
        url: decodedUrl,
        linkId,
        emailId,
      });
    } catch {
      // Don't block redirect on DB errors
    }
  }

  return NextResponse.redirect(decodedUrl);
}
