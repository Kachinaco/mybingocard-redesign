const fs = require('fs');
const path = require('path');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
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

const WEBHOOK_URL = process.env.MYBINGOCARD_EVENTS_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL || '';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mybingocard';

let mongoClient = null;
let dbIndexesCreated = false;
async function getDb() {
  if (!mongoClient) {
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    console.log('[' + new Date().toISOString() + '] Connected to MongoDB');
  }
  const db = mongoClient.db('mybingocard');
  if (!dbIndexesCreated) {
    dbIndexesCreated = true;
    try {
      await db.collection('email_bounces').createIndex({ email: 1 });
      await db.collection('email_bounces').createIndex({ detectedAt: 1 });
    } catch (_) { /* indexes may already exist */ }
  }
  return db;
}

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

async function sendToDiscord(from, subject, preview, date, isReply) {
  if (!WEBHOOK_URL) { console.error('No DISCORD_WEBHOOK_URL set'); return; }
  try {
    const color = isReply ? 0xef4444 : 0xf59e0b;
    const title = isReply ? '🔴 Support Reply - MyBingoCard' : '📧 New Email - MyBingoCard';
    const content = isReply ? '@here' : '';

    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        embeds: [{
          title,
          color,
          fields: [
            { name: 'From', value: from || 'unknown', inline: true },
            { name: 'Subject', value: subject || '(no subject)', inline: true },
            ...(isReply ? [{ name: 'Type', value: '🏷️ support_reply', inline: true }] : []),
            { name: 'Preview', value: (preview || '').substring(0, 300) || '(empty)', inline: false },
          ],
          footer: { text: date ? new Date(date).toLocaleString() : '' },
          timestamp: new Date().toISOString(),
        }],
      }),
    });
    console.log('[' + new Date().toISOString() + '] Sent email notification to Discord: ' + subject + (isReply ? ' (reply)' : ''));
  } catch (err) {
    console.error('Discord webhook failed:', err.message);
  }
}

function processEmails(criteria) {
  if (!imap || imap.state !== 'authenticated') return;

  imap.search(criteria, (err, results) => {
    if (err) { console.error('Search error:', err.message); return; }
    if (!results || results.length === 0) return;

    console.log('[' + new Date().toISOString() + '] Found ' + results.length + ' email(s) to forward');
    // Mark as seen so we don't re-send on reconnect
    imap.setFlags(results, ['\\Seen'], (err) => {
      if (err) console.error('Mark seen error:', err.message);
    });

    const f = imap.fetch(results, { bodies: '' });
    f.on('message', (msg) => {
      msg.on('body', (stream) => {
        simpleParser(stream, async (err, parsed) => {
          if (err) return;
          const from = parsed.from?.text || 'unknown';
          const subject = parsed.subject || '(no subject)';
          const preview = parsed.text || '';
          const date = parsed.date;
          const isReply = !!(parsed.inReplyTo || (subject && subject.toLowerCase().startsWith('re:')));
          const threadId = parsed.inReplyTo || parsed.messageId || '';

          // Skip system/bounce emails — not real support tickets
          const fromLower = from.toLowerCase();
          const isBounce = fromLower.includes('mailer-daemon') ||
            fromLower.includes('postmaster') ||
            (subject && /undelivered|delivery.*(failed|status|notification)|returned to sender|failure notice/i.test(subject));

          if (isBounce) {
            console.log('[' + new Date().toISOString() + '] Bounce detected: ' + subject);

            // Track bounce in email_bounces collection
            try {
              const db = await getDb();

              // Determine bounce type: hard (permanent) vs soft (temporary)
              const subjectLower = (subject || '').toLowerCase();
              const previewLower = (preview || '').toLowerCase();
              const isHard = /unknown user|user unknown|does not exist|no such user|invalid address|address rejected|mailbox not found|recipient rejected|account disabled|account has been disabled/i.test(subjectLower + ' ' + previewLower);
              const bounceType = isHard ? 'hard' : 'soft';

              // Try to extract the original recipient email from the bounce body
              const emailMatch = (preview || '').match(/(?:to|recipient|address)[:\s]*<?([^\s<>]+@[^\s<>,>]+)/i)
                || (preview || '').match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
              const bouncedEmail = emailMatch ? emailMatch[1].toLowerCase().trim() : null;

              // Try to extract campaign ID from bounce body (our emails include campaign id in tracking pixels)
              const campaignMatch = (preview || '').match(/[?&]c=([a-z0-9_-]+)/i);
              const originalCampaignId = campaignMatch ? campaignMatch[1] : null;
              const emailIdMatch = (preview || '').match(/X-MyBingoCard-Email-ID:\s*([0-9a-f-]{36})/i)
                || (preview || '').match(/[?&]mid=([0-9a-f-]{36})/i);
              const emailId = emailIdMatch ? emailIdMatch[1] : null;

              // Build a reason string from the subject/preview
              const reason = (subject || '').substring(0, 200);

              await db.collection('email_bounces').insertOne({
                emailId,
                email: bouncedEmail,
                bounceType,
                reason,
                originalCampaignId,
                rawFrom: from,
                rawSubject: subject,
                detectedAt: new Date(),
              });

              if (emailId) {
                await db.collection('email_messages').updateOne(
                  { emailId },
                  {
                    $set: {
                      status: 'bounced',
                      bounceType,
                      bounceReason: reason,
                      bouncedAt: new Date(),
                      updatedAt: new Date(),
                    },
                  }
                );
              }

              // Log count of recent bounces
              const recentBounceCount = await db.collection('email_bounces').countDocuments({
                detectedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
              });
              console.log('[' + new Date().toISOString() + '] Bounce recorded (' + bounceType + '): ' + (bouncedEmail || 'unknown') + ' | 24h bounce count: ' + recentBounceCount);
            } catch (bounceErr) {
              console.error('[' + new Date().toISOString() + '] Failed to record bounce:', bounceErr.message);
            }

            return;
          }

          await sendToDiscord(from, subject, preview, date, isReply);

          // Save to support_tickets collection
          try {
            const db = await getDb();
            await db.collection('support_tickets').insertOne({
              email: from,
              subject,
              preview: (preview || '').substring(0, 500),
              body: preview || '',
              bodyHtml: parsed.html || '',
              messageId: parsed.messageId || '',
              receivedAt: date || new Date(),
              status: 'open',
              threadId,
              isReply,
            });
            console.log('[' + new Date().toISOString() + '] Saved support ticket: ' + subject);
          } catch (dbErr) {
            console.error('Failed to save support ticket:', dbErr.message);
          }
        });
      });
    });
    f.once('error', (err) => { console.error('Fetch error:', err.message); });
  });
}

function connect(initialBulkSend) {
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

      if (initialBulkSend) {
        // First run: send ALL emails in inbox
        console.log('[' + new Date().toISOString() + '] Bulk sending all existing emails to Discord...');
        processEmails(['ALL']);
      } else {
        // Normal run: only unseen
        processEmails(['UNSEEN']);
      }

      imap.on('mail', (numNewMsgs) => {
        console.log('[' + new Date().toISOString() + '] New mail event: ' + numNewMsgs + ' message(s)');
        processEmails(['UNSEEN']);
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
  if (reconnectTimer) return;
  console.log('[' + new Date().toISOString() + '] Reconnecting in 30 seconds...');
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect(false);
  }, 30000);
}

process.on('SIGINT', () => {
  if (imap) try { imap.end(); } catch (e) {}
  if (mongoClient) try { mongoClient.close(); } catch (e) {}
  process.exit(0);
});
process.on('SIGTERM', () => {
  if (imap) try { imap.end(); } catch (e) {}
  if (mongoClient) try { mongoClient.close(); } catch (e) {}
  process.exit(0);
});

console.log('MyBingoCard Email Monitor started (IDLE mode)');
console.log('Using IMAP user:', IMAP_CONFIG.user);
console.log('Webhook URL set:', !!WEBHOOK_URL);
// First connect does a bulk send of all emails, subsequent reconnects only unseen
connect(true);
