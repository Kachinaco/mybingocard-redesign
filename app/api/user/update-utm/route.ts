import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateUserAttribution, updateUserLastAttribution } from "@/lib/db/users";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer } =
    await request.json();

  // Only save if at least one UTM param is present
  const hasUtm = utm_source || utm_medium || utm_campaign || utm_content || utm_term || referrer;
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
}
