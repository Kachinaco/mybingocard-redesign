export const NATIVE_OAUTH_PENDING_COOKIE = "mybingocard.native_oauth";
const DEFAULT_CALLBACK = "/dashboard";

export type NativeOAuthPending = {
  provider: "google" | "apple";
  callbackUrl: string;
};

export function encodeNativeOAuthPending(value: NativeOAuthPending): string {
  return JSON.stringify(value);
}

export function decodeNativeOAuthPending(value: string | undefined): NativeOAuthPending | null {
  if (!value) return null;

  let candidate = value;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const parsed = JSON.parse(candidate);
      if (
        parsed &&
        (parsed.provider === "google" || parsed.provider === "apple") &&
        typeof parsed.callbackUrl === "string"
      ) {
        return {
          provider: parsed.provider,
          callbackUrl: parsed.callbackUrl,
        };
      }
    } catch {
      try {
        const decoded = decodeURIComponent(candidate);
        if (decoded === candidate) break;
        candidate = decoded;
        continue;
      } catch {
        return null;
      }
    }

    return null;
  }

  return null;
}

export function nativeOAuthBaseUrl(requestUrl: URL): URL {
  const configuredUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  return new URL(configuredUrl || requestUrl.origin);
}

export function nativeOAuthRedirectUrl(path: string, requestUrl: URL): URL {
  return new URL(path, nativeOAuthBaseUrl(requestUrl));
}

export function normalizeNativeCallback(value: string | null | undefined, requestUrl?: URL): string {
  if (!value) return DEFAULT_CALLBACK;

  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("/") && !decoded.startsWith("//")) {
      return decoded;
    }
    if (requestUrl) {
      const decodedUrl = new URL(decoded);
      if (
        decodedUrl.origin === requestUrl.origin ||
        decodedUrl.origin === nativeOAuthBaseUrl(requestUrl).origin
      ) {
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
      if (
        rawUrl.origin === requestUrl.origin ||
        rawUrl.origin === nativeOAuthBaseUrl(requestUrl).origin
      ) {
        return `${rawUrl.pathname}${rawUrl.search}`;
      }
    } catch {
      // Fall through to the default callback.
    }
  }

  return DEFAULT_CALLBACK;
}
