const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const { openSqliteShadowDatabase, useSqliteBackend } = require('./sqlite-shadow-store.cjs');

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

const WEBHOOK_URL = process.env.MYBINGOCARD_EVENTS_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mybingocard';

function getSignupSourceLabel(user) {
  if (user.utm_source) return user.utm_source;
  if (user.referrer) {
    try { return new URL(user.referrer).hostname.replace(/^www\./, ''); } catch (e) { return user.referrer; }
  }
  return 'direct';
}

function isReportableRetentionUser(user) {
  const email = String(user.email || '').toLowerCase();
  const name = String(user.name || '').toLowerCase();
  const customerType = String(user.customerType || '').toLowerCase();

  if (!email || email.includes('@guest.mybingocard.local') || email.startsWith('guest-')) return false;
  if (['guest', 'test', 'admin'].includes(customerType)) return false;
  if (name.includes('cory')) return false;

  return true;
}

function formatCohort(cohort) {
  return cohort.eligible > 0
    ? cohort.returned + '/' + cohort.eligible + ' (' + cohort.pct + '%)'
    : '0/0 (0%)';
}

function formatDate(value) {
  if (!value) return 'unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Phoenix',
  });
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

function dateTime(value) {
  const date = value instanceof Date ? value : new Date(value || 0);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function formatBillingAtRiskLine(user, now) {
  const name = user.name || user.email || 'Unknown';
  const since = user.billingPastDueSince || user.billingLastPaymentFailedAt || user.updatedAt;
  const daysPastDue = since
    ? Math.floor((now.getTime() - new Date(since).getTime()) / 86400000)
    : 0;
  const retry = user.billingNextPaymentAttempt
    ? 'next retry ' + formatDate(user.billingNextPaymentAttempt)
    : 'no retry scheduled';
  const attempt = user.billingFailedAttemptCount
    ? 'attempt ' + user.billingFailedAttemptCount
    : 'attempt unknown';
  const manual = daysPastDue >= 14 ? ' - MANUAL FOLLOW-UP' : '';

  return name + ' - ' + daysPastDue + 'd past due, ' + attempt + ', ' + retry + manual;
}

async function sendDiscord(payload) {
  if (!WEBHOOK_URL) {
    console.log('Discord webhook not configured; skipping daily-summary post');
    return false;
  }
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) console.error('Discord webhook failed:', res.status, await res.text());
  return res.ok;
}

async function run() {
  const sqliteBackend = useSqliteBackend();
  const client = sqliteBackend ? openSqliteShadowDatabase() : new MongoClient(MONGODB_URI);
  try {
    if (!sqliteBackend) await client.connect();
    const db = sqliteBackend ? client : client.db('mybingocard');

    const now = new Date();
    const yesterday = new Date(now.getTime() - 86400000);
    const lastWeek = new Date(now.getTime() - 7 * 86400000);
    const lastMonth = new Date(now.getTime() - 30 * 86400000);
    const sqliteActivityEvents = sqliteBackend
      ? await db.collection('activity_events').find({}).toArray()
      : null;

    // =============================================
    // EMBED 1: Overview (existing metrics + retention)
    // =============================================

    // --- User Metrics ---
    const totalUsers = await db.collection('users').countDocuments();
    const newUsers24h = await db.collection('users').countDocuments({ createdAt: { $gte: yesterday } });
    const newUsers7d = await db.collection('users').countDocuments({ createdAt: { $gte: lastWeek } });
    const newUsers30d = await db.collection('users').countDocuments({ createdAt: { $gte: lastMonth } });
    const newUsersWithSource = await db.collection('users')
      .find({ createdAt: { $gte: yesterday } }, { projection: { utm_source: 1, referrer: 1 } })
      .toArray();

    // --- Subscription Metrics ---
    const paidUsers = await db.collection('users').countDocuments({
      planType: { $ne: 'FREE' },
      subscriptionStatus: { $in: ['active', 'trialing', 'lifetime'] },
    });
    const pastDueUsers = await db.collection('users').countDocuments({
      planType: { $ne: 'FREE' },
      subscriptionStatus: 'past_due',
    });
    const freeUsers = totalUsers - paidUsers - pastDueUsers;

    const planBreakdown = await db.collection('users').aggregate([
      { $group: { _id: '$planType', count: { $sum: 1 } } }
    ]).toArray();
    const planMap = {};
    planBreakdown.forEach(p => { planMap[p._id || 'FREE'] = p.count; });

    // --- Card Metrics ---
    const totalCards = await db.collection('cards').countDocuments();
    const newCards24h = await db.collection('cards').countDocuments({ createdAt: { $gte: yesterday } });
    const newCards7d = await db.collection('cards').countDocuments({ createdAt: { $gte: lastWeek } });
    const publicCards = await db.collection('cards').countDocuments({ isPublic: true });
    const totalTemplates = await db.collection('templates').countDocuments();

    // --- Game Metrics ---
    let totalGames = 0, games24h = 0, games7d = 0, totalWins = 0;
    try {
      totalGames = await db.collection('gameHistory').countDocuments();
      games24h = await db.collection('gameHistory').countDocuments({ completedAt: { $gte: yesterday } });
      games7d = await db.collection('gameHistory').countDocuments({ completedAt: { $gte: lastWeek } });
      totalWins = await db.collection('gameHistory').countDocuments({ result: 'won' });
    } catch (e) {}

    // --- Ghost Users (signed up, 0 cards) ---
    const allUserIds = await db.collection('users').find({}, { projection: { _id: 1 } }).toArray();
    const usersWithCards = new Set(await db.collection('cards').distinct('userId'));
    const ghostCount = allUserIds.filter(u => !usersWithCards.has(u._id.toString())).length;
    const ghostPct = totalUsers > 0 ? ((ghostCount / totalUsers) * 100).toFixed(0) : '0';

    // --- Retention (reportable users only; excludes test/admin/guest and Cory-owned accounts) ---
    async function calculateReturnCohort(days) {
      const cutoff = new Date(now.getTime() - days * 86400000);
      const users = (await db.collection('users').find(
        { createdAt: { $lte: cutoff } },
        { projection: { name: 1, email: 1, createdAt: 1, customerType: 1, lastLoginAt: 1 } }
      ).toArray()).filter(isReportableRetentionUser);

      let returned = 0;
      for (const user of users) {
        if (!user.createdAt) continue;

        const userId = user._id.toString();
        const email = String(user.email || '').toLowerCase();
        const threshold = new Date(new Date(user.createdAt).getTime() + days * 86400000);
        const activity = sqliteActivityEvents
          ? sqliteActivityEvents.some((event) => {
              const eventTime = dateTime(event.createdAt);
              if (eventTime == null || eventTime < threshold.getTime()) return false;
              const eventUserId = objectIdString(event.userId);
              const eventEmail = String(event.email || '').toLowerCase();
              return eventUserId === userId || eventEmail === email;
            })
          : await db.collection('activity_events').findOne({
              createdAt: { $gte: threshold },
              $or: [
                { userId },
                { email },
              ],
            }, { projection: { _id: 1 } });

        const loginReturned = user.lastLoginAt && new Date(user.lastLoginAt) >= threshold;
        if (activity || loginReturned) returned++;
      }

      return {
        returned,
        eligible: users.length,
        pct: users.length > 0 ? ((returned / users.length) * 100).toFixed(0) : '0',
      };
    }

    const retention24h = await calculateReturnCohort(1);
    const retention48h = await calculateReturnCohort(2);
    const retention14d = await calculateReturnCohort(14);
    const retention30d = await calculateReturnCohort(30);

    // --- Billing At Risk ---
    const billingAtRiskUsers = await db.collection('users')
      .find(
        {
          planType: { $ne: 'FREE' },
          subscriptionStatus: 'past_due',
        },
        {
          projection: {
            name: 1,
            email: 1,
            billingPastDueSince: 1,
            billingLastPaymentFailedAt: 1,
            billingNextPaymentAttempt: 1,
            billingFailedAttemptCount: 1,
            updatedAt: 1,
          },
        }
      )
      .sort({ billingPastDueSince: 1, billingLastPaymentFailedAt: 1 })
      .toArray();
    const billingManualFollowups = billingAtRiskUsers.filter((user) => {
      const since = user.billingPastDueSince || user.billingLastPaymentFailedAt || user.updatedAt;
      if (!since) return false;
      return now.getTime() - new Date(since).getTime() >= 14 * 86400000;
    });
    const billingAtRiskList = billingAtRiskUsers
      .map((user) => formatBillingAtRiskLine(user, now))
      .join('\n');

    // --- Recent signups ---
    const recentSignups = await db.collection('users')
      .find({}, { projection: { name: 1, email: 1, createdAt: 1, planType: 1, utm_source: 1, referrer: 1 } })
      .sort({ createdAt: -1 }).limit(5).toArray();
    const recentList = recentSignups.map(u => {
      const name = u.name || 'Anonymous';
      const plan = u.planType || 'FREE';
      const ago = Math.round((now - new Date(u.createdAt)) / 3600000);
      const timeStr = ago < 24 ? ago + 'h ago' : Math.round(ago / 24) + 'd ago';
      return name + ' (' + plan + ', ' + getSignupSourceLabel(u) + ') - ' + timeStr;
    }).join('\n');

    const sourceCounts = {};
    newUsersWithSource.forEach(u => {
      const src = getSignupSourceLabel(u);
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    });
    const signupSources = Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([s, c]) => s + ': **' + c + '**').join(' | ');

    // --- Email / Drip Stats ---
    const totalSent = await db.collection('drip_log').countDocuments();
    const sent24h = await db.collection('drip_log').countDocuments({ sentAt: { $gte: yesterday } });
    const totalOpens = await db.collection('drip_opens').countDocuments();
    const opens24h = await db.collection('drip_opens').countDocuments({ firstOpenedAt: { $gte: yesterday } });
    const totalUnsubs = await db.collection('email_preferences').countDocuments({ marketingEmails: false });

    const campaignLogs = await db.collection('drip_log').aggregate([
      { $group: { _id: '$campaignId', sent: { $sum: 1 } } }
    ]).toArray();
    const campaignOpens = await db.collection('drip_opens').aggregate([
      { $group: { _id: '$campaignId', opens: { $sum: 1 } } }
    ]).toArray();
    const opensByCampaign = {};
    campaignOpens.forEach(c => { opensByCampaign[c._id] = c.opens; });
    const campaignLabels = {
      create_first_card: 'Create First Card',
      how_are_you_liking: 'How Are You Liking It',
      reengage_inactive: 'Re-engagement',
      upgrade_nudge: 'Upgrade Nudge',
    };
    const campaignLines = campaignLogs.map(c => {
      const label = campaignLabels[c._id] || c._id;
      const opens = opensByCampaign[c._id] || 0;
      const rate = c.sent > 0 ? ((opens / c.sent) * 100).toFixed(0) : '0';
      return label + ': **' + opens + '/' + c.sent + '** (' + rate + '%)';
    }).join('\n');
    const overallOpenRate = totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(1) : '0';

    // --- Top Cards ---
    const topCards = await db.collection('cards')
      .find({}, { projection: { title: 1, views: 1 } })
      .sort({ views: -1 }).limit(5).toArray();
    const topCardsList = topCards.map((c, i) =>
      (i + 1) + '. ' + (c.title || 'Untitled') + ' (' + (c.views || 0) + ' views)'
    ).join('\n');

    const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
    const conversionRate = totalUsers > 0 ? ((paidUsers / totalUsers) * 100).toFixed(1) : '0';
    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Phoenix'
    });

    const embed1 = {
      title: 'MyBingoCard Morning Brief',
      description: dateStr,
      color: 0x6366f1,
      fields: [
        {
          name: 'Users',
          value: [
            'Total: **' + totalUsers + '** | Paid: **' + paidUsers + '** | Free: **' + freeUsers + '**',
            'Payment failed / at risk: **' + pastDueUsers + '** | Manual follow-up: **' + billingManualFollowups.length + '**',
            'New (24h): **' + newUsers24h + '** | (7d): **' + newUsers7d + '** | (30d): **' + newUsers30d + '**',
            'Conversion: **' + conversionRate + '%**',
            'Retention: 24h **' + formatCohort(retention24h) + '** | 48h **' + formatCohort(retention48h) + '**',
            'Retention: 14d **' + formatCohort(retention14d) + '** | 30d **' + formatCohort(retention30d) + '**',
            'Ghost users (0 cards): **' + ghostCount + '** (' + ghostPct + '%)',
          ].join('\n'),
          inline: false,
        },
        {
          name: 'Plans',
          value: Object.entries(planMap).map(([p, c]) => p + ': **' + c + '**').join(' | ') || 'No data',
          inline: false,
        },
        {
          name: 'Billing At Risk',
          value: billingAtRiskList || 'No past-due Premium users',
          inline: false,
        },
        {
          name: 'Cards',
          value: 'Total: **' + totalCards + '** | Public: **' + publicCards + '** | Templates: **' + totalTemplates + '**\nNew (24h): **' + newCards24h + '** | (7d): **' + newCards7d + '**',
          inline: true,
        },
        {
          name: 'Games',
          value: 'Total: **' + totalGames + '** | Wins: **' + totalWins + '** (' + winRate + '%)\nPlayed (24h): **' + games24h + '** | (7d): **' + games7d + '**',
          inline: true,
        },
        {
          name: 'Recent Signups',
          value: recentList || 'None',
          inline: false,
        },
        {
          name: 'Signup Sources (24h)',
          value: signupSources || 'No new signups',
          inline: false,
        },
        {
          name: 'Email Drip Stats',
          value: [
            'Sent (24h): **' + sent24h + '** | Total: **' + totalSent + '** | Opens (24h): **' + opens24h + '**',
            'Overall open rate: **' + overallOpenRate + '%** | Unsubs: **' + totalUnsubs + '**',
            campaignLines,
          ].join('\n'),
          inline: false,
        },
        {
          name: 'Top Cards by Views',
          value: topCardsList || 'No cards yet',
          inline: false,
        },
      ],
      footer: { text: 'MyBingoCard.com - Morning Brief' },
      timestamp: now.toISOString(),
    };

    // Send embed 1
    await sendDiscord({ embeds: [embed1] });

    // =============================================
    // EMBED 2: Activity Deep Dive (new)
    // =============================================

    // --- Activity Events (24h) ---
    const totalEvents24h = await db.collection('activity_events').countDocuments({ createdAt: { $gte: yesterday } });
    const pageViews24h = await db.collection('activity_events').countDocuments({ createdAt: { $gte: yesterday }, event: 'page_view' });
    const uniqueAnon24h = (await db.collection('activity_events').distinct('anonymousId', { createdAt: { $gte: yesterday }, anonymousId: { $ne: null } })).length;
    const uniqueLogged24h = (await db.collection('activity_events').distinct('userId', { createdAt: { $gte: yesterday }, userId: { $ne: null } })).length;
    const signups24h = await db.collection('activity_events').countDocuments({ createdAt: { $gte: yesterday }, event: 'signup_completed' });
    const logins24h = await db.collection('activity_events').countDocuments({ createdAt: { $gte: yesterday }, event: 'login_succeeded' });

    // --- Conversion Funnel (24h) ---
    const funnelEvents = ['page_view', 'card_title_entered', 'card_cells_added', 'card_save_attempted', 'card_created', 'upgrade_prompt_shown', 'checkout_started'];
    const funnelLines = [];
    for (const evt of funnelEvents) {
      const count = await db.collection('activity_events').countDocuments({ createdAt: { $gte: yesterday }, event: evt });
      const users = (await db.collection('activity_events').distinct('anonymousId', { createdAt: { $gte: yesterday }, event: evt })).length;
      if (count > 0) funnelLines.push(evt.replace(/_/g, ' ') + ': **' + count + '** (' + users + ' users)');
    }

    // --- ChatGPT Referral (24h) ---
    const chatgptEvents = await db.collection('activity_events').countDocuments({
      createdAt: { $gte: yesterday }, pathname: { $regex: 'chatgpt' }
    });
    const chatgptVisitors = (await db.collection('activity_events').distinct('anonymousId', {
      createdAt: { $gte: yesterday }, pathname: { $regex: 'chatgpt' }
    })).length;

    // ChatGPT 7-day trend
    const chatgpt7d = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - (i + 1) * 86400000);
      const dayEnd = new Date(now.getTime() - i * 86400000);
      const visitors = (await db.collection('activity_events').distinct('anonymousId', {
        createdAt: { $gte: dayStart, $lt: dayEnd }, pathname: { $regex: 'chatgpt' }
      })).length;
      const label = dayStart.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/Phoenix' });
      chatgpt7d.push(label + ': **' + visitors + '**');
    }

    // --- Shared Card Engagement (24h) ---
    const sharedViews24h = await db.collection('activity_events').countDocuments({
      createdAt: { $gte: yesterday }, event: 'shared_card_viewed'
    });
    const topShared = await db.collection('activity_events').aggregate([
      { $match: { createdAt: { $gte: yesterday }, pathname: { $regex: '^/share/' } } },
      { $group: { _id: '$pathname', events: { $sum: 1 } } },
      { $sort: { events: -1 } },
      { $limit: 3 }
    ]).toArray();
    const sharedLines = topShared.map(s => s._id + ': **' + s.events + '** events').join('\n');

    // --- Feature Usage (24h) ---
    const featureList = ['export_pdf', 'export_png', 'batch_pdf_exported', 'template_used',
      'card_share_link_copied', 'game_created', 'image_uploaded'];
    const featureLines = [];
    for (const f of featureList) {
      const count = await db.collection('activity_events').countDocuments({ createdAt: { $gte: yesterday }, event: f });
      if (count > 0) featureLines.push(f.replace(/_/g, ' ') + ': **' + count + '**');
    }

    // --- Upgrade Prompt Performance (24h) ---
    const upgradeShown24h = await db.collection('activity_events').countDocuments({ createdAt: { $gte: yesterday }, event: 'upgrade_prompt_shown' });
    const upgradeDismissed24h = await db.collection('activity_events').countDocuments({ createdAt: { $gte: yesterday }, event: 'upgrade_dismissed' });
    const upgradeClicked24h = await db.collection('activity_events').countDocuments({ createdAt: { $gte: yesterday }, event: 'upgrade_prompt_clicked' });
    const checkoutsStarted24h = await db.collection('activity_events').countDocuments({ createdAt: { $gte: yesterday }, event: 'checkout_started' });
    const checkoutsAbandoned24h = await db.collection('activity_events').countDocuments({ createdAt: { $gte: yesterday }, event: 'checkout_abandoned' });

    // --- Login Security (24h) ---
    const loginFails24h = await db.collection('activity_events').countDocuments({ createdAt: { $gte: yesterday }, event: 'login_failed' });
    const loginFailIPs = (await db.collection('activity_events').distinct('ipAddress', { createdAt: { $gte: yesterday }, event: 'login_failed' })).length;

    // --- Device Split (24h page views) ---
    const recentUAs = await db.collection('activity_events').find(
      { event: 'page_view', createdAt: { $gte: yesterday }, 'metadata.userAgent': { $ne: null } },
      { projection: { 'metadata.userAgent': 1 } }
    ).limit(500).toArray();
    let mobile = 0, desktop = 0;
    recentUAs.forEach(r => {
      const ua = r.metadata?.userAgent || '';
      if (/Mobile|iPhone|Android/i.test(ua) && !/iPad|Tablet/i.test(ua)) mobile++;
      else desktop++;
    });
    const deviceTotal = mobile + desktop || 1;

    // --- Bounced Emails (24h) ---
    const bouncedEmails24h = await db.collection('support_tickets').countDocuments({
      subject: /Undelivered Mail/i
    });

    const embed2 = {
      title: 'Activity Deep Dive (24h)',
      color: 0x10b981,
      fields: [
        {
          name: 'Traffic',
          value: [
            'Events: **' + totalEvents24h + '** | Page views: **' + pageViews24h + '**',
            'Visitors: **' + uniqueAnon24h + '** anon + **' + uniqueLogged24h + '** logged in',
            'Signups: **' + signups24h + '** | Logins: **' + logins24h + '**',
            'Desktop: **' + Math.round(desktop / deviceTotal * 100) + '%** | Mobile: **' + Math.round(mobile / deviceTotal * 100) + '%**',
          ].join('\n'),
          inline: false,
        },
        {
          name: 'Conversion Funnel',
          value: funnelLines.join('\n') || 'No activity',
          inline: false,
        },
        {
          name: 'Upgrade & Checkout',
          value: [
            'Upgrade shown: **' + upgradeShown24h + '** | Dismissed: **' + upgradeDismissed24h + '** | Clicked: **' + upgradeClicked24h + '**',
            'Checkouts started: **' + checkoutsStarted24h + '** | Abandoned: **' + checkoutsAbandoned24h + '**',
          ].join('\n'),
          inline: false,
        },
        {
          name: 'ChatGPT Referrals',
          value: [
            'Today: **' + chatgptVisitors + '** visitors (' + chatgptEvents + ' events)',
            '7-day trend: ' + chatgpt7d.join(' | '),
          ].join('\n'),
          inline: false,
        },
        {
          name: 'Shared Cards',
          value: [
            'Card views: **' + sharedViews24h + '**',
            sharedLines || 'No shared card activity',
          ].join('\n'),
          inline: true,
        },
        {
          name: 'Feature Usage',
          value: featureLines.join('\n') || 'None',
          inline: true,
        },
        {
          name: 'Security',
          value: [
            'Login failures: **' + loginFails24h + '** from **' + loginFailIPs + '** IPs',
            bouncedEmails24h > 0 ? 'Bounced emails: **' + bouncedEmails24h + '** (in support queue)' : '',
          ].filter(Boolean).join('\n') || 'All clear',
          inline: false,
        },
      ],
      footer: { text: 'MyBingoCard.com - Deep Dive' },
      timestamp: now.toISOString(),
    };

    // Discord rate limit: wait 1s between webhook calls
    await new Promise(r => setTimeout(r, 1500));
    await sendDiscord({ embeds: [embed2] });

    console.log('Morning brief sent to Discord at', now.toISOString());
  } catch (err) {
    console.error('Daily summary error:', err);
  } finally {
    await client.close();
  }
}

run();
