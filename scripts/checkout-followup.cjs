/**
 * One-time follow-up emails for users who started checkout but never completed.
 *
 * Usage:
 *   DRY_RUN=1 node scripts/checkout-followup.cjs        # Preview only
 *   node scripts/checkout-followup.cjs                    # Send emails
 *   TARGET_EMAIL=user@example.com node scripts/checkout-followup.cjs  # Single user
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { MongoClient } = require('mongodb');

// Load .env.local
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

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://mybingocard.com').replace(/\/$/, '');
const FROM_ADDRESS = process.env.EMAIL_FROM || 'MyBingoCard <support@mybingocard.com>';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mybingocard';
const DRY_RUN = process.env.DRY_RUN === '1';
const TARGET_EMAIL = (process.env.TARGET_EMAIL || '').trim().toLowerCase();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST || 'smtp.porkbun.com',
  port: Number(process.env.EMAIL_SERVER_PORT) || 587,
  secure: Number(process.env.EMAIL_SERVER_PORT) === 465,
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getFirstName(name) {
  if (!name) return 'there';
  const trimmed = name.trim();
  if (!trimmed) return 'there';
  return trimmed.split(' ')[0] || 'there';
}

function appendUtmParams(url, campaignId) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('mybingocard.com') && parsed.hostname !== 'localhost') return url;
    parsed.searchParams.set('utm_source', 'mybingocard');
    parsed.searchParams.set('utm_medium', 'email');
    parsed.searchParams.set('utm_campaign', campaignId || 'checkout_followup');
    return parsed.toString();
  } catch (_) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}utm_source=mybingocard&utm_medium=email&utm_campaign=${encodeURIComponent(campaignId || 'checkout_followup')}`;
  }
}

function buildFollowupEmail(firstName, daysSince) {
  const freshness = daysSince <= 3 ? 'recently' : `${daysSince} days ago`;
  const campaignId = 'checkout_followup';
  const pricingUrl = appendUtmParams(`${APP_URL}/pricing`, campaignId);

  return {
    subject: `Quick question about your bingo cards, ${firstName}`,
    html: `
<!doctype html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">We noticed you were checking out Premium — anything we can help with?</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;">
        <tr>
          <td style="background:#312e81;padding:24px 28px;border-radius:20px 20px 0 0;">
            <div style="font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#e2e8f0;">MyBingoCard</div>
            <div style="margin-top:8px;font-size:25px;line-height:1.25;font-weight:800;color:#ffffff;">We'd love to help</div>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border:1px solid #e2e8f0;border-top:0;padding:28px;border-radius:0 0 20px 20px;">
            <p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#334155;">Hi ${escapeHtml(firstName)},</p>
            <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#334155;">I noticed you ${freshness} started checking out MyBingoCard Premium but didn't finish. Totally okay — I just wanted to reach out personally in case something went wrong or you had questions.</p>
            <div style="margin:18px 0;padding:16px;border:1px solid #c7d2fe;background:#eef2ff;border-radius:12px;color:#312e81;">
              <p style="margin:0 0 8px;font-size:15px;font-weight:700;">A few things that might help:</p>
              <ul style="margin:0;padding:0 0 0 18px;font-size:14px;line-height:1.7;">
                <li style="margin:0 0 6px;">Was something confusing in the checkout flow?</li>
                <li style="margin:0 0 6px;">Not sure if Premium is worth it for your use case?</li>
                <li style="margin:0 0 6px;">Had a technical issue? I can look into it right away.</li>
              </ul>
            </div>
            <p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:#334155;">Just reply to this email — it goes straight to me, not a support queue. I read every response.</p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0;">
              <tr>
                <td style="border-radius:10px;background:#4f46e5;">
                  <a href="${escapeHtml(pricingUrl)}" style="display:inline-block;padding:12px 20px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">View Premium Plans</a>
                </td>
              </tr>
            </table>
            <p style="margin:10px 0 0;font-size:13px;color:#64748b;">Or just reply with any questions.</p>
            <div style="margin-top:28px;padding-top:18px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
                Cory from MyBingoCard<br />
                <a href="mailto:support@mybingocard.com" style="color:#4f46e5;text-decoration:none;">support@mybingocard.com</a>
              </p>
              <p style="margin:14px 0 0;font-size:12px;color:#94a3b8;">${escapeHtml(APP_URL)}</p>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    text: `Hi ${firstName},\n\nI noticed you ${freshness} started checking out MyBingoCard Premium but didn't finish. Totally okay — I just wanted to reach out personally in case something went wrong or you had questions.\n\nA few things that might help:\n- Was something confusing in the checkout flow?\n- Not sure if Premium is worth it for your use case?\n- Had a technical issue? I can look into it right away.\n\nJust reply to this email — it goes straight to me.\n\nView Premium: ${pricingUrl}\n\nCory from MyBingoCard`,
  };
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== SENDING FOLLOW-UPS ===');

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('mybingocard');

  // Find emails that started checkout
  const checkoutEmails = await db.collection('activity_events').aggregate([
    { $match: { event: 'checkout_started', email: { $ne: null } } },
    { $group: { _id: '$email', lastCheckout: { $max: '$createdAt' } } },
  ]).toArray();

  // Get subscriber user IDs to exclude
  const subscriberUserIds = await db.collection('subscriptions').distinct('userId', { status: 'active' });
  const subscriberUsers = [];
  for (const uid of subscriberUserIds) {
    const user = await db.collection('users').findOne({ _id: new (require('mongodb').ObjectId)(uid) });
    if (user?.email) subscriberUsers.push(user.email.toLowerCase());
  }

  // Exclude internal/test emails
  const excludePatterns = [
    /@testuser\.dev$/i,
    /@mybingocard\.com$/i,
    /^anallacory@/i,
    /^rank@townranker/i,
  ];

  // Filter to follow-up-eligible and already-sent
  const alreadySent = await db.collection('checkout_followup_log').distinct('email');
  const alreadySentSet = new Set(alreadySent.map(e => e.toLowerCase()));

  const eligible = [];
  for (const entry of checkoutEmails) {
    const email = entry._id.toLowerCase();
    if (TARGET_EMAIL && email !== TARGET_EMAIL) continue;
    if (excludePatterns.some(p => p.test(email))) continue;
    if (subscriberUsers.includes(email)) continue;
    if (alreadySentSet.has(email)) continue;

    const user = await db.collection('users').findOne({ email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
    const daysSince = Math.round((Date.now() - new Date(entry.lastCheckout).getTime()) / (24 * 60 * 60 * 1000));
    eligible.push({ email, name: user?.name || null, daysSince, lastCheckout: entry.lastCheckout });
  }

  console.log(`Found ${eligible.length} eligible users:\n`);

  for (const person of eligible) {
    const firstName = getFirstName(person.name);
    const emailContent = buildFollowupEmail(firstName, person.daysSince);
    console.log(`  ${person.email} (${firstName}, ${person.daysSince} days ago)`);

    if (!DRY_RUN) {
      try {
        const result = await transporter.sendMail({
          from: FROM_ADDRESS,
          to: person.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          headers: {
            'List-Unsubscribe': `<${APP_URL}/api/unsubscribe?email=${encodeURIComponent(person.email)}>, <mailto:unsubscribe@mybingocard.com?subject=unsubscribe%20${encodeURIComponent(person.email)}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        });
        console.log(`    Sent! MessageId: ${result.messageId}`);

        await db.collection('checkout_followup_log').insertOne({
          email: person.email,
          name: person.name,
          daysSince: person.daysSince,
          lastCheckout: person.lastCheckout,
          subject: emailContent.subject,
          sentAt: new Date(),
          messageId: result.messageId,
        });

        // 3-second delay between emails (SMTP rate limit)
        await new Promise(r => setTimeout(r, 3000));
      } catch (error) {
        console.error(`    FAILED: ${error.message}`);
      }
    }
  }

  console.log('\nDone.');
  await client.close();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
