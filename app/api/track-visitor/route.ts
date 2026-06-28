import { NextRequest, NextResponse } from "next/server";

const UPSTREAM_URL =
  process.env.VISITOR_TRACK_UPSTREAM || "https://townranker.com/api/track-visitor";

function normalizeHost(raw: string): string {
  const first = raw.split(",")[0] ?? "";
  return first.trim().split(":")[0]?.toLowerCase() || "";
}

function getDomainFromHeaders(req: NextRequest): string {
  const forwardedHost = req.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const normalized = normalizeHost(forwardedHost);
    if (normalized) return normalized;
  }

  const host = req.headers.get("host");
  if (host) {
    const normalized = normalizeHost(host);
    if (normalized) return normalized;
  }

  return "mybingocard.com";
}

function getForwardedFor(req: NextRequest): string | null {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (!xForwardedFor) return null;
  const first = xForwardedFor.split(",")[0]?.trim();
  return first || null;
}

function stringLooksLikeGamePath(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/game/")) return true;

  try {
    return new URL(trimmed).pathname.startsWith("/game/");
  } catch {
    return false;
  }
}

function isGamePageVisitorPayload(payload: Record<string, unknown>): boolean {
  return (
    stringLooksLikeGamePath(payload.page) ||
    stringLooksLikeGamePath(payload.path) ||
    stringLooksLikeGamePath(payload.pathname) ||
    stringLooksLikeGamePath(payload.url) ||
    stringLooksLikeGamePath(payload.href)
  );
}

export async function POST(req: NextRequest) {
  let payload: Record<string, unknown>;

  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!payload.domain) {
    payload.domain = getDomainFromHeaders(req);
  }

  if (isGamePageVisitorPayload(payload)) {
    return NextResponse.json({ success: true, suppressed: true });
  }

  const upstreamHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const forwardedFor = getForwardedFor(req);
  if (forwardedFor) {
    upstreamHeaders["x-forwarded-for"] = forwardedFor;
    upstreamHeaders["x-real-ip"] = forwardedFor;
  }

  const userAgent = req.headers.get("user-agent");
  if (userAgent) {
    upstreamHeaders["user-agent"] = userAgent;
  }

  try {
    const upstreamRes = await fetch(UPSTREAM_URL, {
      method: "POST",
      headers: upstreamHeaders,
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!upstreamRes.ok) {
      const upstreamBody = await upstreamRes.text();
      return NextResponse.json(
        {
          error: "Upstream tracking failed",
          status: upstreamRes.status,
          body: upstreamBody.slice(0, 300),
        },
        { status: 502 }
      );
    }

    const responseText = await upstreamRes.text();
    if (!responseText) {
      return NextResponse.json({ success: true });
    }

    try {
      const responseJson = JSON.parse(responseText);
      return NextResponse.json(responseJson);
    } catch {
      return NextResponse.json({ success: true, responseText });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Tracking request failed",
        message,
      },
      { status: 502 }
    );
  }
}
