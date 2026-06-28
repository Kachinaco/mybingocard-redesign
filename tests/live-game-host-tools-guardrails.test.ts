import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("live game host tool guardrails", () => {
  const gamesSource = readFileSync(resolve(process.cwd(), "lib/db/games.ts"), "utf8");
  const roomRouteSource = readFileSync(resolve(process.cwd(), "app/api/game/[roomCode]/route.ts"), "utf8");
  const streamRouteSource = readFileSync(resolve(process.cwd(), "app/api/game/[roomCode]/stream/route.ts"), "utf8");
  const bingoRouteSource = readFileSync(resolve(process.cwd(), "app/api/game/[roomCode]/bingo/route.ts"), "utf8");
  const hostPageSource = readFileSync(resolve(process.cwd(), "app/game/host/[roomCode]/page.tsx"), "utf8");
  const joinPageSource = readFileSync(resolve(process.cwd(), "app/game/join/page.tsx"), "utf8");
  const joinSheetPageSource = readFileSync(resolve(process.cwd(), "app/game/join-sheet/[roomCode]/page.tsx"), "utf8");
  const playerPageSource = readFileSync(resolve(process.cwd(), "app/game/play/[roomCode]/page.tsx"), "utf8");
  const cleanupScriptSource = readFileSync(resolve(process.cwd(), "scripts/cleanup-stale-game-rooms.cjs"), "utf8");

  test("winner claims store and return a verification code", () => {
    expect(gamesSource).toContain("verificationCode: string;");
    expect(gamesSource).toContain("function generateWinnerVerificationCode()");
    expect(gamesSource).toContain("verificationCode = generateWinnerVerificationCode()");
    expect(gamesSource).toContain("return { valid: true, playerName: player.playerName, verificationCode");
  });

  test("game APIs expose winner verification codes to live clients", () => {
    expect(roomRouteSource).toContain("verificationCode: w.verificationCode");
    expect(streamRouteSource).toContain("verificationCode: w.verificationCode");
    expect(bingoRouteSource).toContain("verificationCode: w.verificationCode");
  });

  test("host page has event-ready QR and join sheet controls", () => {
    expect(hostPageSource).toContain("Show QR");
    expect(hostPageSource).toContain("Print join sheet");
    expect(hostPageSource).toContain("Scan to join");
    expect(hostPageSource).toContain("No app needed");
    expect(hostPageSource).toContain("game_join_sheet_printed");
    expect(hostPageSource).toContain("/game/join-sheet/");
    expect(hostPageSource).not.toContain("document.write");
  });

  test("join sheet prints from a same-origin route", () => {
    expect(joinSheetPageSource).toContain("getGameRoom");
    expect(joinSheetPageSource).toContain("https://mybingocard.com/game/join?code=");
    expect(joinSheetPageSource).toContain("window.print()");
    expect(joinSheetPageSource).toContain("Scan to join the bingo game");
  });

  test("join page supports guest and authenticated joins without exposing email as player name", () => {
    expect(joinPageSource).toContain("Join as a guest or sign in");
    expect(joinPageSource).toContain("Guests can join with a name only.");
    expect(joinPageSource).toContain('href={`/login?callbackUrl=${authQuery}`}');
    expect(joinPageSource).toContain('href={`/signup?callbackUrl=${authQuery}`}');
    expect(joinPageSource).toContain("firstNameFromSessionName(session?.user?.name)");
    expect(joinPageSource).toContain("isGeneratedGuestName(playerName)");
    expect(joinPageSource).toContain('Signed in as {sessionDisplayName || "your account"}');
    expect(joinPageSource).not.toContain("Signed in as {session.user.email}");
  });

  test("host page exposes winner verification and called-list export", () => {
    expect(hostPageSource).toContain("Winner verification");
    expect(hostPageSource).toContain("Ask winners for this code before awarding a prize.");
    expect(hostPageSource).toContain("exportCalledList");
    expect(hostPageSource).toContain("Export called list");
    expect(hostPageSource).toContain("game_called_list_exported");
  });

  test("player page shows winners their verification code", () => {
    expect(playerPageSource).toContain("claimVerificationCode");
    expect(playerPageSource).toContain("Verification code");
    expect(playerPageSource).toContain("Show the host code");
    expect(playerPageSource).toContain("setClaimVerificationCode(data.verificationCode)");
  });

  test("inactive game rooms close out after two days and record an end time", () => {
    expect(gamesSource).toContain("GAME_ROOM_INACTIVITY_CLOSEOUT_DAYS = 2");
    expect(gamesSource).toContain("GAME_ROOM_INACTIVITY_CLOSEOUT_MS");
    expect(gamesSource).toContain("endedAt: now");
    expect(gamesSource).not.toContain("ageMs > 24 * 60 * 60 * 1000");
    expect(gamesSource).not.toContain("Date.now() - 24 * 60 * 60 * 1000");
    expect(cleanupScriptSource).toContain("MYBINGOCARD_GAME_ROOM_CLOSEOUT_DAYS || 2");
    expect(cleanupScriptSource).toContain('status: "finished", endedAt: now, updatedAt: now');
    expect(cleanupScriptSource).toContain('event: "game_auto_ended"');
  });
});
