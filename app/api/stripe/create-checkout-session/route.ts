import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://mybingocard.com").replace(/\/$/, "");

function buildCheckoutUrl(path: string | undefined, fallback: string): string {
  const safePath = path && path.startsWith("/") ? path : fallback;
  return `${appUrl}${safePath}`;
}

export async function POST(request: Request) {
  const session = await auth();
  const requestContext = getRequestActivityContext(request);

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized - Please sign in" },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { successPath, purchaseType, priceId, batchCount } = body ?? {};

  await trackActivity({
    event: "checkout_disabled_free_for_all",
    source: "server",
    userId: session.user.id || null,
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
    url: buildCheckoutUrl(successPath, "/dashboard?success=true&free=1"),
    message: "Checkout is currently disabled. Continue to your dashboard to finish setup.",
  });
}
