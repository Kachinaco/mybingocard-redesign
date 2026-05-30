"use client";

import type { ClientActivityPayload } from "@/lib/activity-client";

type MetaPixelEvent =
  | "PageView"
  | "ViewContent"
  | "Lead"
  | "CompleteRegistration"
  | "InitiateCheckout"
  | "Purchase"
  | "Subscribe";

type MetaPixelParameters = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    fbq?: (
      command: "track" | "trackCustom" | "init",
      eventName: string,
      parameters?: MetaPixelParameters,
      options?: { eventID?: string }
    ) => void;
  }
}

const CURRENCY = "USD";

function cleanParameters(parameters?: MetaPixelParameters): MetaPixelParameters {
  if (!parameters) return {};
  return Object.fromEntries(
    Object.entries(parameters).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

function numberFromUnknown(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function dollarsFromMetadata(metadata: Record<string, unknown>): number | undefined {
  const price = numberFromUnknown(metadata.price);
  if (typeof price === "number") return price;

  const amount = numberFromUnknown(metadata.amount);
  if (typeof amount === "number") {
    return amount > 100 ? amount / 100 : amount;
  }

  const amountCents = numberFromUnknown(metadata.amountCents);
  if (typeof amountCents === "number") return amountCents / 100;

  return undefined;
}

function stringFromMetadata(metadata: Record<string, unknown>, key: string): string | undefined {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function trackMetaPixelEvent(
  eventName: MetaPixelEvent,
  parameters?: MetaPixelParameters,
  eventId?: string
): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;

  try {
    window.fbq("track", eventName, cleanParameters(parameters), eventId ? { eventID: eventId } : undefined);
  } catch {
    // Meta tracking must never block product flows.
  }
}

function trackMetaPixelCustomEvent(
  eventName: string,
  parameters?: MetaPixelParameters,
  eventId?: string
): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;

  try {
    window.fbq("trackCustom", eventName, cleanParameters(parameters), eventId ? { eventID: eventId } : undefined);
  } catch {
    // Meta tracking must never block product flows.
  }
}

export function trackMetaPixelPageView(): void {
  trackMetaPixelEvent("PageView");
}

export function trackMappedMetaPixelEvent(event: string, payload: ClientActivityPayload): void {
  const metadata = payload.metadata || {};
  const value = dollarsFromMetadata(metadata);
  const eventId = stringFromMetadata(metadata, "session_id") || stringFromMetadata(metadata, "stripeSessionId");
  const source = stringFromMetadata(metadata, "source");

  switch (event) {
    case "pricing_page_viewed":
      trackMetaPixelEvent("ViewContent", {
        content_name: "Pricing",
        content_category: "pricing",
        source,
      });
      return;

    case "funnel_signup_page_viewed":
      trackMetaPixelEvent("ViewContent", {
        content_name: "Signup",
        content_category: "account",
        source,
      });
      return;

    case "landing_page_viewed":
      trackMetaPixelEvent("ViewContent", {
        content_name: stringFromMetadata(metadata, "page") || "Landing Page",
        content_category: "landing_page",
        source,
      });
      return;

    case "email_capture_submitted":
      trackMetaPixelEvent("Lead", {
        content_name: "Email Capture",
        content_category: "lead",
        source,
      });
      return;

    case "plan_selected":
      trackMetaPixelCustomEvent("PlanSelected", {
        content_name: stringFromMetadata(metadata, "plan") || "premium",
        content_category: "pricing",
        value,
        currency: CURRENCY,
        source,
      });
      return;

    case "checkout_loaded":
    case "share_links_checkout_started":
    case "email_share_checkout_started":
      trackMetaPixelEvent("InitiateCheckout", {
        content_name: stringFromMetadata(metadata, "plan") || stringFromMetadata(metadata, "purchaseType") || "premium",
        content_category: "checkout",
        value,
        currency: CURRENCY,
        source,
      }, eventId);
      return;

    case "checkout_cancel_clicked":
      trackMetaPixelCustomEvent("CheckoutCanceled", {
        content_name: stringFromMetadata(metadata, "plan") || "premium",
        content_category: "checkout",
        value,
        currency: CURRENCY,
        source,
      }, eventId);
      return;

    default:
      return;
  }
}
