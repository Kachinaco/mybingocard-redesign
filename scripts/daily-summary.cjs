const fs = require('fs');
const path = require('path');
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

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mybingocard';

function getSignupSourceLabel(user) {
  if (user.utm_source) {
    return user.utm_source;
  }

  if (user.referrer) {
    try {
      return new URL(user.referrer).hostname.replace(/^www\./, '');
    } catch (e) {
      return user.referrer;
    }
  }

  return 'direct';
}

async function run() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('mybingocard');

    const now = new Date();
    const yesterday = new Date(now.getTime() - 86400000);
    const lastWeek = new Date(now.getTime() - 7 * 86400000);
    const lastMonth = new Date(now.getTime() - 30 * 86400000);

    // --- User Metrics ---
    const totalUsers = await db.collection('users').countDocuments();
    const newUsers24h = await db.collection('users').countDocuments({ createdAt: { $gte: yesterday } });
    const newUsers7d = await db.collection('users').countDocuments({ createdAt: { $gte: lastWeek } });
    const newUsers30d = await db.collection('users').countDocuments({ createdAt: { $gte: lastMonth } });
    const newUsersWithSource = await db.collection('users')
      .find(
        { createdAt: { $gte: yesterday } },
        { projection: { utm_source: 1, referrer: 1 } }
      )
      .toArray();

    // --- Subscription Metrics ---
    const paidUsers = await db.collection('users').countDocuments({
      planType: { $ne: 'FREE' },
      subscriptionStatus: 'active'
    });
    const freeUsers = totalUsers - paidUsers;

    // Plan breakdown
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

    // --- Template Metrics ---
    const totalTemplates = await db.collection('templates').countDocuments();

    // --- Game Metrics ---
    let totalGames = 0, games24h = 0, games7d = 0, totalWins = 0;
    try {
      totalGames = await db.collection('gameHistory').countDocuments();
      games24h = await db.collection('gameHistory').countDocuments({ completedAt: { $gte: yesterday } });
      games7d = await db.collection('gameHistory').countDocuments({ completedAt: { $gte: lastWeek } });
      totalWins = await db.collection('gameHistory').countDocuments({ result: 'won' });
    } catch (e) { /* gameHistory may not exist yet */ }

    // --- Recent signups (last 5) ---
    const recentSignups = await db.collection('users')
      .find({}, { projection: { name: 1, email: 1, createdAt: 1, planType: 1, utm_source: 1, referrer: 1 } })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    const recentList = recentSignups.map(u => {
      const name = u.name || 'Anonymous';
      const plan = u.planType || 'FREE';
      const ago = Math.round((now - new Date(u.createdAt)) / 3600000);
      const timeStr = ago < 24 ? ago + 'h ago' : Math.round(ago / 24) + 'd ago';
      const source = getSignupSourceLabel(u);
      return name + ' (' + plan + ', ' + source + ') - ' + timeStr;
    }).join('\n');

    const sourceCounts = {};
    newUsersWithSource.forEach((user) => {
      const source = getSignupSourceLabel(user);
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
    const signupSources = Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => source + ': **' + count + '**')
      .join(' | ');

    // --- Most popular cards ---
    const topCards = await db.collection('cards')
      .find({}, { projection: { title: 1, views: 1 } })
      .sort({ views: -1 })
      .limit(5)
      .toArray();

    const topCardsList = topCards.map((c, i) => {
      return (i + 1) + '. ' + (c.title || 'Untitled') + ' (' + (c.views || 0) + ' views)';
    }).join('\n');

    // --- Build embed ---
    const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
    const conversionRate = totalUsers > 0 ? ((paidUsers / totalUsers) * 100).toFixed(1) : '0';

    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      timeZone: 'America/Phoenix'
    });

    const embed = {
      title: 'MyBingoCard Daily Summary',
      description: dateStr,
      color: 0x6366f1,
      fields: [
        {
          name: 'Users',
          value: [
            'Total: **' + totalUsers + '**',
            'New (24h): **' + newUsers24h + '** | (7d): **' + newUsers7d + '** | (30d): **' + newUsers30d + '**',
            'Paid: **' + paidUsers + '** | Free: **' + freeUsers + '**',
            'Conversion: **' + conversionRate + '%**',
          ].join('\n'),
          inline: false,
        },
        {
          name: 'Plans',
          value: Object.entries(planMap).map(([plan, count]) => plan + ': **' + count + '**').join(' | ') || 'No data',
          inline: false,
        },
        {
          name: 'Cards',
          value: [
            'Total: **' + totalCards + '** | Public: **' + publicCards + '**',
            'New (24h): **' + newCards24h + '** | (7d): **' + newCards7d + '**',
          ].join('\n'),
          inline: true,
        },
        {
          name: 'Games',
          value: [
            'Total: **' + totalGames + '** | Wins: **' + totalWins + '** (' + winRate + '%)',
            'Played (24h): **' + games24h + '** | (7d): **' + games7d + '**',
          ].join('\n'),
          inline: true,
        },
        {
          name: 'Templates',
          value: 'Total: **' + totalTemplates + '**',
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
          name: 'Top Cards by Views',
          value: topCardsList || 'No cards yet',
          inline: false,
        },
      ],
      footer: { text: 'MyBingoCard.com - Daily Report' },
      timestamp: now.toISOString(),
    };

    // Send to Discord
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (res.ok) {
      console.log('Daily summary sent to Discord at', now.toISOString());
    } else {
      console.error('Discord webhook failed:', res.status, await res.text());
    }
  } catch (err) {
    console.error('Daily summary error:', err);
  } finally {
    await client.close();
  }
}

run();
