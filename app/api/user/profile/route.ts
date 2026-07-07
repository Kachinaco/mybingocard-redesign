import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserByEmail, updateUser } from "@/lib/db/users";
import { getConnectedAuthProviders } from "@/lib/db/auth-data";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const providers = await getConnectedAuthProviders(user._id);

    return NextResponse.json({
      name: user.name || "",
      email: user.email,
      image: user.image || null,
      hasPassword: !!user.password,
      connectedProviders: providers,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    const requestContext = getRequestActivityContext(request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await request.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (name.trim().length > 100) {
      return NextResponse.json({ error: "Name is too long" }, { status: 400 });
    }

    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await updateUser(user._id.toString(), { name: name.trim() });

    await trackActivity({
      event: "profile_updated",
      source: "server",
      userId: user._id.toString(),
      email: user.email,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        fields: ["name"],
      },
    });

    return NextResponse.json({ success: true, name: name.trim() });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
