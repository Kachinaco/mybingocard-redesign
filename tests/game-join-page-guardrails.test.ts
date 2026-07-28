import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const joinPageSource = readFileSync(
  resolve(process.cwd(), "app/game/join/page.tsx"),
  "utf8",
);

describe("game join page guardrails", () => {
  test("renders the guest join form without waiting for authentication", () => {
    expect(joinPageSource).toContain("<form onSubmit={handleJoin}");
    expect(joinPageSource).not.toContain('status: authStatus');
    expect(joinPageSource).not.toContain('authStatus === "loading"');
  });

  test("lets a resolved session replace only the untouched generated name", () => {
    expect(joinPageSource).toContain("const playerNameEditedRef = useRef(false)");
    expect(joinPageSource).toContain(
      "if (!session?.user?.name || playerNameEditedRef.current) return;",
    );
    expect(joinPageSource).toContain("const handlePlayerNameChange = (value: string)");
    expect(joinPageSource).toContain("onChange={(e) => handlePlayerNameChange(e.target.value)}");
    expect(joinPageSource).toContain("onClick={pickGuestName}");
  });
});
