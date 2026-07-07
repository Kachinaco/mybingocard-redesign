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
    const cardDbSource = readFileSync(
      join(process.cwd(), "lib/db/cards.ts"),
      "utf8"
    );

    expect(cardDbSource).toContain("function normalizeLegacySharedCard");
    expect(cardDbSource).toContain('"bingocards", { shareId: shareLink }');
    expect(cardDbSource).toContain('collectionName: "bingocards"');
    expect(shareRouteSource).toContain("getSharedCardForShareLink");
    expect(shareRouteSource).toContain("function publicCardPayload");
    expect(shareRouteSource).not.toContain("NextResponse.json({ card, ...flags })");
  });
});
