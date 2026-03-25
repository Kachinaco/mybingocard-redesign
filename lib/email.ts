import nodemailer from "nodemailer";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://mybingocard.com").replace(/\/$/, "");
const fromAddress = process.env.EMAIL_FROM || "support@mybingocard.com";
const supportAddress = "support@mybingocard.com";
const port = Number(process.env.EMAIL_SERVER_PORT) || 587;

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port,
  secure: port === 465,
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

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

export function trackableUrl(url: string, email: string, campaignId: string, linkId?: string): string {
  const params = new URLSearchParams({
    e: email,
    c: campaignId,
    u: url,
  });
  if (linkId) params.set("l", linkId);
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

async function sendEmail(payload: EmailPayload): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: fromAddress,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
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
      "Create themed bingo cards in minutes.",
      "Share cards instantly with a simple link.",
      "Export to PDF and run games anywhere."
    ]), "violet")}
    <p style="margin:0;font-size:15px;color:#334155;">You are all set, ${escapeHtml(firstName)}. Start with your first card and invite players right away.</p>
  `;

  return sendEmail({
    to,
    subject,
    html: renderLayout({
      theme: "violet",
      preheader: "Welcome to MyBingoCard - start creating your first bingo card.",
      headline: `Welcome, ${firstName}`,
      intro: "Thanks for joining MyBingoCard. We built this to make fun, custom bingo experiences fast and easy.",
      bodyHtml,
      ctaLabel: "Create Your First Card",
      ctaUrl: `${appUrl}/create`,
      ctaHint: "Takes about 2 minutes to set up.",
    }),
    text: `Welcome, ${firstName}!\n\nThanks for joining MyBingoCard.\n\nYou can now:\n- Create themed bingo cards in minutes\n- Share cards instantly with a link\n- Export to PDF\n\nStart here: ${appUrl}/create\n\nNeed help? Reply to this email.`,
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
       <p style=\"margin:0;font-size:14px;\">Your premium features are now enabled across your account.</p>`,
      "emerald"
    )}
    ${renderBulletList([
      "Create unlimited cards and bigger game sets.",
      "Use advanced templates and export options.",
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
      ctaUrl: `${appUrl}/dashboard`,
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
      ctaUrl: `${appUrl}/pricing`,
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
      ctaUrl: `${appUrl}/settings`,
    }),
    text: `Hi ${firstName},\n\nPayment received: ${amount}.\n${nextBill ? `Current period ends: ${nextBill}.\n` : ""}\nManage billing: ${appUrl}/settings`,
  });
}

export async function sendBillingFailedEmail(
  to: string,
  name: string,
  amountCents: number,
  currency: string,
  manageBillingUrl: string
): Promise<boolean> {
  const firstName = getFirstName(name);
  const amount = formatMoney(amountCents, currency);
  const subject = "Payment failed - update your billing details";
  const bodyHtml = `
    ${renderPanel(
      `<p style=\"margin:0 0 8px;font-size:14px;\"><strong>Attempted charge:</strong> ${escapeHtml(amount)}</p>
       <p style=\"margin:0;font-size:14px;\">Update your card details to avoid service interruption.</p>`,
      "rose"
    )}
    ${renderBulletList([
      "Open billing settings.",
      "Update payment method.",
      "Retry the payment from Stripe portal if prompted."
    ])}
  `;

  return sendEmail({
    to,
    subject,
    html: renderLayout({
      theme: "rose",
      preheader: `We could not process your payment of ${amount}.`,
      headline: "Payment failed",
      intro: `Hi ${firstName}, we could not process your recent subscription payment.`,
      bodyHtml,
      ctaLabel: "Update Billing Details",
      ctaUrl: manageBillingUrl,
      ctaHint: "If payment is not updated, your plan may move to past due.",
    }),
    text: `Hi ${firstName},\n\nWe could not process your payment of ${amount}.\n\nUpdate billing details: ${manageBillingUrl}`,
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
          "Players join instantly from their phone — no app, no signup required",
          "Real-time calling, live score tracking, and instant bingo detection",
          "Perfect for classrooms, parties, team meetings, and game nights",
        ])}
        <p style="margin:16px 0 0 0;font-size:15px;color:#334155;">All you need is a bingo card and a room full of people.</p>
      `,
      ctaLabel: "Get your cards ready →",
      ctaUrl: "https://mybingocard.com/dashboard",
      ctaHint: "See you Friday 🎉",
    }),
    text: `Hi ${firstName},\n\nSomething exciting is dropping this Friday, March 13th.\n\nWe're launching Live Multiplayer Bingo Games.\n\nHere's what's coming:\n- Host a live bingo game from any card you've created\n- Players join instantly from their phone — no app, no signup required\n- Real-time calling, live score tracking, and instant bingo detection\n- Perfect for classrooms, parties, team meetings, and game nights\n\nGet your cards ready: https://mybingocard.com/dashboard\n\nSee you Friday!\n\n— The MyBingoCard Team`,
  });
}

export async function sendAbandonedCheckoutEmail(
  to: string,
  name: string,
  purchaseType: "subscription" | "batch_pack",
  batchCount?: number
): Promise<boolean> {
  const firstName = getFirstName(name);
  const isSubscription = purchaseType === "subscription";

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
        "Unlimited bingo cards — no cap, ever.",
        "Batch-generate up to 100 unique cards at once.",
        "HD PDF & PNG export for print-ready cards.",
        "Ad-free experience across your whole account.",
      ]
    : [
        `${batchCount ?? "Multiple"} unique shuffled cards from your item list.`,
        "Print-ready PDF export in seconds.",
        "Perfect for parties, classrooms, and game nights.",
      ];

  const ctaUrl = isSubscription ? `${appUrl}/pricing` : `${appUrl}/create`;
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
    }),
    text: isSubscription
      ? `Hi ${firstName},\n\nYou started upgrading to Premium but didn't finish.\n\nPremium includes:\n- Unlimited bingo cards\n- Batch-generate up to 100 cards at once\n- HD PDF & PNG export\n- Ad-free experience\n\nComplete your upgrade: ${appUrl}/pricing\n\nQuestions? Reply to this email.`
      : `Hi ${firstName},\n\nYou were close to generating ${batchCount ? `${batchCount} unique bingo cards` : "your card batch"}.\n\nHead back to finish: ${appUrl}/create\n\nQuestions? Reply to this email.`,
  });
}
