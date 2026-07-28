import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOrCreateAppleAppAccountToken } from "@/lib/db/users";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const appAccountToken = await getOrCreateAppleAppAccountToken(session.user.id);
    return NextResponse.json({ appAccountToken });
  } catch (error) {
    console.error("Apple app account token error:", error);
    return NextResponse.json({ error: "Could not prepare Apple purchase" }, { status: 500 });
  }
}
