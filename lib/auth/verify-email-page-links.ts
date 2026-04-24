import { sanitizePostVerificationCallback } from "@/lib/auth/verify-email-redirect";

export function buildVerifyEmailPageUrl({
  email,
  callbackUrl,
}: {
  email?: string | null;
  callbackUrl?: string | null;
}) {
  const params = new URLSearchParams();

  if (email) {
    params.set("email", email);
  }

  const safeCallbackUrl = sanitizePostVerificationCallback(callbackUrl);
  if (safeCallbackUrl) {
    params.set("callbackUrl", safeCallbackUrl);
  }

  const query = params.toString();
  return query ? `/verify-email?${query}` : "/verify-email";
}

export function buildVerifyEmailSigninHref(searchParams: URLSearchParams) {
  const params = new URLSearchParams();
  const email = searchParams.get("email");
  const rawCallbackUrl = searchParams.get("callbackUrl");
  const callbackUrl = rawCallbackUrl
    ? sanitizePostVerificationCallback(rawCallbackUrl)
    : null;

  if (email) {
    params.set("email", email);
  }

  if (callbackUrl) {
    params.set("callbackUrl", callbackUrl);
  }

  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}
