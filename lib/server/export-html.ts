import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "puppeteer";
import { parseImageCell } from "@/lib/cellContent";

const ALLOWED_FONTS = new Set([
  "Arial",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Verdana",
  "Comic Sans MS",
]);
const TRUSTED_WEB_IMAGE_PATHS = [
  /^\/api\/images\/[a-f0-9]{24}$/i,
  /^\/uploads\/[a-z0-9._/-]+$/i,
  /^\/theme-assets\/[a-z0-9._/-]+$/i,
  /^\/badges\/[a-z0-9._/-]+$/i,
];
const TRUSTED_FILE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const MAX_DATA_IMAGE_URL_LENGTH = 12 * 1024 * 1024;

export type SafeExportStyle = {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  fontSize: string;
  fontFamily: string;
};

export function escapeExportHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] || character);
}

function safeColor(value: unknown, fallback: string): string {
  const candidate = typeof value === "string" ? value.trim() : "";
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(candidate)
    ? candidate
    : fallback;
}

export function sanitizeExportStyle(style: unknown): SafeExportStyle {
  const value = style && typeof style === "object"
    ? style as Record<string, unknown>
    : {};
  const numericFontSize = Number.parseFloat(String(value.fontSize ?? "16"));
  const fontSize = Number.isFinite(numericFontSize)
    ? `${Math.min(48, Math.max(8, numericFontSize))}px`
    : "16px";
  const fontFamily = typeof value.fontFamily === "string" && ALLOWED_FONTS.has(value.fontFamily)
    ? value.fontFamily
    : "Arial";

  return {
    backgroundColor: safeColor(value.backgroundColor, "#ffffff"),
    textColor: safeColor(value.textColor, "#000000"),
    borderColor: safeColor(value.borderColor, "#000000"),
    fontSize,
    fontFamily,
  };
}

function isTrustedDataImageUrl(value: string): boolean {
  if (value.length > MAX_DATA_IMAGE_URL_LENGTH) return false;
  return /^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(value);
}

function isPathWithinRoot(filePath: string, allowedFileRoot?: string | null): boolean {
  if (!allowedFileRoot) return false;
  const root = resolve(allowedFileRoot);
  const candidate = resolve(filePath);
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) return false;
  const extension = candidate.split(".").pop()?.toLowerCase() || "";
  return TRUSTED_FILE_EXTENSIONS.has(extension);
}

export function sanitizeExportImageUrl(
  value: unknown,
  options: { allowedFileRoot?: string | null } = {},
): string | null {
  if (typeof value !== "string" || !value) return null;
  if (isTrustedDataImageUrl(value)) return value;

  const absoluteValue = value.startsWith("/")
    ? `https://mybingocard.com${value}`
    : value;

  let url: URL;
  try {
    url = new URL(absoluteValue);
  } catch {
    return null;
  }

  if (url.protocol === "file:") {
    try {
      return isPathWithinRoot(fileURLToPath(url), options.allowedFileRoot) ? url.href : null;
    } catch {
      return null;
    }
  }

  if (
    url.protocol !== "https:" ||
    url.hostname !== "mybingocard.com" ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    return null;
  }

  return TRUSTED_WEB_IMAGE_PATHS.some((pattern) => pattern.test(url.pathname))
    ? url.href
    : null;
}

export function renderExportImageCell(
  cell: string,
  options: { allowedFileRoot?: string | null } = {},
): string | null {
  const image = parseImageCell(cell);
  if (!image) return null;
  const imageUrl = sanitizeExportImageUrl(image.imageUrl, options);
  if (!imageUrl) return null;

  const label = image.label
    ? `<div style="font-size:0.65em;margin-top:2px;text-align:center;${image.fit === "cover" ? "position:relative;z-index:1;background:rgba(0,0,0,0.4);color:#fff;border-radius:3px;padding:1px 3px;" : ""}">${escapeExportHtml(image.label)}</div>`
    : "";
  const source = escapeExportHtml(imageUrl);

  if (image.fit === "cover") {
    return `<img src="${source}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit;" />${label}`;
  }

  return `<img src="${source}" alt="" style="max-width:90%;max-height:${label ? "65%" : "85%"};object-fit:contain;" />${label}`;
}

export function renderExportCellContent(
  cell: string,
  formattedText: string,
  options: { allowedFileRoot?: string | null } = {},
): string {
  const image = parseImageCell(cell);
  if (!image) return escapeExportHtml(formattedText);
  return renderExportImageCell(cell, options) || escapeExportHtml(image.label || "");
}

export function isTrustedExportRequestUrl(
  value: string,
  options: { allowedFileRoot?: string | null } = {},
): boolean {
  return value === "about:blank" || sanitizeExportImageUrl(value, options) !== null;
}

export async function hardenExportPage(
  page: Page,
  options: { allowedFileRoot?: string | null } = {},
): Promise<void> {
  await page.setJavaScriptEnabled(false);
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    if (isTrustedExportRequestUrl(request.url(), options)) {
      request.continue();
    } else {
      request.abort();
    }
  });
}
