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
    <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;"><a href="${escapeHtml(appUrl)}/unsubscribe?email=%%EMAIL%%" style="color:#94a3b8;">Unsubscribe</a> from these emails.</p>
  </div>
  <img src="${escapeHtml(appUrl)}/api/track/open?e=%%EMAIL%%&c=%%CAMPAIGN%%" width="1" height="1" style="display:none;" alt="" />
</td></tr>
</table></td></tr></table></body></html>`;
}

function btn(label, url) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0;"><tr><td style="border-radius:10px;background:#4f46e5;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a></td></tr></table>`;
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
    text: `Hey ${name},\n\nWe noticed you signed up but haven't created a bingo card yet. It only takes about 2 minutes!\n\nCreate your first card: ${appUrl}/create\nBrowse templates: ${appUrl}/templates\n\nNeed help? Reply to this email.`,
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
    text: `Hey ${name},\n\nIt's been a few days since you joined MyBingoCard and we'd love to know how things are going.\n\n${cardLine}\n\nHow has your experience been? Just hit reply and let us know. We read every response.\n\nDashboard: ${appUrl}/dashboard\n\nNeed help? Reply to this email.`,
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
    text: `Hey ${name},\n\nIt's been a while since we've seen you on MyBingoCard. Your cards are still here and ready to play!\n\nCome back and check it out: ${appUrl}/dashboard\n\nNeed help? Reply to this email.`,
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
      <p style="margin:0 0 8px;font-size:14px;color:#065f46;font-weight:600;">Starter plan highlights:</p>
      <ul style="margin:0;padding:0 0 0 18px;color:#334155;font-size:14px;line-height:1.7;">
        <li>Up to 25 bingo cards</li>
        <li>100 exports per month</li>
        <li>Remove the watermark</li>
        <li>Priority support</li>
      </ul>
    </div>
    ${btn('View Plans & Pricing', appUrl + '/pricing')}
    <p style="margin:14px 0 0;font-size:14px;color:#64748b;">No pressure - the free plan is always available. We just want to make sure you know what's there if you need it.</p>
  `;
  return {
    html: wrap('Unlock the full experience', 'See what MyBingoCard paid plans can do for you.', body),
    text: `Hey ${name},\n\nYou've been using MyBingoCard for about a month now. Did you know our paid plans unlock more features?\n\n- Up to 25 cards (Starter)\n- 100 exports/month\n- Remove watermark\n- Priority support\n\nView plans: ${appUrl}/pricing\n\nNo pressure - free plan is always available.`,
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
      const cardCount = await db.collection('bingocards').countDocuments({ userId: user._id.toString() });

      // Check last activity (last card created or updated)
      const lastCard = await db.collection('bingocards')
        .find({ userId: user._id.toString() })
        .sort({ updatedAt: -1 })
        .limit(1)
        .toArray();
      const lastActivity = lastCard[0]?.updatedAt || user.createdAt;
      const daysSinceActivity = Math.floor((now - new Date(lastActivity)) / 86400000);

      for (const campaign of CAMPAIGNS) {
        // Check if it's the right day (allow a 2-day window)
        if (daysSinceSignup < campaign.dayAfterSignup || daysSinceSignup > campaign.dayAfterSignup + 2) {
          continue;
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
        const name = firstName(user.name);
        const email = campaign.build({ ...user, _cardCount: cardCount });
        const subject = campaign.subject(name);

        // Rate limit: wait 3 seconds between emails to avoid Porkbun limits
        await new Promise(resolve => setTimeout(resolve, 3000));

        try {
          await transporter.sendMail({
            from: fromAddress,
            to: user.email,
            subject,
            html: email.html.replace(/%%EMAIL%%/g, encodeURIComponent(user.email)).replace(/%%CAMPAIGN%%/g, campaign.id),
            text: email.text,
          });

          // Log it
          await db.collection('drip_log').insertOne({
            userId: user._id,
            campaignId: campaign.id,
            email: user.email,
            subject,
            sentAt: now,
          });

          sentCount++;
          console.log(`[SENT] ${campaign.id} -> ${user.email}`);
        } catch (err) {
          console.error(`[FAIL] ${campaign.id} -> ${user.email}: ${err.message}`);
        }
      }
    }

    console.log(`\nDrip campaign run complete: ${sentCount} sent, ${skippedCount} skipped`);

    // Notify Discord
    if (sentCount > 0 && WEBHOOK_URL) {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: 'Drip Campaign Report',
            description: `Sent **${sentCount}** engagement email${sentCount !== 1 ? 's' : ''} today.`,
            color: 0x6366f1,
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
