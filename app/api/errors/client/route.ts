import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { notifyClientErrorCaptured, notifyClientErrorSpike } from "@/lib/discord";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
import { symbolicateStack } from "@/lib/source-map-resolver";
import {
  claimClientErrorCaptureNotification,
  claimClientErrorSpikeAlert,
  getRecentClientErrorStats,
  insertClientErrorEvent,
  reopenFixedClientErrorFingerprint,
  releaseClientErrorCaptureNotification,
  releaseClientErrorSpikeAlert,
  upsertClientErrorFingerprint,
  upsertMarketingTrackingFailure,
} from "@/lib/db/client-errors";

const ALERT_WINDOW_MS = 10 * 60_000;
const ALERT_COOLDOWN_MS = 30 * 60_000;
const CAPTURE_ALERT_COOLDOWN_MS = 15 * 60_000;
const THIRD_PARTY_TRACKING_RESOURCE_PATTERNS = [
  /^https:\/\/s\.pinimg\.com\//i,
  /^https:\/\/ct\.pinterest\.com\//i,
  /^https:\/\/connect\.facebook\.net\//i,
  /^https:\/\/www\.facebook\.com\/tr(?:\/|\?|$)/i,
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

/** Strip email-like patterns and long non-stack numeric sequences from stack traces */
function sanitizeStack(raw: string, maxLen = 2000): string {
  let s = raw.slice(0, maxLen);
  // Remove email-like patterns
  s = s.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]");
  // Remove long digit sequences (phone, CC, SSN, etc.) without destroying JS stack :line:column coordinates.
  s = s.replace(/(?<!:)\b\d{6,}\b(?!:)/g, "[DIGITS]");
  return s;
}

function clampString(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  return value.slice(0, maxLen);
}

function safeArray(value: unknown, maxItems: number): unknown[] {
  return Array.isArray(value) ? value.slice(-maxItems) : [];
}

function sanitizeDiagnosticValue(value: unknown, depth = 0, key = ""): unknown {
  if (key && /(password|passcode|secret|token|authorization|cookie|csrf|card|cvc|cvv|ssn|email|phone)/i.test(key)) {
    return "[redacted]";
  }
  if (value === null || value === undefined) return value;
  if (depth > 4) return undefined;
  if (Array.isArray(value)) {
    return value
      .slice(-20)
      .map((item) => sanitizeDiagnosticValue(item, depth + 1))
      .filter((item) => item !== undefined);
  }
  switch (typeof value) {
    case "string":
      return value.slice(0, 1000);
    case "number":
    case "boolean":
      return value;
    case "object": {
      const result: Record<string, unknown> = {};
      for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
        const sanitized = sanitizeDiagnosticValue(childValue, depth + 1, childKey);
        if (sanitized !== undefined) result[childKey] = sanitized;
      }
      return result;
    }
    default:
      return String(value).slice(0, 1000);
  }
}

function normalizeFingerprintPart(value: unknown): string {
  return String(value || "")
    .replace(/[a-f0-9]{16,}/gi, "[hex]")
    .replace(/\b\d{4,}\b/g, "[num]")
    .slice(0, 300);
}

function firstStackFrame(stack: string | null) {
  if (!stack) return "";
  return stack
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.includes("ErrorCapture")) || "";
}

function buildServerFingerprint(doc: {
  type: string;
  message: string;
  source: string | null;
  stack: string | null;
}) {
  const basis = [
    doc.type,
    normalizeFingerprintPart(doc.message),
    normalizeFingerprintPart(doc.source),
    normalizeFingerprintPart(firstStackFrame(doc.stack)),
  ].join("|");
  return `client_${crypto.createHash("sha256").update(basis).digest("hex").slice(0, 16)}`;
}

function pathnameFromPageUrl(pageUrl: string | null) {
  if (!pageUrl) return null;
  try {
    const url = new URL(pageUrl);
    return `${url.pathname}${url.search}`;
  } catch {
    return pageUrl.startsWith("/") ? pageUrl.slice(0, 1000) : null;
  }
}

function getSeverity(doc: { type: string; pageUrl: string | null; source: string | null; message: string }) {
  const pathname = pathnameFromPageUrl(doc.pageUrl) || "";
  const source = doc.source || "";
  const isCriticalPath = /^\/(create|game|templates|pricing|cards|checkout|api\/stripe)(\/|\?|$)/i.test(pathname);
  const isPaymentResource = /js\.stripe\.com/i.test(source) || /stripe/i.test(doc.message);
  const isCheckoutLoadFailure = /checkout could not load|failed to load stripe\.js|stripe could not load/i.test(doc.message);
  if (isCriticalPath || (isPaymentResource && isCheckoutLoadFailure)) return "high" as const;
  if (doc.type === "resource_load_failed") return "low" as const;
  return "medium" as const;
}

function extractFirstHttpUrl(value: string | null) {
  if (!value) return null;
  const match = value.match(/https?:\/\/[^\s"'<>\\)]+/i);
  return match?.[0]?.replace(/[),.]+$/, "") || null;
}

function getResourceUrl(doc: { source: string | null; message: string }) {
  if (doc.source && /^https?:\/\//i.test(doc.source)) return doc.source;
  return extractFirstHttpUrl(doc.message);
}

function getResourceHost(resourceUrl: string | null) {
  if (!resourceUrl) return null;
  try {
    return new URL(resourceUrl).hostname;
  } catch {
    return null;
  }
}

function isThirdPartyTrackingResourceFailure(doc: { type: string; source: string | null; message: string }) {
  if (doc.type !== "resource_load_failed") return false;
  return [doc.source || "", doc.message || ""].some((candidate) =>
    THIRD_PARTY_TRACKING_RESOURCE_PATTERNS.some((pattern) => pattern.test(candidate))
  );
}

function getErrorSignal(doc: { type: string; pageUrl: string | null; source: string | null; message: string }) {
  const resourceUrl = getResourceUrl(doc);
  const resourceHost = getResourceHost(resourceUrl);
  if (isThirdPartyTrackingResourceFailure(doc)) {
    return {
      severity: "low" as const,
      errorCategory: "third_party_tracking_failure" as const,
      impactArea: "marketing_tracking" as const,
      alertSuppressed: true,
      suppressionReason: "third-party marketing pixel resource failure",
      resourceHost,
    };
  }

  return {
    severity: getSeverity(doc),
    errorCategory: "app_error" as const,
    impactArea: "application" as const,
    alertSuppressed: false,
    suppressionReason: null,
    resourceHost,
  };
}

async function maybeAlertForFingerprint(
  doc: {
    fingerprint: string;
    type: string;
    message: string;
    source: string | null;
    pageUrl: string | null;
    buildId: string | null;
    severity: "low" | "medium" | "high";
    breadcrumbs: Array<{ type?: string; message?: string; timestamp?: string }>;
  },
  totalCount: number
) {
  const now = new Date();
  const recentSince = new Date(Date.now() - ALERT_WINDOW_MS);
  const recent = await getRecentClientErrorStats(doc.fingerprint, recentSince);
  const recentCount = recent.count;
  const recentSessions = recent.sessionCount;
  const shouldAlert =
    doc.severity === "high"
      ? recentCount >= 3 || recentSessions >= 2
      : doc.severity === "medium"
        ? (recentCount >= 3 && recentSessions >= 2) || recentSessions >= 3
        : recentCount >= 8 && recentSessions >= 3;

  if (!shouldAlert) return;

  const cooldownBefore = new Date(Date.now() - ALERT_COOLDOWN_MS);
  const claimed = await claimClientErrorSpikeAlert({
    fingerprint: doc.fingerprint,
    cooldownBefore,
    now,
    recentCount,
    recentSessions,
  });

  if (!claimed) return;

  void notifyClientErrorSpike({
    fingerprint: doc.fingerprint,
    type: doc.type,
    message: doc.message,
    pageUrl: doc.pageUrl,
    source: doc.source,
    buildId: doc.buildId,
    recentCount,
    recentSessions,
    totalCount,
    severity: doc.severity,
    breadcrumbs: doc.breadcrumbs,
  }).then((delivered) => {
    if (delivered) return undefined;
    return releaseClientErrorSpikeAlert({ fingerprint: doc.fingerprint, claimedAt: now });
  }).catch(async (error) => {
    console.error("Failed to deliver or release client error spike alert:", error);
    try {
      await releaseClientErrorSpikeAlert({ fingerprint: doc.fingerprint, claimedAt: now });
    } catch (releaseError) {
      console.error("Failed to release client error spike alert claim:", releaseError);
    }
  });
}

async function maybeNotifyClientErrorCaptured(
  doc: {
    fingerprint: string;
    type: string;
    message: string;
    source: string | null;
    pageUrl: string | null;
    buildId: string | null;
    sessionId: string | null;
    anonymousId: string | null;
    severity: "low" | "medium" | "high";
    breadcrumbs: Array<{ type?: string; message?: string; timestamp?: string }>;
  },
  totalCount: number
) {
  const shouldNotify = doc.severity === "high" || (doc.severity === "medium" && totalCount === 1);
  if (!shouldNotify) return;

  const now = new Date();
  const cooldownBefore = new Date(Date.now() - CAPTURE_ALERT_COOLDOWN_MS);
  const claimed = await claimClientErrorCaptureNotification({
    fingerprint: doc.fingerprint,
    cooldownBefore,
    now,
  });

  if (!claimed) return;

  void notifyClientErrorCaptured({
    fingerprint: doc.fingerprint,
    type: doc.type,
    message: doc.message,
    pageUrl: doc.pageUrl,
    source: doc.source,
    buildId: doc.buildId,
    sessionId: doc.sessionId,
    anonymousId: doc.anonymousId,
    severity: doc.severity,
    breadcrumbs: doc.breadcrumbs,
  }).then((delivered) => {
    if (delivered) return undefined;
    return releaseClientErrorCaptureNotification({ fingerprint: doc.fingerprint, claimedAt: now });
  }).catch(async (error) => {
    console.error("Failed to deliver or release client error capture notification:", error);
    try {
      await releaseClientErrorCaptureNotification({ fingerprint: doc.fingerprint, claimedAt: now });
    } catch (releaseError) {
      console.error("Failed to release client error capture claim:", releaseError);
    }
  });
}

// ---------------------------------------------------------------------------
// POST /api/errors/client
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  // Always return 200 so we never break the client
  const ok = () => NextResponse.json({ ok: true });

	  try {
	    const ip = getIp(req);

	    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return ok();
    }

    const reqCtx = getRequestActivityContext(req);
    const rawStack = body.stack ? String(body.stack).slice(0, 4000) : null;
    const symbolicated = symbolicateStack(rawStack);
    const sanitizedStack = rawStack ? sanitizeStack(rawStack) : null;
    const sanitizedSymbolicatedStack = symbolicated.stack ? sanitizeStack(symbolicated.stack, 6000) : null;
    const doc = {
      type: clampString(body.type, 50) || "unknown",
      message: clampString(body.message, 500) || "No message",
      source: clampString(body.source, 500) || null,
      lineno: typeof body.lineno === "number" ? body.lineno : null,
      colno: typeof body.colno === "number" ? body.colno : null,
      stack: sanitizedStack,
      symbolicatedStack: sanitizedSymbolicatedStack,
      sourceMappedFrames: symbolicated.frames,
      pageUrl: clampString(body.pageUrl, 1000) || null,
      pathname: pathnameFromPageUrl(clampString(body.pageUrl, 1000)),
      userAgent: clampString(body.userAgent, 500) || req.headers.get("user-agent")?.slice(0, 500) || null,
      userId: clampString(body.userId, 100) || null,
      email: clampString(body.email, 200) || null,
      sessionId: clampString(body.sessionId, 100) || null,
      anonymousId: clampString(body.anonymousId, 100) || null,
      buildId: clampString(body.buildId, 120) || null,
      release: clampString(body.release, 120) || null,
      breadcrumbs: sanitizeDiagnosticValue(safeArray(body.breadcrumbs, 20)) as unknown[],
      clientContext: sanitizeDiagnosticValue(body.clientContext || {}) as Record<string, unknown>,
      ipAddress: ip,
      domain: reqCtx.domain,
      createdAt: new Date(),
    };
    const fingerprint =
      clampString(body.fingerprint, 120) ||
      buildServerFingerprint(doc);
    const signal = getErrorSignal(doc);
    const severity = signal.severity;
    const storedDoc = { ...doc, fingerprint, ...signal };

    await insertClientErrorEvent(storedDoc);
    if (signal.errorCategory === "third_party_tracking_failure") {
      await upsertMarketingTrackingFailure({ ...doc, fingerprint }, signal);
    }

    const groupUpdate = await upsertClientErrorFingerprint(storedDoc);
    const totalCount = groupUpdate?.totalCount || 1;
    if (groupUpdate?.status === "fixed") {
      await reopenFixedClientErrorFingerprint(fingerprint, doc.createdAt);
    }

    trackActivity({
      event: signal.alertSuppressed ? "client_marketing_tracking_failure" : "client_error_captured",
      source: "client",
      userId: doc.userId,
      email: doc.email,
      pathname: doc.pathname,
      sessionId: doc.sessionId,
      anonymousId: doc.anonymousId,
      domain: reqCtx.domain,
      ipAddress: ip,
      userAgent: doc.userAgent,
      metadata: {
        fingerprint,
        severity,
        type: doc.type,
        message: doc.message,
        buildId: doc.buildId,
        source: doc.source,
        errorCategory: signal.errorCategory,
        impactArea: signal.impactArea,
        alertSuppressed: signal.alertSuppressed,
        resourceHost: signal.resourceHost,
      },
    }).catch(() => {});

    if (!signal.alertSuppressed) {
      await maybeNotifyClientErrorCaptured({
        fingerprint,
        type: doc.type,
        message: doc.message,
        pageUrl: doc.pageUrl,
        source: doc.source,
        buildId: doc.buildId,
        sessionId: doc.sessionId,
        anonymousId: doc.anonymousId,
        severity,
        breadcrumbs: doc.breadcrumbs as Array<{ type?: string; message?: string; timestamp?: string }>,
      }, totalCount);

      await maybeAlertForFingerprint({
        fingerprint,
        type: doc.type,
        message: doc.message,
        source: doc.source,
        pageUrl: doc.pageUrl,
        buildId: doc.buildId,
        severity,
        breadcrumbs: doc.breadcrumbs as Array<{ type?: string; message?: string; timestamp?: string }>,
      }, totalCount);
    }

    return ok();
  } catch (error) {
    console.error("Client error tracking failed:", error);
    return ok();
  }
}
