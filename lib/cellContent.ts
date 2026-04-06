/**
 * Cell content utilities for text and image bingo cells.
 *
 * Image cells are encoded as "__IMG__:{json}" inside the existing cells: string[] array.
 * This means zero migration — existing text cards keep working unchanged.
 */

const IMG_PREFIX = "__IMG__:";

export interface ImageCellData {
  imageId: string;
  imageUrl: string;
  label?: string;
  fit?: "contain" | "cover";
}

/**
 * Check if a cell string represents an image cell
 */
export function isImageCell(cell: string): boolean {
  return cell.startsWith(IMG_PREFIX);
}

/**
 * Parse an image cell string into its data, or return null for text cells
 */
export function parseImageCell(cell: string): ImageCellData | null {
  if (!cell.startsWith(IMG_PREFIX)) return null;
  try {
    return JSON.parse(cell.slice(IMG_PREFIX.length));
  } catch {
    return null;
  }
}

/**
 * Encode image data into a cell string
 */
export function encodeImageCell(data: ImageCellData): string {
  return IMG_PREFIX + JSON.stringify(data);
}

/**
 * Get the display text for any cell (label for image cells, raw text for text cells)
 */
export function getCellDisplayText(cell: string): string {
  const img = parseImageCell(cell);
  if (img) return img.label || "";
  return cell;
}

/**
 * Get the image URL for a cell, or null if it's a text cell
 */
export function getCellImageUrl(cell: string): string | null {
  const img = parseImageCell(cell);
  return img?.imageUrl || null;
}
