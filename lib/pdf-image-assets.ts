import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { encodeImageCell, parseImageCell } from "@/lib/cellContent";
import { getImageById, type StoredImage } from "@/lib/db/images";
import sharp from "sharp";

const MAX_ENCODED_IMAGE_LENGTH = 12 * 1024 * 1024;
const MAX_DECODED_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 32 * 1024 * 1024;

export interface MaterializePdfImageCellsOptions {
  assetDir: string;
  cache: Map<string, string>;
  cardOwnerUserId?: string;
  resolveStoredImage?: (imageId: string) => Promise<StoredImage | null>;
}

export interface MaterializePdfImageCellsResult {
  cells: string[];
  tempFiles: string[];
}

function getDataUrlParts(dataUrl: string): { mimeType: string; data: string } | null {
  if (dataUrl.length > MAX_ENCODED_IMAGE_LENGTH) return null;
  const match = dataUrl.match(/^data:([^;,]+);base64,([a-z0-9+/=]+)$/i);
  if (!match) return null;
  const mimeType = match[1] || "application/octet-stream";
  if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(mimeType)) {
    return null;
  }
  return {
    mimeType,
    data: match[2] || "",
  };
}

async function isSafeRasterImage(imageBytes: Buffer): Promise<boolean> {
  if (imageBytes.length === 0 || imageBytes.length > MAX_DECODED_IMAGE_BYTES) return false;
  try {
    const metadata = await sharp(imageBytes, { limitInputPixels: MAX_IMAGE_PIXELS }).metadata();
    return Boolean(
      metadata.width
      && metadata.height
      && ["png", "jpeg", "webp", "gif"].includes(metadata.format || "")
    );
  } catch {
    return false;
  }
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

function savedImageId(imageUrl: string): string | null {
  const match = imageUrl.match(/^(?:https:\/\/mybingocard\.com)?\/api\/images\/([a-f0-9]{24})$/i);
  return match?.[1] || null;
}

export async function materializePdfImageCells(
  cells: string[],
  options: MaterializePdfImageCellsOptions
): Promise<MaterializePdfImageCellsResult> {
  const { assetDir, cache, cardOwnerUserId } = options;
  const resolveStoredImage = options.resolveStoredImage || getImageById;
  const updatedCells = [...cells];
  const tempFiles: string[] = [];

  await mkdir(assetDir, { recursive: true });

  for (let i = 0; i < updatedCells.length; i++) {
    const cell = updatedCells[i] ?? "";
    const imageData = parseImageCell(cell);

    if (!imageData) {
      continue;
    }

    const storedImageId = savedImageId(imageData.imageUrl);
    if (!imageData.imageUrl.startsWith("data:") && !storedImageId) continue;

    const cacheKey = storedImageId ? `stored:${storedImageId}` : imageData.imageUrl;
    let materializedUrl = cache.get(cacheKey);

    if (!materializedUrl) {
      let imageBytes: Buffer;
      let mimeType: string;

      if (storedImageId) {
        const storedImage = await resolveStoredImage(storedImageId);
        const ownerCanRead = storedImage?.isSystem
          || (cardOwnerUserId && storedImage?.userId === cardOwnerUserId);
        if (!storedImage || !ownerCanRead || !getDataUrlParts(`data:${storedImage.mimeType};base64,AA==`)) {
          updatedCells[i] = encodeImageCell({ ...imageData, imageUrl: "" });
          continue;
        }
        try {
          imageBytes = await readFile(storedImage.storagePath);
        } catch {
          updatedCells[i] = encodeImageCell({ ...imageData, imageUrl: "" });
          continue;
        }
        mimeType = storedImage.mimeType;
      } else {
        const dataUrlParts = getDataUrlParts(imageData.imageUrl);
        if (!dataUrlParts) {
          updatedCells[i] = encodeImageCell({ ...imageData, imageUrl: "" });
          continue;
        }
        imageBytes = Buffer.from(dataUrlParts.data, "base64");
        mimeType = dataUrlParts.mimeType;
      }

      if (!(await isSafeRasterImage(imageBytes))) {
        updatedCells[i] = encodeImageCell({ ...imageData, imageUrl: "" });
        continue;
      }

      const hash = createHash("sha1").update(cacheKey).digest("hex");
      const extension = extensionForMimeType(mimeType);
      const filePath = join(assetDir, `${hash}.${extension}`);

      if (!existsSync(filePath)) {
        await writeFile(filePath, imageBytes);
        tempFiles.push(filePath);
      }

      materializedUrl = pathToFileURL(filePath).href;
      cache.set(cacheKey, materializedUrl);
    }

    updatedCells[i] = encodeImageCell({
      ...imageData,
      imageUrl: materializedUrl,
    });
  }

  return { cells: updatedCells, tempFiles };
}
