const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

const envPath = path.join(__dirname, "..", ".env.local");
try {
  const envFile = fs.readFileSync(envPath, "utf8");
  envFile.split("\n").forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  });
} catch (error) {
  console.error("Could not load .env.local:", error.message);
}

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/mybingocard";
const CLOSEOUT_DAYS = Number(process.env.MYBINGOCARD_GAME_ROOM_CLOSEOUT_DAYS || 2);
const closeoutDays = Number.isFinite(CLOSEOUT_DAYS) && CLOSEOUT_DAYS > 0 ? CLOSEOUT_DAYS : 2;
const closeoutMs = closeoutDays * 24 * 60 * 60 * 1000;

async function run() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db("mybingocard");
    const now = new Date();
    const cutoff = new Date(now.getTime() - closeoutMs);

    const staleRooms = await db.collection("game_rooms")
      .find(
        { status: { $in: ["waiting", "active"] }, updatedAt: { $lt: cutoff } },
        {
          projection: {
            roomCode: 1,
            players: 1,
            calledItems: 1,
            updatedAt: 1,
          },
        }
      )
      .toArray();

    if (staleRooms.length === 0) {
      console.log(`[${now.toISOString()}] Closed 0 stale game rooms`);
      return;
    }

    const result = await db.collection("game_rooms").updateMany(
      { status: { $in: ["waiting", "active"] }, updatedAt: { $lt: cutoff } },
      { $set: { status: "finished", endedAt: now, updatedAt: now } }
    );

    await db.collection("activity_events").insertMany(staleRooms.map((room) => ({
      event: "game_auto_ended",
      source: "server",
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
        inactivityMinutes: Math.round((now.getTime() - new Date(room.updatedAt).getTime()) / 60000),
        inactivityCloseoutDays: closeoutDays,
      },
      createdAt: now,
    })));

    console.log(`[${now.toISOString()}] Closed ${result.modifiedCount} stale game rooms`);
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error("Stale game room cleanup failed:", error);
  process.exit(1);
});
