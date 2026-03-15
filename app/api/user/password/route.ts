import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserByEmail, updateUserPassword } from "@/lib/db/users";
import bcrypt from "bcryptjs";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";

export async function PUT(request: Request) {
  try {
    const session = await auth();
    const requestContext = getRequestActivityContext(request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If user has a password (credential signup), verify current password
    if (user.password) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Current password is required" },
          { status: 400 }
        );
      }

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 403 }
        );
      }
    }

    // User signed up via Google (no password) — allow setting one
    await updateUserPassword(session.user.email, newPassword);

    await trackActivity({
      event: "password_updated",
      source: "server",
      userId: user._id.toString(),
      email: user.email,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        hadExistingPassword: Boolean(user.password),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
