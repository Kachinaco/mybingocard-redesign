import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://mybingocard.com").replace(/\/$/, "");
const appOrigin = new URL(appUrl).origin;

function sanitizeReturnPath(path: unknown, fallback: string): string {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }

  try {
    const parsed = new URL(path, appOrigin);
    if (parsed.origin !== appOrigin) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const requestContext = getRequestActivityContext(request);

  if (!session?.user?.email || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { priceId, purchaseType, batchCount, returnPath } = body ?? {};

  await trackActivity({
    event: "embedded_checkout_disabled_free_for_all",
    source: "server",
    userId: session.user.id,
    email: session.user.email,
    pathname: requestContext.pathname,
    domain: requestContext.domain,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: {
      purchaseType: purchaseType || "subscription",
      priceId: priceId || null,
      batchCount: batchCount || null,
    },
  });

  return NextResponse.json({
    free: true,
    redirectUrl: sanitizeReturnPath(returnPath, "/dashboard?success=true&free=1"),
    message: "Checkout is disabled because all MyBingoCard features are free right now.",
  });
}
