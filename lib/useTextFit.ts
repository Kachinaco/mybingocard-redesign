"use client";

import { useState, useEffect, useCallback, useRef, type RefObject } from "react";
import { isImageCell } from "@/lib/cellContent";

interface TextFitOptions {
  cells: string[];
  gridSize: 3 | 4 | 5;
  fontFamily?: string;
  freeSpaceIndex: number | null;
}

const FONT_RANGES: Record<number, { min: number; max: number }> = {
  3: { min: 7, max: 28 },
  4: { min: 6, max: 22 },
  5: { min: 4, max: 16 },
};

const LINE_HEIGHT_RATIO = 1.2;
const PADDING = 4; // px inner padding on each side (matches cell inline style)

async function computeSizes(
  cells: string[],
  gridSize: 3 | 4 | 5,
  fontFamily: string,
  freeSpaceIndex: number | null,
  cellWidth: number,
): Promise<Map<number, number>> {
  const { prepare, layout } = await import("@chenglou/pretext");
  const sizes = new Map<number, number>();
  const available = cellWidth - PADDING * 2;
  if (available <= 0) return sizes;

  // Use a tighter box to prevent edge clipping from subpixel rounding
  const fitWidth = Math.floor(available * 0.92);
  const fitHeight = Math.floor(available * 0.92);

  const range = FONT_RANGES[gridSize]!;
  const { min, max } = range;

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (!cell || cell.trim() === "" || isImageCell(cell) || i === freeSpaceIndex) continue;

    let lo = min;
    let hi = max;
    let best = min;

    while (lo <= hi) {
      const mid = Math.round((lo + hi) / 2 * 2) / 2; // 0.5px steps
      const font = `600 ${mid}px ${fontFamily}`;
      const prepared = prepare(cell, font);
      const result = layout(prepared, fitWidth, mid * LINE_HEIGHT_RATIO);
      if (result.height <= fitHeight) {
        best = mid;
        lo = mid + 0.5;
      } else {
        hi = mid - 0.5;
      }
    }

    sizes.set(i, best);
  }

  return sizes;
}

export function useTextFit(
  gridRef: RefObject<HTMLDivElement | null>,
  options: TextFitOptions,
): Map<number, number> {
  const [sizes, setSizes] = useState<Map<number, number>>(() => new Map());
  const { cells, gridSize, fontFamily = "sans-serif", freeSpaceIndex } = options;
  const mountedRef = useRef(true);

  const measure = useCallback(() => {
    const el = gridRef.current;
    if (!el || !mountedRef.current) return;

    const containerWidth = el.clientWidth;
    const gap = parseFloat(getComputedStyle(el).gap) || 6;
    const cellWidth = (containerWidth - gap * (gridSize - 1)) / gridSize;

    computeSizes(cells, gridSize, fontFamily, freeSpaceIndex, cellWidth).then((result) => {
      if (mountedRef.current) setSizes(result);
    });
  }, [gridRef, cells, gridSize, fontFamily, freeSpaceIndex]);

  useEffect(() => {
    mountedRef.current = true;
    const el = gridRef.current;
    if (!el) return;

    // Wait for fonts then measure
    document.fonts.ready.then(() => {
      if (mountedRef.current) measure();
    });

    // Re-measure on resize
    let timer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(measure, 100);
    });
    observer.observe(el);

    return () => {
      mountedRef.current = false;
      observer.disconnect();
      clearTimeout(timer);
      import("@chenglou/pretext").then(({ clearCache }) => clearCache()).catch(() => {});
    };
  }, [measure]);

  return sizes;
}
