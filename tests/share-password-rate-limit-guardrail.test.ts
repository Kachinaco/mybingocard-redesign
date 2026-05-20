import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const shareRouteSource = readFileSync(
  join(process.cwd(), "app/api/cards/share/[shareLink]/route.ts"),
  "utf8"
);

describe("share password guardrails", () => {
  test("rate limits password-protected share link attempts before bcrypt compare", () => {
    expect(shareRouteSource).toContain("const PASSWORD_ATTEMPT_MAX = 10");
    expect(shareRouteSource).toContain("function checkPasswordAttemptLimit");
    expect(shareRouteSource).toContain("status: 429");

    const limiterIndex = shareRouteSource.indexOf("checkPasswordAttemptLimit(shareLink, request)");
    const bcryptIndex = shareRouteSource.indexOf("bcrypt.compare(password, card.sharePassword)");
    expect(limiterIndex).toBeGreaterThan(-1);
    expect(bcryptIndex).toBeGreaterThan(-1);
    expect(limiterIndex).toBeLessThan(bcryptIndex);
  });
});
