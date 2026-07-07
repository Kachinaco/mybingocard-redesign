#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");
const { EJSON } = require("bson");
const Database = require("better-sqlite3");

function parseArgs(argv) {
  const args = {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017/mybingocard",
    dbName: process.env.MONGODB_DB || "mybingocard",
    out: "",
    batchSize: 1000,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--uri") args.uri = argv[++i];
    else if (arg === "--db") args.dbName = argv[++i];
    else if (arg === "--out") args.out = argv[++i];
    else if (arg === "--batch-size") args.batchSize = Number(argv[++i]);
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.out) {
    throw new Error("Missing required --out /path/to/export.sqlite");
  }
  if (!Number.isInteger(args.batchSize) || args.batchSize < 1) {
    throw new Error("--batch-size must be a positive integer");
  }
  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/export-mongo-to-sqlite.cjs --out /path/to/mybingocard.sqlite [--uri mongodb://...] [--db mybingocard]

Exports every MongoDB collection into a SQLite document mirror:
  collections(name, source_count, exported_count)
  documents(collection, object_id, ejson)

Mongo types are preserved with canonical MongoDB Extended JSON.`);
}

function ensureFreshOutput(outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
  for (const suffix of ["-wal", "-shm"]) {
    const sidecar = `${outPath}${suffix}`;
    if (fs.existsSync(sidecar)) fs.unlinkSync(sidecar);
  }
}

function setupSqlite(db) {
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE export_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE collections (
      name TEXT PRIMARY KEY,
      source_count INTEGER NOT NULL,
      exported_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE documents (
      collection TEXT NOT NULL,
      object_id TEXT NOT NULL,
      ejson TEXT NOT NULL,
      PRIMARY KEY (collection, object_id),
      FOREIGN KEY (collection) REFERENCES collections(name) ON DELETE CASCADE
    );

    CREATE INDEX documents_collection_idx ON documents(collection);
  `);
}

async function exportCollection({ mongoDb, sqlite, collectionName, batchSize }) {
  const collection = mongoDb.collection(collectionName);
  const sourceCount = await collection.countDocuments({});
  const insertCollection = sqlite.prepare(
    "INSERT INTO collections (name, source_count, exported_count) VALUES (?, ?, 0)"
  );
  const insertDocument = sqlite.prepare(
    "INSERT INTO documents (collection, object_id, ejson) VALUES (?, ?, ?)"
  );
  const updateCount = sqlite.prepare(
    "UPDATE collections SET exported_count = ? WHERE name = ?"
  );
  const insertMany = sqlite.transaction((rows) => {
    for (const row of rows) {
      insertDocument.run(row.collection, row.objectId, row.ejson);
    }
  });

  insertCollection.run(collectionName, sourceCount);

  let exported = 0;
  let pending = [];
  const cursor = collection.find({}, { noCursorTimeout: true }).batchSize(batchSize);

  try {
    for await (const doc of cursor) {
      pending.push({
        collection: collectionName,
        objectId: String(doc._id),
        ejson: EJSON.stringify(doc, { relaxed: false }),
      });
      if (pending.length >= batchSize) {
        insertMany(pending);
        exported += pending.length;
        pending = [];
      }
    }
    if (pending.length > 0) {
      insertMany(pending);
      exported += pending.length;
    }
  } finally {
    await cursor.close();
  }

  updateCount.run(exported, collectionName);
  return { collectionName, sourceCount, exported };
}

async function main() {
  const args = parseArgs(process.argv);
  ensureFreshOutput(args.out);

  const client = new MongoClient(args.uri, { serverSelectionTimeoutMS: 10000 });
  await client.connect();

  const sqlite = new Database(args.out);
  setupSqlite(sqlite);

  const meta = sqlite.prepare("INSERT INTO export_meta (key, value) VALUES (?, ?)");
  meta.run("exported_at", new Date().toISOString());
  meta.run("source_db", args.dbName);

  const mongoDb = client.db(args.dbName);
  const collections = (await mongoDb.listCollections({}, { nameOnly: true }).toArray())
    .map((entry) => entry.name)
    .sort();

  meta.run("collection_count", String(collections.length));

  const results = [];
  for (const collectionName of collections) {
    const result = await exportCollection({
      mongoDb,
      sqlite,
      collectionName,
      batchSize: args.batchSize,
    });
    results.push(result);
    console.log(`${collectionName}\t${result.exported}/${result.sourceCount}`);
  }

  const mismatches = results.filter((row) => row.exported !== row.sourceCount);
  const integrity = sqlite.prepare("PRAGMA integrity_check").get().integrity_check;
  const totalDocs = sqlite.prepare("SELECT COUNT(*) AS count FROM documents").get().count;

  sqlite.pragma("wal_checkpoint(TRUNCATE)");
  sqlite.close();
  await client.close();

  const summary = {
    ok: mismatches.length === 0 && integrity === "ok",
    out: args.out,
    collections: collections.length,
    documents: totalDocs,
    mismatches,
    integrity,
  };
  console.log(JSON.stringify(summary, null, 2));

  if (!summary.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
