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

function formatMoney(amount: number | null | undefined, currency: string | null | undefined) {
  if (typeof amount !== "number") return "Unknown";
  return `${(amount / 100).toFixed(2)} ${(currency || "usd").toUpperCase()}`;
}

function formatSessionId(sessionId: string) {
  return sessionId ? `\`${sessionId}\`` : "Unknown";
}

function getCheckoutTypeLabel(checkoutType: "subscription" | "one_time") {
  return checkoutType === "subscription" ? "Subscription" : "One-Time";
}

async function sendStripeEventEmbed(
  title: string,
  description: string,
  color: number,
  fields: Array<{ name: string; value: string; inline?: boolean }>
) {
  await sendDiscordNotification("", [{
    title,
    color,
    description,
    fields,
    footer: { text: "MyBingoCard • Stripe" },
    timestamp: new Date().toISOString(),
  }]);
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

export async function notifyCheckoutStarted(
  email: string,
  name: string,
  checkoutType: "subscription" | "one_time",
  product: string,
  amount: number | null | undefined,
  currency: string | null | undefined,
  sessionId: string
) {
  await sendStripeEventEmbed(
    "🛒 Stripe Checkout Started",
    "A user opened a Stripe checkout session.",
    0xf59e0b,
    [
      { name: "User", value: name || "Unknown", inline: true },
      { name: "Email", value: email, inline: true },
      {
        name: "Type",
        value: getCheckoutTypeLabel(checkoutType),
        inline: true,
      },
      { name: "Product", value: product, inline: true },
      { name: "Amount", value: formatMoney(amount, currency), inline: true },
      { name: "Status", value: "Awaiting payment", inline: true },
      { name: "Session ID", value: formatSessionId(sessionId), inline: false },
    ]
  );
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
  await sendStripeEventEmbed(
    "✅ Stripe Checkout Activated",
    "A Stripe checkout completed successfully.",
    0x22c55e,
    [
      { name: "User", value: name || "Unknown", inline: true },
      { name: "Email", value: email, inline: true },
      {
        name: "Type",
        value: getCheckoutTypeLabel(checkoutType),
        inline: true,
      },
      { name: "Product", value: product, inline: true },
      { name: "Amount", value: formatMoney(amount, currency), inline: true },
      { name: "Status", value: "Paid / Activated", inline: true },
      { name: "Session ID", value: formatSessionId(sessionId), inline: false },
    ]
  );
}

export async function notifyCheckoutExpired(
  email: string,
  name: string,
  product: string,
  sessionId: string
) {
  await sendStripeEventEmbed(
    "⌛ Stripe Checkout Expired",
    "A checkout session expired before payment was completed.",
    0xf97316,
    [
      { name: "User", value: name || "Unknown", inline: true },
      { name: "Email", value: email, inline: true },
      { name: "Product", value: product, inline: true },
      { name: "Status", value: "Expired", inline: true },
      { name: "Session ID", value: formatSessionId(sessionId), inline: false },
    ]
  );
}

export async function notifyRenewalPaid(
  email: string,
  name: string,
  product: string,
  amount: number | null | undefined,
  currency: string | null | undefined,
  invoiceId: string
) {
  await sendStripeEventEmbed(
    "💸 Stripe Renewal Paid",
    "A recurring Stripe invoice was paid successfully.",
    0x10b981,
    [
      { name: "User", value: name || "Unknown", inline: true },
      { name: "Email", value: email, inline: true },
      { name: "Product", value: product, inline: true },
      { name: "Amount", value: formatMoney(amount, currency), inline: true },
      { name: "Status", value: "Renewal paid", inline: true },
      { name: "Invoice ID", value: `\`${invoiceId}\``, inline: false },
    ]
  );
}

export async function notifyRenewalFailed(
  email: string,
  name: string,
  product: string,
  amount: number | null | undefined,
  currency: string | null | undefined,
  invoiceId: string
) {
  await sendStripeEventEmbed(
    "⚠️ Stripe Renewal Failed",
    "A recurring Stripe invoice payment failed.",
    0xef4444,
    [
      { name: "User", value: name || "Unknown", inline: true },
      { name: "Email", value: email, inline: true },
      { name: "Product", value: product, inline: true },
      { name: "Amount", value: formatMoney(amount, currency), inline: true },
      { name: "Status", value: "Payment failed", inline: true },
      { name: "Invoice ID", value: `\`${invoiceId}\``, inline: false },
    ]
  );
}

export async function notifyRefundIssued(
  email: string,
  name: string,
  product: string,
  amount: number | null | undefined,
  currency: string | null | undefined,
  chargeId: string
) {
  await sendStripeEventEmbed(
    "↩️ Stripe Refund Issued",
    "A Stripe charge was refunded.",
    0x3b82f6,
    [
      { name: "User", value: name || "Unknown", inline: true },
      { name: "Email", value: email, inline: true },
      { name: "Product", value: product, inline: true },
      { name: "Amount", value: formatMoney(amount, currency), inline: true },
      { name: "Status", value: "Refunded", inline: true },
      { name: "Charge ID", value: `\`${chargeId}\``, inline: false },
    ]
  );
}

export async function notifyDisputeUpdate(
  email: string,
  name: string,
  amount: number | null | undefined,
  currency: string | null | undefined,
  disputeId: string,
  disputeStatus: string,
  reason?: string | null
) {
  await sendStripeEventEmbed(
    disputeStatus === "won" || disputeStatus === "closed_won"
      ? "🛡️ Stripe Dispute Won"
      : disputeStatus === "lost" || disputeStatus === "closed_lost"
        ? "🚨 Stripe Dispute Lost"
        : "🚨 Stripe Dispute Opened",
    "A Stripe dispute event was received.",
    disputeStatus === "won" || disputeStatus === "closed_won" ? 0x22c55e : 0xef4444,
    [
      { name: "User", value: name || "Unknown", inline: true },
      { name: "Email", value: email, inline: true },
      { name: "Amount", value: formatMoney(amount, currency), inline: true },
      { name: "Status", value: disputeStatus, inline: true },
      { name: "Reason", value: reason || "Unknown", inline: true },
      { name: "Dispute ID", value: `\`${disputeId}\``, inline: false },
    ]
  );
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

export async function notifyBingoAchieved(
  cardTitle: string,
  gridSize: number,
  timeToBingoSeconds: number,
  context: string
) {
  const minutes = Math.floor(timeToBingoSeconds / 60);
  const seconds = timeToBingoSeconds % 60;
  const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  await sendDiscordNotification("", [{
    title: "🎯 BINGO! Someone won!",
    color: 0xeab308,
    fields: [
      { name: "Card", value: cardTitle || "Untitled", inline: true },
      { name: "Grid", value: `${gridSize}x${gridSize}`, inline: true },
      { name: "Time to Bingo", value: timeStr, inline: true },
      { name: "Context", value: context === "shared_card" ? "Shared card" : context === "owner_card" ? "Owner playing" : context, inline: true },
    ],
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifyGameStarted(
  hostEmail: string,
  gameTitle: string,
  roomCode: string,
  playerCount: number,
  gridSize: number
) {
  await sendDiscordNotification("", [{
    title: "🕹️ Live Game Started!",
    color: 0x8b5cf6,
    fields: [
      { name: "Host", value: hostEmail, inline: true },
      { name: "Game", value: gameTitle || "Untitled", inline: true },
      { name: "Room Code", value: `\`${roomCode}\``, inline: true },
      { name: "Players", value: String(playerCount), inline: true },
      { name: "Grid", value: `${gridSize}x${gridSize}`, inline: true },
    ],
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifyCheckoutCompleted(
  email: string,
  mode: string,
  amount: number | null | undefined,
  currency: string | null | undefined
) {
  await sendStripeEventEmbed(
    "💰 Checkout Completed",
    "A customer completed payment.",
    0x22c55e,
    [
      { name: "Email", value: email || "Unknown", inline: true },
      { name: "Type", value: mode === "subscription" ? "Subscription" : "One-Time", inline: true },
      { name: "Amount", value: formatMoney(amount, currency), inline: true },
    ]
  );
}

export async function notifySharedCardViewed(
  cardTitle: string,
  cardOwnerEmail: string | null,
  referrer: string | null,
  viewCount: number
) {
  // Only notify on milestone views to avoid spam
  const milestones = [1, 10, 25, 50, 100, 250, 500, 1000];
  if (!milestones.includes(viewCount)) return;

  await sendDiscordNotification("", [{
    title: `👀 Shared card hit ${viewCount} view${viewCount === 1 ? "" : "s"}!`,
    color: 0x06b6d4,
    fields: [
      { name: "Card", value: cardTitle || "Untitled", inline: true },
      { name: "Owner", value: cardOwnerEmail || "Unknown", inline: true },
      { name: "Views", value: String(viewCount), inline: true },
      ...(referrer ? [{ name: "Referrer", value: referrer.substring(0, 100), inline: false }] : []),
    ],
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifyUpgradeDismissed(
  email: string | null,
  source: string
) {
  await sendDiscordNotification("", [{
    title: "👋 Upgrade Dismissed",
    color: 0xf97316,
    fields: [
      { name: "User", value: email || "Anonymous", inline: true },
      { name: "Source", value: source === "modal" ? "Upgrade Modal" : "Upgrade Banner", inline: true },
    ],
    timestamp: new Date().toISOString(),
  }]);
}
