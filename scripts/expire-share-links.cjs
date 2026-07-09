const fs = require('fs');
const path = require('path');
const { openSqliteShadowStore } = require('./sqlite-shadow-store.cjs');

// Load .env.local (same pattern as expire-trials.cjs)
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

function expireSqliteShareLinks(now) {
  const store = openSqliteShadowStore();
  let modifiedCount = 0;

  try {
    for (const row of store.findMany('shared_links')) {
      const link = row.document;
      if (link.status !== 'pending' || !link.expiresAt) continue;

      const expiresAt = new Date(link.expiresAt);
      if (Number.isNaN(expiresAt.getTime()) || expiresAt >= now) continue;

      store.replaceOne('shared_links', {
        ...link,
        status: 'expired',
        updatedAt: now,
      });
      modifiedCount += 1;
    }
  } finally {
    store.close();
  }

  return modifiedCount;
}

async function run() {
  const now = new Date();

  const modifiedCount = expireSqliteShareLinks(now);
  console.log(`[${now.toISOString()}] Expired ${modifiedCount} share links`);
}

run().catch(e => {
  console.error('Share link expiration script failed:', e);
  process.exit(1);
});
