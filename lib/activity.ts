import { getSqliteStore } from "@/lib/db/sqlite";

export type ActivitySource = "client" | "server" | "auth" | "webhook";

export interface ActivityInput {
  event: string;
  source?: ActivitySource;
  userId?: string | null;
  email?: string | null;
  pathname?: string | null;
  sessionId?: string | null;
  anonymousId?: string | null;
  domain?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

const SENSITIVE_METADATA_KEY_PATTERN =
  /(password|passcode|secret|token|authorization|cookie|session|csrf|card[_-]?number|cvc|cvv|ssn)/i;

function sanitizeValue(value: unknown, depth = 0, key = ""): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (key && SENSITIVE_METADATA_KEY_PATTERN.test(key)) {
    return "[redacted]";
  }

  if (depth > 4) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeValue(item, depth + 1))
      .filter((item) => item !== undefined);
  }

  switch (typeof value) {
    case "string":
      return value.slice(0, 2000);
    case "number":
    case "boolean":
      return value;
    case "bigint":
      return value.toString();
    case "object": {
      const result: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        const sanitized = sanitizeValue(item, depth + 1, key);
        if (sanitized !== undefined) {
          result[key] = sanitized;
        }
      }
      return result;
    }
    default:
      return String(value);
  }
}

export function sanitizeActivityMetadata(metadata?: Record<string, unknown> | null): Record<string, unknown> {
  return (sanitizeValue(metadata || {}) as Record<string, unknown>) || {};
}

export function getRequestActivityContext(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  const xForwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress = xForwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
  const userAgent = request.headers.get("user-agent");

  let pathname: string | null = null;
  try {
    const url = new URL(request.url);
    pathname = `${url.pathname}${url.search}`;
  } catch {
    pathname = null;
  }

  return {
    domain: host || null,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
    pathname,
  };
}

export async function trackActivity(input: ActivityInput): Promise<void> {
  if (!input.event) {
    return;
  }

  try {
    const document = {
      event: input.event,
      source: input.source || "server",
      userId: input.userId || null,
      email: input.email || null,
      pathname: input.pathname || null,
      sessionId: input.sessionId || null,
      anonymousId: input.anonymousId || null,
      domain: input.domain || null,
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null,
      metadata: sanitizeActivityMetadata(input.metadata),
      createdAt: new Date(),
    };

    getSqliteStore().insertOne("activity_events", document);
  } catch (error) {
    console.error("Activity tracking failed:", error);
  }
}
