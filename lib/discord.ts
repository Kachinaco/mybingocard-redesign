import { getSignupSourceLabel, type AttributionData } from "./attribution";

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

export async function sendDiscordNotification(content: string, embeds?: any[]) {
  if (!WEBHOOK_URL) return;
  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(content ? { content } : {}),
        ...(embeds ? { embeds } : {}),
      }),
    });
  } catch (err) {
    console.error("Discord webhook failed:", err);
  }
}

export async function notifySignup(
  name: string,
  email: string,
  attribution?: Partial<AttributionData>
) {
  const source = getSignupSourceLabel(attribution);

  await sendDiscordNotification("", [{
    title: "🎉 New Signup on MyBingoCard!",
    color: 0x6366f1,
    fields: [
      { name: "Name", value: name, inline: true },
      { name: "Email", value: email, inline: true },
      { name: "Source", value: source, inline: true },
      ...(attribution?.referrer ? [{ name: "Referrer", value: attribution.referrer, inline: false }] : []),
    ],
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifySupportEmail(from: string, subject: string, preview: string) {
  await sendDiscordNotification("", [{
    title: "📧 Support Email Received",
    color: 0xf59e0b,
    fields: [
      { name: "From", value: from, inline: true },
      { name: "Subject", value: subject || "(no subject)", inline: true },
      { name: "Preview", value: preview?.substring(0, 200) || "(empty)", inline: false },
    ],
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifySignIn(name: string, email: string, provider: string) {
  await sendDiscordNotification("", [{
    title: "🔑 User Signed In",
    color: 0x22c55e,
    fields: [
      { name: "Name", value: name || "Unknown", inline: true },
      { name: "Email", value: email, inline: true },
      { name: "Provider", value: provider, inline: true },
    ],
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifyCardCreated(name: string, email: string, cardTitle: string, planType: string) {
  await sendDiscordNotification("", [{
    title: "🎴 New Bingo Card Created",
    color: 0x3b82f6,
    fields: [
      { name: "User", value: name || "Unknown", inline: true },
      { name: "Email", value: email, inline: true },
      { name: "Plan", value: planType || "FREE", inline: true },
      { name: "Card Title", value: cardTitle || "Untitled", inline: false },
    ],
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifySubscription(name: string, email: string, planType: string, event: "activated" | "canceled" | "payment_failed") {
  const configs = {
    activated: { title: "💳 New Subscription!", color: 0xf59e0b },
    canceled: { title: "❌ Subscription Canceled", color: 0xef4444 },
    payment_failed: { title: "⚠️ Payment Failed", color: 0xf97316 },
  };
  const { title, color } = configs[event];

  await sendDiscordNotification("", [{
    title,
    color,
    fields: [
      { name: "Name", value: name || "Unknown", inline: true },
      { name: "Email", value: email, inline: true },
      { name: "Plan", value: planType, inline: true },
    ],
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifyMagicLink(email: string) {
  await sendDiscordNotification("", [{
    title: "✉️ Magic Link Requested",
    color: 0xa855f7,
    fields: [
      { name: "Email", value: email, inline: true },
      { name: "Type", value: "Sign-in / Signup", inline: true },
    ],
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifyCheckoutStarted(email: string, name: string, planType: string) {
  await sendDiscordNotification("", [{
    title: "🛒 Stripe Checkout Started",
    color: 0xf59e0b,
    fields: [
      { name: "User", value: name || "Unknown", inline: true },
      { name: "Email", value: email, inline: true },
      { name: "Plan", value: planType || "PREMIUM", inline: true },
    ],
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifyCheckoutActivated(
  email: string,
  name: string,
  checkoutType: "subscription" | "one_time",
  product: string,
  amount: number | null | undefined,
  currency: string | null | undefined,
  sessionId: string
) {
  await sendDiscordNotification("", [{
    title: "✅ Stripe Checkout Activated",
    color: 0x22c55e,
    fields: [
      { name: "User", value: name || "Unknown", inline: true },
      { name: "Email", value: email, inline: true },
      {
        name: "Type",
        value: checkoutType === "subscription" ? "Subscription" : "One-Time",
        inline: true,
      },
      { name: "Product", value: product, inline: true },
      {
        name: "Amount",
        value:
          typeof amount === "number"
            ? `${(amount / 100).toFixed(2)} ${(currency || "usd").toUpperCase()}`
            : "Unknown",
        inline: true,
      },
      {
        name: "Session",
        value: sessionId,
        inline: true,
      },
    ],
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifyBatchCardsCreated(
  name: string,
  email: string,
  title: string,
  count: number,
  planType: string
) {
  await sendDiscordNotification("", [{
    title: "🧾 Batch Cards Generated",
    color: 0x0ea5e9,
    fields: [
      { name: "User", value: name || "Unknown", inline: true },
      { name: "Email", value: email, inline: true },
      { name: "Plan", value: planType || "FREE", inline: true },
      { name: "Batch", value: `${count} cards`, inline: true },
      { name: "Title", value: title || "Untitled", inline: false },
    ],
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifyAdminImpersonationStarted(
  adminEmail: string,
  targetEmail: string,
  targetName?: string | null
) {
  await sendDiscordNotification("", [{
    title: "🕵️ Admin Impersonation Started",
    color: 0xf59e0b,
    fields: [
      { name: "Admin", value: adminEmail, inline: true },
      { name: "Target", value: targetEmail, inline: true },
      { name: "Target Name", value: targetName || "Unknown", inline: true },
    ],
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifyAccountDeleted(
  name: string,
  email: string,
  planType: string,
  hadStripeSubscription: boolean
) {
  await sendDiscordNotification("", [{
    title: "🗑️ Account Deleted",
    color: 0xef4444,
    fields: [
      { name: "Name", value: name || "Unknown", inline: true },
      { name: "Email", value: email, inline: true },
      { name: "Plan", value: planType || "FREE", inline: true },
      {
        name: "Had Stripe Subscription",
        value: hadStripeSubscription ? "Yes" : "No",
        inline: true,
      },
    ],
    timestamp: new Date().toISOString(),
  }]);
}
