const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim(); const val = match[2].trim();
    if (!process.env[key]) process.env[key] = val;
  }
});

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST || 'smtp.porkbun.com',
  port: Number(process.env.EMAIL_SERVER_PORT) || 587,
  secure: false,
  auth: { user: process.env.EMAIL_SERVER_USER, pass: process.env.EMAIL_SERVER_PASSWORD },
});

const fromAddress = process.env.EMAIL_FROM || 'MyBingoCard <support@mybingocard.com>';
const TO = process.argv[2] || 'coryanalla@gmail.com';
const NAME = 'Cory';

// Patch drip-campaigns to export functions
const dripSrc = fs.readFileSync(path.join(__dirname, 'drip-campaigns.cjs'), 'utf8');
const patchedSrc = dripSrc.replace(/\nrun\(\);?\s*$/, '\nmodule.exports = { CAMPAIGNS, buildCreateFirstCardEmail, buildHowAreYouLikingEmail, buildReengageEmail, buildUpgradeNudgeEmail };');
const tmpFile = path.join(__dirname, '.drip-preview-tmp.cjs');
fs.writeFileSync(tmpFile, patchedSrc);
const mod = require(tmpFile);
fs.unlinkSync(tmpFile);

const fakeUser = { name: NAME, email: TO, planType: 'FREE', _cardCount: 0 };

const builds = [
  { id: 'create_first_card',  subject: `${NAME}, ready to create your first bingo card?`,   fn: mod.buildCreateFirstCardEmail },
  { id: 'how_are_you_liking', subject: `${NAME}, how are you liking MyBingoCard?`,            fn: mod.buildHowAreYouLikingEmail },
  { id: 'reengage_inactive',  subject: `We miss you, ${NAME}! Your bingo cards are waiting`, fn: mod.buildReengageEmail },
  { id: 'upgrade_nudge',      subject: `${NAME}, unlock the full MyBingoCard experience`,    fn: mod.buildUpgradeNudgeEmail },
];

async function sendAll() {
  for (const { id, subject, fn } of builds) {
    const email = fn(fakeUser);
    const html = email.html.replace(/%%EMAIL%%/g, encodeURIComponent(TO)).replace(/%%CAMPAIGN%%/g, id);
    console.log(`Sending [${id}]...`);
    try {
      await transporter.sendMail({ from: fromAddress, to: TO, subject: `[PREVIEW] ${subject}`, html, text: email.text });
      console.log(`  ✅ Sent`);
    } catch(e) { console.error(`  ❌`, e.message); }
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log('All done!');
}

sendAll();
