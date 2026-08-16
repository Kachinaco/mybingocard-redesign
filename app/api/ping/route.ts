import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateUserLastSeenByEmail } from "@/lib/db/users";
import { withTelemetryTimeout } from "@/lib/telemetry-timeout";

const PING_TIMEOUT_MS = 2500;

export async function POST() {
  try {
    const sessionResult = await withTelemetryTimeout(auth(), PING_TIMEOUT_MS);
    if (sessionResult.timedOut) {
      return NextResponse.json({ ok: true, updated: false }, { status: 202 });
    }

    const session = sessionResult.value;
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const updateResult = await withTelemetryTimeout(
      updateUserLastSeenByEmail(session.user.email),
      PING_TIMEOUT_MS,
    );
    if (updateResult.timedOut) {
      return NextResponse.json({ ok: true, updated: false }, { status: 202 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true, updated: false }, { status: 202 });
  }
}
