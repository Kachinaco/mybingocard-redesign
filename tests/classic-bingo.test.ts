import { describe, expect, test } from "bun:test";
import {
  checkWinByGrid,
  createSeededRng,
  generateClassic75Card,
  generateClassic90Ticket,
  getCallPoolForVariant,
  validateClassic75Cells,
  validateClassic90Cells,
} from "@/lib/classic-bingo";

describe("classic bingo generation", () => {
  test("generates a valid 75-ball card with strict B-I-N-G-O ranges", () => {
    const card = generateClassic75Card(createSeededRng(75));

    expect(card).toHaveLength(25);
    expect(card[12]).toBe("FREE");
    expect(validateClassic75Cells(card)).toBe(true);

    for (let row = 0; row < 5; row++) {
      expect(card[row * 5]?.startsWith("B-")).toBe(true);
      expect(card[row * 5 + 1]?.startsWith("I-")).toBe(true);
      if (row !== 2) expect(card[row * 5 + 2]?.startsWith("N-")).toBe(true);
      expect(card[row * 5 + 3]?.startsWith("G-")).toBe(true);
      expect(card[row * 5 + 4]?.startsWith("O-")).toBe(true);
    }
  });

  test("generates a valid 90-ball ticket with 3 rows, 9 columns, and 15 numbers", () => {
    const ticket = generateClassic90Ticket(createSeededRng(90));

    expect(ticket).toHaveLength(27);
    expect(validateClassic90Cells(ticket)).toBe(true);

    for (let row = 0; row < 3; row++) {
      expect(ticket.slice(row * 9, row * 9 + 9).filter(Boolean)).toHaveLength(5);
    }
    expect(ticket.filter(Boolean)).toHaveLength(15);
  });

  test("exposes full classic call pools", () => {
    const seventyFive = getCallPoolForVariant("classic75");
    const ninety = getCallPoolForVariant("classic90");

    expect(seventyFive).toHaveLength(75);
    expect(seventyFive[0]).toBe("B-1");
    expect(seventyFive[74]).toBe("O-75");
    expect(ninety).toHaveLength(90);
    expect(ninety[0]).toBe("1");
    expect(ninety[89]).toBe("90");
  });

  test("checks 75-ball standard lines and 90-ball one-line/full-house wins", () => {
    const seventyFive = generateClassic75Card(createSeededRng(7));
    expect(checkWinByGrid([0, 1, 2, 3, 4, 12], seventyFive, 5, 5, "standard", "classic75")).toBe(true);

    const ninety = generateClassic90Ticket(createSeededRng(9));
    const firstRow = ninety
      .slice(0, 9)
      .map((value, index) => (value ? index : -1))
      .filter((index) => index >= 0);
    const allNumbers = ninety
      .map((value, index) => (value ? index : -1))
      .filter((index) => index >= 0);

    expect(checkWinByGrid(firstRow, ninety, 3, 9, "one_line", "classic90")).toBe(true);
    expect(checkWinByGrid(firstRow, ninety, 3, 9, "full_house", "classic90")).toBe(false);
    expect(checkWinByGrid(allNumbers, ninety, 3, 9, "full_house", "classic90")).toBe(true);
  });
});
