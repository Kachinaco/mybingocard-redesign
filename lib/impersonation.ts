import { createHmac, timingSafeEqual } from "crypto";

export const IMPERSONATION_COOKIE_NAME = "mybingo_admin_impersonation";

export interface ImpersonationPayload {
  adminEmail: string;
  targetUserId: string;
  targetEmail: string;
  targetName?: string | null;
  startedAt: string;
}

function getSigningSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is required for impersonation");
  }
  return secret;
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", getSigningSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function isValidPayload(payload: unknown): payload is ImpersonationPayload {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Record<string, unknown>;
  return (
    typeof candidate.adminEmail === "string" &&
    typeof candidate.targetUserId === "string" &&
    typeof candidate.targetEmail === "string" &&
    typeof candidate.startedAt === "string"
  );
}

export function createImpersonationCookieValue(
  payload: ImpersonationPayload
): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function parseImpersonationCookie(
  value?: string | null
): ImpersonationPayload | null {
  if (!value) {
    return null;
  }

  const [encodedPayload, providedSignature] = value.split(".");
  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    );

    if (!isValidPayload(payload)) {
      return null;
    }

    return {
      adminEmail: payload.adminEmail,
      targetUserId: payload.targetUserId,
      targetEmail: payload.targetEmail,
      targetName:
        typeof payload.targetName === "string" ? payload.targetName : null,
      startedAt: payload.startedAt,
    };
  } catch {
    return null;
  }
}
