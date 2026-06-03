import { getSignupSourceLabel, type AttributionData } from "./attribution";

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
type DiscordNotificationChannel = "signups" | "visitors" | "events" | "errors";

function webhookUrlFor(channel: DiscordNotificationChannel = "events") {
  if (channel === "signups") return process.env.MYBINGOCARD_SIGNUPS_WEBHOOK_URL || WEBHOOK_URL;
  if (channel === "visitors") return process.env.MYBINGOCARD_VISITORS_WEBHOOK_URL || WEBHOOK_URL;
  if (channel === "errors") return process.env.MYBINGOCARD_ERRORS_WEBHOOK_URL || process.env.MYBINGOCARD_EVENTS_WEBHOOK_URL || WEBHOOK_URL;
  return process.env.MYBINGOCARD_EVENTS_WEBHOOK_URL || WEBHOOK_URL;
}

export async function sendDiscordNotification(
  content: string,
  embeds?: any[],
  channel: DiscordNotificationChannel = "events"
) {
  const webhookUrl = webhookUrlFor(channel);
  if (!webhookUrl) {
    console.warn("Discord notification skipped: DISCORD_WEBHOOK_URL not set");
    return;
  }
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(content ? { content } : {}),
        ...(embeds ? { embeds } : {}),
      }),
    });
    if (!res.ok) {
      console.error(`Discord webhook returned ${res.status}: ${await res.text().catch(() => "")}`);
    }
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

function truncateDiscordField(value: string | null | undefined, max = 1000) {
  const text = value || "Unknown";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function getCheckoutTypeLabel(checkoutType: "subscription" | "one_time") {
  return checkoutType === "subscription" ? "Subscription" : "One-Time";
}

async function sendStripeEventEmbed(
  title: string,
  _description: string,
  color: number,
  fields: Array<{ name: string; value: string; inline?: boolean }>,
  channel: DiscordNotificationChannel = "events"
) {
  await sendDiscordNotification("", [{
    title,
    color,
    fields,
    footer: { text: "MyBingoCard • Stripe" },
    timestamp: new Date().toISOString(),
  }], channel);
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
  }], "signups");
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

export async function notifyFirstCard(name: string, email: string, cardTitle: string) {
  await sendDiscordNotification("", [{
    title: "🏆 First Bingo Card Created!",
    color: 0x10b981,
    fields: [
      { name: "User", value: name || "Unknown", inline: true },
      { name: "Email", value: email, inline: true },
      { name: "Card Title", value: cardTitle || "Untitled", inline: false },
    ],
    footer: { text: "MyBingoCard • Milestone" },
    timestamp: new Date().toISOString(),
  }], "signups");
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
  }], event === "activated" ? "signups" : "events");
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
    ],
    "signups"
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
  invoiceId: string,
  attemptCount?: number | null,
  nextPaymentAttempt?: Date | null
) {
  const fields = [
    { name: "User", value: name || "Unknown", inline: true },
    { name: "Email", value: email, inline: true },
    { name: "Product", value: product, inline: true },
    { name: "Amount", value: formatMoney(amount, currency), inline: true },
    { name: "Status", value: "Payment failed", inline: true },
    ...(attemptCount ? [{ name: "Attempt", value: String(attemptCount), inline: true }] : []),
    ...(nextPaymentAttempt
      ? [{ name: "Next Retry", value: nextPaymentAttempt.toISOString().split("T")[0] ?? nextPaymentAttempt.toISOString(), inline: true }]
      : []),
    { name: "Access", value: "Premium remains active while Stripe retries.", inline: false },
    { name: "Invoice ID", value: `\`${invoiceId}\``, inline: false },
  ];

  await sendStripeEventEmbed(
    "⚠️ Stripe Renewal Failed",
    "A recurring Stripe invoice payment failed.",
    0xef4444,
    fields
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
    ],
    "signups"
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

export async function notifyBatchSelected(
  email: string | null,
  batchCount: number,
  price: string,
  planType: string,
  isGuest: boolean
) {
  await sendDiscordNotification("", [{
    title: "📦 Batch Size Selected",
    color: 0x3b82f6,
    fields: [
      { name: "User", value: email || "Anonymous (not signed in)", inline: true },
      { name: "Plan", value: planType || "GUEST", inline: true },
      { name: "Batch Size", value: `${batchCount} cards`, inline: true },
      { name: "Price", value: price, inline: true },
      { name: "Guest?", value: isGuest ? "Yes" : "No", inline: true },
    ],
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifyExportButtonClicked(
  email: string | null,
  options: {
    source: string;
    exportType: string;
    cardTitle?: string | null;
    planType?: string | null;
    batchCount?: number | null;
    isGuest?: boolean;
  }
) {
  await sendDiscordNotification("", [{
    title: "📥 Export Button Clicked",
    color: 0x14b8a6,
    fields: [
      { name: "User", value: email || "Anonymous", inline: true },
      { name: "Source", value: options.source || "unknown", inline: true },
      { name: "Export", value: options.exportType || "unknown", inline: true },
      { name: "Plan", value: options.planType || "GUEST", inline: true },
      { name: "Batch Size", value: options.batchCount ? `${options.batchCount} cards` : "None", inline: true },
      { name: "Guest?", value: options.isGuest ? "Yes" : "No", inline: true },
      { name: "Card", value: options.cardTitle || "Untitled", inline: false },
    ],
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifyBatchButtonClicked(
  email: string | null,
  options: {
    action: string;
    source: string;
    batchCount?: number | null;
    price?: string | null;
    planType?: string | null;
    cardsPerPage?: number | null;
    grayscale?: boolean;
    isGuest?: boolean;
  }
) {
  await sendDiscordNotification("", [{
    title: "📦 Batch Button Clicked",
    color: 0xf59e0b,
    fields: [
      { name: "User", value: email || "Anonymous", inline: true },
      { name: "Action", value: options.action || "unknown", inline: true },
      { name: "Source", value: options.source || "unknown", inline: true },
      { name: "Batch Size", value: options.batchCount ? `${options.batchCount} cards` : "Unknown", inline: true },
      { name: "Price", value: options.price || "Unknown", inline: true },
      { name: "Plan", value: options.planType || "GUEST", inline: true },
      ...(options.cardsPerPage ? [{ name: "PDF Layout", value: `${options.cardsPerPage} per page`, inline: true }] : []),
      ...(typeof options.grayscale === "boolean" ? [{ name: "Grayscale", value: options.grayscale ? "Yes" : "No", inline: true }] : []),
      { name: "Guest?", value: options.isGuest ? "Yes" : "No", inline: true },
    ],
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifyTrialStarted(
  name: string,
  email: string,
  trialEndsAt: Date | null
) {
  await sendDiscordNotification("", [{
    title: "🆓 New Trial Started!",
    color: 0x10b981,
    fields: [
      { name: "Name", value: name || "Unknown", inline: true },
      { name: "Email", value: email, inline: true },
      { name: "Trial Ends", value: trialEndsAt ? trialEndsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Unknown", inline: true },
    ],
    timestamp: new Date().toISOString(),
  }], "signups");
}

export async function notifyTrialEndingSoon(
  email: string,
  name: string,
  trialEndsAt: Date
) {
  const daysRemaining = Math.max(
    0,
    Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  await sendStripeEventEmbed(
    "⏳ Trial Ending Soon",
    "A customer's trial period is about to expire.",
    0xf59e0b,
    [
      { name: "User", value: name || "Unknown", inline: true },
      { name: "Email", value: email, inline: true },
      { name: "Days Remaining", value: String(daysRemaining), inline: true },
      { name: "Trial Ends", value: trialEndsAt.toISOString().split("T")[0] ?? "", inline: true },
    ]
  );
}

export async function notifyCardExported(
  name: string,
  email: string,
  cardTitle: string,
  format: "pdf" | "png"
) {
  await sendDiscordNotification("", [{
    title: `📥 Card Exported as ${format.toUpperCase()}`,
    color: format === "pdf" ? 0xdc2626 : 0x7c3aed,
    fields: [
      { name: "User", value: name || "Unknown", inline: true },
      { name: "Email", value: email, inline: true },
      { name: "Format", value: format.toUpperCase(), inline: true },
      { name: "Card", value: cardTitle || "Untitled", inline: false },
    ],
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifyBatchPdfExported(
  name: string,
  email: string,
  options: {
    cardCount: number;
    cardsPerPage: number;
    grayscale: boolean;
    showCutLines: boolean;
    planType: string;
    firstCardTitle?: string | null;
  }
) {
  await sendDiscordNotification("", [{
    title: "📄 Batch PDF Exported",
    color: 0xdc2626,
    fields: [
      { name: "User", value: name || "Unknown", inline: true },
      { name: "Email", value: email, inline: true },
      { name: "Plan", value: options.planType || "Unknown", inline: true },
      { name: "Cards", value: String(options.cardCount), inline: true },
      { name: "Layout", value: `${options.cardsPerPage} per page`, inline: true },
      { name: "Grayscale", value: options.grayscale ? "Yes" : "No", inline: true },
      { name: "Cut Lines", value: options.showCutLines ? "Yes" : "No", inline: true },
      { name: "First Card", value: options.firstCardTitle || "Untitled", inline: false },
    ],
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifyTrialChurnRisk(
  email: string,
  name: string,
  trialDay: number,
  daysInactive: number,
  cardsCreated: number
) {
  await sendDiscordNotification("", [{
    title: "🚨 Trial Churn Risk Detected",
    color: 0xef4444,
    fields: [
      { name: "Name", value: name || "Unknown", inline: true },
      { name: "Email", value: email, inline: true },
      { name: "Trial Day", value: `Day ${trialDay} of 7`, inline: true },
      { name: "Inactive", value: `${daysInactive} day${daysInactive === 1 ? "" : "s"}`, inline: true },
      { name: "Cards Created", value: String(cardsCreated), inline: true },
    ],
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifyFirstAiGeneration(
  name: string,
  email: string,
  topic: string
) {
  await sendDiscordNotification("", [{
    title: "🤖 First AI Generation!",
    color: 0x8b5cf6,
    fields: [
      { name: "Name", value: name || "Unknown", inline: true },
      { name: "Email", value: email, inline: true },
      { name: "Topic", value: topic || "Unknown", inline: false },
    ],
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifyUpgradeDismissed(
  email: string | null,
  source: string,
  metadata?: Record<string, unknown>
) {
  const reasonLabels: Record<string, string> = {
    card_limit: "Card Limit Hit",
    premium_template: "Premium Template",
    image_picker: "Image Picker",
    modal: "Upgrade Modal",
  };
  const fields = [
    { name: "User", value: email || "Anonymous", inline: true },
    { name: "Reason", value: reasonLabels[source] || source, inline: true },
  ];
  if (metadata?.dismiss_method) {
    fields.push({ name: "Method", value: String(metadata.dismiss_method), inline: true });
  }
  if (typeof metadata?.duration_seconds === "number") {
    fields.push({ name: "Time on Modal", value: `${metadata.duration_seconds}s`, inline: true });
  }
  if (typeof metadata?.session_dismiss_count === "number") {
    fields.push({ name: "Session Dismissals", value: String(metadata.session_dismiss_count), inline: true });
  }
  await sendDiscordNotification("", [{
    title: "👋 Upgrade Dismissed",
    color: 0xf97316,
    fields,
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifyClientErrorSpike(options: {
  fingerprint: string;
  type: string;
  message: string;
  pageUrl?: string | null;
  source?: string | null;
  buildId?: string | null;
  recentCount: number;
  recentSessions: number;
  totalCount: number;
  severity: "low" | "medium" | "high";
  breadcrumbs?: Array<{ type?: string; message?: string; timestamp?: string }>;
}) {
  const adminUrl = `https://mybingocard.com/admin/errors?fingerprint=${encodeURIComponent(options.fingerprint)}`;
  const breadcrumbText = (options.breadcrumbs || [])
    .slice(-5)
    .map((crumb) => `${crumb.timestamp || ""} ${crumb.type || "event"}:${crumb.message || ""}`.trim())
    .filter(Boolean)
    .join("\n");

  await sendDiscordNotification("", [{
    title: options.severity === "high" ? "MyBingoCard High-Impact Error" : "MyBingoCard Error Spike",
    color: options.severity === "high" ? 0xef4444 : 0xf59e0b,
    fields: [
      { name: "Fingerprint", value: `\`${options.fingerprint}\``, inline: false },
      { name: "Type", value: truncateDiscordField(options.type, 256), inline: true },
      { name: "Severity", value: options.severity.toUpperCase(), inline: true },
      { name: "Build", value: truncateDiscordField(options.buildId || "unknown", 256), inline: true },
      { name: "Recent", value: `${options.recentCount} events / ${options.recentSessions} sessions`, inline: true },
      { name: "Total", value: String(options.totalCount), inline: true },
      { name: "Page", value: truncateDiscordField(options.pageUrl, 500), inline: false },
      { name: "Message", value: truncateDiscordField(options.message), inline: false },
      ...(options.source ? [{ name: "Source", value: truncateDiscordField(options.source, 500), inline: false }] : []),
      ...(breadcrumbText ? [{ name: "Breadcrumbs", value: truncateDiscordField(breadcrumbText), inline: false }] : []),
      { name: "Admin", value: adminUrl, inline: false },
    ],
    footer: { text: "MyBingoCard • Error Monitoring" },
    timestamp: new Date().toISOString(),
  }], "errors");
}

export async function notifyClientErrorCaptured(options: {
  fingerprint: string;
  type: string;
  message: string;
  pageUrl?: string | null;
  source?: string | null;
  buildId?: string | null;
  sessionId?: string | null;
  anonymousId?: string | null;
  severity: "low" | "medium" | "high";
  breadcrumbs?: Array<{ type?: string; message?: string; timestamp?: string }>;
}) {
  const adminUrl = `https://mybingocard.com/admin/errors?fingerprint=${encodeURIComponent(options.fingerprint)}`;
  const breadcrumbText = (options.breadcrumbs || [])
    .slice(-4)
    .map((crumb) => `${crumb.type || "event"}:${crumb.message || ""}`.trim())
    .filter(Boolean)
    .join(" -> ");

  await sendDiscordNotification("", [{
    title: "MyBingoCard Error Captured",
    color: options.severity === "high" ? 0xef4444 : options.severity === "medium" ? 0xf59e0b : 0x64748b,
    fields: [
      { name: "Fingerprint", value: `\`${options.fingerprint}\``, inline: false },
      { name: "Type", value: truncateDiscordField(options.type, 256), inline: true },
      { name: "Severity", value: options.severity.toUpperCase(), inline: true },
      { name: "Build", value: truncateDiscordField(options.buildId || "unknown", 256), inline: true },
      { name: "Page", value: truncateDiscordField(options.pageUrl, 500), inline: false },
      { name: "Message", value: truncateDiscordField(options.message), inline: false },
      ...(options.source ? [{ name: "Source", value: truncateDiscordField(options.source, 500), inline: false }] : []),
      { name: "Session", value: truncateDiscordField(options.sessionId || "unknown", 256), inline: true },
      { name: "Anonymous ID", value: truncateDiscordField(options.anonymousId || "unknown", 256), inline: true },
      ...(breadcrumbText ? [{ name: "Breadcrumbs", value: truncateDiscordField(breadcrumbText, 700), inline: false }] : []),
      { name: "Admin", value: adminUrl, inline: false },
    ],
    footer: { text: "MyBingoCard • Error Monitoring" },
    timestamp: new Date().toISOString(),
  }], "errors");
}

export async function notifyServerErrorCaptured(options: {
  type: string;
  message: string;
  stack?: string | null;
  path?: string | null;
  method?: string | null;
  routePath?: string | null;
  routeType?: string | null;
  routerKind?: string | null;
  digest?: string | null;
  buildId?: string | null;
}) {
  const fields = [
    { name: "Type", value: truncateDiscordField(options.type, 256), inline: true },
    { name: "Method", value: truncateDiscordField(options.method || "unknown", 256), inline: true },
    { name: "Build", value: truncateDiscordField(options.buildId || "unknown", 256), inline: true },
    { name: "Path", value: truncateDiscordField(options.path, 500), inline: false },
    { name: "Route", value: truncateDiscordField(options.routePath, 500), inline: false },
    { name: "Route Type", value: truncateDiscordField(options.routeType || "unknown", 256), inline: true },
    { name: "Router", value: truncateDiscordField(options.routerKind || "unknown", 256), inline: true },
    { name: "Message", value: truncateDiscordField(options.message), inline: false },
    ...(options.digest ? [{ name: "Digest", value: truncateDiscordField(options.digest, 256), inline: true }] : []),
    ...(options.stack ? [{ name: "Stack", value: truncateDiscordField(options.stack, 1000), inline: false }] : []),
  ];

  await sendDiscordNotification("", [{
    title: "MyBingoCard Server Error",
    color: 0xdc2626,
    fields,
    footer: { text: "MyBingoCard • Server Error Monitoring" },
    timestamp: new Date().toISOString(),
  }], "errors");
}
