const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { MongoClient, ObjectId } = require('mongodb');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
try {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim();
      if (!process.env[key]) process.env[key] = val;
    }
  });
} catch (e) {
  console.error('Could not load .env.local:', e.message);
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mybingocard';
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://mybingocard.com').replace(/\/$/, '');
const fromAddress = process.env.EMAIL_FROM || 'MyBingoCard <support@mybingocard.com>';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST || 'smtp.porkbun.com',
  port: Number(process.env.EMAIL_SERVER_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

// ── Campaign Definitions ──

const CAMPAIGNS = [
  {
    id: 'create_first_card',
    dayAfterSignup: 1,
    condition: 'no_cards',
    subject: (name) => `${name}, ready to create your first bingo card?`,
    build: buildCreateFirstCardEmail,
  },
  {
    id: 'how_are_you_liking',
    dayAfterSignup: 5,
    condition: 'all',
    subject: (name) => `${name}, how are you liking MyBingoCard?`,
    build: buildHowAreYouLikingEmail,
  },
  {
    id: 'reengage_inactive',
    dayAfterSignup: 14,
    condition: 'inactive_7d',
    subject: (name) => `We miss you, ${name}! Your bingo cards are waiting`,
    build: buildReengageEmail,
  },
  {
    id: 'upgrade_nudge',
    dayAfterSignup: 30,
    condition: 'free_plan',
    subject: (name) => `${name}, unlock the full MyBingoCard experience`,
    build: buildUpgradeNudgeEmail,
  },
  {
    id: 'winback_canceled',
    dayAfterSignup: -1, // special: not day-based
    condition: 'canceled_7d',
    subject: (name) => `${name}, we'd love to have you back on MyBingoCard`,
    build: buildWinbackEmail,
  },
];

// ── Email Templates ──

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function firstName(name) {
  if (!name) return 'there';
  return name.trim().split(' ')[0] || 'there';
}

function wrap(headline, preheader, bodyHtml) {
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(headline)}</title></head>
<body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;">
<tr><td style="background:#312e81;padding:24px 28px;border-radius:20px 20px 0 0;">
  <div style="font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#e2e8f0;">MyBingoCard</div>
  <div style="margin-top:8px;font-size:25px;line-height:1.25;font-weight:800;color:#ffffff;">${escapeHtml(headline)}</div>
</td></tr>
<tr><td style="background:#ffffff;border:1px solid #e2e8f0;border-top:0;padding:28px;border-radius:0 0 20px 20px;">
  ${bodyHtml}
  <div style="margin-top:28px;padding-top:18px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:13px;color:#64748b;">Need help? Reply to this email or contact <a href="mailto:support@mybingocard.com" style="color:#4f46e5;">support@mybingocard.com</a></p>
    <p style="margin:8px 0 0;font-size:13px;color:#94a3b8;"><a href="${escapeHtml(appUrl)}/unsubscribe?email=%%EMAIL%%" style="color:#64748b;text-decoration:underline;">Unsubscribe</a> from these emails.</p>
  </div>
  <img src="${escapeHtml(appUrl)}/api/track/open?e=%%EMAIL%%&c=%%CAMPAIGN%%" width="1" height="1" style="display:none;" alt="" />
</td></tr>
</table></td></tr></table></body></html>`;
}

function appendUtmParams(url, campaignId) {
  try {
    const parsed = new URL(url);
    // Only add UTM params to mybingocard.com links
    if (!parsed.hostname.includes('mybingocard.com') && parsed.hostname !== 'localhost') return url;
    parsed.searchParams.set('utm_source', 'mybingocard');
    parsed.searchParams.set('utm_medium', 'email');
    parsed.searchParams.set('utm_campaign', campaignId || 'drip');
    return parsed.toString();
  } catch (_) {
    // If URL parsing fails, append manually
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}utm_source=mybingocard&utm_medium=email&utm_campaign=${encodeURIComponent(campaignId || 'drip')}`;
  }
}

// Module-level variable set during email build to pass campaign context
let _currentCampaignId = 'drip';

function trackClickUrl(url, linkId) {
  const utmUrl = appendUtmParams(url, _currentCampaignId);
  const params = `e=%%EMAIL%%&c=%%CAMPAIGN%%&u=${encodeURIComponent(utmUrl)}${linkId ? `&l=${encodeURIComponent(linkId)}` : ''}`;
  return `${appUrl}/api/track/click?${params}`;
}

function btn(label, url, linkId) {
  const trackedUrl = trackClickUrl(url, linkId || 'cta');
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0;"><tr><td style="border-radius:10px;background:#4f46e5;"><a href="${escapeHtml(trackedUrl)}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a></td></tr></table>`;
}

function buildCreateFirstCardEmail(user) {
  const name = firstName(user.name);
  const body = `
    <p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#334155;">Hey ${escapeHtml(name)},</p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#334155;">We noticed you signed up but haven't created a bingo card yet. It only takes about 2 minutes!</p>
    <div style="margin:18px 0;padding:16px;border:1px solid #c7d2fe;background:#eef2ff;border-radius:12px;">
      <p style="margin:0 0 8px;font-size:14px;color:#312e81;font-weight:600;">Here are some ideas to get started:</p>
      <ul style="margin:0;padding:0 0 0 18px;color:#334155;font-size:14px;line-height:1.7;">
        <li>Party bingo for your next get-together</li>
        <li>Classroom bingo for students</li>
        <li>Team building bingo for work</li>
        <li>Holiday-themed bingo cards</li>
      </ul>
    </div>
    <p style="margin:0 0 4px;font-size:15px;color:#334155;">Or browse our ready-made templates and customize from there.</p>
    ${btn('Create Your First Card', appUrl + '/create')}
    ${btn('Browse Templates', appUrl + '/templates')}
  `;
  return {
    html: wrap('Ready to make your first card?', 'Create your first bingo card in minutes.', body),
    text: `Hey ${name},\n\nWe noticed you signed up but haven't created a bingo card yet. It only takes about 2 minutes!\n\nCreate your first card: ${appendUtmParams(appUrl + '/create', 'create_first_card')}\nBrowse templates: ${appendUtmParams(appUrl + '/templates', 'create_first_card')}\n\nNeed help? Reply to this email.`,
  };
}

function buildHowAreYouLikingEmail(user) {
  const name = firstName(user.name);
  const cardCount = user._cardCount || 0;
  const cardLine = cardCount > 0
    ? `You've already created ${cardCount} card${cardCount > 1 ? 's' : ''} - nice!`
    : `You haven't created any cards yet, but there's still time to jump in.`;

  const body = `
    <p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#334155;">Hey ${escapeHtml(name)},</p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#334155;">It's been a few days since you joined MyBingoCard and we'd love to know how things are going. ${escapeHtml(cardLine)}</p>
    <div style="margin:18px 0;padding:16px;border:1px solid #c7d2fe;background:#eef2ff;border-radius:12px;">
      <p style="margin:0 0 8px;font-size:14px;color:#312e81;font-weight:600;">Quick question:</p>
      <p style="margin:0;font-size:14px;color:#334155;">How has your experience been so far? Just hit reply and let us know. We read every response and it helps us make MyBingoCard better for everyone.</p>
    </div>
    <p style="margin:0 0 4px;font-size:15px;color:#334155;">If there's anything confusing or missing, we want to hear about it.</p>
    ${btn('Go to Dashboard', appUrl + '/dashboard')}
    <p style="margin:14px 0 0;font-size:14px;color:#64748b;">Or just reply to this email - we'd love to chat!</p>
  `;
  return {
    html: wrap(`How are you liking MyBingoCard?`, `We'd love to hear how things are going, ${name}.`, body),
    text: `Hey ${name},\n\nIt's been a few days since you joined MyBingoCard and we'd love to know how things are going.\n\n${cardLine}\n\nHow has your experience been? Just hit reply and let us know. We read every response.\n\nDashboard: ${appendUtmParams(appUrl + '/dashboard', 'how_are_you_liking')}\n\nNeed help? Reply to this email.`,
  };
}

function buildReengageEmail(user) {
  const name = firstName(user.name);
  const body = `
    <p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#334155;">Hey ${escapeHtml(name)},</p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#334155;">It's been a while since we've seen you on MyBingoCard. Your cards are still here and ready to play!</p>
    <div style="margin:18px 0;padding:16px;border:1px solid #c7d2fe;background:#eef2ff;border-radius:12px;">
      <p style="margin:0 0 8px;font-size:14px;color:#312e81;font-weight:600;">What's new:</p>
      <ul style="margin:0;padding:0 0 0 18px;color:#334155;font-size:14px;line-height:1.7;">
        <li>New templates added regularly</li>
        <li>Share cards with a single link</li>
        <li>Track your game history and stats</li>
        <li>Dark mode and improved mobile experience</li>
      </ul>
    </div>
    <p style="margin:0 0 4px;font-size:15px;color:#334155;">Come back and check it out - we've been making things better while you were away.</p>
    ${btn('Jump Back In', appUrl + '/dashboard')}
  `;
  return {
    html: wrap('We miss you!', `Your bingo cards are waiting for you, ${name}.`, body),
    text: `Hey ${name},\n\nIt's been a while since we've seen you on MyBingoCard. Your cards are still here and ready to play!\n\nCome back and check it out: ${appendUtmParams(appUrl + '/dashboard', 'reengage_inactive')}\n\nNeed help? Reply to this email.`,
  };
}

function buildUpgradeNudgeEmail(user) {
  const name = firstName(user.name);
  const cardCount = user._cardCount || 0;
  const body = `
    <p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#334155;">Hey ${escapeHtml(name)},</p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#334155;">You've been using MyBingoCard for about a month now${cardCount > 0 ? ` and created ${cardCount} card${cardCount > 1 ? 's' : ''}` : ''}. We hope you're having fun!</p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#334155;">Did you know our paid plans unlock even more?</p>
    <div style="margin:18px 0;padding:16px;border:1px solid #a7f3d0;background:#ecfdf5;border-radius:12px;">
      <p style="margin:0 0 8px;font-size:14px;color:#065f46;font-weight:600;">Premium plan highlights:</p>
      <ul style="margin:0;padding:0 0 0 18px;color:#334155;font-size:14px;line-height:1.7;">
        <li>AI-powered card generation</li>
        <li>Image bingo cards and all premium templates</li>
        <li>HD PDF &amp; PNG export</li>
        <li>Custom colors &amp; fonts</li>
        <li>Batch generate up to 100 cards</li>
        <li>Ad-free experience</li>
      </ul>
    </div>
    ${btn('View Plans & Pricing', appUrl + '/pricing')}
    <p style="margin:14px 0 0;font-size:14px;color:#64748b;">No pressure — the free plan is always available. Upgrade whenever you're ready.</p>
  `;
  return {
    html: wrap('Unlock the full experience', 'See what MyBingoCard paid plans can do for you.', body),
    text: `Hey ${name},\n\nYou've been using MyBingoCard for about a month now. Did you know Premium unlocks the full experience?\n\n- AI-powered card generation\n- Image bingo cards and premium templates\n- HD PDF & PNG export\n- Custom colors & fonts\n- Batch generate up to 100 cards\n- Ad-free experience\n\nUpgrade: ${appendUtmParams(appUrl + '/pricing', 'upgrade_nudge')}\n\nNo pressure — free plan is always available.`,
  };
}

function buildWinbackEmail(user) {
  const name = firstName(user.name);
  const body = `
    <p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#334155;">Hey ${escapeHtml(name)},</p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#334155;">We noticed you recently canceled your MyBingoCard subscription. We're sorry to see you go, and we wanted to check in.</p>
    <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#334155;">Your account and all your bingo cards are still here, waiting for you. If things have changed or you'd like to give it another try, we'd love to have you back.</p>
    <div style="margin:18px 0;padding:16px;border:1px solid #a7f3d0;background:#ecfdf5;border-radius:12px;">
      <p style="margin:0 0 8px;font-size:14px;color:#065f46;font-weight:600;">Come back and enjoy:</p>
      <ul style="margin:0;padding:0 0 0 18px;color:#334155;font-size:14px;line-height:1.7;">
        <li>All your saved bingo cards, exactly as you left them</li>
        <li>Unlimited cards with all grid sizes</li>
        <li>HD PDF &amp; PNG exports</li>
        <li>Custom colors, fonts, and premium templates</li>
        <li>Ad-free experience</li>
      </ul>
    </div>
    <p style="margin:0 0 4px;font-size:15px;color:#334155;">Reactivating takes just a moment. We've kept everything safe for you.</p>
    ${btn('Reactivate My Subscription', appUrl + '/pricing')}
    <p style="margin:14px 0 0;font-size:14px;color:#64748b;">If there's anything we could do better, just reply to this email. We read every response.</p>
  `;
  return {
    html: wrap("We'd love to have you back", `${name}, your bingo cards are waiting for you.`, body),
    text: `Hey ${name},\n\nWe noticed you recently canceled your MyBingoCard subscription. We're sorry to see you go.\n\nYour account and all your bingo cards are still here. If you'd like to give it another try, we'd love to have you back.\n\nReactivate: ${appendUtmParams(appUrl + '/pricing', 'winback_canceled')}\n\nIf there's anything we could do better, just reply to this email.`,
  };
}

// ── Main Logic ──

async function run() {
  const client = new MongoClient(MONGODB_URI);
  let sentCount = 0;
  let skippedCount = 0;

  try {
    await client.connect();
    const db = client.db('mybingocard');

    // Ensure drip_log collection and index
    await db.collection('drip_log').createIndex({ userId: 1, campaignId: 1 }, { unique: true });
    // Ensure drip_progression collection and index
    await db.collection('drip_progression').createIndex({ userId: 1 }, { unique: true });

    const now = new Date();

    // Get unsubscribed emails
    const unsubs = await db.collection('email_preferences')
      .find({ marketingEmails: false })
      .project({ email: 1 })
      .toArray();
    const unsubEmails = new Set(unsubs.map(u => u.email));

    const users = await db.collection('users').find({}).toArray();

    for (const user of users) {
      if (!user.email) continue;
      if (unsubEmails.has(user.email.toLowerCase().trim())) {
        skippedCount++;
        continue;
      }

      const daysSinceSignup = Math.floor((now - new Date(user.createdAt)) / 86400000);
      const cardCount = await db.collection('cards').countDocuments({ userId: user._id.toString() });

      // Check last activity (last card created or updated)
      const lastCard = await db.collection('cards')
        .find({ userId: user._id.toString() })
        .sort({ updatedAt: -1 })
        .limit(1)
        .toArray();
      const lastActivity = lastCard[0]?.updatedAt || user.createdAt;
      const daysSinceActivity = Math.floor((now - new Date(lastActivity)) / 86400000);

      for (const campaign of CAMPAIGNS) {
        // Handle special non-day-based campaigns
        if (campaign.dayAfterSignup === -1) {
          // Special condition: canceled_7d — user canceled ~7 days ago
          if (campaign.condition === 'canceled_7d') {
            if (user.subscriptionStatus !== 'canceled') continue;
            // Check if cancellation happened ~7 days ago (allow a 3-day window: days 6-9)
            const cancelDate = user.cancelAt || user.updatedAt || user.createdAt;
            if (!cancelDate) continue;
            const daysSinceCanceled = Math.floor((now - new Date(cancelDate)) / 86400000);
            if (daysSinceCanceled < 6 || daysSinceCanceled > 9) continue;
          }
        } else {
          // Check if it's the right day (allow a 2-day window)
          if (daysSinceSignup < campaign.dayAfterSignup || daysSinceSignup > campaign.dayAfterSignup + 2) {
            continue;
          }
        }

        // Check condition
        if (campaign.condition === 'no_cards' && cardCount > 0) continue;
        if (campaign.condition === 'inactive_7d' && daysSinceActivity < 7) continue;
        if (campaign.condition === 'free_plan' && user.planType && user.planType !== 'FREE') continue;

        // Check if already sent
        const alreadySent = await db.collection('drip_log').findOne({
          userId: user._id,
          campaignId: campaign.id,
        });
        if (alreadySent) continue;

        // Build and send
        _currentCampaignId = campaign.id;
        const name = firstName(user.name);
        const email = campaign.build({ ...user, _cardCount: cardCount });
        const subject = campaign.subject(name);

        // Rate limit: wait 3 seconds between emails to avoid Porkbun limits
        await new Promise(resolve => setTimeout(resolve, 3000));

        try {
          const sendResult = await transporter.sendMail({
            from: fromAddress,
            to: user.email,
            subject,
            html: email.html.replace(/%%EMAIL%%/g, encodeURIComponent(user.email)).replace(/%%CAMPAIGN%%/g, campaign.id),
            text: email.text,
            headers: {
              'List-Unsubscribe': `<${appUrl}/api/unsubscribe?email=${encodeURIComponent(user.email)}>, <mailto:unsubscribe@mybingocard.com?subject=unsubscribe%20${encodeURIComponent(user.email)}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          });

          // Log it
          await db.collection('drip_log').insertOne({
            userId: user._id,
            campaignId: campaign.id,
            email: user.email,
            subject,
            sentAt: now,
            status: 'sent',
            messageId: sendResult.messageId || null,
          });

          // Update campaign progression tracking
          try {
            const allCampaignIds = CAMPAIGNS.map(c => c.id);
            const sentCampaigns = await db.collection('drip_log')
              .find({ userId: user._id, status: 'sent' })
              .project({ campaignId: 1 })
              .toArray();
            const campaignsReceived = [...new Set(sentCampaigns.map(s => s.campaignId))];
            // Determine next eligible campaign (first one not yet sent)
            const nextEligible = allCampaignIds.find(id => !campaignsReceived.includes(id)) || null;

            await db.collection('drip_progression').updateOne(
              { userId: user._id },
              {
                $set: {
                  email: user.email,
                  campaignsReceived,
                  lastCampaignSentAt: now,
                  nextEligibleCampaign: nextEligible,
                  updatedAt: now,
                },
                $setOnInsert: { createdAt: now },
              },
              { upsert: true }
            );
          } catch (progErr) {
            console.error(`[WARN] Failed to update drip_progression for ${user.email}: ${progErr.message}`);
          }

          sentCount++;
          console.log(`[SENT] ${campaign.id} -> ${user.email} (${sendResult.messageId})`);
        } catch (err) {
          console.error(`[FAIL] ${campaign.id} -> ${user.email}: ${err.message}`);
          // Log the failure so we don't retry and can investigate
          try {
            await db.collection('drip_log').insertOne({
              userId: user._id,
              campaignId: campaign.id,
              email: user.email,
              subject,
              sentAt: now,
              status: 'failed',
              error: err.message,
            });
          } catch (_) { /* ignore duplicate key on retry */ }
        }
      }
    }

    console.log(`\nDrip campaign run complete: ${sentCount} sent, ${skippedCount} skipped`);

    // Notify Discord
    if (WEBHOOK_URL) {
      const fields = [];

      // Summary
      fields.push({
        name: '📊 Summary',
        value: `Sent: **${sentCount}** | Skipped (unsub): **${skippedCount}**`,
        inline: false,
      });

      // Breakdown by campaign
      const campaignCounts = {};
      const campaignRecipients = {};
      const sentLogs = await db.collection('drip_log')
        .find({ sentAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } })
        .toArray();
      for (const log of sentLogs) {
        campaignCounts[log.campaignId] = (campaignCounts[log.campaignId] || 0) + 1;
        if (!campaignRecipients[log.campaignId]) campaignRecipients[log.campaignId] = [];
        campaignRecipients[log.campaignId].push(log.email);
      }

      const campaignLabels = {
        create_first_card: '📝 Create First Card (Day 1)',
        how_are_you_liking: '💬 How Are You Liking It? (Day 5)',
        reengage_inactive: '🔄 Re-engagement (Day 14)',
        upgrade_nudge: '⭐ Upgrade Nudge (Day 30)',
        winback_canceled: '🔙 Win-back Canceled (7d post-cancel)',
      };

      for (const [id, count] of Object.entries(campaignCounts)) {
        const label = campaignLabels[id] || id;
        const recipients = (campaignRecipients[id] || []).join('\n') || 'none';
        fields.push({
          name: `${label} — ${count} sent`,
          value: recipients.substring(0, 900),
          inline: false,
        });
      }

      if (sentCount === 0) {
        fields.push({ name: 'ℹ️ No emails sent', value: 'No users matched campaign criteria today.', inline: false });
      }

      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: '📧 Drip Campaign Report',
            color: 0x6366f1,
            fields,
            timestamp: now.toISOString(),
            footer: { text: 'MyBingoCard Drip Campaigns' },
          }],
        }),
      });
    }
  } catch (err) {
    console.error('Drip campaign error:', err);
  } finally {
    await client.close();
  }
}

run();
