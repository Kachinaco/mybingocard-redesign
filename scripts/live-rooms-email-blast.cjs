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
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://mybingocard.com').replace(/\/$/, '');
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

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function firstName(name) {
  if (!name) return 'there';
  return name.trim().split(' ')[0] || 'there';
}

function buildEmail(user) {
  const name = firstName(user.name);

  const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Live Bingo Rooms are here!</title></head>
<body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Play bingo in real-time with friends, family, or your class — right from your browser.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#059669,#0d9488);padding:32px 28px;border-radius:20px 20px 0 0;">
  <div style="font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#a7f3d0;">MyBingoCard</div>
  <div style="margin-top:12px;font-size:28px;line-height:1.2;font-weight:800;color:#ffffff;">🎯 Live Bingo Rooms Are Here!</div>
  <div style="margin-top:8px;font-size:15px;color:#d1fae5;line-height:1.5;">Play bingo together in real-time — no app download needed.</div>
</td></tr>

<!-- Body -->
<tr><td style="background:#ffffff;border:1px solid #e2e8f0;border-top:0;padding:28px;border-radius:0 0 20px 20px;">

  <p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#334155;">Hey ${escapeHtml(name)},</p>

  <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#334155;">Big news — you can now <strong>host live bingo games</strong> directly from your cards on MyBingoCard. Share a room code, and everyone plays together in real-time from their own device.</p>

  <!-- How it works -->
  <div style="margin:20px 0;padding:20px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:14px;">
    <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#065f46;">How it works:</p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="padding:8px 12px 8px 0;vertical-align:top;width:36px;">
          <div style="width:32px;height:32px;border-radius:50%;background:#059669;color:#fff;text-align:center;line-height:32px;font-weight:800;font-size:14px;">1</div>
        </td>
        <td style="padding:8px 0;vertical-align:top;">
          <p style="margin:0;font-size:14px;color:#334155;line-height:1.5;"><strong>Create or pick a card</strong> — any bingo card you've made works</p>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 12px 8px 0;vertical-align:top;width:36px;">
          <div style="width:32px;height:32px;border-radius:50%;background:#059669;color:#fff;text-align:center;line-height:32px;font-weight:800;font-size:14px;">2</div>
        </td>
        <td style="padding:8px 0;vertical-align:top;">
          <p style="margin:0;font-size:14px;color:#334155;line-height:1.5;"><strong>Hit "Host Live Game"</strong> — get a room code and QR code to share</p>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 12px 8px 0;vertical-align:top;width:36px;">
          <div style="width:32px;height:32px;border-radius:50%;background:#059669;color:#fff;text-align:center;line-height:32px;font-weight:800;font-size:14px;">3</div>
        </td>
        <td style="padding:8px 0;vertical-align:top;">
          <p style="margin:0;font-size:14px;color:#334155;line-height:1.5;"><strong>Call items live</strong> — or use auto-call and let it run itself</p>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 12px 8px 0;vertical-align:top;width:36px;">
          <div style="width:32px;height:32px;border-radius:50%;background:#059669;color:#fff;text-align:center;line-height:32px;font-weight:800;font-size:14px;">4</div>
        </td>
        <td style="padding:8px 0;vertical-align:top;">
          <p style="margin:0;font-size:14px;color:#334155;line-height:1.5;"><strong>Players mark their cards</strong> — first to get BINGO wins with confetti and sound effects 🎉</p>
        </td>
      </tr>
    </table>
  </div>

  <!-- Use cases -->
  <p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:#334155;font-weight:600;">Perfect for:</p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr>
      <td style="padding:6px 0;font-size:14px;color:#334155;line-height:1.5;">🎉 &nbsp;Party games at baby showers, birthdays, holidays</td>
    </tr>
    <tr>
      <td style="padding:6px 0;font-size:14px;color:#334155;line-height:1.5;">🏫 &nbsp;Classroom activities and review games</td>
    </tr>
    <tr>
      <td style="padding:6px 0;font-size:14px;color:#334155;line-height:1.5;">🏢 &nbsp;Team meetings and virtual events</td>
    </tr>
    <tr>
      <td style="padding:6px 0;font-size:14px;color:#334155;line-height:1.5;">👨‍👩‍👧‍👦 &nbsp;Family game nights — everyone plays on their own phone</td>
    </tr>
  </table>

  <!-- CTA -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 8px;">
    <tr>
      <td style="border-radius:12px;background:linear-gradient(135deg,#059669,#0d9488);">
        <a href="${escapeHtml(appUrl)}/dashboard" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:700;color:#fff;text-decoration:none;border-radius:12px;">Host Your First Live Game →</a>
      </td>
    </tr>
  </table>

  <p style="margin:16px 0 0;font-size:14px;color:#64748b;line-height:1.5;">Works on any device with a browser. No downloads, no signups for players — just share the code and play.</p>

  <!-- Footer -->
  <div style="margin-top:28px;padding-top:18px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:13px;color:#64748b;">Questions? Just reply to this email — we read every one.</p>
    <p style="margin:8px 0 0;font-size:13px;color:#94a3b8;"><a href="${escapeHtml(appUrl)}/unsubscribe?email=${encodeURIComponent(user.email)}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a> from product updates.</p>
  </div>

  <img src="${escapeHtml(appUrl)}/api/track/open?e=${encodeURIComponent(user.email)}&c=live_rooms_launch" width="1" height="1" style="display:none;" alt="" />
</td></tr>
</table></td></tr></table></body></html>`;

  const text = `Hey ${name},

Big news — you can now host live bingo games directly from your cards on MyBingoCard!

How it works:
1. Create or pick any bingo card
2. Hit "Host Live Game" — get a room code and QR code
3. Call items live or use auto-call
4. Players mark their cards — first to BINGO wins!

Perfect for:
- Party games at baby showers, birthdays, holidays
- Classroom activities and review games
- Team meetings and virtual events
- Family game nights

Host your first game: ${appUrl}/dashboard

Works on any device with a browser. No downloads needed.

Questions? Reply to this email — we read every one.

Unsubscribe: ${appUrl}/unsubscribe?email=${encodeURIComponent(user.email)}`;

  return { html, text };
}

// ── Main ──

const DRY_RUN = process.argv.includes('--dry-run');

async function run() {
  const client = new MongoClient(MONGODB_URI);
  let sentCount = 0;
  let skippedCount = 0;

  try {
    await client.connect();
    const db = client.db('mybingocard');

    // Check who already got this blast
    const blastId = 'live_rooms_launch';
    await db.collection('email_blasts').createIndex({ email: 1, blastId: 1 }, { unique: true });

    // Get unsubscribed emails
    const unsubs = await db.collection('email_preferences')
      .find({ marketingEmails: false })
      .project({ email: 1 })
      .toArray();
    const unsubEmails = new Set(unsubs.map(u => u.email?.toLowerCase().trim()));

    const users = await db.collection('users').find({ email: { $exists: true, $ne: null } }).toArray();
    console.log(`Found ${users.length} users total`);

    for (const user of users) {
      if (!user.email) continue;
      const emailLower = user.email.toLowerCase().trim();

      if (unsubEmails.has(emailLower)) {
        skippedCount++;
        continue;
      }

      // Check if already sent
      const already = await db.collection('email_blasts').findOne({ email: emailLower, blastId });
      if (already) {
        skippedCount++;
        continue;
      }

      const { html, text } = buildEmail(user);
      const subject = `🎯 New: Host live bingo games with your cards!`;

      if (DRY_RUN) {
        console.log(`[DRY RUN] Would send to: ${user.email} (${firstName(user.name)})`);
        sentCount++;
        continue;
      }

      // Rate limit: 3s between emails
      await new Promise(resolve => setTimeout(resolve, 3000));

      try {
        const sendResult = await transporter.sendMail({
          from: fromAddress,
          to: user.email,
          subject,
          html,
          text,
          headers: {
            'List-Unsubscribe': `<${appUrl}/api/unsubscribe?email=${encodeURIComponent(user.email)}>, <mailto:unsubscribe@mybingocard.com?subject=unsubscribe%20${encodeURIComponent(user.email)}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        });

        await db.collection('email_blasts').insertOne({
          email: emailLower,
          blastId,
          sentAt: new Date(),
          status: 'sent',
          messageId: sendResult.messageId || null,
        });

        sentCount++;
        console.log(`[SENT] ${user.email} (${sendResult.messageId})`);
      } catch (err) {
        console.error(`[FAIL] ${user.email}: ${err.message}`);
        try {
          await db.collection('email_blasts').insertOne({
            email: emailLower,
            blastId,
            sentAt: new Date(),
            status: 'failed',
            error: err.message,
          });
        } catch (_) {}
      }
    }

    console.log(`\nBlast complete: ${sentCount} sent, ${skippedCount} skipped`);

    // Discord notification
    if (WEBHOOK_URL && sentCount > 0) {
      try {
        await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: '📧 Live Rooms Email Blast',
              color: 0x059669,
              fields: [
                { name: 'Sent', value: String(sentCount), inline: true },
                { name: 'Skipped', value: String(skippedCount), inline: true },
              ],
              timestamp: new Date().toISOString(),
            }],
          }),
        });
      } catch {}
    }
  } finally {
    await client.close();
  }
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
