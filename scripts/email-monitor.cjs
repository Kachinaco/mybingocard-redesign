const fs = require('fs');
const path = require('path');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { openSqliteShadowDatabase } = require('./sqlite-shadow-store.cjs');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
try {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim();
      if (!Object.prototype.hasOwnProperty.call(process.env, key)) process.env[key] = val;
    }
  });
} catch (e) {
  console.error('Could not load .env.local:', e.message);
}

const WEBHOOK_URL = process.env.MYBINGOCARD_EVENTS_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL || '';
const SUPPORT_REPLY_MENTIONS_ENABLED = process.env.MYBINGOCARD_SUPPORT_REPLY_MENTIONS === '1';

let sqliteDatabase = null;
let dbIndexesCreated = false;
async function getDb() {
  if (!sqliteDatabase) {
    sqliteDatabase = openSqliteShadowDatabase();
    console.log('[' + new Date().toISOString() + '] Connected to SQLite store');
  }
  await ensureDbIndexes(sqliteDatabase);
  return sqliteDatabase;
}

async function ensureDbIndexes(db) {
  if (!dbIndexesCreated) {
    dbIndexesCreated = true;
    try {
      await db.collection('email_bounces').createIndex({ email: 1 });
      await db.collection('email_bounces').createIndex({ detectedAt: 1 });
    } catch (_) { /* indexes may already exist */ }
  }
}

const IMAP_CONFIG = {
  user: process.env.EMAIL_SERVER_USER || 'support@mybingocard.com',
  password: process.env.EMAIL_SERVER_PASSWORD || '',
  host: 'imap.porkbun.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: true, servername: 'imap.porkbun.com' },
  connTimeout: 30000,
  authTimeout: 15000,
  keepalive: { interval: 10000, idleInterval: 300000, forceNoop: true },
};

let imap = null;
let reconnectTimer = null;
const processingUids = new Set();

function truncateDiscordText(value, max, fallback) {
  const text = value == null ? (fallback || '') : String(value);
  if (!text) return fallback || '';
  return text.length > max ? text.substring(0, Math.max(0, max - 1)) + '…' : text;
}

function messageKeyFor(parsed, imapUid) {
  const messageId = String(parsed && parsed.messageId || '').trim().toLowerCase();
  if (messageId) return 'message:' + messageId;
  if (imapUid != null && String(imapUid).trim()) return 'imap:' + String(imapUid).trim();
  const fallback = [
    parsed && parsed.from && parsed.from.text,
    parsed && parsed.subject,
    parsed && parsed.date && new Date(parsed.date).toISOString(),
  ].filter(Boolean).join('|');
  return 'fallback:' + require('crypto').createHash('sha256').update(fallback).digest('hex');
}

function discordRetryDelayMs(response, attempt) {
  const retryAfterSeconds = Number(response && response.headers && response.headers.get('retry-after'));
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
    return Math.min(2000, Math.ceil(retryAfterSeconds * 1000));
  }
  return Math.min(2000, 250 * (2 ** attempt));
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isLowSignalSupportEmail(from, subject, preview) {
  const text = [from, subject, preview].filter(Boolean).join(' ').toLowerCase();
  return /deliverability status|warmup check|warm-up check|quick inbox check|delivery status notification|undelivered|returned to sender|failure notice|mail delivery|mail delivery test|inbox placement|placement note|normal back-and-forth signal|warmup by cory managed seed network|upload your catalog|csv upload|csv file was uploaded|tips for creating great pins|creator'?s guide|unlock the full mybingocard experience|beyond the scroll|a\/b test your content|summer break re:|app合作机会|问候|collaboration opportunity|合作机会|@(yourvpn\.ai|yourestimate\.app|demandletterservice\.com)/.test(text);
}

async function sendToDiscord(from, subject, preview, date, isReply) {
  if (!WEBHOOK_URL) { console.error('No DISCORD_WEBHOOK_URL set'); return false; }
  const color = isReply ? 0xef4444 : 0xf59e0b;
  const title = isReply ? '🔴 Support Reply - MyBingoCard' : '📧 New Email - MyBingoCard';
  const content = isReply && SUPPORT_REPLY_MENTIONS_ENABLED ? '@here' : '';
  const payload = {
    content,
    allowed_mentions: { parse: content ? ['everyone'] : [] },
    embeds: [{
      title: truncateDiscordText(title, 256),
      color,
      fields: [
        { name: 'From', value: truncateDiscordText(from, 1024, 'unknown'), inline: true },
        { name: 'Subject', value: truncateDiscordText(subject, 1024, '(no subject)'), inline: true },
        ...(isReply ? [{ name: 'Type', value: '🏷️ support_reply', inline: true }] : []),
        { name: 'Preview', value: truncateDiscordText(preview, 1024, '(empty)'), inline: false },
      ],
      footer: { text: truncateDiscordText(date ? new Date(date).toLocaleString() : '', 2048) },
      timestamp: new Date().toISOString(),
    }],
  };
  const attempts = Math.max(1, Math.min(3, Number(process.env.MYBINGOCARD_DISCORD_MAX_ATTEMPTS) || 3));
  const timeoutMs = Math.max(500, Math.min(15000, Number(process.env.MYBINGOCARD_DISCORD_TIMEOUT_MS) || 5000));

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let response = null;
    try {
      response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.ok) {
        console.log('[' + new Date().toISOString() + '] Sent email notification to Discord: ' + truncateDiscordText(subject, 200, '(no subject)') + (isReply ? ' (reply)' : ''));
        return true;
      }
      const responseBody = truncateDiscordText(await response.text().catch(() => ''), 500);
      console.error('Discord webhook returned ' + response.status + ': ' + responseBody);
      const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
      if (!retryable || attempt === attempts - 1) return false;
    } catch (err) {
      console.error('Discord webhook attempt ' + (attempt + 1) + '/' + attempts + ' failed:', err.message);
      if (attempt === attempts - 1) return false;
    }
    await wait(discordRetryDelayMs(response, attempt));
  }

  return false;
}

async function handleParsedEmail(parsed, context = {}) {
  const from = parsed.from?.text || 'unknown';
  const subject = parsed.subject || '(no subject)';
  const preview = parsed.text || '';
  const date = parsed.date;
  const isReply = !!(parsed.inReplyTo || (subject && subject.toLowerCase().startsWith('re:')));
  const threadId = parsed.inReplyTo || parsed.messageId || '';
  const messageKey = messageKeyFor(parsed, context.imapUid);

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

      await db.collection('email_bounces').updateOne({ _id: messageKey }, { $setOnInsert: {
        _id: messageKey,
        emailId,
        email: bouncedEmail,
        bounceType,
        reason,
        originalCampaignId,
        rawFrom: from,
        rawSubject: subject,
        detectedAt: new Date(),
      } }, { upsert: true });

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
      return false;
    }

    return true;
  }

  if (isLowSignalSupportEmail(from, subject, preview)) {
    console.log('[' + new Date().toISOString() + '] Low-signal support email skipped: ' + subject);
    return true;
  }

  // Persist first with a stable key, then deliver. This keeps reconnects from
  // creating duplicate tickets while a Discord retry is still pending.
  let db;
  try {
    db = await getDb();
    await db.collection('support_tickets').updateOne(
      { _id: messageKey },
      { $setOnInsert: {
        _id: messageKey,
        email: from,
        subject,
        preview: truncateDiscordText(preview, 500, ''),
        body: preview || '',
        bodyHtml: parsed.html || '',
        messageId: parsed.messageId || '',
        imapUid: context.imapUid == null ? null : String(context.imapUid),
        receivedAt: date || new Date(),
        status: 'open',
        threadId,
        isReply,
      } },
      { upsert: true }
    );
  } catch (dbErr) {
    console.error('Failed to save support ticket:', dbErr.message);
    return false;
  }

  const existingTicket = await db.collection('support_tickets').findOne({ _id: messageKey });
  if (existingTicket && existingTicket.discordDeliveredAt) return true;

  const delivered = await sendToDiscord(from, subject, preview, date, isReply);
  if (!delivered) return false;

  try {
    await db.collection('support_tickets').updateOne(
      { _id: messageKey },
      { $set: { discordDeliveredAt: new Date(), updatedAt: new Date() } }
    );
    console.log('[' + new Date().toISOString() + '] Saved support ticket: ' + truncateDiscordText(subject, 200, '(no subject)'));
    return true;
  } catch (dbErr) {
    console.error('Failed to mark support ticket delivered:', dbErr.message);
    return false;
  }
}

function processEmails(criteria) {
  if (!imap || imap.state !== 'authenticated') return;

  imap.search(criteria, (err, results) => {
    if (err) { console.error('Search error:', err.message); return; }
    if (!results || results.length === 0) return;

    const pendingUids = results.filter(uid => !processingUids.has(String(uid)));
    if (pendingUids.length === 0) return;
    for (const uid of pendingUids) processingUids.add(String(uid));
    console.log('[' + new Date().toISOString() + '] Found ' + pendingUids.length + ' email(s) to forward');

    const f = imap.fetch(pendingUids, { bodies: '' });
    f.on('message', (msg) => {
      let messageUid = null;
      let parsedEmailPromise = null;

      msg.on('body', (stream) => {
        parsedEmailPromise = simpleParser(stream);
      });
      msg.once('attributes', attrs => {
        messageUid = attrs && attrs.uid != null ? attrs.uid : null;
      });
      msg.once('end', async () => {
        const uidKey = String(messageUid == null ? '' : messageUid);
        try {
          if (!parsedEmailPromise) throw new Error('Email body was not returned by IMAP');
          const parsed = await parsedEmailPromise;
          const handled = await handleParsedEmail(parsed, { imapUid: messageUid });
          if (!handled) {
            console.error('[' + new Date().toISOString() + '] Email left unread for retry: ' + (parsed.subject || '(no subject)'));
            return;
          }

          await new Promise((resolve, reject) => {
            if (messageUid == null) return reject(new Error('IMAP message UID missing'));
            imap.addFlags(messageUid, ['\\Seen'], flagErr => flagErr ? reject(flagErr) : resolve());
          });
        } catch (processErr) {
          console.error('Email processing failed; message left unread:', processErr.message);
        } finally {
          if (uidKey) {
            processingUids.delete(uidKey);
          } else {
            for (const pendingUid of pendingUids) processingUids.delete(String(pendingUid));
          }
        }
      });
    });
    f.once('error', (fetchErr) => {
      for (const uid of pendingUids) processingUids.delete(String(uid));
      console.error('Fetch error:', fetchErr.message);
    });
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

async function closeDb() {
  if (sqliteDatabase) {
    try { sqliteDatabase.close(); } catch (e) {}
    sqliteDatabase = null;
  }
  dbIndexesCreated = false;
}

function start() {
  console.log('MyBingoCard Email Monitor started (IDLE mode)');
  console.log('Using IMAP user:', IMAP_CONFIG.user);
  console.log('Webhook URL set:', !!WEBHOOK_URL);
  console.log('Database backend: sqlite');
  const bulkSendExistingUnread = process.env.MYBINGOCARD_EMAIL_MONITOR_BULK_SEND === '1' &&
    process.argv.includes('--notify-existing-unread');
  if (process.argv.includes('--notify-existing-unread') && !bulkSendExistingUnread) {
    console.log('Existing unread forwarding flag ignored; set MYBINGOCARD_EMAIL_MONITOR_BULK_SEND=1 to enable it');
  }
  connect(bulkSendExistingUnread);
}

process.on('SIGINT', async () => {
  if (imap) try { imap.end(); } catch (e) {}
  await closeDb();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  if (imap) try { imap.end(); } catch (e) {}
  await closeDb();
  process.exit(0);
});

if (require.main === module) {
  start();
}

module.exports = {
  closeDb,
  getDb,
  handleParsedEmail,
  isLowSignalSupportEmail,
  messageKeyFor,
  sendToDiscord,
  start,
};
