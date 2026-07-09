import { sendSmtpMail, type SmtpMail } from "@/lib/smtp";
import { recordEmailMessageSent } from "@/lib/db/email-marketing";
import crypto from "node:crypto";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://mybingocard.com").replace(/\/$/, "");
const fromAddress = process.env.EMAIL_FROM || "support@mybingocard.com";
const supportAddress = "support@mybingocard.com";
const EMAIL_ID_PLACEHOLDER = "__MBC_EMAIL_ID__";
type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
  campaignId?: string;
  // When true, adds List-Unsubscribe + List-Unsubscribe-Post headers so
  // Gmail/Apple Mail/Yahoo show their native one-click unsubscribe button.
  // Required by Gmail's Feb 2024 bulk sender rules. Set ONLY for marketing
  // mail — never for auth/billing/receipts that the user must always receive.
  marketing?: boolean;
};

function buildUnsubscribeHeaders(to: string): Record<string, string> {
  const url = `${appUrl}/api/unsubscribe?email=${encodeURIComponent(to)}`;
  const mailto = `mailto:unsubscribe@mybingocard.com?subject=unsubscribe%20${encodeURIComponent(to)}`;
  return {
    "List-Unsubscribe": `<${url}>, <${mailto}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

type Theme = "violet" | "emerald" | "rose" | "slate";

type ThemePalette = {
  top: string;
  badge: string;
  button: string;
  softBg: string;
  softBorder: string;
  softText: string;
};

const THEMES: Record<Theme, ThemePalette> = {
  violet: {
    top: "#312e81",
    badge: "#818cf8",
    button: "#4f46e5",
    softBg: "#eef2ff",
    softBorder: "#c7d2fe",
    softText: "#312e81",
  },
  emerald: {
    top: "#065f46",
    badge: "#34d399",
    button: "#059669",
    softBg: "#ecfdf5",
    softBorder: "#a7f3d0",
    softText: "#065f46",
  },
  rose: {
    top: "#9f1239",
    badge: "#fb7185",
    button: "#e11d48",
    softBg: "#fff1f2",
    softBorder: "#fecdd3",
    softText: "#881337",
  },
  slate: {
    top: "#0f172a",
    badge: "#94a3b8",
    button: "#334155",
    softBg: "#f1f5f9",
    softBorder: "#cbd5e1",
    softText: "#0f172a",
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getFirstName(name?: string): string {
  if (!name) return "there";
  const trimmed = name.trim();
  if (!trimmed) return "there";
  return trimmed.split(" ")[0] || "there";
}

function formatMoney(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "USD").toUpperCase(),
  }).format((amountCents || 0) / 100);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function trackableUrl(url: string, email: string, campaignId: string, linkId?: string, emailId?: string): string {
  const params = new URLSearchParams({
    e: email,
    c: campaignId,
    u: url,
  });
  if (linkId) params.set("l", linkId);
  params.set("mid", emailId || EMAIL_ID_PLACEHOLDER);
  return `${appUrl}/api/track/click?${params.toString()}`;
}

function renderButton(label: string, url: string, color: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0;">
      <tr>
        <td style="border-radius:10px;background:${color};">
          <a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 20px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>
  `;
}

function renderPanel(content: string, theme: Theme): string {
  const palette = THEMES[theme];
  return `
    <div style="margin:18px 0;padding:16px;border:1px solid ${palette.softBorder};background:${palette.softBg};border-radius:12px;color:${palette.softText};">
      ${content}
    </div>
  `;
}

function renderLayout(options: {
  theme: Theme;
  preheader: string;
  headline: string;
  intro: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  ctaHint?: string;
  footerNote?: string;
  email?: string;
  campaignId?: string;
  emailId?: string;
}): string {
  const palette = THEMES[options.theme];
  const ctaSection = options.ctaLabel && options.ctaUrl
    ? `
      <div style="margin-top:24px;">${renderButton(options.ctaLabel, options.ctaUrl, palette.button)}</div>
      ${options.ctaHint ? `<p style="margin:10px 0 0;font-size:13px;color:#64748b;">${escapeHtml(options.ctaHint)}</p>` : ""}
    `
    : "";

  const footerNote = options.footerNote
    ? `<p style="margin:16px 0 0;font-size:13px;color:#64748b;">${escapeHtml(options.footerNote)}</p>`
    : "";

  const trackingPixel = options.email && options.campaignId
    ? `<img src="${appUrl}/api/track/open?e=${encodeURIComponent(options.email)}&c=${encodeURIComponent(options.campaignId)}&mid=${encodeURIComponent(options.emailId || EMAIL_ID_PLACEHOLDER)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`
    : "";

  return `
<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(options.headline)}</title>
  </head>
  <body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(options.preheader)}</div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;">
            <tr>
              <td style="background:${palette.top};padding:24px 28px;border-radius:20px 20px 0 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <div style="font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#e2e8f0;">MyBingoCard</div>
                      <div style="margin-top:8px;font-size:25px;line-height:1.25;font-weight:800;color:#ffffff;">${escapeHtml(options.headline)}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:14px;">
                      <span style="display:inline-block;padding:6px 10px;border-radius:999px;background:${palette.badge};color:#0f172a;font-size:12px;font-weight:700;">Creative Bingo Tools</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="background:#ffffff;border:1px solid #e2e8f0;border-top:0;padding:28px;border-radius:0 0 20px 20px;">
                <p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#334155;">${escapeHtml(options.intro)}</p>
                ${options.bodyHtml}
                ${ctaSection}
                <div style="margin-top:28px;padding-top:18px;border-top:1px solid #e2e8f0;">
                  <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
                    Need help? Reply to this email or contact us at <a href="mailto:${supportAddress}" style="color:#4f46e5;text-decoration:none;">${supportAddress}</a>.
                  </p>
                  ${footerNote}
                  <p style="margin:14px 0 0;font-size:12px;color:#94a3b8;">${escapeHtml(appUrl)}</p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    ${trackingPixel}
  </body>
</html>
  `;
}

function renderBulletList(items: string[]): string {
  return `
    <ul style="margin:0;padding:0 0 0 18px;color:#334155;line-height:1.7;font-size:15px;">
      ${items.map((item) => `<li style=\"margin:0 0 8px;\">${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function extractCampaignIdFromHtml(html: string): string | undefined {
  const openPixelMatch = html.match(/\/api\/track\/open\?[^"']*[?&]c=([^"&]+)/);
  const anyTrackingMatch = html.match(/[?&]c=([^"&]+)/);
  const value = openPixelMatch?.[1] || anyTrackingMatch?.[1];
  return value ? decodeURIComponent(value) : undefined;
}

function addVisibleUnsubscribe(html: string, email: string): string {
  const unsubscribeUrl = `${appUrl}/unsubscribe?email=${encodeURIComponent(email)}`;
  const block = `
    <div style="max-width:640px;margin:16px auto 0;text-align:center;font-size:12px;line-height:1.6;color:#94a3b8;">
      You are receiving this because you signed up for MyBingoCard or created a bingo card.
      <a href="${escapeHtml(unsubscribeUrl)}" style="color:#64748b;text-decoration:underline;">Unsubscribe from marketing emails</a>.
    </div>
  `;

  return html.includes("</body>")
    ? html.replace("</body>", `${block}\n  </body>`)
    : `${html}${block}`;
}

async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const emailId = crypto.randomUUID();
  const sentAt = new Date();
  const campaignId = payload.campaignId || extractCampaignIdFromHtml(payload.html);
  const trackedHtml = payload.html.replaceAll(encodeURIComponent(EMAIL_ID_PLACEHOLDER), encodeURIComponent(emailId));
  const html = payload.marketing ? addVisibleUnsubscribe(trackedHtml, payload.to) : trackedHtml;
  const headers = {
    ...(payload.marketing ? buildUnsubscribeHeaders(payload.to) : {}),
    "X-MyBingoCard-Email-ID": emailId,
    ...(campaignId ? { "X-MyBingoCard-Campaign": campaignId } : {}),
  };

  try {
    const result = await sendSmtpMail({
      from: fromAddress,
      to: payload.to,
      subject: payload.subject,
      html,
      text: payload.text,
      headers,
    });
    if (campaignId) {
      try {
        await recordEmailMessageSent({
          emailId,
          messageId: result.messageId,
          email: payload.to,
          campaignId,
          subject: payload.subject,
          sentAt,
        });
      } catch (trackingError) {
        console.error("Failed to record email tracking row:", trackingError);
      }
    }
    console.log(`Email sent to ${payload.to}: ${payload.subject}`);
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${payload.to}:`, error);
    return false;
  }
}

export async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  const firstName = getFirstName(name);
  const subject = "Welcome to MyBingoCard!";
  const bodyHtml = `
    ${renderPanel(renderBulletList([
      "Make themed bingo cards in minutes.",
      "Save one card, customize it, and export an individual PDF or PNG for free.",
      "Use printable batch packs, paid sharing, or Premium hosting when you need larger sets or live games."
    ]), "violet")}
    <p style="margin:0;font-size:15px;color:#334155;">You are all set, ${escapeHtml(firstName)}. Start with your first card, then add paid batches, sharing, or hosting only when you need it.</p>
  `;

  return sendEmail({
    to,
    subject,
    html: renderLayout({
      theme: "violet",
      preheader: "Welcome to MyBingoCard - create your first bingo card.",
      headline: `Welcome, ${firstName}`,
      intro: "Thanks for joining MyBingoCard. We built this to make fun, custom bingo experiences fast and easy.",
      bodyHtml,
      ctaLabel: "Create Your First Card",
      ctaUrl: trackableUrl(`${appUrl}/create`, to, "welcome", "main_cta"),
      ctaHint: "Takes about 2 minutes to set up.",
      email: to,
      campaignId: "welcome",
    }),
    text: `Welcome, ${firstName}!\n\nThanks for joining MyBingoCard.\n\nYou can now:\n- Make themed bingo cards in minutes\n- Save one card, customize it, and export an individual PDF or PNG for free\n- Use printable batch packs, paid sharing, or Premium hosting when you need larger sets or live games\n\nStart here: ${appUrl}/create\n\nNeed help? Reply to this email.`,
    marketing: true,
  });
}

export async function sendMagicLinkEmail(to: string, url: string): Promise<boolean> {
  const subject = "Your MyBingoCard sign-in link";
  const bodyHtml = `
    ${renderPanel(
      `<p style=\"margin:0;font-size:14px;line-height:1.65;\">For security, this link expires automatically and can only be used to sign in to your account.</p>`,
      "violet"
    )}
    <p style="margin:0;font-size:14px;line-height:1.65;color:#475569;word-break:break-all;">If the button below does not work, copy and paste this URL into your browser:<br /><a href="${escapeHtml(url)}" style="color:#4f46e5;text-decoration:none;">${escapeHtml(url)}</a></p>
  `;

  return sendEmail({
    to,
    subject,
    html: renderLayout({
      theme: "violet",
      preheader: "Your secure MyBingoCard sign-in link is ready.",
      headline: "Sign in securely",
      intro: "Use your secure sign-in link below to access your MyBingoCard account.",
      bodyHtml,
      ctaLabel: "Sign In",
      ctaUrl: url,
      ctaHint: "If you did not request this, you can ignore this email.",
      email: to,
      campaignId: "magic-link",
    }),
    text: `Sign in to MyBingoCard\n\nUse this secure link to sign in:\n${url}\n\nThis link expires automatically. If you did not request it, ignore this email.`,
  });
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string): Promise<boolean> {
  const firstName = getFirstName(name);
  const subject = "Reset your MyBingoCard password";
  const bodyHtml = `
    ${renderPanel(
      `<p style=\"margin:0;font-size:14px;line-height:1.65;\"><strong>Security notice:</strong> This reset link is valid for 1 hour only.</p>`,
      "rose"
    )}
    <p style="margin:0;font-size:15px;color:#334155;">Hi ${escapeHtml(firstName)}, if this was not you, no action is needed and your password will remain unchanged.</p>
  `;

  return sendEmail({
    to,
    subject,
    html: renderLayout({
      theme: "rose",
      preheader: "Reset your MyBingoCard password.",
      headline: "Password reset requested",
      intro: `We received a request to reset your password, ${firstName}.`,
      bodyHtml,
      ctaLabel: "Reset Password",
      ctaUrl: resetUrl,
      ctaHint: "This link expires in 1 hour.",
      email: to,
      campaignId: "password-reset",
    }),
    text: `Hi ${firstName},\n\nWe received a request to reset your MyBingoCard password.\n\nReset link (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
  });
}

export async function sendSubscriptionActivatedEmail(to: string, name: string, planName: string): Promise<boolean> {
  const firstName = getFirstName(name);
  const subject = `Your ${planName} plan is active`;
  const bodyHtml = `
    ${renderPanel(
      `<p style=\"margin:0 0 10px;font-size:14px;\"><strong>Plan:</strong> ${escapeHtml(planName)}</p>
       <p style=\"margin:0;font-size:14px;\">Your paid batch, sharing, and hosting features are now enabled across your account.</p>`,
      "emerald"
    )}
    ${renderBulletList([
      "Generate printable batches and host live bingo rooms.",
      "Send direct player links.",
      "Use paid sharing workflows for groups.",
      "Manage your billing anytime from settings."
    ])}
  `;

  return sendEmail({
    to,
    subject,
    html: renderLayout({
      theme: "emerald",
      preheader: `Your ${planName} plan is now active.`,
      headline: `${planName} plan activated`,
      intro: `Great news ${firstName}, your subscription upgrade is complete.`,
      bodyHtml,
      ctaLabel: "Open Dashboard",
      ctaUrl: trackableUrl(`${appUrl}/dashboard`, to, "subscription_activated", "main_cta"),
      email: to,
      campaignId: "subscription-activated",
    }),
    text: `Hi ${firstName},\n\nYour ${planName} plan is now active.\n\nOpen dashboard: ${appUrl}/dashboard\nManage billing: ${appUrl}/settings`,
  });
}

export async function sendSubscriptionCanceledEmail(
  to: string,
  name: string,
  currentPeriodEnd?: Date | null
): Promise<boolean> {
  const firstName = getFirstName(name);
  const renewalText = currentPeriodEnd
    ? `You will keep premium access through ${formatDate(currentPeriodEnd)}.`
    : "Your subscription has been canceled.";
  const subject = "Your MyBingoCard subscription was canceled";
  const bodyHtml = `
    ${renderPanel(`<p style=\"margin:0;font-size:14px;\">${escapeHtml(renewalText)}</p>`, "slate")}
    <p style="margin:0;font-size:15px;color:#334155;">If you want to reactivate later, your account and existing cards will still be here.</p>
  `;

  return sendEmail({
    to,
    subject,
    html: renderLayout({
      theme: "slate",
      preheader: "Your subscription status has changed.",
      headline: "Subscription canceled",
      intro: `Hi ${firstName}, we confirmed your cancellation request.`,
      bodyHtml,
      ctaLabel: "View Plans",
      ctaUrl: trackableUrl(`${appUrl}/pricing`, to, "subscription_canceled", "main_cta"),
      email: to,
      campaignId: "subscription-canceled",
    }),
    text: `Hi ${firstName},\n\n${renewalText}\n\nView plans: ${appUrl}/pricing`,
  });
}

export async function sendBillingSuccessEmail(
  to: string,
  name: string,
  amountCents: number,
  currency: string,
  currentPeriodEnd?: Date | null
): Promise<boolean> {
  const firstName = getFirstName(name);
  const amount = formatMoney(amountCents, currency);
  const nextBill = currentPeriodEnd ? formatDate(currentPeriodEnd) : null;
  const subject = "Payment received - MyBingoCard";
  const bodyHtml = `
    ${renderPanel(
      `<p style=\"margin:0 0 8px;font-size:14px;\"><strong>Amount received:</strong> ${escapeHtml(amount)}</p>
       ${nextBill ? `<p style=\"margin:0;font-size:14px;\"><strong>Current period ends:</strong> ${escapeHtml(nextBill)}</p>` : ""}`,
      "emerald"
    )}
    <p style="margin:0;font-size:15px;color:#334155;">Thanks ${escapeHtml(firstName)}. Your subscription remains active with no action needed.</p>
  `;

  return sendEmail({
    to,
    subject,
    html: renderLayout({
      theme: "emerald",
      preheader: `We received your payment of ${amount}.`,
      headline: "Payment confirmed",
      intro: "Your latest billing payment was processed successfully.",
      bodyHtml,
      ctaLabel: "Manage Billing",
      ctaUrl: trackableUrl(`${appUrl}/settings`, to, "billing_success", "main_cta"),
      email: to,
      campaignId: "billing-success",
    }),
    text: `Hi ${firstName},\n\nPayment received: ${amount}.\n${nextBill ? `Current period ends: ${nextBill}.\n` : ""}\nManage billing: ${appUrl}/settings`,
  });
}

export async function sendBillingFailedEmail(
  to: string,
  name: string,
  amountCents: number,
  currency: string,
  manageBillingUrl: string,
  attemptCount?: number | null,
  nextPaymentAttempt?: Date | null
): Promise<boolean> {
  const firstName = getFirstName(name);
  const amount = formatMoney(amountCents, currency);
  const subject = "We couldn't process your MyBingoCard payment";
  const retryLine = nextPaymentAttempt
    ? `Stripe will retry this payment around ${formatDate(nextPaymentAttempt)}.`
    : "Stripe may retry this payment automatically.";
  const bodyHtml = `
    ${renderPanel(
      `<p style=\"margin:0 0 8px;font-size:14px;\"><strong>Attempted charge:</strong> ${escapeHtml(amount)}</p>
       ${attemptCount ? `<p style=\"margin:0 0 8px;font-size:14px;\"><strong>Attempt:</strong> ${escapeHtml(String(attemptCount))}</p>` : ""}
       <p style=\"margin:0;font-size:14px;\">${escapeHtml(retryLine)}</p>`,
      "rose"
    )}
    ${renderBulletList([
      "Open billing settings.",
      "Update payment method.",
      "Your Premium access stays available while Stripe retries the payment."
    ])}
  `;

  return sendEmail({
    to,
    subject,
    html: renderLayout({
      theme: "rose",
      preheader: `We could not process your payment of ${amount}.`,
      headline: "Payment needs attention",
      intro: `Hi ${firstName}, we could not process your recent subscription payment.`,
      bodyHtml,
      ctaLabel: "Update Billing Details",
      ctaUrl: trackableUrl(manageBillingUrl, to, "billing_failed", "main_cta"),
      ctaHint: "This opens your billing settings securely.",
      email: to,
      campaignId: "billing-failed",
    }),
    text: `Hi ${firstName},\n\nWe could not process your payment of ${amount}.\n${attemptCount ? `Attempt: ${attemptCount}.\n` : ""}${retryLine}\n\nYour Premium access stays available while Stripe retries the payment.\n\nUpdate billing details: ${manageBillingUrl}`,
  });
}

export async function sendEmailVerificationEmail(to: string, name: string, verifyUrl: string): Promise<boolean> {
  const firstName = getFirstName(name);
  return sendEmail({
    to,
    subject: "Verify your MyBingoCard email address",
    html: renderLayout({
      theme: "violet",
      preheader: "One quick step to activate your MyBingoCard account.",
      headline: "Verify your email",
      intro: `Hi ${firstName}! Thanks for signing up — one more step to get started.`,
      bodyHtml: "",
      ctaLabel: "Verify Email Address",
      ctaUrl: verifyUrl,
      ctaHint: "This link expires in 24 hours. If you didn't sign up, you can ignore this email.",
      email: to,
      campaignId: "email-verification",
    }),
    text: `Hi ${firstName},\n\nThanks for signing up for MyBingoCard!\n\nVerify your email address:\n${verifyUrl}\n\nThis link expires in 24 hours. If you didn't sign up, you can ignore this email.`,
  });
}

export async function sendLiveGamesAnnouncementEmail(to: string, name: string): Promise<boolean> {
  const firstName = getFirstName(name);
  return sendEmail({
    to,
    subject: "🎯 Live Bingo Games are coming to MyBingoCard this Friday",
    html: renderLayout({
      theme: "violet",
      preheader: "Host real-time games with anyone, anywhere — launching in 3 days.",
      headline: "Live Bingo Games are coming Friday, March 13th",
      intro: `Hi ${firstName} — something exciting is dropping this Friday.`,
      bodyHtml: `
        ${renderPanel(
          `<p style="margin:0;font-size:15px;font-weight:bold;color:#1e1b4b;">We're launching Live Multiplayer Bingo Games — and you'll be one of the first to try it.</p>`,
          "violet"
        )}
        ${renderBulletList([
          "Host a live bingo game from any card you've created",
          "Players join from their phone without installing an app",
          "Real-time calling, live score tracking, and automatic bingo detection",
          "Perfect for classrooms, parties, team meetings, and game nights",
        ])}
        <p style="margin:16px 0 0 0;font-size:15px;color:#334155;">All you need is a bingo card and a room full of people.</p>
      `,
      ctaLabel: "Get your cards ready →",
      ctaUrl: "https://mybingocard.com/dashboard",
      ctaHint: "See you Friday 🎉",
      email: to,
      campaignId: "live-games-announcement",
    }),
    text: `Hi ${firstName},\n\nSomething exciting is dropping this Friday, March 13th.\n\nWe're launching Live Multiplayer Bingo Games.\n\nHere's what's coming:\n- Host a live bingo game from any card you've created\n- Players join from their phone without installing an app\n- Real-time calling, live score tracking, and automatic bingo detection\n- Perfect for classrooms, parties, team meetings, and game nights\n\nGet your cards ready: https://mybingocard.com/dashboard\n\nSee you Friday!\n\n— The MyBingoCard Team`,
    marketing: true,
  });
}

export async function sendAbandonedCheckoutEmail(
  to: string,
  name: string,
  purchaseType: "subscription" | "batch_pack" | "trial",
  batchCount?: number
): Promise<boolean> {
  const firstName = getFirstName(name);
  const isSubscription = purchaseType === "subscription" || purchaseType === "trial";

  const subject = isSubscription
    ? "Still thinking it over? Your Premium spot is waiting"
    : `Your ${batchCount ?? ""} card batch is still available`;

  const headline = isSubscription
    ? "You left before finishing"
    : "Your batch cards are a click away";

  const intro = isSubscription
    ? `Hi ${firstName}, we noticed you started upgrading to Premium but didn't complete it.`
    : `Hi ${firstName}, you were so close to generating ${batchCount ? `${batchCount} unique bingo cards` : "your card batch"}.`;

  const bulletItems = isSubscription
    ? [
        "Live bingo event hosting.",
        "Direct player links and email sharing.",
        "Unique shuffled cards per viewer.",
        "Paid sharing workflow for groups.",
      ]
    : [
        `${batchCount ?? "Multiple"} unique shuffled cards from your item list.`,
        "free PDF export in seconds.",
        "Perfect for parties, classrooms, and game nights.",
      ];

  const ctaUrl = isSubscription
    ? trackableUrl(`${appUrl}/pricing`, to, "abandoned_checkout", "upgrade_button")
    : trackableUrl(`${appUrl}/create`, to, "abandoned_checkout", "main_cta");
  const ctaLabel = isSubscription ? "Complete Upgrade →" : "Generate My Cards →";

  const bodyHtml = `
    ${renderPanel(renderBulletList(bulletItems), "violet")}
    <p style="margin:0;font-size:15px;color:#334155;">It only takes a minute to finish. Your card data and settings are still saved.</p>
  `;

  return sendEmail({
    to,
    subject,
    html: renderLayout({
      theme: "violet",
      preheader: isSubscription
        ? "Your Premium upgrade is incomplete — pick up where you left off."
        : `Your ${batchCount ?? ""} card batch is still waiting — finish checkout now.`,
      headline,
      intro,
      bodyHtml,
      ctaLabel,
      ctaUrl,
      ctaHint: "Questions? Just reply to this email.",
      email: to,
      campaignId: "abandoned-checkout",
    }),
    text: isSubscription
      ? `Hi ${firstName},\n\nYou started upgrading to Premium but didn't finish.\n\nPremium includes:\n- Live bingo event hosting\n- Direct player links and email sharing\n- Unique shuffled cards per viewer\n- Paid sharing workflow for groups\n\nComplete your upgrade: ${appUrl}/pricing\n\nQuestions? Reply to this email.`
      : `Hi ${firstName},\n\nYou were close to generating ${batchCount ? `${batchCount} unique bingo cards` : "your card batch"}.\n\nHead back to finish: ${appUrl}/create\n\nQuestions? Reply to this email.`,
    marketing: true,
  });
}

export async function sendCardComebackEmail(
  to: string,
  name: string,
  cardTitle: string,
  cardUrl: string
): Promise<boolean> {
  const firstName = getFirstName(name);
  const subject = "Your bingo card is ready to play";
  const ctaUrl = trackableUrl(cardUrl, to, "card_comeback_24h", "open_card");
  const bodyHtml = `
    ${renderPanel(renderBulletList([
      "Open the card and tap squares to play solo.",
      "Copy a share link for players.",
      "Export a PDF for free if you want to print it.",
    ]), "emerald")}
    <p style="margin:0;font-size:15px;color:#334155;">Your saved card is still in your dashboard whenever you need it.</p>
  `;

  return sendEmail({
    to,
    subject,
    html: renderLayout({
      theme: "emerald",
      preheader: "Open your saved MyBingoCard and run the game.",
      headline: "Ready when you are",
      intro: `Hi ${firstName}, your "${cardTitle || "bingo card"}" card is saved and ready.`,
      bodyHtml,
      ctaLabel: "Open My Card",
      ctaUrl,
      ctaHint: "You can play, share, or print from the card page.",
      email: to,
      campaignId: "card-comeback-24h",
    }),
    text: `Hi ${firstName},\n\nYour "${cardTitle || "bingo card"}" card is saved and ready.\n\nOpen it here: ${cardUrl}\n\nYou can play, share, or print from the card page.\n\nUnsubscribe: ${appUrl}/unsubscribe?email=${encodeURIComponent(to)}`,
    marketing: true,
  });
}

export async function sendAdminCustomEmail(
  to: string,
  subject: string,
  body: string
): Promise<boolean> {
  const bodyHtml = body
    .split("\n\n")
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#334155;">${escapeHtml(p)}</p>`)
    .join("");

  return sendEmail({
    to,
    subject,
    html: renderLayout({
      theme: "violet",
      preheader: subject,
      headline: subject,
      intro: "",
      bodyHtml,
      email: to,
      campaignId: "admin-custom",
    }),
    text: body,
    marketing: true,
  });
}

export async function sendSupportReplyEmail(
  to: string,
  subject: string,
  replyBody: string,
  inReplyTo?: string
): Promise<boolean> {
  const replySubject = subject.toLowerCase().startsWith("re:") ? subject : `Re: ${subject}`;
  const htmlBody = replyBody.replace(/\n/g, "<br />");

  try {
    const mailOptions: SmtpMail = {
      from: fromAddress,
      to,
      subject: replySubject,
      html: renderLayout({
        theme: "violet",
        preheader: replySubject,
        headline: replySubject,
        intro: "",
        bodyHtml: `<div style="font-size:15px;line-height:1.65;color:#334155;">${htmlBody}</div>`,
      }),
      text: replyBody,
    };
    if (inReplyTo) {
      mailOptions.inReplyTo = inReplyTo;
      mailOptions.references = inReplyTo;
    }
    await sendSmtpMail(mailOptions);
    console.log(`Support reply sent to ${to}: ${replySubject}`);
    return true;
  } catch (error) {
    console.error(`Failed to send support reply to ${to}:`, error);
    return false;
  }
}

export async function sendShareLinkInvitationEmail(
  to: string,
  recipientName: string | null | undefined,
  ownerName: string | null | undefined,
  linkUrl: string,
  cardTitle: string | null | undefined
): Promise<boolean> {
  if (!/^https?:\/\//i.test(linkUrl)) {
    console.error(
      `sendShareLinkInvitationEmail: refusing to send, invalid linkUrl protocol: ${linkUrl}`
    );
    return false;
  }

  const firstName = getFirstName(recipientName || "");
  const friendlyOwner = (ownerName && ownerName.trim()) || "Someone you know";
  const friendlyCardTitle = (cardTitle && cardTitle.trim()) || "a bingo card";
  const cleanedOwner =
    friendlyOwner.replace(/[\r\n\t]+/g, " ").slice(0, 60).trim() ||
    "Someone you know";
  const subject = `${cleanedOwner} sent you a bingo card to play`;

  const bodyHtml = `
    ${renderPanel(
      `<p style="margin:0 0 10px;font-size:14px;"><strong>From:</strong> ${escapeHtml(cleanedOwner)}</p>
       <p style="margin:0;font-size:14px;"><strong>Card:</strong> ${escapeHtml(friendlyCardTitle)}</p>`,
      "violet"
    )}
    <p style="margin:0 0 14px;font-size:15px;color:#334155;">Click the button below to open your card and start playing. You can sign in, or play as a guest — no account required.</p>
    <p style="margin:0;font-size:14px;line-height:1.65;color:#475569;word-break:break-all;">If the button does not work, copy and paste this link:<br /><a href="${escapeHtml(linkUrl)}" style="color:#4f46e5;text-decoration:none;">${escapeHtml(linkUrl)}</a></p>
  `;

  return sendEmail({
    to,
    subject,
    html: renderLayout({
      theme: "violet",
      preheader: `${cleanedOwner} sent you a bingo card to play on MyBingoCard.`,
      headline: `${cleanedOwner} invited you to play`,
      intro: `Hi ${firstName} — ${cleanedOwner} has sent you a personal link to play their bingo card.`,
      bodyHtml,
      ctaLabel: "Open My Card",
      ctaUrl: trackableUrl(linkUrl, to, "share-link-invitation", "open_card"),
      ctaHint: "Your link is unique to you and grants access to this specific card.",
      email: to,
      campaignId: "share-link-invitation",
    }),
    text: `Hi ${firstName},\n\n${cleanedOwner} sent you a bingo card to play: ${friendlyCardTitle}\n\nOpen your card: ${linkUrl}\n\nYou can sign in or play as a guest.`,
    marketing: true,
  });
}

export async function sendShareLinkSummaryEmail(
  to: string,
  ownerName: string | null,
  links: Array<{ linkId: string; cardTitle: string; linkUrl: string }>
): Promise<boolean> {
  const firstName = getFirstName(ownerName || "");
  const count = links.length;
  const subject = `Your ${count} MyBingoCard share link${count === 1 ? "" : "s"} ${count === 1 ? "is" : "are"} ready`;

  const linkRows = links
    .map(
      (link) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
            <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#0f172a;">${escapeHtml(link.cardTitle || "Bingo card")}</p>
            <p style="margin:0;font-size:13px;line-height:1.55;color:#475569;word-break:break-all;">
              <a href="${escapeHtml(link.linkUrl)}" style="color:#4f46e5;text-decoration:none;">${escapeHtml(link.linkUrl)}</a>
            </p>
          </td>
        </tr>
      `
    )
    .join("");

  const bodyHtml = `
    ${renderPanel(
      `<p style="margin:0;font-size:14px;"><strong>${count}</strong> share link${count === 1 ? "" : "s"} generated and ready to send out. Copy any link below and share it directly with a player, or manage everything from your dashboard.</p>`,
      "violet"
    )}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 0;">
      ${linkRows}
    </table>
  `;

  const plainTextLinks = links
    .map((link) => `- ${link.cardTitle || "Bingo card"}: ${link.linkUrl}`)
    .join("\n");

  return sendEmail({
    to,
    subject,
    html: renderLayout({
      theme: "violet",
      preheader: `Your ${count} MyBingoCard share link${count === 1 ? "" : "s"} ${count === 1 ? "is" : "are"} ready to share.`,
      headline: `${count} share link${count === 1 ? "" : "s"} ready`,
      intro: `Hi ${firstName}, your share links have been generated and are ready to hand out.`,
      bodyHtml,
      ctaLabel: "Open Share Links Dashboard",
      ctaUrl: trackableUrl(
        `${appUrl}/dashboard/share-links`,
        to,
        "share-link-summary",
        "dashboard"
      ),
      ctaHint: "You can copy, track, and resend any of these links from the dashboard.",
      email: to,
      campaignId: "share-link-summary",
    }),
    text: `Hi ${firstName},\n\nYour ${count} MyBingoCard share link${count === 1 ? "" : "s"} ${count === 1 ? "is" : "are"} ready.\n\n${plainTextLinks}\n\nManage everything: ${appUrl}/dashboard/share-links`,
    marketing: true,
  });
}

export async function sendCardLimitEmail(to: string, name: string) {
  const firstName = escapeHtml((name || "there").split(/\s/)[0] || "there");

  return sendEmail({
    to,
    subject: `${firstName}, unlock Premium bingo features`,
    html: renderLayout({
      theme: "violet",
      preheader: "Upgrade to Premium for batches, live hosting, and direct player sharing.",
      headline: "Unlock Premium bingo features",
      intro: `Hey ${firstName}, Premium gives you printable batches, paid sharing, and hosting tools for player-ready bingo events.`,
      bodyHtml: `
        ${renderPanel(renderBulletList([
          "Live bingo event rooms",
          "Printable batches up to 500 cards",
          "Direct player links and email sharing",
          "Unique shuffled cards per viewer",
          "Paid sharing workflow for groups",
          "Priority support",
        ]), "violet")}
        <p style="margin:0;font-size:15px;color:#334155;">Upgrade takes 30 seconds and you can start creating right away.</p>`,
      ctaLabel: "Upgrade to Premium →",
      ctaUrl: trackableUrl(`${appUrl}/pricing?utm_source=mybingocard&utm_medium=email&utm_campaign=card_limit_hit`, to, "card_limit", "upgrade_button"),
      ctaHint: "Just reply to this email if you have questions.",
      email: to,
      campaignId: "card-limit",
    }),
    text: `Hey ${firstName},\n\nPremium gives you printable batches up to 500 cards, live bingo event hosting, direct player links, email sharing, unique shuffled cards per viewer, and paid sharing workflows for groups.\n\nUpgrade here: ${appUrl}/pricing\n\nQuestions? Reply to this email.`,
    marketing: true,
  });
}
