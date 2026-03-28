const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { MongoClient } = require('mongodb');

const envPath = path.join(__dirname, '..', '.env.local');
try {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) return;
    const key = match[1].trim();
    const value = match[2].trim();
    if (!process.env[key]) process.env[key] = value;
  });
} catch (error) {
  console.error('Could not load .env.local:', error.message);
}

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://mybingocard.com').replace(/\/$/, '');
const FROM_ADDRESS = process.env.EMAIL_FROM || 'MyBingoCard <support@mybingocard.com>';
const SUPPORT_ADDRESS = 'support@mybingocard.com';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mybingocard';
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const configuredMaxAgeDays = Number(process.env.ABANDONED_CHECKOUT_MAX_AGE_DAYS || 7);
const MAX_CHECKOUT_AGE_DAYS = Number.isFinite(configuredMaxAgeDays) ? configuredMaxAgeDays : 7;
const MAX_CHECKOUT_AGE_MS = MAX_CHECKOUT_AGE_DAYS * 24 * 60 * 60 * 1000;
const DRY_RUN = process.env.DRY_RUN === '1';
const TARGET_EMAIL = normalizeEmail(process.env.TARGET_EMAIL || '');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST || 'smtp.porkbun.com',
  port: Number(process.env.EMAIL_SERVER_PORT) || 587,
  secure: Number(process.env.EMAIL_SERVER_PORT) === 465,
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function firstName(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return 'there';
  return trimmed.split(' ')[0] || 'there';
}

function planName(planType) {
  if (planType === 'PREMIUM') return 'Premium';
  if (!planType) return 'Premium';
  return String(planType)
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function appendUtmParams(url, campaignId) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('mybingocard.com') && parsed.hostname !== 'localhost') return url;
    parsed.searchParams.set('utm_source', 'mybingocard');
    parsed.searchParams.set('utm_medium', 'email');
    parsed.searchParams.set('utm_campaign', campaignId || 'abandoned_checkout');
    return parsed.toString();
  } catch (_) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}utm_source=mybingocard&utm_medium=email&utm_campaign=${encodeURIComponent(campaignId || 'abandoned_checkout')}`;
  }
}

function button(label, url, color) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0 0;"><tr><td style="border-radius:12px;background:${color};"><a href="${escapeHtml(url)}" style="display:inline-block;padding:13px 22px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">${escapeHtml(label)}</a></td></tr></table>`;
}

function bulletList(items) {
  return `<ul style="margin:0;padding:0 0 0 18px;color:#334155;font-size:15px;line-height:1.7;">${items.map((item) => `<li style="margin:0 0 8px;">${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function panel(content, colors) {
  return `<div style="margin:20px 0;padding:16px;border:1px solid ${colors.border};background:${colors.bg};border-radius:14px;color:${colors.text};">${content}</div>`;
}

function wrapEmail({ email, campaignId, headline, preheader, intro, bodyHtml, ctaLabel, ctaUrl, ctaHint, accent, footerNote }) {
  const unsubscribeUrl = `${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}`;
  const openPixelUrl = `${APP_URL}/api/track/open?e=${encodeURIComponent(email)}&c=${encodeURIComponent(campaignId)}`;
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(headline)}</title>
  </head>
  <body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;">
            <tr>
              <td style="background:${accent.top};padding:24px 28px;border-radius:22px 22px 0 0;">
                <div style="font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#e2e8f0;">MyBingoCard</div>
                <div style="margin-top:8px;font-size:27px;line-height:1.25;font-weight:800;color:#ffffff;">${escapeHtml(headline)}</div>
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;border:1px solid #e2e8f0;border-top:0;padding:28px;border-radius:0 0 22px 22px;">
                <p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#334155;">${escapeHtml(intro)}</p>
                ${bodyHtml}
                ${ctaLabel && ctaUrl ? button(ctaLabel, ctaUrl, accent.button) : ''}
                ${ctaHint ? `<p style="margin:12px 0 0;font-size:13px;color:#64748b;">${escapeHtml(ctaHint)}</p>` : ''}
                <div style="margin-top:28px;padding-top:18px;border-top:1px solid #e2e8f0;">
                  <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
                    Need help? Reply to this email or contact <a href="mailto:${SUPPORT_ADDRESS}" style="color:${accent.button};text-decoration:none;">${SUPPORT_ADDRESS}</a>.
                  </p>
                  ${footerNote ? `<p style="margin:14px 0 0;font-size:13px;color:#64748b;">${escapeHtml(footerNote)}</p>` : ''}
                  <p style="margin:14px 0 0;font-size:12px;color:#94a3b8;">
                    <a href="${escapeHtml(unsubscribeUrl)}" style="color:#94a3b8;text-decoration:none;">Unsubscribe</a> from reminder emails.
                  </p>
                </div>
                <img src="${escapeHtml(openPixelUrl)}" width="1" height="1" style="display:none;" alt="" />
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildTwoHourReminder({ email, name, planType }) {
  const displayPlan = planName(planType);
  const userFirstName = firstName(name);
  const campaignId = 'abandoned_checkout_2h';
  const ctaUrl = appendUtmParams(`${APP_URL}/pricing`, campaignId);
  const bodyHtml = `
    ${panel(
      `<p style="margin:0 0 10px;font-size:14px;"><strong>Plan:</strong> ${escapeHtml(displayPlan)}</p>
       <p style="margin:0;font-size:14px;">You were close to finishing your upgrade. If you still want the extra features, you can jump back in any time.</p>`,
      { bg: '#eef2ff', border: '#c7d2fe', text: '#312e81' }
    )}
    ${bulletList([
      'Create unlimited bingo cards without hitting the free plan cap.',
      'Unlock premium templates, HD export, and custom fonts and colors.',
      'Pick up where you left off in just a minute or two.',
    ])}
    <p style="margin:18px 0 0;font-size:15px;line-height:1.7;color:#334155;">If something felt off during checkout, reply and tell us what happened. We can usually fix it quickly.</p>
  `;

  return {
    reminderType: 'two_hours',
    campaignId,
    subject: 'Your Premium upgrade is still waiting',
    html: wrapEmail({
      email,
      campaignId,
      headline: 'Finish your Premium upgrade',
      preheader: 'Your checkout is still there if you want to keep going.',
      intro: `Hi ${userFirstName}, you started upgrading to ${displayPlan} but did not finish checkout.`,
      bodyHtml,
      ctaLabel: 'Complete My Upgrade',
      ctaUrl,
      ctaHint: 'You can review the plan again before paying.',
      accent: {
        top: '#312e81',
        button: '#4f46e5',
      },
      footerNote: 'We only send this when you start a paid checkout and do not complete it.',
    }),
    text: `Hi ${userFirstName},\n\nYou started upgrading to ${displayPlan} but did not finish checkout.\n\nPremium gives you:\n- Unlimited bingo cards\n- Premium templates, HD export, and custom fonts/colors\n- A faster path back into your saved work\n\nFinish your upgrade: ${ctaUrl}\n\nIf something felt off during checkout, reply to this email and we will help.\n\nUnsubscribe from reminder emails: ${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}`,
  };
}

function buildTwoDayReminder({ email, name, planType }) {
  const displayPlan = planName(planType);
  const userFirstName = firstName(name);
  const campaignId = 'abandoned_checkout_2d';
  const ctaUrl = appendUtmParams(`${APP_URL}/pricing`, campaignId);
  const bodyHtml = `
    ${panel(
      `<p style="margin:0 0 10px;font-size:14px;"><strong>${escapeHtml(displayPlan)} unlocks:</strong></p>
       ${bulletList([
         'Unlimited cards and larger batch exports',
         'Premium templates with better customization',
         'HD export and a cleaner, ad-free workflow',
       ])}`,
      { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46' }
    )}
    <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#334155;">If you were comparing plans, waiting on a card, or hit a payment issue, just reply. We read these and can help you finish the upgrade or answer questions.</p>
    <p style="margin:0;font-size:15px;line-height:1.7;color:#334155;">No pressure if you decided to stay on free. Your account and cards are still there whenever you need them.</p>
  `;

  return {
    reminderType: 'two_days',
    campaignId,
    subject: 'Still interested in Premium?',
    html: wrapEmail({
      email,
      campaignId,
      headline: 'Need a hand finishing your upgrade?',
      preheader: 'If you still want Premium, your account is ready.',
      intro: `Hi ${userFirstName}, it has been a couple of days since you started upgrading to ${displayPlan}.`,
      bodyHtml,
      ctaLabel: 'View Premium Again',
      ctaUrl,
      ctaHint: 'You can always stay on the free plan if that is the better fit.',
      accent: {
        top: '#065f46',
        button: '#059669',
      },
      footerNote: 'Reply if there was anything unclear in checkout or pricing.',
    }),
    text: `Hi ${userFirstName},\n\nIt has been a couple of days since you started upgrading to ${displayPlan}.\n\nPremium includes:\n- Unlimited cards and larger batch exports\n- Premium templates and better customization\n- HD export and an ad-free workflow\n\nTake another look: ${ctaUrl}\n\nNo pressure if you decided to stay on free. Your account and cards are still there.\n\nUnsubscribe from reminder emails: ${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}`,
  };
}

function getNow() {
  if (!process.env.NOW_OVERRIDE) {
    return new Date();
  }
  const override = new Date(process.env.NOW_OVERRIDE);
  if (Number.isNaN(override.getTime())) {
    throw new Error(`Invalid NOW_OVERRIDE: ${process.env.NOW_OVERRIDE}`);
  }
  return override;
}

function getReminderToSend(ageMs) {
  if (ageMs >= TWO_DAYS_MS) return 'two_days';
  if (ageMs >= TWO_HOURS_MS) return 'two_hours';
  return null;
}

function isPaidOrInBillingFlow(user) {
  if (!user) return false;
  if (user.planType && user.planType !== 'FREE') return true;
  return ['active', 'past_due'].includes(user.subscriptionStatus);
}

async function sendReminderEmail(to, subject, html, text) {
  await transporter.sendMail({
    from: FROM_ADDRESS,
    to,
    subject,
    html,
    text,
  });
}

async function run() {
  const client = new MongoClient(MONGODB_URI);
  const now = getNow();
  const earliestCheckout = new Date(now.getTime() - MAX_CHECKOUT_AGE_MS);

  let sent = 0;
  let skipped = 0;

  try {
    await client.connect();
    const db = client.db('mybingocard');
    const activityEvents = db.collection('activity_events');
    const users = db.collection('users');
    const emailPreferences = db.collection('email_preferences');
    const reminderLog = db.collection('checkout_reminder_log');

    await reminderLog.createIndex(
      { email: 1, checkoutSessionId: 1, reminderType: 1 },
      { unique: true }
    );

    const latestStartedCheckouts = await activityEvents.aggregate([
      {
        $match: {
          event: 'checkout_started',
          email: { $type: 'string', $ne: '' },
          createdAt: { $gte: earliestCheckout },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { $toLower: '$email' },
          checkout: { $first: '$$ROOT' },
        },
      },
    ]).toArray();

    console.log(`Found ${latestStartedCheckouts.length} recent checkout starts since ${earliestCheckout.toISOString()}`);

    for (const row of latestStartedCheckouts) {
      const checkout = row.checkout;
      const email = normalizeEmail(checkout?.email);
      const rawEmail = String(checkout?.email || '').trim();
      if (!email) {
        skipped += 1;
        continue;
      }

      if (TARGET_EMAIL && email !== TARGET_EMAIL) {
        skipped += 1;
        continue;
      }

      const startedAt = new Date(checkout.createdAt);
      const ageMs = now.getTime() - startedAt.getTime();
      const reminderType = getReminderToSend(ageMs);
      if (!reminderType) {
        skipped += 1;
        continue;
      }

      const checkoutSessionId = checkout?.metadata?.checkoutSessionId || String(checkout._id);
      const alreadySent = await reminderLog.findOne({
        email,
        checkoutSessionId,
        reminderType,
      });
      if (alreadySent) {
        skipped += 1;
        continue;
      }

      const [user, prefs, converted] = await Promise.all([
        users.findOne({ email: { $in: [email, rawEmail] } }),
        emailPreferences.findOne({ email: { $in: [email, rawEmail] } }),
        activityEvents.findOne({
          event: 'subscription_activated',
          email: { $in: [email, rawEmail] },
          createdAt: { $gt: startedAt },
        }),
      ]);

      if (prefs?.marketingEmails === false) {
        console.log(`Skipping ${email}: marketing emails disabled`);
        skipped += 1;
        continue;
      }

      if (converted || isPaidOrInBillingFlow(user)) {
        console.log(`Skipping ${email}: already converted or currently paid`);
        skipped += 1;
        continue;
      }

      const planType = checkout?.metadata?.planType || 'PREMIUM';
      const reminder = reminderType === 'two_days'
        ? buildTwoDayReminder({ email, name: user?.name, planType })
        : buildTwoHourReminder({ email, name: user?.name, planType });

      if (DRY_RUN) {
        console.log(`[dry-run] would send ${reminder.reminderType} reminder to ${email} for checkout ${checkoutSessionId}`);
      } else {
        await sendReminderEmail(email, reminder.subject, reminder.html, reminder.text);
        console.log(`Sent ${reminder.reminderType} reminder to ${email}`);

        await reminderLog.insertOne({
          email,
          userId: checkout.userId || user?._id || null,
          checkoutSessionId,
          reminderType: reminder.reminderType,
          campaignId: reminder.campaignId,
          planType,
          startedAt,
          sentAt: now,
          dryRun: false,
          createdAt: now,
        });
      }
      sent += 1;
    }

    console.log(`Abandoned checkout reminders complete. Sent=${sent} Skipped=${skipped} DryRun=${DRY_RUN}`);
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error('Abandoned checkout reminder job failed:', error);
  process.exit(1);
});
