import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { trackActivity, getRequestActivityContext } from "@/lib/activity";

/**
 * Extract the unsubscribe email from any of the supported request shapes:
 *   - JSON body  { "email": "..." }            (existing /unsubscribe page flow)
 *   - Query string ?email=...                  (Gmail/Apple Mail one-click)
 *   - Form-encoded body email=...              (RFC 8058 fallback)
 *
 * RFC 8058 one-click flow: mail clients POST `List-Unsubscribe=One-Click`
 * (form-encoded) to the URL listed in the List-Unsubscribe header. That URL
 * carries the recipient address in its query string, NOT in the body.
 */
async function extractEmail(req: NextRequest): Promise<string | null> {
  const queryEmail = req.nextUrl.searchParams.get("email");
  if (queryEmail) return queryEmail;

  const contentType = req.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (body && typeof body.email === "string") return body.email;
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      const formEmail = params.get("email");
      if (formEmail) return formEmail;
    }
  } catch {
    // fall through
  }
  return null;
}

async function applyUnsubscribe(req: NextRequest, rawEmail: string): Promise<NextResponse> {
  const email = rawEmail.toLowerCase().trim();
  const client = await clientPromise;
  const db = client.db("mybingocard");

  await db.collection("email_preferences").updateOne(
    { email },
    {
      $set: {
        email,
        unsubscribedAt: new Date(),
        marketingEmails: false,
      },
    },
    { upsert: true }
  );

  const reqCtx = getRequestActivityContext(req as unknown as Request);
  trackActivity({
    event: "email_unsubscribed",
    source: "server",
    userId: null,
    email,
    pathname: "/api/unsubscribe",
    domain: reqCtx.domain,
    ipAddress: reqCtx.ipAddress,
    userAgent: reqCtx.userAgent,
    metadata: {
      email,
      type: "marketing",
      source: req.method === "POST" && req.nextUrl.searchParams.get("email") ? "one_click" : "page",
    },
  }).catch(() => {});

  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  try {
    const email = await extractEmail(req);
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    return applyUnsubscribe(req, email);
  } catch (err) {
    console.error("Unsubscribe error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
