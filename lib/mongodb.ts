import type { MongoClient } from "mongodb";

const sqliteBackendEnabled =
  process.env.MYBINGOCARD_DB_BACKEND?.toLowerCase() === "sqlite";

// When running in SQLite mode, export a promise that never resolves.
// Every db/* module guards with useSqliteDb() before reaching clientPromise,
// so this should never be awaited. If it is, we hang rather than crash since
// an unhandled rejection takes down the SSR render or API route.
const NEVER = new Promise<never>(() => {});

let clientPromise: Promise<MongoClient>;

if (sqliteBackendEnabled) {
  clientPromise = NEVER as unknown as Promise<MongoClient>;
} else {
  const uri = process.env.MONGODB_URI;
  const options = {};

  if (!uri) {
    throw new Error(
      "MONGODB_URI is required when MYBINGOCARD_DB_BACKEND is not sqlite"
    );
  }

  let client: MongoClient;

  if (process.env.NODE_ENV === "development") {
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      const { MongoClient } = require("mongodb");
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise!;
  } else {
    const { MongoClient } = require("mongodb");
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
}

export default clientPromise;
