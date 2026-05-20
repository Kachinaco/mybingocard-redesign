import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCardById } from "@/lib/db/cards";
import { getUserByEmail } from "@/lib/db/users";
import puppeteer from "puppeteer";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
import { seededShuffle } from "@/lib/shuffle";
import {
  createSeededRng,
  formatClassicCellLabel,
  generateClassicBingoCard,
  getBingoGridShape,
  getFreeSpaceIndexForGrid,
  isBlankClassicCell,
  normalizeBingoVariant,
} from "@/lib/classic-bingo";

function generateShuffledCells(cells: string[], size: number, freeSpace: boolean, cardIndex: number): string[] {
  const seed = cardIndex * 31337 + 42;
  if (!freeSpace) {
    return seededShuffle(cells, seed);
  }

  const freeSpaceIndex = Math.floor((size * size) / 2);
  const nonFreeCells = cells.filter((_, i) => i !== freeSpaceIndex);
  const shuffled = seededShuffle(nonFreeCells, seed);
  const result = [...shuffled];
  result.splice(freeSpaceIndex, 0, cells[freeSpaceIndex] || "FREE");
  return result;
}

function generateBulkCardCells(card: any, cardIndex: number): string[] {
  const variant = normalizeBingoVariant(card.bingoVariant);
  if (variant !== "custom") {
    return generateClassicBingoCard(variant, createSeededRng(cardIndex * 31337 + 42));
  }
  return generateShuffledCells(card.cells, card.size, !!card.freeSpace, cardIndex);
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m] || m);
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9]/gi, "_").toLowerCase().substring(0, 50);
}

function generateCardPageHTML(card: any, cardCells: string[], cardNum: number, totalCards: number): string {
  const { title, style } = card;
  const variant = normalizeBingoVariant(card.bingoVariant);
  const shape = getBingoGridShape(card);
  const freeSpaceIndex = getFreeSpaceIndexForGrid({
    freeSpace: card.freeSpace,
    rows: shape.rows,
    columns: shape.columns,
    bingoVariant: variant,
  });
  const gridAspect = shape.columns === shape.rows ? "1" : `${shape.columns} / ${shape.rows}`;

  return `
    <div class="page">
      <div class="container">
        <div class="header">
          <div class="card-num">Card ${cardNum} of ${totalCards}</div>
          <div class="title">${escapeHtml(title)}</div>
        </div>
        ${variant === "classic75" ? `<div class="classic-header" style="grid-template-columns: repeat(${shape.columns}, 1fr);">${"BINGO".split("").map((letter) => `<div>${letter}</div>`).join("")}</div>` : ""}
        ${variant === "classic90" ? `<div class="classic-header classic-90" style="grid-template-columns: repeat(${shape.columns}, 1fr);">${["1-9", "10s", "20s", "30s", "40s", "50s", "60s", "70s", "80-90"].map((label) => `<div>${label}</div>`).join("")}</div>` : ""}
        <div class="bingo-grid" style="grid-template-columns: repeat(${shape.columns}, 1fr); aspect-ratio: ${gridAspect};">
          ${cardCells.map((cell: string, index: number) => {
            const isFreeSpace = card.freeSpace && index === freeSpaceIndex;
            const isBlank = isBlankClassicCell(cell, variant);
            const cellLabel = formatClassicCellLabel(cell, variant);
            return `<div class="cell ${isFreeSpace ? "free-space" : ""}" style="
              background-color: ${isBlank ? "#fff7ed" : isFreeSpace ? "#6366f1" : (style.backgroundColor || "#ffffff")};
              color: ${isFreeSpace ? "#ffffff" : (style.textColor || "#000000")};
              border: ${isBlank ? "1px dashed #fed7aa" : `2px solid ${style.borderColor || "#e2e8f0"}`};
              font-size: ${style.fontSize || "14px"};
              font-family: ${style.fontFamily || "Arial"}, sans-serif;
            ">${isBlank ? "" : isFreeSpace ? "FREE" : cell.startsWith("__IMG__:") ? (() => { try { const d = JSON.parse(cell.slice(8)); const u = d.imageUrl?.startsWith("/") ? "https://mybingocard.com" + d.imageUrl : d.imageUrl; const lblStyle = d.fit === 'cover' ? 'position:relative;z-index:1;background:rgba(0,0,0,0.4);color:#fff;border-radius:3px;padding:1px 3px;' : ''; const lbl = d.label ? `<div style="font-size:0.65em;margin-top:2px;${lblStyle}">${escapeHtml(d.label)}</div>` : ""; if (d.fit === "cover") { return `<img src="${u}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit;" />${lbl}`; } return `<img src="${u}" style="max-width:90%;max-height:${d.label ? '65%' : '85%'};object-fit:contain;" />${lbl}`; } catch { return escapeHtml(cellLabel); } })() : escapeHtml(cellLabel)}</div>`;
          }).join("")}
        </div>
        <div class="footer">MyBingoCard.com</div>
      </div>
    </div>
  `;
}

function generateBulkHTML(card: any, allCardCells: string[][], totalCards: number): string {
  const { style } = card;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: ${style.fontFamily || "Arial"}, sans-serif; }
          .page {
            width: 8.5in;
            height: 11in;
            padding: 0.5in;
            display: flex;
            align-items: center;
            justify-content: center;
            page-break-after: always;
          }
          .page:last-child { page-break-after: auto; }
          .container { width: 100%; max-width: 700px; }
          .header { text-align: center; margin-bottom: 24px; }
          .card-num { font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
          .title { font-size: 28px; font-weight: bold; color: #0f172a; }
          .bingo-grid {
            display: grid;
            gap: 6px;
            width: 100%;
            aspect-ratio: 1;
          }
          .classic-header {
            display: grid;
            gap: 6px;
            width: 100%;
            margin: 0 auto 6px;
            color: #047857;
            font-weight: 900;
            font-size: 16px;
          }
          .classic-header div {
            border-radius: 6px;
            background: #ecfdf5;
            padding: 4px 0;
          }
          .classic-header.classic-90 {
            color: #b45309;
            font-size: 10px;
          }
          .classic-header.classic-90 div {
            background: #fff7ed;
          }
          .cell {
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 8px;
            border-radius: 8px;
            word-wrap: break-word;
            overflow-wrap: break-word;
            font-weight: 600;
            font-size: 13px;
            position: relative;
          }
          .free-space { font-weight: bold; font-size: 16px; }
          .footer { text-align: center; margin-top: 16px; font-size: 11px; color: #cbd5e1; }
        </style>
      </head>
      <body>
        ${allCardCells.map((cells, i) => generateCardPageHTML(card, cells, i + 1, totalCards)).join("")}
      </body>
    </html>
  `;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const requestContext = getRequestActivityContext(request);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized - Please sign in" }, { status: 401 });
    }

    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check plan — bulk PDF is Pro/Business only
    if (user.planType === "FREE") {
      return NextResponse.json(
        { error: "Bulk PDF export requires Premium plan.", upgradeRequired: true },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const count = Math.min(Math.max(parseInt(body.count) || 10, 1), 50);

    const card = await getCardById(id);
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    if (card.userId.toString() !== session.user.id && !card.isPublic) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Generate `count` unique shuffled card layouts
    const allCardCells: string[][] = [];
    for (let i = 0; i < count; i++) {
      allCardCells.push(generateBulkCardCells(card, i));
    }

    // Generate multi-page PDF
    const html = generateBulkHTML(card, allCardCells, count);

    const browser = await puppeteer.launch({
      executablePath: "/usr/bin/google-chrome",
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      width: "8.5in",
      height: "11in",
      printBackground: true,
    });

    await browser.close();

    const filename = `${sanitizeFilename(card.title)}-${count}-cards.pdf`;

    await trackActivity({
      event: "export_bulk_pdf",
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
        count,
      },
    });

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Bulk PDF export error:", error);
    return NextResponse.json({ error: "Failed to generate bulk PDF" }, { status: 500 });
  }
}
