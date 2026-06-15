import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCardById } from "@/lib/db/cards";
import { findGeneratedBatchPurchaseForCards } from "@/lib/db/batchPurchases";
import { getUserByEmail } from "@/lib/db/users";
import { canRemoveBranding } from "@/lib/permissions";
import { PLANS } from "@/lib/stripe/config";
import puppeteer from "puppeteer";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
import { materializePdfImageCells } from "@/lib/pdf-image-assets";
import { notifyBatchPdfExported } from "@/lib/discord";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync } from "node:fs";
import {
  formatClassicCellLabel,
  getBingoGridShape,
  getFreeSpaceIndexForGrid,
  isBlankClassicCell,
  normalizeBingoVariant,
} from "@/lib/classic-bingo";

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

function generateBatchHTML(
  cards: any[],
  removeBranding: boolean,
  options: { grayscale: boolean; cardsPerPage: number; showCutLines: boolean }
): string {
  const { grayscale, cardsPerPage, showCutLines } = options;

  const cardHTMLs = cards.map((card) => {
    const { title, size, cells, freeSpace, style } = card;
    const variant = normalizeBingoVariant(card.bingoVariant);
    const shape = getBingoGridShape(card);
    const freeSpaceIndex = getFreeSpaceIndexForGrid({
      freeSpace,
      rows: shape.rows,
      columns: shape.columns,
      bingoVariant: variant,
    });

    const cellFontSize = size === 3 ? "11px" : size === 4 ? "9px" : "8px";

    return `
      <div class="card-container">
        <div class="card-title">${escapeHtml(title)}</div>
        ${variant === "classic75" ? `<div class="classic-header grid-cols-${shape.columns}">${"BINGO".split("").map((letter) => `<div>${letter}</div>`).join("")}</div>` : ""}
        ${variant === "classic90" ? `<div class="classic-header classic-90 grid-cols-${shape.columns}">${["1-9", "10s", "20s", "30s", "40s", "50s", "60s", "70s", "80-90"].map((label) => `<div>${label}</div>`).join("")}</div>` : ""}
        <div class="bingo-grid grid-cols-${shape.columns}" style="aspect-ratio:${shape.columns} / ${shape.rows}">
          ${cells
            .map((cell: string, index: number) => {
              const isFreeSpace = freeSpace && index === freeSpaceIndex;
              const isBlank = isBlankClassicCell(cell, variant);
              const bgColor = grayscale ? "#ffffff" : (style.backgroundColor || "#ffffff");
              const txtColor = grayscale ? "#000000" : (style.textColor || "#000000");
              const borderClr = grayscale ? "#666666" : (style.borderColor || "#000000");
              const cellText = formatClassicCellLabel(cell, variant);

              return `
                <div class="cell" style="
                  background-color: ${isBlank ? "#fff7ed" : isFreeSpace && !grayscale ? '#e0e7ff' : bgColor};
                  color: ${txtColor};
                  border: ${isBlank ? "1px dashed #fed7aa" : `1.5px solid ${borderClr}`};
                  font-size: ${cellFontSize};
                ">
                  ${isBlank ? "" : isFreeSpace ? '<span class="free">FREE</span>' : cell.startsWith("__IMG__:") ? (() => { try { const d = JSON.parse(cell.slice(8)); const u = d.imageUrl?.startsWith("/") ? "https://mybingocard.com" + d.imageUrl : d.imageUrl; const lblStyle = d.fit === 'cover' ? 'position:relative;z-index:1;background:rgba(0,0,0,0.4);color:#fff;border-radius:3px;padding:1px 3px;' : ''; const lbl = d.label ? `<div style="font-size:0.6em;margin-top:1px;text-align:center;${lblStyle}">${escapeHtml(d.label)}</div>` : ""; if (d.fit === "cover") { return `<img src="${u}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit;" />${lbl}`; } return `<img src="${u}" style="max-width:90%;max-height:${d.label ? '65%' : '85%'};object-fit:contain;" />${lbl}`; } catch { return escapeHtml(cellText); } })() : escapeHtml(cellText)}
                </div>
              `;
            })
            .join("")}
        </div>
        ${!removeBranding ? '<div class="card-footer">MyBingoCard.com</div>' : ''}
      </div>
    `;
  });

  // Group cards per page
  const pages: string[] = [];
  for (let i = 0; i < cardHTMLs.length; i += cardsPerPage) {
    const pageCards = cardHTMLs.slice(i, i + cardsPerPage);
    pages.push(`
      <div class="page ${cardsPerPage === 4 ? 'page-grid-2x2' : cardsPerPage === 2 ? 'page-grid-2x1' : 'page-grid-1x1'}">
        ${pageCards.join("\n")}
        ${showCutLines && cardsPerPage > 1 ? '<div class="cut-lines"></div>' : ''}
      </div>
    `);
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }

          @page {
            size: letter;
            margin: 0.5in;
          }

          body {
            font-family: Arial, sans-serif;
            ${grayscale ? 'filter: grayscale(100%);' : ''}
          }

          .page {
            width: 7.5in;
            height: 10in;
            padding: 0.25in;
            page-break-after: always;
            position: relative;
          }

          .page:last-child {
            page-break-after: avoid;
          }

          .page-grid-1x1 {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .page-grid-2x2 {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            grid-template-rows: repeat(2, minmax(0, 1fr));
            gap: 0.18in;
            align-items: center;
          }

          .page-grid-2x1 {
            display: grid;
            grid-template-columns: 1fr;
            grid-template-rows: repeat(2, minmax(0, 1fr));
            gap: 0.22in;
            align-items: center;
          }

          .card-container {
            text-align: center;
            width: 100%;
            height: 100%;
            min-width: 0;
            min-height: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            page-break-inside: avoid;
          }

          .page-grid-1x1 .card-container {
            max-width: 100%;
          }

          .page-grid-2x1 .card-container {
            max-height: 4.55in;
          }

          .page-grid-2x2 .card-container {
            max-height: 4.55in;
          }

          .card-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 8px;
            color: #1e293b;
          }

          .page-grid-2x2 .card-title,
          .page-grid-2x1 .card-title {
            font-size: 12px;
            margin-bottom: 4px;
          }

          .page-grid-2x2 .card-title {
            font-size: 11px;
            margin-bottom: 3px;
          }

          .bingo-grid {
            display: grid;
            gap: 3px;
            width: 100%;
            aspect-ratio: 1;
            max-width: 6in;
            margin: 0 auto;
          }

          .page-grid-2x2 .bingo-grid {
            max-width: 3in;
          }

          .page-grid-2x1 .bingo-grid {
            max-width: 4in;
          }

          .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
          .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
          .grid-cols-5 { grid-template-columns: repeat(5, 1fr); }
          .grid-cols-9 { grid-template-columns: repeat(9, 1fr); }

          .classic-header {
            display: grid;
            gap: 3px;
            width: 100%;
            max-width: 6in;
            margin: 0 auto 3px;
            color: #047857;
            font-weight: 900;
            font-size: 10px;
          }

          .classic-header div {
            border-radius: 4px;
            background: #ecfdf5;
            padding: 2px 0;
          }

          .classic-header.classic-90 {
            color: #b45309;
            font-size: 6px;
          }

          .classic-header.classic-90 div {
            background: #fff7ed;
          }

          .cell {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 4px;
            border-radius: 4px;
            word-wrap: break-word;
            overflow-wrap: break-word;
            overflow: hidden;
            line-height: 1.2;
          }
          .cell img { display: block; }

          .free {
            font-weight: bold;
            font-size: 1.1em;
          }

          .card-footer {
            font-size: 8px;
            color: #94a3b8;
            margin-top: 4px;
          }

          .page-grid-2x2 .card-footer {
            font-size: 7px;
            margin-top: 2px;
          }

          /* Cut lines */
          .cut-lines {
            position: absolute;
            inset: 0;
            pointer-events: none;
          }

          .page-grid-2x2 .cut-lines::before {
            content: '';
            position: absolute;
            left: 0;
            right: 0;
            top: 50%;
            border-top: 1px dashed #cbd5e1;
          }

          .page-grid-2x2 .cut-lines::after {
            content: '';
            position: absolute;
            top: 0;
            bottom: 0;
            left: 50%;
            border-left: 1px dashed #cbd5e1;
          }

          .page-grid-2x1 .cut-lines::before {
            content: '';
            position: absolute;
            left: 0;
            right: 0;
            top: 50%;
            border-top: 1px dashed #cbd5e1;
          }

          /* Crop marks at corners */
          .page-grid-2x2 .cut-lines .crop-tl,
          .page-grid-2x2 .cut-lines .crop-tr,
          .page-grid-2x2 .cut-lines .crop-bl,
          .page-grid-2x2 .cut-lines .crop-br {
            position: absolute;
            width: 12px;
            height: 12px;
          }
        </style>
      </head>
      <body>
        ${pages.join("\n")}
      </body>
    </html>
  `;
}

export async function POST(request: Request) {
  let tempAssetDir: string | null = null;

  try {
    const session = await auth();
    const requestContext = getRequestActivityContext(request);

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const plan = PLANS[user.planType as keyof typeof PLANS];
    const maxBatchSize = Number((plan.limits as any).maxBatchSize || 0);
    const hasPremiumBatchAccess = maxBatchSize >= 10;

    const data = await request.json();
    const {
      cardIds,
      grayscale = false,
      cardsPerPage = 1,
      showCutLines = true,
    } = data;

    if (!cardIds || !Array.isArray(cardIds) || cardIds.length === 0) {
      return NextResponse.json(
        { error: "cardIds array required" },
        { status: 400 }
      );
    }

    if (hasPremiumBatchAccess && cardIds.length > maxBatchSize) {
      return NextResponse.json(
        { error: `Your plan supports up to ${maxBatchSize} cards per batch PDF.` },
        { status: 403 }
      );
    }

    // Fetch all cards and ensure they belong to the signed-in user.
    const cards = [];
    for (const id of cardIds) {
      let card;
      try {
        card = await getCardById(id);
      } catch {
        return NextResponse.json(
          { error: `Invalid card id: ${id}` },
          { status: 400 }
        );
      }

      if (!card) {
        return NextResponse.json(
          { error: `Card not found: ${id}` },
          { status: 404 }
        );
      }

      if (card.userId.toString() !== session.user.id) {
        return NextResponse.json(
          { error: "Access denied for one or more cards" },
          { status: 403 }
        );
      }

      cards.push(card);
    }

    if (!hasPremiumBatchAccess) {
      const purchasedBatch = await findGeneratedBatchPurchaseForCards(session.user.id, cardIds);
      if (!purchasedBatch) {
        await trackActivity({
          event: "batch_pdf_export_blocked",
          source: "server",
          userId: session.user.id || null,
          email: session.user.email,
          pathname: requestContext.pathname,
          domain: requestContext.domain,
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
          metadata: {
            reason: "free_batch_access_required",
            cardCount: cardIds.length,
            cardsPerPage,
            grayscale,
            showCutLines,
            planType: user.planType,
          },
        });
        return NextResponse.json(
          { error: "Sign in to download free batch PDFs for these cards." },
          { status: 403 }
        );
      }

      if (cardIds.length > purchasedBatch.batchCount) {
        await trackActivity({
          event: "batch_pdf_export_blocked",
          source: "server",
          userId: session.user.id || null,
          email: session.user.email,
          pathname: requestContext.pathname,
          domain: requestContext.domain,
          ipAddress: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
          metadata: {
            reason: "card_count_exceeds_purchased_batch",
            cardCount: cardIds.length,
            purchasedBatchCount: purchasedBatch.batchCount,
            cardsPerPage,
            grayscale,
            showCutLines,
            planType: user.planType,
          },
        });
        return NextResponse.json(
          {
            error: `This PDF has ${cardIds.length} cards, but this generated batch includes ${purchasedBatch.batchCount}.`,
          },
          { status: 403 }
        );
      }
    }

    const brandingPermission = canRemoveBranding(user.planType as any);

    tempAssetDir = await mkdtemp(join(tmpdir(), "mybingocard-batch-pdf-"));
    const imageAssetCache = new Map<string, string>();
    const pdfCards = await Promise.all(
      cards.map(async (card) => {
        const materialized = await materializePdfImageCells(card.cells, {
          assetDir: tempAssetDir!,
          cache: imageAssetCache,
        });

        return {
          ...card,
          cells: materialized.cells,
        };
      })
    );

    const html = generateBatchHTML(pdfCards, brandingPermission.allowed, {
      grayscale,
      cardsPerPage: [1, 2, 4].includes(cardsPerPage) ? cardsPerPage : 1,
      showCutLines,
    });

    const browser = await puppeteer.launch({
      executablePath: "/usr/bin/google-chrome",
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600 });
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "letter",
      printBackground: true,
      margin: { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" },
    });

    await browser.close();

    await trackActivity({
      event: "batch_pdf_exported",
      source: "server",
      userId: session.user.id || null,
      email: session.user.email,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        cardCount: cards.length,
        grayscale,
        cardsPerPage,
        showCutLines,
        planType: user.planType,
        hasPremiumBatchAccess,
        firstCardTitle: cards[0]?.title || null,
      },
    });

    notifyBatchPdfExported(
      user.name || "Unknown",
      session.user.email,
      {
        cardCount: cards.length,
        cardsPerPage,
        grayscale,
        showCutLines,
        planType: user.planType,
        firstCardTitle: cards[0]?.title || null,
      }
    ).catch(() => {});

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="bingo-cards-batch-${cards.length}.pdf"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Batch PDF error:", error);
    return NextResponse.json(
      { error: "Failed to generate batch PDF" },
      { status: 500 }
    );
  } finally {
    if (tempAssetDir) {
      rmSync(tempAssetDir, { recursive: true, force: true });
    }
  }
}
