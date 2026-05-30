const DEFAULT_POST_VERIFICATION_CALLBACK = "/create";

export function sanitizePostVerificationCallback(callbackUrl?: string | null) {
  if (!callbackUrl || !callbackUrl.startsWith("/")) {
    return DEFAULT_POST_VERIFICATION_CALLBACK;
  }

  if (callbackUrl.startsWith("//")) {
    return DEFAULT_POST_VERIFICATION_CALLBACK;
  }

  return callbackUrl;
}

export function buildPostVerificationLoginUrl({
  appUrl,
  email,
  callbackUrl,
}: {
  appUrl: string;
  email: string;
  callbackUrl?: string | null;
}) {
  const nextCallbackUrl = sanitizePostVerificationCallback(callbackUrl);
  return `${appUrl}/login?verified=1&email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(nextCallbackUrl)}`;
}

export function buildVerifyEmailErrorUrl({
  appUrl,
  error,
  email,
  callbackUrl,
}: {
  appUrl: string;
  error: string;
  email?: string | null;
  callbackUrl?: string | null;
}) {
  const params = new URLSearchParams({ error });

  if (email) {
    params.set("email", email);
  }

  if (callbackUrl) {
    params.set("callbackUrl", sanitizePostVerificationCallback(callbackUrl));
  }

  return `${appUrl}/verify-email?${params.toString()}`;
}
