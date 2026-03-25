/**
 * Shared seeded shuffle utilities for deterministic per-viewer card randomization.
 * Used by: shared card viewer, bulk PDF export.
 */

/** DJB2 hash — converts a string to a 32-bit integer seed */
export function hashStringToSeed(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return hash;
}

/** Fisher-Yates shuffle with LCG seeded PRNG (Numerical Recipes constants) */
export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const array = [...arr];
  let s = seed;
  for (let i = array.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [array[i], array[j]] = [array[j]!, array[i]!];
  }
  return array;
}

/**
 * Shuffle bingo card cells for a specific viewer.
 * Free space is extracted, remaining cells are shuffled, then free space is re-inserted at center.
 */
export function shuffleBingoCells(
  cells: string[],
  size: number,
  freeSpace: boolean,
  viewerId: string,
  cardId: string
): string[] {
  const seed = hashStringToSeed(viewerId + cardId);
  const freeSpaceIndex = Math.floor((size * size) / 2);

  if (!freeSpace) {
    return seededShuffle(cells, seed);
  }

  // Extract non-free-space cells, shuffle them, re-insert free space at center
  const nonFreeCells = cells.filter((_, i) => i !== freeSpaceIndex);
  const shuffled = seededShuffle(nonFreeCells, seed);
  const result = [...shuffled];
  result.splice(freeSpaceIndex, 0, cells[freeSpaceIndex]!);
  return result;
}
