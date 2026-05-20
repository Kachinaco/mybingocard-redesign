const fs = require('fs');
const path = require('path');
const nodemailer = require('./smtp-client.cjs');

const envPath = '/var/www/mybingocard.com/.env.local';
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
} catch (e) {}

const appUrl = 'https://mybingocard.com';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

const name = 'Cory';
const email = 'coryanalla@gmail.com';

const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Live Bingo Rooms are here!</title></head>
<body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Play bingo in real-time with friends, family, or your class — right from your browser.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;">

<tr><td style="background:linear-gradient(135deg,#059669,#0d9488);padding:32px 28px;border-radius:20px 20px 0 0;">
  <div style="font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#a7f3d0;">MyBingoCard</div>
  <div style="margin-top:12px;font-size:28px;line-height:1.2;font-weight:800;color:#ffffff;">🎯 Live Bingo Rooms Are Here!</div>
  <div style="margin-top:8px;font-size:15px;color:#d1fae5;line-height:1.5;">Play bingo together in real-time — no app download needed.</div>
</td></tr>

<tr><td style="background:#ffffff;border:1px solid #e2e8f0;border-top:0;padding:28px;border-radius:0 0 20px 20px;">

  <p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#334155;">Hey ${name},</p>

  <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#334155;">Big news — you can now <strong>host live bingo games</strong> directly from your cards on MyBingoCard. Share a room code, and everyone plays together in real-time from their own device.</p>

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

  <p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:#334155;font-weight:600;">Perfect for:</p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr><td style="padding:6px 0;font-size:14px;color:#334155;line-height:1.5;">🎉 &nbsp;Party games at baby showers, birthdays, holidays</td></tr>
    <tr><td style="padding:6px 0;font-size:14px;color:#334155;line-height:1.5;">🏫 &nbsp;Classroom activities and review games</td></tr>
    <tr><td style="padding:6px 0;font-size:14px;color:#334155;line-height:1.5;">🏢 &nbsp;Team meetings and virtual events</td></tr>
    <tr><td style="padding:6px 0;font-size:14px;color:#334155;line-height:1.5;">👨‍👩‍👧‍👦 &nbsp;Family game nights — everyone plays on their own phone</td></tr>
  </table>

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 8px;">
    <tr>
      <td style="border-radius:12px;background:linear-gradient(135deg,#059669,#0d9488);">
        <a href="${appUrl}/dashboard" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:700;color:#fff;text-decoration:none;border-radius:12px;">Host Your First Live Game →</a>
      </td>
    </tr>
  </table>

  <p style="margin:16px 0 0;font-size:14px;color:#64748b;line-height:1.5;">Works on any device with a browser. No downloads, no signups for players — just share the code and play.</p>

  <div style="margin-top:28px;padding-top:18px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:13px;color:#64748b;">Questions? Just reply to this email — we read every one.</p>
    <p style="margin:8px 0 0;font-size:13px;color:#94a3b8;"><a href="${appUrl}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a> from product updates.</p>
  </div>
</td></tr>
</table></td></tr></table></body></html>`;

async function main() {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'MyBingoCard <support@mybingocard.com>',
    to: email,
    subject: '[DRAFT PREVIEW] 🎯 New: Host live bingo games with your cards!',
    html,
    text: 'Preview of the Live Rooms announcement email. Check the HTML version.',
  });
  console.log('Preview sent to ' + email);
}
main().catch(console.error);
