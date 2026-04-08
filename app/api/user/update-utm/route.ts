import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateUser, updateUserAttribution, updateUserLastAttribution, getUserById } from "@/lib/db/users";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer, anonymousId } =
      await request.json();

    const hasUtm = utm_source || utm_medium || utm_campaign || utm_content || utm_term || referrer;

    // Stitch anonymousId to user record (only if not already set)
    if (anonymousId && typeof anonymousId === "string") {
      const user = await getUserById(session.user.id);
      if (user && !user.anonymousId) {
        await updateUser(session.user.id, { anonymousId });
      }
    }

    if (!hasUtm) {
      return NextResponse.json({ ok: true });
    }

    const attribution = {
      ...(utm_source && { utm_source }),
      ...(utm_medium && { utm_medium }),
      ...(utm_campaign && { utm_campaign }),
      ...(utm_content && { utm_content }),
      ...(utm_term && { utm_term }),
      ...(referrer && { referrer }),
    };

    await Promise.all([
      updateUserAttribution(session.user.id, attribution),
      updateUserLastAttribution(session.user.id, attribution),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Update UTM error:", error);
    return NextResponse.json({ error: "Failed to update attribution" }, { status: 500 });
  }
}
