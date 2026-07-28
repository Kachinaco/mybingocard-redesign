import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCardById } from "@/lib/db/cards";
import { getUserByEmail, incrementUserCounter } from "@/lib/db/users";
import { canExportHD, canRemoveBranding } from "@/lib/permissions";
import puppeteer, { type Browser } from "puppeteer";
import { mkdtemp } from "node:fs/promises";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { materializePdfImageCells } from "@/lib/pdf-image-assets";
import { getPuppeteerLaunchOptions } from "@/lib/server/chromium";
import {
  hardenExportPage,
  renderExportCellContent,
  sanitizeExportStyle,
} from "@/lib/server/export-html";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
import { notifyCardExported } from "@/lib/discord";
import {
  formatClassicCellLabel,
  getBingoGridShape,
  getFreeSpaceIndexForGrid,
  isBlankClassicCell,
  normalizeBingoVariant,
} from "@/lib/classic-bingo";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let tempAssetDir: string | null = null;
  let browser: Browser | null = null;

  try {
    const session = await auth();
    const requestContext = getRequestActivityContext(request);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const card = await getCardById(id);

    if (!card) {
      return NextResponse.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }

    // Check if user owns the card or if it's public
    if (card.userId.toString() !== session.user.id && !card.isPublic) {
      return NextResponse.json(
        { error: "You don't have access to this card" },
        { status: 403 }
      );
    }

    // Get user and check permissions
    const user = await getUserByEmail(session.user.email);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Parse options from request body
    let options = { grayscale: false, copies: 1 };
    try {
      const body = await request.json();
      if (body.grayscale !== undefined) options.grayscale = body.grayscale;
      if (body.copies !== undefined) options.copies = Math.min(Math.max(1, body.copies), 4);
    } catch {
      // No body or invalid JSON - use defaults
    }

    const hdPermission = canExportHD(user.planType);
    const brandingPermission = canRemoveBranding(user.planType);

    tempAssetDir = await mkdtemp(join(tmpdir(), "mybingocard-pdf-"));
    const materialized = await materializePdfImageCells(card.cells, {
      assetDir: tempAssetDir,
      cache: new Map(),
      cardOwnerUserId: card.userId.toString(),
    });

    // Generate HTML for the bingo card
    const html = generateCardHTML(
      { ...card, cells: materialized.cells },
      brandingPermission.allowed,
      options,
      tempAssetDir,
    );

    // Launch headless browser
    browser = await puppeteer.launch(getPuppeteerLaunchOptions());

    const page = await browser.newPage();
    await hardenExportPage(page, { allowedFileRoot: tempAssetDir });

    // Set viewport based on HD permission
    const viewportSize = hdPermission.allowed ? 2400 : 1200;
    await page.setViewport({
      width: viewportSize,
      height: viewportSize,
      deviceScaleFactor: hdPermission.allowed ? 2 : 1,
    });

    // Set content and wait for load
    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "letter",
      printBackground: true,
      margin: {
        top: "0.5in",
        right: "0.5in",
        bottom: "0.5in",
        left: "0.5in",
      },
    });

    await browser.close();
    browser = null;

    await trackActivity({
      event: "export_pdf",
      source: "server",
      userId: session.user.id || null,
      email: session.user.email,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        cardId: id,
        title: card.title,
        grayscale: options.grayscale,
        copies: options.copies,
        hd: hdPermission.allowed,
      },
    });

    // Increment export counter and send Discord notification (fire-and-forget)
    if (session.user.id) {
      incrementUserCounter(session.user.id, "totalExports").catch(() => {});
    }
    notifyCardExported(
      user.name || "Unknown",
      session.user.email,
      card.title,
      "pdf"
    ).catch(() => {});

    // Return PDF as downloadable file
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${sanitizeFilename(card.title)}.pdf"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("PDF export error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close().catch((error) => {
        console.error("PDF browser cleanup error:", error);
      });
    }
    if (tempAssetDir) {
      rmSync(tempAssetDir, { recursive: true, force: true });
    }
  }
}

function generateCardHTML(
  card: any,
  removeBranding: boolean,
  options: { grayscale: boolean; copies: number },
  allowedFileRoot?: string | null,
): string {
  const { title, description, size, cells, freeSpace } = card;
  const style = sanitizeExportStyle(card.style);
  const variant = normalizeBingoVariant(card.bingoVariant);
  const shape = getBingoGridShape(card);
  const freeSpaceIndex = getFreeSpaceIndexForGrid({
    freeSpace,
    rows: shape.rows,
    columns: shape.columns,
    bingoVariant: variant,
  });
  const { grayscale, copies } = options;

  const bgColor = grayscale ? "#ffffff" : (style.backgroundColor || "#ffffff");
  const txtColor = grayscale ? "#000000" : (style.textColor || "#000000");
  const borderClr = grayscale ? "#444444" : (style.borderColor || "#000000");
  const freeSpaceBg = grayscale ? "#e5e5e5" : "#e0e7ff";

  // For multiple copies per page
  const isMulti = copies > 1;
  const cardWidth = copies === 4 ? "48%" : copies === 2 ? "100%" : "100%";
  const gridMaxWidth = copies === 4 ? "3.2in" : copies === 2 ? "4.5in" : "6.5in";
  const gridAspect = shape.columns === shape.rows ? "1" : `${shape.columns} / ${shape.rows}`;
  const titleSize = isMulti ? "14px" : "28px";
  const descSize = isMulti ? "10px" : "16px";
  const cellFontSize = isMulti
    ? (size === 3 ? "9px" : size === 4 ? "8px" : "7px")
    : (style.fontSize || "14px");
  const cellPadding = isMulti ? "3px" : "10px";
  const cellBorderRadius = isMulti ? "3px" : "6px";
  const gridGap = isMulti ? "2px" : "6px";

  const singleCard = `
    <div class="card-container" style="width: ${cardWidth};">
      ${!removeBranding ? '<div class="watermark-overlay"><div class="watermark-text">MyBingoCard.com</div></div>' : ""}
      <div class="card-title" style="font-size: ${titleSize};">${escapeHtml(title)}</div>
      ${description ? `<div class="card-desc" style="font-size: ${descSize};">${escapeHtml(description)}</div>` : ""}
      ${variant === "classic75" ? `<div class="classic-header" style="grid-template-columns: repeat(${shape.columns}, 1fr); max-width: ${gridMaxWidth}; gap: ${gridGap};">${"BINGO".split("").map((letter) => `<div>${letter}</div>`).join("")}</div>` : ""}
      ${variant === "classic90" ? `<div class="classic-header ninety" style="grid-template-columns: repeat(${shape.columns}, 1fr); max-width: ${gridMaxWidth}; gap: ${gridGap};">${["1-9", "10s", "20s", "30s", "40s", "50s", "60s", "70s", "80-90"].map((label) => `<div>${label}</div>`).join("")}</div>` : ""}
      <div class="bingo-grid" style="grid-template-columns: repeat(${shape.columns}, 1fr); gap: ${gridGap}; max-width: ${gridMaxWidth}; aspect-ratio: ${gridAspect};">
        ${cells
          .map((cell: string, index: number) => {
            const isFreeSpace = freeSpace && index === freeSpaceIndex;
            const isBlank = isBlankClassicCell(cell, variant);
            const cellContent = renderExportCellContent(
              cell,
              formatClassicCellLabel(cell, variant),
              { allowedFileRoot },
            );
            return `
              <div class="cell" style="
                background-color: ${isBlank ? "#fff7ed" : isFreeSpace ? freeSpaceBg : bgColor};
                color: ${txtColor};
                border: ${isBlank ? "1px dashed #fed7aa" : `${isMulti ? '1px' : '2px'} solid ${borderClr}`};
                font-size: ${cellFontSize};
                font-family: ${style.fontFamily || "Arial"}, sans-serif;
                padding: ${cellPadding};
                border-radius: ${cellBorderRadius};
                ${isFreeSpace ? 'font-weight: bold;' : ''}
              ">
                ${isBlank ? "" : isFreeSpace ? "FREE" : cellContent}
              </div>
            `;
          })
          .join("")}
      </div>
      ${!removeBranding ? `<div class="card-footer" style="font-size: ${isMulti ? '7px' : '12px'};">Created with MyBingoCard.com</div>` : ""}
    </div>
  `;

  const cardRepeat = Array(copies).fill(singleCard).join("\n");

  const pageClass = copies === 4 ? "page-2x2" : copies === 2 ? "page-2x1" : "page-1x1";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }

          @page {
            size: letter;
            margin: 0;
          }

          body {
            font-family: ${style.fontFamily || "Arial"}, sans-serif;
            background: white;
            ${grayscale ? 'filter: grayscale(100%);' : ''}
          }

          .page {
            width: 8.5in;
            height: 11in;
            padding: 0.5in;
            position: relative;
          }

          .page-1x1 {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .page-2x1 {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-around;
          }

          .page-2x2 {
            display: flex;
            flex-wrap: wrap;
            align-content: space-between;
            justify-content: space-between;
          }

          .card-container {
            text-align: center;
            page-break-inside: avoid;
            position: relative;
          }

          .card-title {
            font-weight: bold;
            margin-bottom: 6px;
            color: ${grayscale ? '#000' : '#1e293b'};
          }

          .card-desc {
            color: ${grayscale ? '#444' : '#64748b'};
            margin-bottom: 12px;
          }

          .bingo-grid {
            display: grid;
            width: 100%;
            margin: 0 auto;
          }
          .classic-header {
            display: grid;
            width: 100%;
            margin: 0 auto 4px;
            color: ${grayscale ? "#000" : "#047857"};
            font-weight: 900;
            font-size: ${isMulti ? "9px" : "18px"};
          }
          .classic-header div {
            border-radius: 6px;
            background: ${grayscale ? "#f5f5f5" : "#ecfdf5"};
            padding: 3px 0;
          }
          .classic-header.ninety {
            color: ${grayscale ? "#000" : "#b45309"};
            font-size: ${isMulti ? "6px" : "10px"};
          }
          .classic-header.ninety div {
            background: ${grayscale ? "#f5f5f5" : "#fff7ed"};
          }

          .cell {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            word-wrap: break-word;
            overflow-wrap: break-word;
            overflow: hidden;
            line-height: 1.2;
          }
          .cell img { display: block; }

          .card-footer {
            color: #94a3b8;
            margin-top: 8px;
          }

          .watermark-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            z-index: 10;
          }
          .watermark-text {
            font-size: 48px;
            font-weight: 900;
            color: rgba(100, 100, 120, 0.13);
            transform: rotate(-30deg);
            white-space: nowrap;
            letter-spacing: 0.05em;
            user-select: none;
          }

          /* Cut lines for multi-card layouts */
          ${copies === 4 ? `
          .page-2x2::before {
            content: '';
            position: absolute;
            left: 0.3in;
            right: 0.3in;
            top: 50%;
            border-top: 1px dashed #cbd5e1;
          }
          .page-2x2::after {
            content: '';
            position: absolute;
            top: 0.3in;
            bottom: 0.3in;
            left: 50%;
            border-left: 1px dashed #cbd5e1;
          }
          ` : copies === 2 ? `
          .page-2x1::before {
            content: '';
            position: absolute;
            left: 0.3in;
            right: 0.3in;
            top: 50%;
            border-top: 1px dashed #cbd5e1;
          }
          ` : ''}

          /* Crop marks at corners */
          ${copies > 1 ? `
          .crop-mark {
            position: absolute;
            width: 0.15in;
            height: 0;
            border-top: 0.5px solid #94a3b8;
          }
          .crop-mark-v {
            position: absolute;
            width: 0;
            height: 0.15in;
            border-left: 0.5px solid #94a3b8;
          }
          ` : ''}
        </style>
      </head>
      <body>
        <div class="page ${pageClass}">
          ${cardRepeat}
          ${copies > 1 ? `
            <!-- Corner crop marks -->
            <div class="crop-mark" style="top: 0.1in; left: 0.1in;"></div>
            <div class="crop-mark-v" style="top: 0.1in; left: 0.1in;"></div>
            <div class="crop-mark" style="top: 0.1in; right: 0.1in;"></div>
            <div class="crop-mark-v" style="top: 0.1in; right: 0.1in;"></div>
            <div class="crop-mark" style="bottom: 0.1in; left: 0.1in;"></div>
            <div class="crop-mark-v" style="bottom: 0.1in; left: 0.1in;"></div>
            <div class="crop-mark" style="bottom: 0.1in; right: 0.1in;"></div>
            <div class="crop-mark-v" style="bottom: 0.1in; right: 0.1in;"></div>
          ` : ''}
        </div>
      </body>
    </html>
  `;
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m] || m);
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase()
    .substring(0, 50);
}
