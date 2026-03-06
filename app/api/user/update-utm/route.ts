import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateUserAttribution } from "@/lib/db/users";

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

  await updateUserAttribution(session.user.id, {
    ...(utm_source && { utm_source }),
    ...(utm_medium && { utm_medium }),
    ...(utm_campaign && { utm_campaign }),
    ...(utm_content && { utm_content }),
    ...(utm_term && { utm_term }),
    ...(referrer && { referrer }),
  });

  return NextResponse.json({ ok: true });
}
