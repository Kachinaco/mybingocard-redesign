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
          } catch (e) {
            console.error(`Failed to send trial warning to ${user.email}:`, e.message);
          }
        }
      }
    }

    if (expiredCount > 0) {
      await notifyDiscord(`Trial expiration: ${expiredCount} user(s) downgraded to Free`);
    }

    console.log(`Trial check complete: ${expiredCount} expired, ${expiredTrials.length} total processed`);
  } finally {
    await client.close();
  }
}

run().catch(e => {
  console.error('Trial expiration script failed:', e);
  process.exit(1);
});
