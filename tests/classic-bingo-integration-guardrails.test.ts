import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("classic bingo integration guardrails", () => {
  const createPageSource = readFileSync(resolve(process.cwd(), "app/create/page.tsx"), "utf8");
  const cardsRouteSource = readFileSync(resolve(process.cwd(), "app/api/cards/route.ts"), "utf8");
  const cardRouteSource = readFileSync(resolve(process.cwd(), "app/api/cards/[id]/route.ts"), "utf8");
  const gamesSource = readFileSync(resolve(process.cwd(), "lib/db/games.ts"), "utf8");
  const hostPageSource = readFileSync(resolve(process.cwd(), "app/game/host/[roomCode]/page.tsx"), "utf8");
  const playerPageSource = readFileSync(resolve(process.cwd(), "app/game/play/[roomCode]/page.tsx"), "utf8");
  const sharePageSource = readFileSync(resolve(process.cwd(), "app/share/[shareLink]/page.tsx"), "utf8");
  const bulkPdfSource = readFileSync(resolve(process.cwd(), "app/api/cards/[id]/export/bulk-pdf/route.ts"), "utf8");

  test("create page exposes strict 75-ball and 90-ball modes", () => {
    expect(createPageSource).toContain("Bingo Type");
    expect(createPageSource).toContain('["classic75", "75-Ball"]');
    expect(createPageSource).toContain('["classic90", "90-Ball"]');
    expect(createPageSource).toContain("Strict B-I-N-G-O columns");
    expect(createPageSource).toContain("Traditional 3x9 ticket");
    expect(createPageSource).toContain("Regenerate classic card");
    expect(createPageSource).toContain('bingoVariant === "custom" && (');
    expect(createPageSource).toContain("if (bingoVariant !== \"custom\") return;");
  });

  test("card APIs store classic shape and reject invalid classic layouts", () => {
    for (const source of [cardsRouteSource, cardRouteSource]) {
      expect(source).toContain("validateClassicCells");
      expect(source).toContain("getBingoGridShape");
      expect(source).toContain("bingoVariant");
      expect(source).toContain("rows");
      expect(source).toContain("columns");
      expect(source).toContain('bingoVariant === "classic90" ? false');
    }
  });

  test("live games use classic call pools, player cards, and win rules", () => {
    expect(gamesSource).toContain("getCallPoolForVariant");
    expect(gamesSource).toContain("function generatePlayerCells(room: GameRoom)");
    expect(gamesSource).toContain("generateClassicBingoCard");
    expect(gamesSource).toContain("!room.wordList.includes(item)");
    expect(gamesSource).toContain("checkWinByGrid");
    expect(gamesSource).toContain("one_line");
    expect(gamesSource).toContain("two_lines");
    expect(gamesSource).toContain("full_house");
  });

  test("live host and player UIs understand 90-ball win conditions and blanks", () => {
    expect(hostPageSource).toContain('["one_line", "1 Line"]');
    expect(hostPageSource).toContain('["two_lines", "2 Lines"]');
    expect(hostPageSource).toContain('["full_house", "Full House"]');
    expect(hostPageSource).toContain("isBlankClassicCell");
    expect(playerPageSource).toContain("checkWinByGrid");
    expect(playerPageSource).toContain("isBlankClassicCell");
  });

  test("shared play and bulk PDFs keep classic cards valid", () => {
    expect(sharePageSource).toContain("generateClassicBingoCard");
    expect(sharePageSource).toContain("checkWinByGrid");
    expect(sharePageSource).toContain("classic90");
    expect(bulkPdfSource).toContain("generateBulkCardCells");
    expect(bulkPdfSource).toContain("generateClassicBingoCard");
    expect(bulkPdfSource).toContain("getBingoGridShape");
    expect(bulkPdfSource).toContain("aspect-ratio");
  });
});
