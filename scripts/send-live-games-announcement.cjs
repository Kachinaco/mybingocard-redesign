#!/usr/bin/env node
/**
 * Send Live Games announcement email to all users.
 * Usage:
 *   node scripts/send-live-games-announcement.cjs           # dry run
 *   node scripts/send-live-games-announcement.cjs --send    # actually send
 *   node scripts/send-live-games-announcement.cjs --preview your@email.com
 */

const path = require('path');
const fs = require('fs');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
try {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) process.env[match[1].trim()] = match[2].trim();
  });
} catch (e) { console.error('Could not load .env.local:', e.message); }

const nodemailer = require('./smtp-client.cjs');
const { MongoClient } = require('mongodb');
const { openSqliteShadowDatabase, useSqliteBackend } = require('./sqlite-shadow-store.cjs');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mybingocard';
const FROM = process.env.EMAIL_FROM || 'support@mybingocard.com';
const CAMPAIGN_ID = 'live_games_announcement_2026_03_13';
const DRY_RUN = !process.argv.includes('--send');
const PREVIEW_TO = process.argv.includes('--preview') ? process.argv[process.argv.indexOf('--preview') + 1] : null;

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT) || 587,
  secure: false,
  auth: { user: process.env.EMAIL_SERVER_USER, pass: process.env.EMAIL_SERVER_PASSWORD },
});

function getFirstName(name) {
  if (!name) return 'there';
  return name.trim().split(/\s+/)[0];
}

function buildHtml(firstName) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:white;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:40px 32px;text-align:center;">
        <div style="font-size:48px;margin-bottom:12px;">🎯</div>
        <h1 style="color:white;font-size:24px;font-weight:800;margin:0 0 8px 0;">Live Bingo Games are coming</h1>
        <p style="color:rgba(255,255,255,0.85);font-size:16px;margin:0;">Friday, March 13th</p>
      </div>
      <div style="padding:32px;">
        <p style="color:#475569;font-size:16px;line-height:1.6;margin:0 0 20px 0;">Hi ${firstName},</p>
        <p style="color:#475569;font-size:16px;line-height:1.6;margin:0 0 24px 0;">
          Something exciting is dropping this <strong>Friday, March 13th</strong> — and you'll be one of the first to try it.
        </p>
        <div style="background:#f5f3ff;border-left:4px solid #7c3aed;border-radius:8px;padding:16px 20px;margin:0 0 24px 0;">
          <p style="color:#1e1b4b;font-size:15px;font-weight:700;margin:0;">We're launching Live Multiplayer Bingo Games.</p>
        </div>
        <p style="color:#64748b;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px 0;">Here's what's coming:</p>
        <ul style="color:#475569;font-size:15px;line-height:1.7;padding-left:20px;margin:0 0 24px 0;">
          <li>Host a live bingo game from any card you've already created</li>
          <li>Players join instantly from their phone — no app, no signup required</li>
          <li>Real-time calling, live score tracking, and instant bingo detection</li>
          <li>Perfect for classrooms, parties, team meetings, and game nights</li>
        </ul>
        <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 28px 0;">All you need is a bingo card and a room full of people.</p>
        <div style="text-align:center;margin:0 0 28px 0;">
          <a href="https://mybingocard.com/dashboard" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:white;font-size:16px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:12px;">Get your cards ready →</a>
        </div>
        <p style="color:#94a3b8;font-size:14px;text-align:center;margin:0;">See you Friday 🎉</p>
      </div>
      <div style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="color:#94a3b8;font-size:13px;margin:0;">You're receiving this because you have a MyBingoCard account.<br>
        <a href="https://mybingocard.com/unsubscribe" style="color:#64748b;text-decoration:underline;">Unsubscribe</a></p>
      </div>
    </div>
  </div>
</body></html>`;
}

function buildText(firstName) {
  return `Hi ${firstName},\n\nSomething exciting is dropping this Friday, March 13th.\n\nWe're launching Live Multiplayer Bingo Games — and you'll be one of the first to try it.\n\nHere's what's coming:\n- Host a live bingo game from any card you've created\n- Players join instantly from their phone — no app, no signup required\n- Real-time calling, live score tracking, and instant bingo detection\n- Perfect for classrooms, parties, team meetings, and game nights\n\nAll you need is a bingo card and a room full of people.\n\nGet your cards ready: https://mybingocard.com/dashboard\n\nSee you Friday!\n\n— The MyBingoCard Team\n\nUnsubscribe: https://mybingocard.com/unsubscribe`;
}

async function main() {
  if (PREVIEW_TO) {
    console.log(`Sending preview to ${PREVIEW_TO}...`);
    await transporter.sendMail({
      from: FROM, to: PREVIEW_TO,
      subject: '[PREVIEW] 🎯 Live Bingo Games are coming to MyBingoCard this Friday',
      html: buildHtml('there'), text: buildText('there'),
      headers: {
        'List-Unsubscribe': `<https://mybingocard.com/api/unsubscribe?email=${encodeURIComponent(PREVIEW_TO)}>, <mailto:unsubscribe@mybingocard.com?subject=unsubscribe%20${encodeURIComponent(PREVIEW_TO)}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
    console.log('Preview sent!');
    return;
  }

  const sqliteDb = useSqliteBackend() ? openSqliteShadowDatabase() : null;
  const client = sqliteDb ? null : new MongoClient(MONGO_URI);
  if (client) await client.connect();
  const db = sqliteDb || client.db('mybingocard');

  try {

    // Get all users who haven't unsubscribed
    const unsubscribed = await db.collection('email_preferences').distinct('email', { unsubscribed: true });
    const users = await db.collection('users').find(
      { email: { $nin: unsubscribed }, createdAt: { $exists: true } },
      { projection: { email: 1, name: 1, _id: 0 } }
    ).toArray();

    // Filter out already sent
    const alreadySent = await db.collection('drip_log').distinct('email', { campaignId: CAMPAIGN_ID });
    const toSend = users.filter(u => u.email && !alreadySent.includes(u.email));

    console.log(`Total users: ${users.length} | Already sent: ${alreadySent.length} | To send: ${toSend.length}`);
    if (DRY_RUN) {
      console.log('\n🔍 DRY RUN — pass --send to actually send');
      toSend.forEach(u => console.log(`  → ${u.email} (${u.name || 'no name'})`));
      return;
    }

    let sent = 0, failed = 0;
    for (const user of toSend) {
      try {
        const firstName = getFirstName(user.name);
        await transporter.sendMail({
          from: FROM, to: user.email,
          subject: '🎯 Live Bingo Games are coming to MyBingoCard this Friday',
          html: buildHtml(firstName), text: buildText(firstName),
          headers: {
            'List-Unsubscribe': `<https://mybingocard.com/api/unsubscribe?email=${encodeURIComponent(user.email)}>, <mailto:unsubscribe@mybingocard.com?subject=unsubscribe%20${encodeURIComponent(user.email)}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        });
        await db.collection('drip_log').insertOne({
          email: user.email, campaignId: CAMPAIGN_ID,
          subject: '🎯 Live Bingo Games are coming to MyBingoCard this Friday',
          sentAt: new Date(),
        });
        console.log(`[SENT] ${user.email}`);
        sent++;
        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error(`[FAILED] ${user.email}: ${err.message}`);
        failed++;
      }
    }

    console.log(`\nDone. Sent: ${sent} | Failed: ${failed}`);
  } finally {
    if (client) await client.close();
    if (sqliteDb) sqliteDb.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
