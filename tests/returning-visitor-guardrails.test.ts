import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const visitorTrackerSource = readFileSync(join(process.cwd(), "components/VisitorTracker.tsx"), "utf8");

describe("returning visitor tracking guardrails", () => {
  test("first visits are not logged as returning visitors", () => {
    expect(visitorTrackerSource).toContain('"returning_visitor"');
    expect(visitorTrackerSource).toContain("days_since_last_visit: daysSinceLast");
    expect(visitorTrackerSource).toContain("is_first_visit: false");
    expect(visitorTrackerSource).not.toContain("is_first_visit: true");
  });
});
