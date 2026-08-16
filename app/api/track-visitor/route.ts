import { NextRequest, NextResponse } from "next/server";

const UPSTREAM_URL =
  process.env.VISITOR_TRACK_UPSTREAM || "https://townranker.com/api/track-visitor";
const TRACKING_TIMEOUT_MS = 2500;

function acceptedResponse() {
  return NextResponse.json({ success: true, tracked: false }, { status: 202 });
}

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
      signal: AbortSignal.timeout(TRACKING_TIMEOUT_MS),
    });

    if (!upstreamRes.ok) {
      return acceptedResponse();
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
  } catch {
    return acceptedResponse();
  }
}
