import { SqliteDocumentStore } from "@/lib/sqlite-document-store";

let activeStore: SqliteDocumentStore | null = null;
let activeStorePath: string | null = null;

export function getSqliteStore() {
  const sqlitePath = process.env.MYBINGOCARD_SQLITE_PATH;
  if (!sqlitePath) {
    throw new Error("MYBINGOCARD_SQLITE_PATH is required");
  }

  if (!activeStore || activeStorePath !== sqlitePath) {
    activeStore?.close();
    activeStore = SqliteDocumentStore.open(sqlitePath);
    activeStorePath = sqlitePath;
  }

  return activeStore;
}

export function closeSqliteStoreForTests() {
  activeStore?.close();
  activeStore = null;
  activeStorePath = null;
}

export function setSqliteStoreForTests(store: SqliteDocumentStore, path = "__test__") {
  activeStore?.close();
  activeStore = store;
  activeStorePath = path;
  process.env.MYBINGOCARD_DB_BACKEND = "sqlite";
  process.env.MYBINGOCARD_SQLITE_PATH = path;
}
