import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserByEmail } from "@/lib/db/users";
import Stripe from "stripe";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    const requestContext = getRequestActivityContext(request);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    const user = await getUserByEmail(session.user.email);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!user.stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer ID found. Please subscribe first." },
        { status: 400 }
      );
    }

    // Create Stripe billing portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL}/dashboard`,
    });

    await trackActivity({
      event: "billing_portal_opened",
      source: "server",
      userId: session.user.id || null,
      email: session.user.email,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        portalUrl: portalSession.url,
      },
    });

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error) {
    console.error("Billing portal error:", error);
    return NextResponse.json(
      { error: "Failed to create billing portal session" },
      { status: 500 }
    );
  }
}
