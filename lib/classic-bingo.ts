export type BingoVariant = "custom" | "classic75" | "classic90";

export type WinCondition =
  | "standard"
  | "four_corners"
  | "blackout"
  | "one_line"
  | "two_lines"
  | "full_house";

export interface BingoGridShape {
  rows: number;
  columns: number;
}

export const CLASSIC_75_RANGES = [
  { letter: "B", min: 1, max: 15 },
  { letter: "I", min: 16, max: 30 },
  { letter: "N", min: 31, max: 45 },
  { letter: "G", min: 46, max: 60 },
  { letter: "O", min: 61, max: 75 },
] as const;

export const CLASSIC_90_RANGES = [
  { min: 1, max: 9 },
  { min: 10, max: 19 },
  { min: 20, max: 29 },
  { min: 30, max: 39 },
  { min: 40, max: 49 },
  { min: 50, max: 59 },
  { min: 60, max: 69 },
  { min: 70, max: 79 },
  { min: 80, max: 90 },
] as const;

function randomInt(min: number, max: number, rng = Math.random) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function createSeededRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function shuffle<T>(items: T[], rng = Math.random): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = randomInt(0, index, rng);
    [result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!];
  }
  return result;
}

function sampleRange(min: number, max: number, count: number, rng = Math.random) {
  return shuffle(
    Array.from({ length: max - min + 1 }, (_, index) => min + index),
    rng
  )
    .slice(0, count)
    .sort((a, b) => a - b);
}

export function normalizeBingoVariant(value: unknown): BingoVariant {
  return value === "classic75" || value === "classic90" ? value : "custom";
}

export function getBingoGridShape(input: {
  size?: number | null;
  rows?: number | null;
  columns?: number | null;
  bingoVariant?: BingoVariant | string | null;
}): BingoGridShape {
  const variant = normalizeBingoVariant(input.bingoVariant);
  if (variant === "classic90") return { rows: 3, columns: 9 };
  const fallback = Number(input.size) || 5;
  const rows = Number(input.rows) || fallback;
  const columns = Number(input.columns) || fallback;
  return { rows, columns };
}

export function getFreeSpaceIndexForGrid(input: {
  freeSpace?: boolean | null;
  rows?: number | null;
  columns?: number | null;
  bingoVariant?: BingoVariant | string | null;
}): number {
  const variant = normalizeBingoVariant(input.bingoVariant);
  const rows = input.rows || (variant === "classic90" ? 3 : 5);
  const columns = input.columns || (variant === "classic90" ? 9 : 5);
  if (!input.freeSpace || rows !== columns) return -1;
  return Math.floor((rows * columns) / 2);
}

export function getDefaultWinCondition(variant: BingoVariant): WinCondition {
  return variant === "classic90" ? "one_line" : "standard";
}

export function getCallPoolForVariant(variant: BingoVariant, customWordList: string[] = []): string[] {
  if (variant === "classic75") {
    return CLASSIC_75_RANGES.flatMap(({ letter, min, max }) =>
      Array.from({ length: max - min + 1 }, (_, index) => `${letter}-${min + index}`)
    );
  }

  if (variant === "classic90") {
    return Array.from({ length: 90 }, (_, index) => String(index + 1));
  }

  return customWordList;
}

export function generateClassic75Card(rng = Math.random): string[] {
  const rows = 5;
  const columns = 5;
  const cells = Array(rows * columns).fill("");

  CLASSIC_75_RANGES.forEach(({ letter, min, max }, column) => {
    const count = letter === "N" ? 4 : 5;
    const numbers = sampleRange(min, max, count, rng);
    let numberIndex = 0;
    for (let row = 0; row < rows; row++) {
      const cellIndex = row * columns + column;
      if (letter === "N" && row === 2) {
        cells[cellIndex] = "FREE";
      } else {
        cells[cellIndex] = `${letter}-${numbers[numberIndex++]}`;
      }
    }
  });

  return cells;
}

function createNinetyBallMask(rng = Math.random): boolean[][] | null {
  for (let attempt = 0; attempt < 2000; attempt++) {
    const rows = Array.from({ length: 3 }, () => Array(9).fill(false) as boolean[]);

    for (let row = 0; row < 3; row++) {
      for (const column of shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8], rng).slice(0, 5)) {
        rows[row]![column] = true;
      }
    }

    const columnCounts = Array.from({ length: 9 }, (_, column) =>
      rows.reduce((sum, row) => sum + (row[column] ? 1 : 0), 0)
    );

    if (columnCounts.every((count) => count >= 1 && count <= 3)) return rows;
  }

  return null;
}

export function generateClassic90Ticket(rng = Math.random): string[] {
  const mask = createNinetyBallMask(rng);
  if (!mask) throw new Error("Failed to generate a valid 90-ball bingo ticket");

  const cells = Array(27).fill("");

  CLASSIC_90_RANGES.forEach(({ min, max }, column) => {
    const rowsWithNumber = mask
      .map((row, rowIndex) => (row[column] ? rowIndex : -1))
      .filter((rowIndex) => rowIndex >= 0);
    const numbers = sampleRange(min, max, rowsWithNumber.length, rng);

    rowsWithNumber.forEach((rowIndex, numberIndex) => {
      cells[rowIndex * 9 + column] = String(numbers[numberIndex]);
    });
  });

  return cells;
}

export function generateClassicBingoCard(variant: BingoVariant, rng = Math.random): string[] {
  if (variant === "classic75") return generateClassic75Card(rng);
  if (variant === "classic90") return generateClassic90Ticket(rng);
  return [];
}

export function formatClassicCellLabel(cell: string, variant: BingoVariant): string {
  if (variant === "classic75") {
    const match = /^([BINGO])-(\d{1,2})$/.exec(cell);
    return match ? match[2]! : cell;
  }
  return cell;
}

export function formatCalledItemLabel(item: string, variant: BingoVariant): string {
  if (variant === "classic75") {
    const match = /^([BINGO])-(\d{1,2})$/.exec(item);
    return match ? `${match[1]} ${match[2]}` : item;
  }
  return item;
}

export function isBlankClassicCell(cell: string, variant: BingoVariant): boolean {
  return variant === "classic90" && cell.trim() === "";
}

export function validateClassic75Cells(cells: string[]): boolean {
  if (cells.length !== 25) return false;
  const seen = new Set<string>();

  for (let index = 0; index < cells.length; index++) {
    const row = Math.floor(index / 5);
    const column = index % 5;
    const value = cells[index] || "";
    const range = CLASSIC_75_RANGES[column]!;

    if (row === 2 && column === 2) {
      if (value !== "FREE") return false;
      continue;
    }

    const match = /^([BINGO])-(\d{1,2})$/.exec(value);
    if (!match || match[1] !== range.letter) return false;
    const number = Number(match[2]);
    if (number < range.min || number > range.max) return false;
    if (seen.has(value)) return false;
    seen.add(value);
  }

  return seen.size === 24;
}

export function validateClassic90Cells(cells: string[]): boolean {
  if (cells.length !== 27) return false;
  const seen = new Set<number>();

  for (let row = 0; row < 3; row++) {
    const filledInRow = cells.slice(row * 9, row * 9 + 9).filter((cell) => cell.trim()).length;
    if (filledInRow !== 5) return false;
  }

  for (let column = 0; column < 9; column++) {
    const range = CLASSIC_90_RANGES[column]!;
    const values: number[] = [];

    for (let row = 0; row < 3; row++) {
      const value = cells[row * 9 + column]!.trim();
      if (!value) continue;
      if (!/^\d{1,2}$/.test(value)) return false;

      const number = Number(value);
      if (number < range.min || number > range.max) return false;
      if (seen.has(number)) return false;
      seen.add(number);
      values.push(number);
    }

    if (values.length < 1 || values.length > 3) return false;
    const sorted = [...values].sort((a, b) => a - b);
    if (values.some((value, index) => value !== sorted[index])) return false;
  }

  return seen.size === 15;
}

export function validateClassicCells(variant: BingoVariant, cells: string[]): boolean {
  if (variant === "classic75") return validateClassic75Cells(cells);
  if (variant === "classic90") return validateClassic90Cells(cells);
  return true;
}

export function isCalledMatch(cell: string, calledItems: Set<string>, variant: BingoVariant): boolean {
  if (isBlankClassicCell(cell, variant) || cell === "FREE") return false;
  return calledItems.has(cell);
}

function filledIndicesForLine(
  cells: string[],
  variant: BingoVariant,
  indices: number[]
): number[] {
  return indices.filter((index) => !isBlankClassicCell(cells[index] || "", variant));
}

export function checkWinByGrid(
  marked: number[],
  cells: string[],
  rows: number,
  columns: number,
  winCondition: WinCondition,
  variant: BingoVariant
): boolean {
  const markedSet = new Set(marked);

  if (variant === "classic90") {
    const completedRows = Array.from({ length: rows }, (_, row) => {
      const indices = filledIndicesForLine(
        cells,
        variant,
        Array.from({ length: columns }, (_, column) => row * columns + column)
      );
      return indices.length > 0 && indices.every((index) => markedSet.has(index));
    }).filter(Boolean).length;

    if (winCondition === "two_lines") return completedRows >= 2;
    if (winCondition === "full_house" || winCondition === "blackout") {
      return cells.every((cell, index) => isBlankClassicCell(cell, variant) || markedSet.has(index));
    }
    return completedRows >= 1;
  }

  if (winCondition === "four_corners") {
    return [0, columns - 1, columns * (rows - 1), rows * columns - 1].every((index) =>
      markedSet.has(index)
    );
  }

  if (winCondition === "blackout" || winCondition === "full_house") {
    return cells.every((cell, index) => cell === "FREE" || markedSet.has(index));
  }

  for (let row = 0; row < rows; row++) {
    const indices = Array.from({ length: columns }, (_, column) => row * columns + column);
    if (indices.every((index) => markedSet.has(index))) return true;
  }

  for (let column = 0; column < columns; column++) {
    const indices = Array.from({ length: rows }, (_, row) => row * columns + column);
    if (indices.every((index) => markedSet.has(index))) return true;
  }

  if (rows === columns) {
    const mainDiagonal = Array.from({ length: rows }, (_, index) => index * columns + index);
    const antiDiagonal = Array.from({ length: rows }, (_, index) => index * columns + (columns - 1 - index));
    if (mainDiagonal.every((index) => markedSet.has(index))) return true;
    if (antiDiagonal.every((index) => markedSet.has(index))) return true;
  }

  return false;
}
