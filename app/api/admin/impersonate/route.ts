import { NextResponse } from "next/server";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
import { getUserById } from "@/lib/db/users";
import { notifyAdminImpersonationStarted } from "@/lib/discord";
import {
  IMPERSONATION_COOKIE_NAME,
  createImpersonationCookieValue,
  parseImpersonationCookie,
} from "@/lib/impersonation";
import { getAdminSessionEmail, requireAdmin } from "@/lib/admin";

function getSafeRedirectPath(path: unknown, fallback: string): string {
  return typeof path === "string" && path.startsWith("/") ? path : fallback;
}

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 4,
  };
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin().catch(() => null);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestContext = getRequestActivityContext(request);
    const adminEmail = getAdminSessionEmail(session);

    if (!adminEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const userId =
      typeof body?.userId === "string" ? body.userId.trim() : "";
    const redirectTo = getSafeRedirectPath(body?.redirectTo, "/dashboard");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.email === adminEmail) {
      return NextResponse.json(
        { error: "You are already signed in as this user." },
        { status: 400 }
      );
    }

    const cookieValue = createImpersonationCookieValue({
      adminEmail,
      targetUserId: user._id.toString(),
      targetEmail: user.email,
      targetName: user.name || null,
      startedAt: new Date().toISOString(),
    });

    await trackActivity({
      event: "admin_impersonation_started",
      source: "server",
      userId:
        ((session as typeof session & {
          actor?: { id?: string };
        })?.actor?.id as string | undefined) ||
        session.user?.id ||
        null,
      email: adminEmail,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        targetUserId: user._id.toString(),
        targetEmail: user.email,
        targetName: user.name || null,
      },
    });

    const response = NextResponse.json({
      success: true,
      redirectTo,
      target: {
        id: user._id.toString(),
        email: user.email,
        name: user.name || null,
      },
    });

    response.cookies.set(
      IMPERSONATION_COOKIE_NAME,
      cookieValue,
      getCookieOptions()
    );

    notifyAdminImpersonationStarted(
      adminEmail,
      user.email,
      user.name || null
    ).catch(console.error);

    return response;
  } catch (error) {
    console.error("Admin impersonation start error:", error);
    return NextResponse.json(
      { error: "Failed to start impersonation" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAdmin().catch(() => null);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestContext = getRequestActivityContext(request);
    const adminEmail = getAdminSessionEmail(session);
    const cookieHeader = request.headers.get("cookie");
    const cookieValue = cookieHeader
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${IMPERSONATION_COOKIE_NAME}=`))
      ?.slice(IMPERSONATION_COOKIE_NAME.length + 1);
    const impersonation = parseImpersonationCookie(cookieValue);

    await trackActivity({
      event: "admin_impersonation_stopped",
      source: "server",
      userId:
        ((session as typeof session & {
          actor?: { id?: string };
        })?.actor?.id as string | undefined) ||
        session.user?.id ||
        null,
      email: adminEmail,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        targetUserId: impersonation?.targetUserId || null,
        targetEmail: impersonation?.targetEmail || null,
      },
    });

    const response = NextResponse.json({
      success: true,
      redirectTo: impersonation?.targetUserId
        ? `/admin/users/${impersonation.targetUserId}`
        : "/admin/users",
    });
    response.cookies.set(IMPERSONATION_COOKIE_NAME, "", {
      ...getCookieOptions(),
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error("Admin impersonation stop error:", error);
    return NextResponse.json(
      { error: "Failed to stop impersonation" },
      { status: 500 }
    );
  }
}
