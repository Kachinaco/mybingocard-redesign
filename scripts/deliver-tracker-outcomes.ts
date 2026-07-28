#!/usr/bin/env bun
import { getTrackerOutcomeQueueCounts } from "@/lib/db/tracker-outcomes";
import { drainTrackerOutcomes } from "@/lib/server/tracker-outcomes";

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function boundedLimit(): number {
  const raw = option("--limit") ?? "25";
  const value = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(value) || value < 1 || value > 100) {
    throw new Error("--limit must be an integer from 1 through 100");
  }
  return value;
}

async function main() {
  const deliver = process.argv.includes("--deliver");
  const limit = boundedLimit();
  if (!deliver) {
    console.log(JSON.stringify({ mode: "audit", deliveryAttempted: false, queue: getTrackerOutcomeQueueCounts() }));
    return;
  }

  const result = await drainTrackerOutcomes({ limit });
  console.log(JSON.stringify({ mode: "deliver", deliveryAttempted: result.claimed > 0, ...result }));
  if (result.failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Tracker outcome worker failed";
  console.error(JSON.stringify({ ok: false, error: message.replace(/[\r\n\t]+/g, " ").slice(0, 500) }));
  process.exitCode = 1;
});
