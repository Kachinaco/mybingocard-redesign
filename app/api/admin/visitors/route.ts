import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminSession } from "@/lib/admin";
import { getAdminVisitorsData } from "@/lib/admin-live-visitors";

export const runtime = "nodejs";

function numberParam(request: NextRequest, name: string): number | undefined {
  const raw = request.nextUrl.searchParams.get(name);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function stringParam(request: NextRequest, name: string): string | null {
  const raw = request.nextUrl.searchParams.get(name);
  return raw && raw.trim() ? raw.trim().slice(0, 128) : null;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await getAdminVisitorsData({
      liveWindowMinutes: numberParam(request, "liveWindowMinutes"),
      periodHours: numberParam(request, "periodHours"),
      limit: numberParam(request, "limit"),
      anonymousId: stringParam(request, "anonymousId"),
      sessionId: stringParam(request, "sessionId"),
      visitorKey: stringParam(request, "visitorKey"),
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Admin visitors API error:", error);
    return NextResponse.json({ error: "Failed to load visitors" }, { status: 500 });
  }
}
