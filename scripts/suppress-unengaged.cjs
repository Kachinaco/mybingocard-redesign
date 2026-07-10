/**
 * Sunset policy: suppress recipients who have not opened any marketing
 * email in the last N days (default 180), provided we have actually been
 * sending to them. Without this, dead/abandoned addresses keep getting
 * mail and tank our sender reputation over time.
 *
 * Defaults are conservative — only suppress users who:
 *   - Have an email address
 *   - Are not already opted out
 *   - Were sent at least MIN_SENDS emails in the last LOOKBACK_DAYS
 *   - Have ZERO human-likely opens in that window
 *   - Have been on the list for at least GRACE_DAYS (don't suppress brand-new users)
 *
 * Suppression sets email_preferences.marketingEmails=false with
 * suppressedReason='engagement_decay' so we can audit/reverse later.
 *
 * Usage:
 *   DRY_RUN=1 node scripts/suppress-unengaged.cjs   (default — show who would be suppressed)
 *   node scripts/suppress-unengaged.cjs             (actually suppress)
 *
 * Tunable via env:
 *   LOOKBACK_DAYS  (default 180)
 *   MIN_SENDS      (default 3)
 *   GRACE_DAYS     (default 30)
 */

const fs = require('fs');
const path = require('path');
const { openSqliteShadowDatabase } = require('./sqlite-shadow-store.cjs');

const envPath = path.join(__dirname, '..', '.env.local');
try {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) return;
    const key = match[1].trim();
    const value = match[2].trim();
    if (!Object.prototype.hasOwnProperty.call(process.env, key)) process.env[key] = value;
  });
} catch (error) {
  console.error('Could not load .env.local:', error.message);
}

const LOOKBACK_DAYS = Number(process.env.LOOKBACK_DAYS) || 180;
const MIN_SENDS = Number(process.env.MIN_SENDS) || 3;
const GRACE_DAYS = Number(process.env.GRACE_DAYS) || 30;
const DRY_RUN = process.env.DRY_RUN !== '0'; // dry run by default — pass DRY_RUN=0 to actually suppress

const REASON = 'engagement_decay';

async function run() {
  const db = openSqliteShadowDatabase();

  try {
    const now = new Date();
    const lookbackCutoff = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const graceCutoff = new Date(now.getTime() - GRACE_DAYS * 24 * 60 * 60 * 1000);

    console.log(`=== Engagement-decay suppression sweep ===`);
    console.log(`  now:           ${now.toISOString()}`);
    console.log(`  lookback:      last ${LOOKBACK_DAYS} days (cutoff ${lookbackCutoff.toISOString().slice(0,10)})`);
    console.log(`  min sends:     ${MIN_SENDS}`);
    console.log(`  grace:         ${GRACE_DAYS} days (skip users newer than ${graceCutoff.toISOString().slice(0,10)})`);
    console.log(`  mode:          ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
    console.log('');

    // Step 1: get the set of emails currently opted out so we can skip them.
    const optedOut = new Set(
      (await db.collection('email_preferences')
        .find({ marketingEmails: false })
        .project({ email: 1 })
        .toArray())
        .map((p) => p.email)
    );
    console.log(`  already opted out: ${optedOut.size}`);

    // Step 2: aggregate drip_log to find emails that received >= MIN_SENDS in window.
    const heavyRecipients = await db.collection('drip_log').aggregate([
      { $match: { sentAt: { $gte: lookbackCutoff } } },
      { $group: { _id: '$email', sendCount: { $sum: 1 }, lastSentAt: { $max: '$sentAt' } } },
      { $match: { sendCount: { $gte: MIN_SENDS } } },
    ]).toArray();
    console.log(`  recipients with >= ${MIN_SENDS} sends in window: ${heavyRecipients.length}`);

    // Step 3: for each, look up their last human-likely open in window.
    const candidates = [];
    for (const r of heavyRecipients) {
      if (!r._id || optedOut.has(r._id)) continue;

      // Skip brand-new users (haven't had a fair chance to engage yet).
      const user = await db.collection('users').findOne(
        { email: r._id },
        { projection: { _id: 1, createdAt: 1, planType: 1, subscriptionStatus: 1 } }
      );
      if (!user) continue;
      if (user.createdAt && user.createdAt > graceCutoff) continue;

      // Never suppress an active paying customer (they get receipts/billing
      // alerts which are transactional, but they may also get promo mail and
      // we don't want to silently kill that channel for revenue customers).
      if (user.planType === 'PREMIUM' || user.subscriptionStatus === 'active' || user.subscriptionStatus === 'lifetime' || user.subscriptionStatus === 'trialing') {
        continue;
      }

      // Did they open ANY of those emails (human-likely)?
      const opens = await db.collection('drip_opens').findOne({
        email: r._id,
        $or: [
          { lastHumanOpenAt: { $gte: lookbackCutoff } },
          // Backwards compat: pre-bot-filter records didn't have lastHumanOpenAt.
          // Treat any open in window as engagement so we don't suppress old-data users on first run.
          { lastOpenedAt: { $gte: lookbackCutoff }, lastHumanOpenAt: { $exists: false } },
        ],
      });
      if (opens) continue;

      candidates.push({
        email: r._id,
        sendCount: r.sendCount,
        lastSentAt: r.lastSentAt,
        userId: user._id,
        createdAt: user.createdAt,
      });
    }

    console.log('');
    console.log(`=== ${candidates.length} candidate(s) for suppression ===`);
    candidates.forEach((c) => {
      console.log(`  ${(c.email || '').padEnd(40)} | sends: ${c.sendCount} | last sent: ${c.lastSentAt ? c.lastSentAt.toISOString().slice(0,10) : '?'} | created: ${c.createdAt ? c.createdAt.toISOString().slice(0,10) : '?'}`);
    });

    if (DRY_RUN) {
      console.log('');
      console.log('=== DRY RUN — pass DRY_RUN=0 to actually suppress ===');
      return;
    }

    console.log('');
    console.log('=== Suppressing... ===');
    let suppressed = 0;
    for (const c of candidates) {
      try {
        await db.collection('email_preferences').updateOne(
          { email: c.email },
          {
            $set: {
              email: c.email,
              marketingEmails: false,
              unsubscribedAt: new Date(),
              suppressedReason: REASON,
              suppressedAt: new Date(),
              suppressedSendCount: c.sendCount,
            },
          },
          { upsert: true }
        );
        console.log(`  SUPPRESSED ${c.email}`);
        suppressed += 1;
      } catch (e) {
        console.error(`  ERROR ${c.email}: ${e.message}`);
      }
    }

    console.log('');
    console.log(`=== DONE: suppressed ${suppressed}/${candidates.length} ===`);
  } finally {
    db.close();
  }
}

run().catch((err) => {
  console.error('Suppression sweep failed:', err);
  process.exit(1);
});
