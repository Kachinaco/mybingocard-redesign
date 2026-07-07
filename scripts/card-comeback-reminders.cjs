const fs = require('fs');
const path = require('path');
const nodemailer = require('./smtp-client.cjs');
const { MongoClient, ObjectId } = require('mongodb');
const { openSqliteShadowStore, useSqliteBackend } = require('./sqlite-shadow-store.cjs');

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
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mybingocard';
const CAMPAIGN_ID = 'card_comeback_24h';
const MIN_AGE_HOURS = Number(process.env.CARD_COMEBACK_MIN_AGE_HOURS || 20);
const MAX_AGE_DAYS = Number(process.env.CARD_COMEBACK_MAX_AGE_DAYS || 7);
const LIMIT = Number(process.env.CARD_COMEBACK_LIMIT || 100);
const TARGET_EMAIL = normalizeEmail(process.env.TARGET_EMAIL || '');
const SEND_EMAILS = process.env.SEND_EMAILS === '1';

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

function appendUtmParams(url) {
  const parsed = new URL(url);
  parsed.searchParams.set('utm_source', 'mybingocard');
  parsed.searchParams.set('utm_medium', 'email');
  parsed.searchParams.set('utm_campaign', CAMPAIGN_ID);
  return parsed.toString();
}

function button(label, url) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0 0;"><tr><td style="border-radius:12px;background:#059669;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:13px 22px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">${escapeHtml(label)}</a></td></tr></table>`;
}

function buildEmail({ email, name, card }) {
  const userFirstName = firstName(name);
  const cardTitle = card.title || 'your bingo card';
  const cardUrl = appendUtmParams(`${APP_URL}/cards/${card._id.toString()}?next=share`);
  const unsubscribeUrl = `${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}`;
  const openPixelUrl = `${APP_URL}/api/track/open?e=${encodeURIComponent(email)}&c=${encodeURIComponent(CAMPAIGN_ID)}`;

  const html = `<!doctype html>
<html>
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>Your bingo card is ready</title></head>
  <body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Open your saved MyBingoCard and run the game.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;">
        <tr><td style="background:#065f46;padding:24px 28px;border-radius:22px 22px 0 0;">
          <div style="font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#d1fae5;">MyBingoCard</div>
          <div style="margin-top:8px;font-size:27px;line-height:1.25;font-weight:800;color:#ffffff;">Ready when you are</div>
        </td></tr>
        <tr><td style="background:#ffffff;border:1px solid #e2e8f0;border-top:0;padding:28px;border-radius:0 0 22px 22px;">
          <p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#334155;">Hi ${escapeHtml(userFirstName)}, your <strong>${escapeHtml(cardTitle)}</strong> card is saved and ready.</p>
          <div style="margin:20px 0;padding:16px;border:1px solid #a7f3d0;background:#ecfdf5;border-radius:14px;color:#065f46;">
            <ul style="margin:0;padding:0 0 0 18px;font-size:15px;line-height:1.7;">
              <li style="margin:0 0 8px;">Open the card and tap squares to play solo.</li>
              <li style="margin:0 0 8px;">Copy a share link for players.</li>
              <li style="margin:0;">Download a PDF if you want to print it.</li>
            </ul>
          </div>
          ${button('Open My Card', cardUrl)}
          <p style="margin:12px 0 0;font-size:13px;color:#64748b;">You can play, share, or print from the card page.</p>
          <div style="margin-top:28px;padding-top:18px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">Need help? Reply to this email.</p>
            <p style="margin:14px 0 0;font-size:13px;color:#94a3b8;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a> from reminder emails.</p>
          </div>
          <img src="${escapeHtml(openPixelUrl)}" width="1" height="1" style="display:none;" alt="" />
        </td></tr>
      </table>
    </td></tr></table>
  </body>
</html>`;

  return {
    subject: 'Your bingo card is ready to play',
    html,
    text: `Hi ${userFirstName},\n\nYour "${cardTitle}" card is saved and ready.\n\nOpen it here: ${cardUrl}\n\nYou can play, share, or print from the card page.\n\nUnsubscribe: ${unsubscribeUrl}`,
  };
}

function userIdQueries(userId) {
  const queries = [{ userId: userId.toString() }];
  try {
    queries.push({ userId: new ObjectId(userId) });
  } catch (_) {}
  return queries;
}

function objectIdString(value) {
  if (value instanceof ObjectId) return value.toHexString();
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
  const time = date.getTime();
  return Number.isNaN(time) ? null : date;
}

function timestamp(value) {
  const date = dateValue(value);
  return date ? date.getTime() : 0;
}

function cardBelongsToUser(card, userId) {
  return objectIdString(card.userId) === userId;
}

function latestCardForUser(cards, userId) {
  return cards
    .filter((card) => cardBelongsToUser(card, userId))
    .sort((a, b) => timestamp(b.createdAt) - timestamp(a.createdAt))[0] || null;
}

function hasPlayedAfterCreate(activityEvents, user, email, cardCreatedAt) {
  const userId = objectIdString(user._id);
  const playEvents = new Set(['play_started', 'cell_toggled', 'bingo_achieved']);
  return activityEvents.some((event) => {
    if (!playEvents.has(event.event)) return false;
    if (objectIdString(event.userId) !== userId && normalizeEmail(event.email) !== email) return false;
    const createdAt = dateValue(event.createdAt);
    return Boolean(createdAt && createdAt >= cardCreatedAt);
  });
}

async function mainSqlite() {
  const store = openSqliteShadowStore();
  try {
    const now = Date.now();
    const newest = new Date(now - MIN_AGE_HOURS * 60 * 60 * 1000);
    const oldest = new Date(now - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);

    const blocked = new Set(
      store
        .findMany('email_preferences')
        .map((row) => row.document)
        .filter((preference) => preference.unsubscribed === true || preference.marketingEmails === false)
        .map((preference) => normalizeEmail(preference.email))
        .filter(Boolean)
    );

    const cards = store.findMany('cards').map((row) => row.document);
    const dripLogs = store.findMany('drip_log').map((row) => row.document);
    const activityEvents = store.findMany('activity_events').map((row) => row.document);
    const users = store
      .findMany('users')
      .map((row) => row.document)
      .filter((user) => {
        const email = normalizeEmail(user.email);
        if (!email || blocked.has(email)) return false;
        if (TARGET_EMAIL && email !== TARGET_EMAIL) return false;
        if (['admin', 'test', 'guest'].includes(user.customerType)) return false;
        const lastCardCreatedAt = dateValue(user.lastCardCreatedAt);
        return Boolean(lastCardCreatedAt && lastCardCreatedAt >= oldest && lastCardCreatedAt <= newest);
      })
      .sort((a, b) => timestamp(b.lastCardCreatedAt) - timestamp(a.lastCardCreatedAt))
      .slice(0, LIMIT);

    let considered = 0;
    let skipped = 0;
    let sent = 0;

    for (const user of users) {
      considered += 1;
      const email = normalizeEmail(user.email);
      const userId = objectIdString(user._id);
      const card = latestCardForUser(cards, userId);
      if (!card) {
        skipped += 1;
        continue;
      }

      const cardCreatedAt = dateValue(card.createdAt || user.lastCardCreatedAt);
      if (!cardCreatedAt) {
        skipped += 1;
        continue;
      }

      const cardId = objectIdString(card._id);
      const alreadySent = dripLogs.some((log) => (
        normalizeEmail(log.email) === email
        && log.campaignId === CAMPAIGN_ID
        && objectIdString(log.cardId) === cardId
      ));
      if (alreadySent) {
        skipped += 1;
        continue;
      }

      if (hasPlayedAfterCreate(activityEvents, user, email, cardCreatedAt)) {
        skipped += 1;
        continue;
      }

      const emailPayload = buildEmail({ email, name: user.name, card });
      console.log(`${SEND_EMAILS ? 'SEND' : 'DRY_RUN'} ${email} card="${card.title}" created=${cardCreatedAt.toISOString()}`);

      if (!SEND_EMAILS) continue;

      await transporter.sendMail({
        from: FROM_ADDRESS,
        to: email,
        subject: emailPayload.subject,
        html: emailPayload.html,
        text: emailPayload.text,
        headers: {
          'List-Unsubscribe': `<${APP_URL}/api/unsubscribe?email=${encodeURIComponent(email)}>, <mailto:unsubscribe@mybingocard.com?subject=unsubscribe%20${encodeURIComponent(email)}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });
      store.insertOne('drip_log', {
        userId,
        email,
        campaignId: CAMPAIGN_ID,
        cardId,
        sentAt: new Date(),
        source: 'card-comeback-reminders',
      });
      sent += 1;
    }

    console.log(`Done. considered=${considered} skipped=${skipped} sent=${sent} dryRun=${!SEND_EMAILS}`);
  } finally {
    store.close();
  }
}

async function main() {
  if (useSqliteBackend()) {
    await mainSqlite();
    return;
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('mybingocard');
  try {
    await db.collection('drip_log').createIndex({ email: 1, campaignId: 1, cardId: 1 });

    const now = Date.now();
    const newest = new Date(now - MIN_AGE_HOURS * 60 * 60 * 1000);
    const oldest = new Date(now - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
    const unsubscribed = await db.collection('email_preferences').distinct('email', {
      $or: [{ unsubscribed: true }, { marketingEmails: false }],
    });
    const blocked = new Set(unsubscribed.map(normalizeEmail));

    const users = await db.collection('users').find({
      email: { $exists: true, $nin: Array.from(blocked) },
      lastCardCreatedAt: { $gte: oldest, $lte: newest },
      ...(TARGET_EMAIL ? { email: TARGET_EMAIL } : {}),
      customerType: { $nin: ['admin', 'test', 'guest'] },
    }).sort({ lastCardCreatedAt: -1 }).limit(LIMIT).toArray();

    let considered = 0;
    let skipped = 0;
    let sent = 0;
    for (const user of users) {
      considered += 1;
      const email = normalizeEmail(user.email);
      if (!email || blocked.has(email)) {
        skipped += 1;
        continue;
      }

      const card = await db.collection('cards').findOne(
        { $or: userIdQueries(user._id) },
        { sort: { createdAt: -1 } }
      );
      if (!card) {
        skipped += 1;
        continue;
      }

      const cardCreatedAt = new Date(card.createdAt || user.lastCardCreatedAt);
      const alreadySent = await db.collection('drip_log').findOne({
        email,
        campaignId: CAMPAIGN_ID,
        cardId: card._id.toString(),
      });
      if (alreadySent) {
        skipped += 1;
        continue;
      }

      const playedAfterCreate = await db.collection('activity_events').findOne({
        $or: [{ userId: user._id.toString() }, { email }],
        event: { $in: ['play_started', 'cell_toggled', 'bingo_achieved'] },
        createdAt: { $gte: cardCreatedAt },
      });
      if (playedAfterCreate) {
        skipped += 1;
        continue;
      }

      const emailPayload = buildEmail({ email, name: user.name, card });
      console.log(`${SEND_EMAILS ? 'SEND' : 'DRY_RUN'} ${email} card="${card.title}" created=${cardCreatedAt.toISOString()}`);

      if (!SEND_EMAILS) continue;

      await transporter.sendMail({
        from: FROM_ADDRESS,
        to: email,
        subject: emailPayload.subject,
        html: emailPayload.html,
        text: emailPayload.text,
        headers: {
          'List-Unsubscribe': `<${APP_URL}/api/unsubscribe?email=${encodeURIComponent(email)}>, <mailto:unsubscribe@mybingocard.com?subject=unsubscribe%20${encodeURIComponent(email)}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });
      await db.collection('drip_log').insertOne({
        userId: user._id.toString(),
        email,
        campaignId: CAMPAIGN_ID,
        cardId: card._id.toString(),
        sentAt: new Date(),
        source: 'card-comeback-reminders',
      });
      sent += 1;
    }

    console.log(`Done. considered=${considered} skipped=${skipped} sent=${sent} dryRun=${!SEND_EMAILS}`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
