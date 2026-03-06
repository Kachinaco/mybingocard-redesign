export const ATTRIBUTION_COOKIE_NAME = "mbc_attribution";

export type AttributionData = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
};

export function sanitizeAttribution(data: Partial<AttributionData> | null | undefined): AttributionData {
  const normalized: AttributionData = {};

  if (!data) return normalized;

  if (typeof data.utm_source === "string" && data.utm_source) normalized.utm_source = data.utm_source;
  if (typeof data.utm_medium === "string" && data.utm_medium) normalized.utm_medium = data.utm_medium;
  if (typeof data.utm_campaign === "string" && data.utm_campaign) normalized.utm_campaign = data.utm_campaign;
  if (typeof data.utm_content === "string" && data.utm_content) normalized.utm_content = data.utm_content;
  if (typeof data.utm_term === "string" && data.utm_term) normalized.utm_term = data.utm_term;
  if (typeof data.referrer === "string" && data.referrer) normalized.referrer = data.referrer;

  return normalized;
}

export function parseAttributionCookie(value: string | undefined): AttributionData {
  if (!value) return {};

  try {
    const parsed = JSON.parse(decodeURIComponent(value));
    return sanitizeAttribution(parsed);
  } catch {
    return {};
  }
}

export function getSignupSourceLabel(data: Partial<AttributionData> | null | undefined): string {
  const attribution = sanitizeAttribution(data);

  if (attribution.utm_source) {
    return attribution.utm_source;
  }

  if (attribution.referrer) {
    try {
      const url = new URL(attribution.referrer);
      return url.hostname.replace(/^www\./, "");
    } catch {
      return attribution.referrer;
    }
  }

  return "direct";
}
