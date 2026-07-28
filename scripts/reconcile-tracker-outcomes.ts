import { getSqliteStore } from "@/lib/db/sqlite";
import { SqliteDocumentStore } from "@/lib/sqlite-document-store";
import { reconcileTrackerOutcomes } from "@/lib/server/tracker-outcome-reconciliation";

const apply = process.argv.includes("--apply");
const unknown = process.argv.slice(2).filter((argument) => argument !== "--apply");
if (unknown.length > 0) {
  throw new Error("Usage: bun scripts/reconcile-tracker-outcomes.ts [--apply]");
}

const sqlitePath = process.env.MYBINGOCARD_SQLITE_PATH;
if (!sqlitePath) {
  throw new Error("MYBINGOCARD_SQLITE_PATH is required");
}

const auditStore = apply
  ? null
  : SqliteDocumentStore.open(sqlitePath, { readonly: true });

try {
  const summary = reconcileTrackerOutcomes({
    store: auditStore || getSqliteStore(),
    apply,
  });
  console.log(JSON.stringify(summary, null, 2));
  if (summary.conflicts > 0) process.exitCode = 2;
} finally {
  auditStore?.close();
}
