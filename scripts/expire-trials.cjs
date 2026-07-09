const fs = require('fs');
const path = require('path');
const nodemailer = require('./smtp-client.cjs');
const { openSqliteShadowStore } = require('./sqlite-shadow-store.cjs');

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

const WEBHOOK_URL = process.env.MYBINGOCARD_EVENTS_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL || '';
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
        You can keep creating and sharing bingo cards for free. Upgrade to Premium when you want AI generation, image bingo cards, HD exports, and premium templates.
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
    headers: {
      'List-Unsubscribe': `<${appUrl}/api/unsubscribe?email=${encodeURIComponent(email)}>, <mailto:unsubscribe@mybingocard.com?subject=unsubscribe%20${encodeURIComponent(email)}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
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
        You've been using Premium features like AI generation, image bingo cards, and HD exports. When your trial ends, you'll switch back to the Free plan with starter templates, standard PDF export, and ads.
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
    headers: {
      'List-Unsubscribe': `<${appUrl}/api/unsubscribe?email=${encodeURIComponent(email)}>, <mailto:unsubscribe@mybingocard.com?subject=unsubscribe%20${encodeURIComponent(email)}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });
}

// Trial day emails removed — users already entered card info at signup,
// no need for reminder/nurture emails during the 7-day trial period.

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

function objectIdString(value) {
  if (value && typeof value === 'object' && typeof value.toHexString === 'function') {
    return value.toHexString();
  }
  if (value && typeof value === 'object' && typeof value.$oid === 'string') {
    return value.$oid;
  }
  return String(value || '');
}

function dateValue(value) {
  const date = value instanceof Date ? value : new Date(value || 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function emailMatches(document, user) {
  return String(document.email || '').trim().toLowerCase() === String(user.email || '').trim().toLowerCase();
}

function userIdMatches(document, user) {
  return objectIdString(document.userId) === objectIdString(user._id);
}

function alreadyLogged(dripLog, user, campaignId) {
  return dripLog.some((entry) => userIdMatches(entry, user) && entry.campaignId === campaignId);
}

function activityBelongsToUser(event, user) {
  return userIdMatches(event, user) || emailMatches(event, user);
}

function countCardsForUser(cards, user) {
  const userId = objectIdString(user._id);
  return cards.filter((card) => objectIdString(card.userId) === userId).length;
}

function latestActivityForUser(activityEvents, user) {
  return activityEvents
    .filter((event) => activityBelongsToUser(event, user))
    .sort((a, b) => {
      const aDate = dateValue(a.createdAt)?.getTime() || 0;
      const bDate = dateValue(b.createdAt)?.getTime() || 0;
      return bDate - aDate;
    })[0] || null;
}

function sqliteFindExpiredTrials(users, now) {
  return users.filter((user) => {
    const trialEndsAt = dateValue(user.trialEndsAt);
    return trialEndsAt
      && trialEndsAt <= now
      && user.planType === 'PREMIUM'
      && user.subscriptionStatus === 'trialing';
  });
}

function sqliteFindWarningUsers(users, warnStart, warnEnd) {
  return users.filter((user) => {
    const trialEndsAt = dateValue(user.trialEndsAt);
    return trialEndsAt
      && trialEndsAt >= warnStart
      && trialEndsAt <= warnEnd
      && user.planType === 'PREMIUM'
      && !['active', 'lifetime'].includes(user.subscriptionStatus);
  });
}

function sqliteFindActiveTrialUsers(users, now) {
  return users.filter((user) => {
    const trialEndsAt = dateValue(user.trialEndsAt);
    return trialEndsAt
      && trialEndsAt > now
      && user.planType === 'PREMIUM'
      && user.subscriptionStatus !== 'lifetime';
  });
}

async function runSqlite() {
  const store = openSqliteShadowStore();
  try {
    const users = store.findMany('users').map((row) => row.document);
    const dripLog = store.findMany('drip_log').map((row) => row.document);
    const cards = store.findMany('cards').map((row) => row.document);
    const activityEvents = store.findMany('activity_events').map((row) => row.document);
    const now = new Date();

    const expiredTrials = sqliteFindExpiredTrials(users, now);

    let expiredCount = 0;
    for (const user of expiredTrials) {
      user.planType = 'FREE';
      user.subscriptionStatus = 'inactive';
      user.updatedAt = now;
      store.replaceOne('users', user);

      if (!alreadyLogged(dripLog, user, 'trial_expired')) {
        try {
          await sendTrialExpiredEmail(user.email, user.name);
          const log = {
            userId: objectIdString(user._id),
            email: user.email,
            campaignId: 'trial_expired',
            sentAt: now,
          };
          store.insertOne('drip_log', log);
          dripLog.push(log);
          console.log(`Trial expired + email sent: ${user.email}`);

          const cardCount = countCardsForUser(cards, user);
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

    let trialDayEmailsSent = 0;
    for (const daysLeft of [3, 1]) {
      const warnDate = new Date(now);
      warnDate.setDate(warnDate.getDate() + daysLeft);
      const warnStart = new Date(warnDate);
      warnStart.setHours(0, 0, 0, 0);
      const warnEnd = new Date(warnDate);
      warnEnd.setHours(23, 59, 59, 999);

      const warningUsers = sqliteFindWarningUsers(users, warnStart, warnEnd);
      const campaignId = `trial_ending_${daysLeft}d`;

      for (const user of warningUsers) {
        if (alreadyLogged(dripLog, user, campaignId)) continue;

        try {
          await sendTrialEndingSoonEmail(user.email, user.name, daysLeft);
          const log = {
            userId: objectIdString(user._id),
            email: user.email,
            campaignId,
            sentAt: now,
          };
          store.insertOne('drip_log', log);
          dripLog.push(log);
          trialDayEmailsSent++;
          console.log(`Trial warning (${daysLeft}d left) sent: ${user.email}`);

          const cardCount = countCardsForUser(cards, user);
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

    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const trialUsers = sqliteFindActiveTrialUsers(users, now);

    let churnFlagged = 0;

    for (const user of trialUsers) {
      if (!user.trialEndsAt) continue;

      const trialStart = new Date(user.trialEndsAt);
      trialStart.setDate(trialStart.getDate() - 7);
      const trialDay = Math.max(1, Math.ceil((now - trialStart) / 86400000));

      if (trialDay < 2) continue;
      if (alreadyLogged(dripLog, user, 'trial_churn_risk_detected')) continue;

      const recentActivity = activityEvents.some((event) => (
        activityBelongsToUser(event, user)
        && dateValue(event.createdAt)
        && dateValue(event.createdAt) >= fortyEightHoursAgo
      ));
      if (recentActivity) continue;

      const lastEvent = latestActivityForUser(activityEvents, user);
      const lastActiveDate = lastEvent?.createdAt || user.createdAt || trialStart;
      const daysInactive = Math.max(1, Math.floor((now - new Date(lastActiveDate)) / 86400000));
      const cardsCreated = countCardsForUser(cards, user);

      const userName = user.name || 'Unknown';
      const msg = `🚨 Trial user **${userName}** (${user.email}) has been inactive for ${daysInactive} day${daysInactive === 1 ? '' : 's'} (trial day ${trialDay} of 7). Cards created: ${cardsCreated}`;
      await notifyDiscord(msg);

      const event = {
        event: 'trial_churn_risk_detected',
        source: 'server',
        userId: objectIdString(user._id),
        email: user.email,
        metadata: { trialDay, daysInactive, cardsCreated },
        createdAt: now,
      };
      store.insertOne('activity_events', event);
      activityEvents.push(event);

      const log = {
        userId: objectIdString(user._id),
        email: user.email,
        campaignId: 'trial_churn_risk_detected',
        sentAt: now,
      };
      store.insertOne('drip_log', log);
      dripLog.push(log);

      churnFlagged++;
      console.log(`Churn risk flagged: ${user.email} (trial day ${trialDay}, inactive ${daysInactive}d, ${cardsCreated} cards)`);
    }

    console.log(`Trial check complete: ${expiredCount} expired, ${trialDayEmailsSent} day emails sent, ${churnFlagged} churn risks flagged`);
  } finally {
    store.close();
  }
}

async function run() {
  await runSqlite();
}

run().catch(e => {
  console.error('Trial expiration script failed:', e);
  process.exit(1);
});
