import { createHash } from "node:crypto";

type MetaConversionEventName =
  | "CompleteRegistration"
  | "Lead"
  | "InitiateCheckout"
  | "Purchase"
  | "Subscribe";

interface MetaConversionEventInput {
  eventName: MetaConversionEventName;
  eventId: string;
  eventSourceUrl?: string | null;
  email?: string | null;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  valueCents?: number | null;
  currency?: string | null;
  contentName?: string | null;
  contentType?: string | null;
  orderId?: string | null;
}

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://mybingocard.com").replace(/\/$/, "");

function hashValue(value?: string | null): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  return createHash("sha256").update(normalized).digest("hex");
}

function centsToDollars(valueCents?: number | null): number | undefined {
  if (typeof valueCents !== "number" || !Number.isFinite(valueCents)) return undefined;
  return Math.round(valueCents) / 100;
}

function compactObject<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => {
      if (value === undefined || value === null || value === "") return false;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    })
  ) as Partial<T>;
}

export async function sendMetaConversionEvent(input: MetaConversionEventInput): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = process.env.META_CONVERSIONS_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    return;
  }

  const apiVersion = process.env.META_CONVERSIONS_API_VERSION || "v24.0";
  const testEventCode = process.env.META_TEST_EVENT_CODE;
  const emailHash = hashValue(input.email);
  const externalIdHash = hashValue(input.userId || input.email || undefined);
  const value = centsToDollars(input.valueCents);

  const event = compactObject({
    event_name: input.eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: input.eventId,
    action_source: "website",
    event_source_url: input.eventSourceUrl || appUrl,
    user_data: compactObject({
      em: emailHash ? [emailHash] : undefined,
      external_id: externalIdHash ? [externalIdHash] : undefined,
      client_ip_address: input.ipAddress || undefined,
      client_user_agent: input.userAgent || undefined,
    }),
    custom_data: compactObject({
      value,
      currency: (input.currency || "usd").toUpperCase(),
      content_name: input.contentName || undefined,
      content_type: input.contentType || "product",
      order_id: input.orderId || undefined,
    }),
  });

  const payload = compactObject({
    data: [event],
    test_event_code: testEventCode || undefined,
  });

  const url = `https://graph.facebook.com/${apiVersion}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("Meta Conversions API event failed", {
        status: response.status,
        eventName: input.eventName,
        eventId: input.eventId,
        response: body.slice(0, 500),
      });
    }
  } catch (error) {
    console.error("Meta Conversions API request failed", {
      eventName: input.eventName,
      eventId: input.eventId,
      error,
    });
  }
}
