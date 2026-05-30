import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const shareRouteSource = readFileSync(
  join(process.cwd(), "app/api/cards/share/[shareLink]/route.ts"),
  "utf8"
);

describe("share password guardrails", () => {
  test("does not rate-limit password-protected share link attempts before bcrypt compare", () => {
    expect(shareRouteSource).not.toContain("PASSWORD_ATTEMPT_MAX");
    expect(shareRouteSource).not.toContain("checkPasswordAttemptLimit");
    expect(shareRouteSource).not.toContain("Too many password attempts");

    const bcryptIndex = shareRouteSource.indexOf("bcrypt.compare(password, card.sharePassword)");
    expect(bcryptIndex).toBeGreaterThan(-1);
  });

  test("keeps old public share links playable without exposing password hashes", () => {
    expect(shareRouteSource).toContain("function normalizeLegacySharedCard");
    expect(shareRouteSource).toContain('collection("bingocards").findOne({ shareId: shareLink })');
    expect(shareRouteSource).toContain("collectionName: \"bingocards\"");
    expect(shareRouteSource).toContain("function publicCardPayload");
    expect(shareRouteSource).not.toContain("NextResponse.json({ card, ...flags })");
  });
});
