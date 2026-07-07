const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const { openSqliteShadowStore, useSqliteBackend } = require('./sqlite-shadow-store.cjs');

const envPath = path.join(__dirname, '..', '.env.local');
try {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) return;
    const key = match[1].trim();
    const val = match[2].trim();
    if (!process.env[key]) process.env[key] = val;
  });
} catch (error) {
  console.error('Could not load .env.local:', error.message);
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mybingocard';
const isDryRun = process.argv.includes('--dry-run');

function objectIdString(value) {
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
  return Number.isNaN(date.getTime()) ? null : date;
}

function staleRoomFilter(cutoff) {
  return {
    status: { $in: ['waiting', 'active'] },
    updatedAt: { $lt: cutoff },
  };
}

function gameAutoEndedEvent(room, now) {
  const updatedAt = dateValue(room.updatedAt) || new Date(0);
  const inactivityMinutes = Math.round((now.getTime() - updatedAt.getTime()) / 60000);

  return {
    event: 'game_auto_ended',
    source: 'server',
    userId: null,
    email: null,
    pathname: null,
    sessionId: null,
    anonymousId: null,
    domain: null,
    ipAddress: null,
    userAgent: null,
    metadata: {
      roomCode: room.roomCode,
      playerCount: room.players?.length || 0,
      calledItemCount: room.calledItems?.length || 0,
      inactivityMinutes,
    },
    createdAt: now,
  };
}

async function runSqlite() {
  const store = openSqliteShadowStore();
  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const staleRooms = store.findMany('game_rooms')
      .map((row) => row.document)
      .filter((room) => (
        ['waiting', 'active'].includes(room.status)
        && dateValue(room.updatedAt)
        && dateValue(room.updatedAt) < cutoff
      ));

    if (isDryRun) {
      console.log(`[${now.toISOString()}] Would clean up ${staleRooms.length} stale game rooms`);
      return;
    }

    for (const room of staleRooms) {
      store.replaceOne('game_rooms', {
        ...room,
        status: 'finished',
        updatedAt: now,
      });
      store.insertOne('activity_events', gameAutoEndedEvent(room, now));
    }

    console.log(`[${now.toISOString()}] Cleaned up ${staleRooms.length} stale game rooms`);
  } finally {
    store.close();
  }
}

async function runMongo() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('mybingocard');
    const now = new Date();
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const filter = staleRoomFilter(cutoff);
    const staleRooms = await db.collection('game_rooms').find(filter).toArray();

    if (isDryRun) {
      console.log(`[${now.toISOString()}] Would clean up ${staleRooms.length} stale game rooms`);
      return;
    }

    if (staleRooms.length > 0) {
      await db.collection('game_rooms').updateMany(filter, {
        $set: {
          status: 'finished',
          updatedAt: now,
        },
      });

      await db.collection('activity_events').insertMany(
        staleRooms.map((room) => {
          const event = gameAutoEndedEvent(room, now);
          return {
            ...event,
            metadata: {
              ...event.metadata,
              roomId: objectIdString(room._id),
            },
          };
        })
      );
    }

    console.log(`[${now.toISOString()}] Cleaned up ${staleRooms.length} stale game rooms`);
  } finally {
    await client.close();
  }
}

async function run() {
  if (useSqliteBackend()) {
    await runSqlite();
    return;
  }

  await runMongo();
}

run().catch((error) => {
  console.error('Stale game room cleanup failed:', error);
  process.exit(1);
});
