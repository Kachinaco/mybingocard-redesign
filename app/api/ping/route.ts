import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateUserLastSeenByEmail } from "@/lib/db/users";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    await updateUserLastSeenByEmail(session.user.email);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
