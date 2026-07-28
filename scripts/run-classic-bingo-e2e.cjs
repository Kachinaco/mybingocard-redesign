#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { createFixture } = require("./sqlite-runtime-smoke.cjs");

const ROOT = path.resolve(__dirname, "..");
const fixture = createFixture({ seedSharedCard: false });

try {
  const result = spawnSync(
    path.join(ROOT, "node_modules", ".bin", "jiti"),
    [path.join(ROOT, "scripts", "verify-classic-bingo-e2e.ts")],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        JITI_ALIAS: JSON.stringify({ "@/": `${ROOT}/` }),
        MYBINGOCARD_DB_BACKEND: "sqlite",
        MYBINGOCARD_SQLITE_PATH: fixture.dbPath,
      },
      stdio: "inherit",
    },
  );

  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  fs.rmSync(fixture.dir, { recursive: true, force: true });
}
