const DEFAULT_AUTH_CALLBACK = "/dashboard";

export function sanitizeAuthCallbackUrl(
  value: string | null | undefined,
  fallback = DEFAULT_AUTH_CALLBACK
): string {
  const safeFallback =
    fallback.startsWith("/") && !fallback.startsWith("//")
      ? fallback
      : DEFAULT_AUTH_CALLBACK;

  if (!value) return safeFallback;

  let candidate = value;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (candidate.startsWith("/") && !candidate.startsWith("//")) {
      return candidate;
    }

    try {
      const decoded = decodeURIComponent(candidate);
      if (decoded === candidate) break;
      candidate = decoded;
    } catch {
      break;
    }
  }

  return safeFallback;
}
