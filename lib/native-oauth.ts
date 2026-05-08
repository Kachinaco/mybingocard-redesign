import crypto from "crypto";

const DEFAULT_CALLBACK = "/dashboard";

export function normalizeNativeCallback(value: string | null | undefined, requestUrl?: URL): string {
  if (!value) return DEFAULT_CALLBACK;

  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("/") && !decoded.startsWith("//")) {
      return decoded;
    }
    if (requestUrl) {
      const decodedUrl = new URL(decoded);
      if (decodedUrl.origin === requestUrl.origin) {
        return `${decodedUrl.pathname}${decodedUrl.search}`;
      }
    }
  } catch {
    // Fall through to the raw value check.
  }

  if (value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  if (requestUrl) {
    try {
      const rawUrl = new URL(value);
      if (rawUrl.origin === requestUrl.origin) {
        return `${rawUrl.pathname}${rawUrl.search}`;
      }
    } catch {
      // Fall through to the default callback.
    }
  }

  return DEFAULT_CALLBACK;
}

export function createNativeOAuthToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashNativeOAuthToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function nativeOAuthCookieName(requestUrl: URL): string {
  const configuredUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || requestUrl.origin;
  const secure = configuredUrl.startsWith("https://") || requestUrl.protocol === "https:";
  return secure ? "__Secure-authjs.session-token" : "authjs.session-token";
}
