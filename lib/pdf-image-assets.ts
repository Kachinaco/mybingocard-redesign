import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { encodeImageCell, parseImageCell } from "@/lib/cellContent";

export interface MaterializePdfImageCellsOptions {
  assetDir: string;
  cache: Map<string, string>;
}

export interface MaterializePdfImageCellsResult {
  cells: string[];
  tempFiles: string[];
}

function getDataUrlParts(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1] || "application/octet-stream",
    data: match[2] || "",
  };
}

function extensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/svg+xml":
      return "svg";
    default:
      return "bin";
  }
}

export async function materializePdfImageCells(
  cells: string[],
  options: MaterializePdfImageCellsOptions
): Promise<MaterializePdfImageCellsResult> {
  const { assetDir, cache } = options;
  const updatedCells = [...cells];
  const tempFiles: string[] = [];

  await mkdir(assetDir, { recursive: true });

  for (let i = 0; i < updatedCells.length; i++) {
    const cell = updatedCells[i] ?? "";
    const imageData = parseImageCell(cell);

    if (!imageData || !imageData.imageUrl.startsWith("data:")) {
      continue;
    }

    let materializedUrl = cache.get(imageData.imageUrl);

    if (!materializedUrl) {
      const dataUrlParts = getDataUrlParts(imageData.imageUrl);
      if (!dataUrlParts) {
        continue;
      }

      const hash = createHash("sha1").update(imageData.imageUrl).digest("hex");
      const extension = extensionForMimeType(dataUrlParts.mimeType);
      const filePath = join(assetDir, `${hash}.${extension}`);

      if (!existsSync(filePath)) {
        const buffer = Buffer.from(dataUrlParts.data, "base64");
        await writeFile(filePath, buffer);
        tempFiles.push(filePath);
      }

      materializedUrl = pathToFileURL(filePath).href;
      cache.set(imageData.imageUrl, materializedUrl);
    }

    updatedCells[i] = encodeImageCell({
      ...imageData,
      imageUrl: materializedUrl,
    });
  }

  return { cells: updatedCells, tempFiles };
}
