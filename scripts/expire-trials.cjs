const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { MongoClient } = require('mongodb');

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

async function notifyDiscord(message) {
  if (!WEBHOOK_URL) return;
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message }),
    });
  } catch (e) {
    // non-fatal
  }
}

async function sendTrialExpiredEmail(email, name) {
  const firstName = (name || email).split(/[\s@]/)[0];
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #7c3aed, #4f46e5); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
          <span style="color: white; font-size: 24px; font-weight: bold;">B</span>
        </div>
      </div>
      <h1 style="font-size: 22px; color: #1e293b; margin-bottom: 16px;">Your free trial has ended, ${firstName}</h1>
      <p style="color: #475569; line-height: 1.6; margin-bottom: 16px;">
        Your 7-day Premium trial has ended and your account has been switched to the Free plan.
      </p>
      <p style="color: #475569; line-height: 1.6; margin-bottom: 24px;">
        You can still create 1 bingo card for free, but to unlock unlimited cards, AI generation, HD exports, and all templates, upgrade to Premium.
      </p>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${appUrl}/pricing" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px;">
          Get Lifetime Access &mdash; $14.99
        </a>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 8px;">One payment. Premium forever. No subscription.</p>
      </div>
      <p style="color: #94a3b8; font-size: 13px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
        &copy; ${new Date().getFullYear()} MyBingoCard
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: fromAddress,
    to: email,
    subject: `${firstName}, your Premium trial has ended`,
    html,
  });
}

async function sendTrialEndingSoonEmail(email, name, daysLeft) {
  const firstName = (name || email).split(/[\s@]/)[0];
  const urgency = daysLeft === 1 ? 'ends tomorrow' : `ends in ${daysLeft} days`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #7c3aed, #4f46e5); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
          <span style="color: white; font-size: 24px; font-weight: bold;">B</span>
        </div>
      </div>
      <h1 style="font-size: 22px; color: #1e293b; margin-bottom: 16px;">Your trial ${urgency}, ${firstName}</h1>
      <p style="color: #475569; line-height: 1.6; margin-bottom: 16px;">
        You've been using Premium features like unlimited cards, AI generation, and HD exports. When your trial ends, you'll switch to the Free plan (1 card, watermarks, ads).
      </p>
      <p style="color: #475569; line-height: 1.6; margin-bottom: 24px;">
        Keep everything you have now by upgrading before your trial ends.
      </p>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${appUrl}/pricing" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px;">
          Get Lifetime Access &mdash; $14.99
        </a>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 8px;">Or subscribe monthly for $4.99/mo. Cancel anytime.</p>
      </div>
      <p style="color: #94a3b8; font-size: 13px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
        &copy; ${new Date().getFullYear()} MyBingoCard
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: fromAddress,
    to: email,
    subject: `${firstName}, your Premium trial ${urgency}`,
    html,
  });
}

// ── Trial Day Lifecycle Emails (Day 1, 3, 5, 7) ──

const TRIAL_DAY_EMAILS = {
  1: {
    campaignId: 'trial_day_1',
    subject: (name) => `Welcome to Premium, ${name}! Here's how to get the most out of your trial`,
    build: (first, cardCount) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #7c3aed, #4f46e5); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 24px; font-weight: bold;">B</span>
          </div>
        </div>
        <h1 style="font-size: 22px; color: #1e293b; margin-bottom: 16px;">Welcome to your Premium trial, ${first}!</h1>
        <p style="color: #475569; line-height: 1.6; margin-bottom: 16px;">
          You now have 7 days of full Premium access. Here's what you can do right now:
        </p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <p style="color: #334155; font-weight: 600; margin: 0 0 12px;">Your Premium features:</p>
          <ul style="color: #475569; line-height: 1.8; margin: 0; padding: 0 0 0 20px;">
            <li>Unlimited bingo cards (no more 1-card limit)</li>
            <li>AI-powered card generation</li>
            <li>HD PDF and PNG exports, no watermarks</li>
            <li>All grid sizes: 3x3, 4x4, 5x5</li>
            <li>Custom colors, fonts, and premium templates</li>
          </ul>
        </div>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${appUrl}/create" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px;">
            Create Your First Premium Card
          </a>
        </div>
        <p style="color: #64748b; line-height: 1.6; margin-bottom: 16px; font-size: 14px;">
          Tip: Try our AI generator to create a themed bingo card in seconds. Just describe what you want and we'll build it for you.
        </p>
        <p style="color: #94a3b8; font-size: 13px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          &copy; ${new Date().getFullYear()} MyBingoCard
        </p>
      </div>
    `,
  },
  3: {
    campaignId: 'trial_day_3',
    subject: (name) => `${name}, have you tried AI bingo card generation yet?`,
    build: (first, cardCount) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #7c3aed, #4f46e5); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 24px; font-weight: bold;">B</span>
          </div>
        </div>
        <h1 style="font-size: 22px; color: #1e293b; margin-bottom: 16px;">${cardCount > 0 ? `Nice work, ${first}! You've made ${cardCount} card${cardCount > 1 ? 's' : ''} so far` : `${first}, your Premium trial is almost half over`}</h1>
        <p style="color: #475569; line-height: 1.6; margin-bottom: 16px;">
          ${cardCount > 0 ? 'Here are a few more Premium features worth trying before your trial ends:' : "You still have 4 days left to explore everything Premium has to offer. Here's what most people love:"}
        </p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <p style="color: #334155; font-weight: 600; margin: 0 0 12px;">Worth trying:</p>
          <ul style="color: #475569; line-height: 1.8; margin: 0; padding: 0 0 0 20px;">
            <li>AI generation: describe a theme and get a full card instantly</li>
            <li>Batch generate: create up to 100 unique cards at once</li>
            <li>HD export: download print-ready PDFs without watermarks</li>
            <li>Browse premium templates for parties, classrooms, holidays</li>
          </ul>
        </div>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${appUrl}/create" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px;">
            Try AI Generation
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 13px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          &copy; ${new Date().getFullYear()} MyBingoCard
        </p>
      </div>
    `,
  },
  5: {
    campaignId: 'trial_day_5',
    subject: (name) => `${name}, 2 days left on your Premium trial`,
    build: (first, cardCount) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #7c3aed, #4f46e5); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 24px; font-weight: bold;">B</span>
          </div>
        </div>
        <h1 style="font-size: 22px; color: #1e293b; margin-bottom: 16px;">2 days left, ${first}</h1>
        <p style="color: #475569; line-height: 1.6; margin-bottom: 16px;">
          Your Premium trial ends in 2 days. ${cardCount > 0 ? `You've created ${cardCount} card${cardCount > 1 ? 's' : ''} during your trial.` : "There's still time to explore what Premium can do."} After it ends, you'll switch to the Free plan with a 1-card limit and watermarks.
        </p>
        <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
          Want to keep unlimited cards, AI generation, HD exports, and the ad-free experience? Lock in your access now.
        </p>
        <div style="text-align: center; margin-bottom: 16px;">
          <a href="${appUrl}/pricing" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px;">
            Get Lifetime Access &mdash; $14.99
          </a>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 8px;">One payment. Premium forever. No subscription.</p>
        </div>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${appUrl}/pricing" style="color: #4f46e5; text-decoration: underline; font-size: 14px;">
            Or subscribe for $4.99/mo
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 13px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          &copy; ${new Date().getFullYear()} MyBingoCard
        </p>
      </div>
    `,
  },
  7: {
    campaignId: 'trial_day_7',
    subject: (name) => `${name}, your Premium trial ends today`,
    build: (first, cardCount) => `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #7c3aed, #4f46e5); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 24px; font-weight: bold;">B</span>
          </div>
        </div>
        <h1 style="font-size: 22px; color: #1e293b; margin-bottom: 16px;">Last chance, ${first}</h1>
        <p style="color: #475569; line-height: 1.6; margin-bottom: 16px;">
          Your Premium trial ends today. ${cardCount > 0 ? `You made ${cardCount} card${cardCount > 1 ? 's' : ''} during your trial, and they'll still be here, but` : 'Once it expires,'} you'll lose access to unlimited cards, AI generation, HD exports, and premium templates.
        </p>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <p style="color: #991b1b; font-weight: 600; margin: 0 0 8px;">After your trial ends:</p>
          <ul style="color: #7f1d1d; line-height: 1.8; margin: 0; padding: 0 0 0 20px;">
            <li>Limited to 1 bingo card</li>
            <li>Watermarks on exports</li>
            <li>No AI generation</li>
            <li>Ads shown on your account</li>
          </ul>
        </div>
        <div style="text-align: center; margin-bottom: 16px;">
          <a href="${appUrl}/pricing" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px;">
            Upgrade Now &mdash; Keep Premium
          </a>
        </div>
        <div style="text-align: center; margin-bottom: 24px;">
          <p style="color: #64748b; font-size: 14px; margin: 8px 0;">
            <a href="${appUrl}/pricing" style="color: #4f46e5; text-decoration: underline;">Lifetime $14.99</a> &nbsp;|&nbsp;
            <a href="${appUrl}/pricing" style="color: #4f46e5; text-decoration: underline;">Monthly $4.99/mo</a>
          </p>
        </div>
        <p style="color: #94a3b8; font-size: 13px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          &copy; ${new Date().getFullYear()} MyBingoCard
        </p>
      </div>
    `,
  },
};

async function sendTrialDayEmail(email, name, trialDay, cardCount) {
  const config = TRIAL_DAY_EMAILS[trialDay];
  if (!config) return;

  const first = (name || email).split(/[\s@]/)[0];
  const html = config.build(first, cardCount || 0);
  const subject = config.subject(first);

  await transporter.sendMail({
    from: fromAddress,
    to: email,
    subject,
    html,
  });
}

async function notifyDiscordTrialEvent(title, fields) {
  if (!WEBHOOK_URL) return;
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title,
          color: 0x6366f1,
          fields,
          timestamp: new Date().toISOString(),
          footer: { text: 'MyBingoCard Trial Lifecycle' },
        }],
      }),
    });
  } catch (e) {
    // non-fatal
  }
}

async function run() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('mybingocard');
    const users = db.collection('users');
    const dripLog = db.collection('drip_log');
    const now = new Date();

    // 1. EXPIRE: Find trial users whose trial has ended
    const expiredTrials = await users.find({
      trialEndsAt: { $lte: now },
      planType: 'PREMIUM',
      subscriptionStatus: { $nin: ['active', 'lifetime'] },
    }).toArray();

    let expiredCount = 0;
    for (const user of expiredTrials) {
      await users.updateOne(
        { _id: user._id },
        {
          $set: {
            planType: 'FREE',
            subscriptionStatus: 'inactive',
            updatedAt: now,
          },
        }
      );

      // Check if we already sent the expired email
      const alreadySent = await dripLog.findOne({
        userId: user._id.toString(),
        campaignId: 'trial_expired',
      });

      if (!alreadySent) {
        try {
          await sendTrialExpiredEmail(user.email, user.name);
          await dripLog.insertOne({
            userId: user._id.toString(),
            email: user.email,
            campaignId: 'trial_expired',
            sentAt: now,
          });
          console.log(`Trial expired + email sent: ${user.email}`);

          // Per-user Discord notification
          const cardCount = await db.collection('cards').countDocuments({ userId: user._id.toString() });
          await notifyDiscordTrialEvent('🔴 Trial Expired — Downgraded to Free', [
            { name: 'User', value: `${user.name || 'Unknown'} (${user.email})`, inline: true },
            { name: 'Cards Created', value: `${cardCount}`, inline: true },
          ]);
        } catch (e) {
          console.error(`Failed to send trial expired email to ${user.email}:`, e.message);
        }
      }

      expiredCount++;
    }

    // 2. WARN: Send "trial ending soon" emails (3 days left and 1 day left)
    for (const daysLeft of [3, 1]) {
      const warnDate = new Date(now);
      warnDate.setDate(warnDate.getDate() + daysLeft);
      const warnStart = new Date(warnDate);
      warnStart.setHours(0, 0, 0, 0);
      const warnEnd = new Date(warnDate);
      warnEnd.setHours(23, 59, 59, 999);

      const warningUsers = await users.find({
        trialEndsAt: { $gte: warnStart, $lte: warnEnd },
        planType: 'PREMIUM',
        subscriptionStatus: { $nin: ['active', 'lifetime'] },
      }).toArray();

      const campaignId = `trial_ending_${daysLeft}d`;

      for (const user of warningUsers) {
        const alreadySent = await dripLog.findOne({
          userId: user._id.toString(),
          campaignId,
        });

        if (!alreadySent) {
          try {
            await sendTrialEndingSoonEmail(user.email, user.name, daysLeft);
            await dripLog.insertOne({
              userId: user._id.toString(),
              email: user.email,
              campaignId,
              sentAt: now,
            });
            console.log(`Trial warning (${daysLeft}d left) sent: ${user.email}`);

            // Per-user Discord notification
            const cardCount = await db.collection('cards').countDocuments({ userId: user._id.toString() });
            const urgencyLabel = daysLeft === 1 ? 'Tomorrow' : `${daysLeft} Days`;
            await notifyDiscordTrialEvent(`⏳ Trial Ending in ${urgencyLabel}`, [
              { name: 'User', value: `${user.name || 'Unknown'} (${user.email})`, inline: true },
              { name: 'Days Left', value: `${daysLeft}`, inline: true },
              { name: 'Cards Created', value: `${cardCount}`, inline: true },
            ]);
          } catch (e) {
            console.error(`Failed to send trial warning to ${user.email}:`, e.message);
          }
        }
      }
    }

    // 3. TRIAL DAY EMAILS: Send day 1, 3, 5, 7 engagement emails
    const activeTrialUsers = await users.find({
      trialEndsAt: { $gt: now },
      planType: 'PREMIUM',
      subscriptionStatus: { $nin: ['active', 'lifetime'] },
    }).toArray();

    let trialDayEmailsSent = 0;
    for (const user of activeTrialUsers) {
      if (!user.email || !user.trialEndsAt) continue;

      // Compute trial day: trialEndsAt minus 7 days = trial start
      const trialStart = new Date(user.trialEndsAt);
      trialStart.setDate(trialStart.getDate() - 7);
      const trialDay = Math.max(1, Math.ceil((now - trialStart) / 86400000));

      // Only send on day 1, 3, 5, 7
      if (!TRIAL_DAY_EMAILS[trialDay]) continue;

      const campaignId = TRIAL_DAY_EMAILS[trialDay].campaignId;

      // Deduplicate via drip_log
      const alreadySent = await dripLog.findOne({
        userId: user._id.toString(),
        campaignId,
      });
      if (alreadySent) continue;

      const cardCount = await db.collection('cards').countDocuments({ userId: user._id.toString() });

      try {
        await sendTrialDayEmail(user.email, user.name, trialDay, cardCount);
        await dripLog.insertOne({
          userId: user._id.toString(),
          email: user.email,
          campaignId,
          sentAt: now,
        });
        trialDayEmailsSent++;
        console.log(`Trial day ${trialDay} email sent: ${user.email} (${cardCount} cards)`);

        // Per-user Discord notification
        const userName = user.name || 'Unknown';
        const trialEnd = new Date(user.trialEndsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        await notifyDiscordTrialEvent(`📧 Trial Day ${trialDay} Email Sent`, [
          { name: 'User', value: `${userName} (${user.email})`, inline: true },
          { name: 'Trial Day', value: `${trialDay} of 7`, inline: true },
          { name: 'Cards Created', value: `${cardCount}`, inline: true },
          { name: 'Trial Ends', value: trialEnd, inline: true },
        ]);
      } catch (e) {
        console.error(`Failed to send trial day ${trialDay} email to ${user.email}:`, e.message);
      }
    }

    // 4. CHURN RISK: Flag inactive trial users
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const trialUsers = await users.find({
      $or: [
        { subscriptionStatus: 'trialing' },
        { subscriptionStatus: 'active', trialEndsAt: { $gt: now } },
      ],
    }).toArray();

    let churnFlagged = 0;
    const activityEvents = db.collection('activity_events');

    for (const user of trialUsers) {
      if (!user.trialEndsAt) continue;

      const trialStart = new Date(user.trialEndsAt);
      trialStart.setDate(trialStart.getDate() - 7);
      const trialDay = Math.max(1, Math.ceil((now - trialStart) / 86400000));

      if (trialDay < 2) continue;

      // Check if already flagged via drip_log
      const alreadyFlagged = await dripLog.findOne({
        userId: user._id.toString(),
        campaignId: 'trial_churn_risk_detected',
      });
      if (alreadyFlagged) continue;

      // Check for any activity in the last 48 hours
      const recentActivity = await activityEvents.findOne({
        $or: [
          { userId: user._id.toString() },
          { email: user.email },
        ],
        createdAt: { $gte: fortyEightHoursAgo },
      });

      if (recentActivity) continue;

      // Calculate days inactive (from last activity event ever, or signup)
      const lastEvent = await activityEvents.find({
        $or: [
          { userId: user._id.toString() },
          { email: user.email },
        ],
      }).sort({ createdAt: -1 }).limit(1).toArray();

      const lastActiveDate = lastEvent[0]?.createdAt || user.createdAt || trialStart;
      const daysInactive = Math.max(1, Math.floor((now - new Date(lastActiveDate)) / 86400000));

      const cardsCreated = await db.collection('cards').countDocuments({ userId: user._id.toString() });

      // Send Discord alert
      const userName = user.name || 'Unknown';
      const msg = `🚨 Trial user **${userName}** (${user.email}) has been inactive for ${daysInactive} day${daysInactive === 1 ? '' : 's'} (trial day ${trialDay} of 7). Cards created: ${cardsCreated}`;
      await notifyDiscord(msg);

      // Track the activity event
      await activityEvents.insertOne({
        event: 'trial_churn_risk_detected',
        source: 'server',
        userId: user._id.toString(),
        email: user.email,
        metadata: { trialDay, daysInactive, cardsCreated },
        createdAt: now,
      });

      // Log to drip_log so we don't flag the same user again
      await dripLog.insertOne({
        userId: user._id.toString(),
        email: user.email,
        campaignId: 'trial_churn_risk_detected',
        sentAt: now,
      });

      churnFlagged++;
      console.log(`Churn risk flagged: ${user.email} (trial day ${trialDay}, inactive ${daysInactive}d, ${cardsCreated} cards)`);
    }

    console.log(`Trial check complete: ${expiredCount} expired, ${trialDayEmailsSent} day emails sent, ${churnFlagged} churn risks flagged`);
  } finally {
    await client.close();
  }
}

run().catch(e => {
  console.error('Trial expiration script failed:', e);
  process.exit(1);
});
