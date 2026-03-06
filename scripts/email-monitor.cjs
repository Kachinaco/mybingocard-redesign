const fs = require('fs');
const path = require('path');
const Imap = require('imap');
const { simpleParser } = require('mailparser');

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

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';
const IMAP_CONFIG = {
  user: process.env.EMAIL_SERVER_USER || 'support@mybingocard.com',
  password: process.env.EMAIL_SERVER_PASSWORD || '',
  host: 'imap.porkbun.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
  connTimeout: 30000,
  authTimeout: 15000,
  keepalive: { interval: 10000, idleInterval: 300000, forceNoop: true },
};

let imap = null;
let reconnectTimer = null;

async function sendToDiscord(from, subject, preview) {
  if (!WEBHOOK_URL) { console.error('No DISCORD_WEBHOOK_URL set'); return; }
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: 'New Support Email - MyBingoCard',
          color: 0xf59e0b,
          fields: [
            { name: 'From', value: from || 'unknown', inline: true },
            { name: 'Subject', value: subject || '(no subject)', inline: true },
            { name: 'Preview', value: (preview || '').substring(0, 200) || '(empty)', inline: false },
          ],
          timestamp: new Date().toISOString(),
        }],
      }),
    });
    console.log('[' + new Date().toISOString() + '] Sent email notification to Discord');
  } catch (err) {
    console.error('Discord webhook failed:', err.message);
  }
}

function processNewEmails() {
  if (!imap || imap.state !== 'authenticated') return;

  imap.search(['UNSEEN'], (err, results) => {
    if (err) { console.error('Search error:', err.message); return; }
    if (!results || results.length === 0) return;

    console.log('[' + new Date().toISOString() + '] Found ' + results.length + ' new email(s)');
    const f = imap.fetch(results, { bodies: '', markSeen: false });
    f.on('message', (msg) => {
      msg.on('body', (stream) => {
        simpleParser(stream, async (err, parsed) => {
          if (err) return;
          const from = parsed.from?.text || 'unknown';
          const subject = parsed.subject || '(no subject)';
          const preview = parsed.text || '';
          await sendToDiscord(from, subject, preview);
        });
      });
    });
    f.once('error', (err) => { console.error('Fetch error:', err.message); });
  });
}

function connect() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }

  console.log('[' + new Date().toISOString() + '] Connecting to IMAP...');
  imap = new Imap(IMAP_CONFIG);

  imap.once('ready', () => {
    console.log('[' + new Date().toISOString() + '] IMAP connected, opening INBOX...');
    imap.openBox('INBOX', false, (err, box) => {
      if (err) {
        console.error('Open box error:', err.message);
        scheduleReconnect();
        return;
      }
      console.log('[' + new Date().toISOString() + '] INBOX open — listening for new emails via IDLE');

      // Check for any existing unseen emails
      processNewEmails();

      // Listen for new mail events (triggered by IDLE)
      imap.on('mail', (numNewMsgs) => {
        console.log('[' + new Date().toISOString() + '] New mail event: ' + numNewMsgs + ' message(s)');
        processNewEmails();
      });
    });
  });

  imap.once('error', (err) => {
    console.error('[' + new Date().toISOString() + '] IMAP error:', err.message);
    scheduleReconnect();
  });

  imap.once('end', () => {
    console.log('[' + new Date().toISOString() + '] IMAP connection ended');
    scheduleReconnect();
  });

  imap.once('close', (hadError) => {
    console.log('[' + new Date().toISOString() + '] IMAP connection closed' + (hadError ? ' (with error)' : ''));
    scheduleReconnect();
  });

  imap.connect();
}

function scheduleReconnect() {
  if (reconnectTimer) return; // already scheduled
  console.log('[' + new Date().toISOString() + '] Reconnecting in 30 seconds...');
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, 30000);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  if (imap) try { imap.end(); } catch (e) {}
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  if (imap) try { imap.end(); } catch (e) {}
  process.exit(0);
});

console.log('MyBingoCard Email Monitor started (IDLE mode)');
console.log('Using IMAP user:', IMAP_CONFIG.user);
console.log('Webhook URL set:', !!WEBHOOK_URL);
connect();
