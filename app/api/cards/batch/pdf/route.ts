import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCardById } from "@/lib/db/cards";
import { getUserByEmail } from "@/lib/db/users";
import { canRemoveBranding } from "@/lib/permissions";
import { PLANS } from "@/lib/stripe/config";
import puppeteer from "puppeteer";

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

  const cardHTMLs = cards.map((card, cardIndex) => {
    const { title, size, cells, freeSpace, style } = card;
    const freeSpaceIndex = freeSpace ? Math.floor((size * size) / 2) : -1;

    const cellFontSize = size === 3 ? "11px" : size === 4 ? "9px" : "8px";

    return `
      <div class="card-container" ${cardsPerPage > 1 ? `style="width: ${cardsPerPage === 4 ? '48%' : '100%'}; page-break-inside: avoid;"` : ''}>
        <div class="card-title">${escapeHtml(title)}</div>
        <div class="bingo-grid grid-${size}">
          ${cells
            .map((cell: string, index: number) => {
              const isFreeSpace = freeSpace && index === freeSpaceIndex;
              const bgColor = grayscale ? "#ffffff" : (style.backgroundColor || "#ffffff");
              const txtColor = grayscale ? "#000000" : (style.textColor || "#000000");
              const borderClr = grayscale ? "#666666" : (style.borderColor || "#000000");

              return `
                <div class="cell" style="
                  background-color: ${isFreeSpace && !grayscale ? '#e0e7ff' : bgColor};
                  color: ${txtColor};
                  border: 1.5px solid ${borderClr};
                  font-size: ${cellFontSize};
                ">
                  ${isFreeSpace ? '<span class="free">FREE</span>' : escapeHtml(cell)}
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
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.3in;
          }

          .page:last-child {
            page-break-after: avoid;
          }

          .page-grid-2x2 {
            display: flex;
            flex-wrap: wrap;
            flex-direction: row;
            justify-content: space-between;
            align-content: space-between;
          }

          .page-grid-2x1 {
            display: flex;
            flex-direction: column;
            justify-content: space-around;
          }

          .card-container {
            text-align: center;
          }

          .page-grid-1x1 .card-container {
            width: 100%;
          }

          .page-grid-2x1 .card-container {
            width: 100%;
            max-height: 4.5in;
          }

          .page-grid-2x2 .card-container {
            width: 48%;
            max-height: 4.5in;
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

          .bingo-grid {
            display: grid;
            gap: 3px;
            width: 100%;
            aspect-ratio: 1;
            max-width: 6in;
            margin: 0 auto;
          }

          .page-grid-2x2 .bingo-grid {
            max-width: 3.2in;
          }

          .page-grid-2x1 .bingo-grid {
            max-width: 4.2in;
          }

          .grid-3 { grid-template-columns: repeat(3, 1fr); }
          .grid-4 { grid-template-columns: repeat(4, 1fr); }
          .grid-5 { grid-template-columns: repeat(5, 1fr); }

          .cell {
            display: flex;
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

          .free {
            font-weight: bold;
            font-size: 1.1em;
          }

          .card-footer {
            font-size: 8px;
            color: #94a3b8;
            margin-top: 4px;
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
  try {
    const session = await auth();

    if (!session?.user?.email) {
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
    if (!(plan.limits as any).canBulkGenerate) {
      return NextResponse.json(
        { error: "Batch PDF download requires a Premium plan." },
        { status: 403 }
      );
    }

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

    if (cardIds.length > 100) {
      return NextResponse.json(
        { error: "Maximum 100 cards per batch PDF" },
        { status: 400 }
      );
    }

    // Fetch all cards
    const cards = [];
    for (const id of cardIds) {
      const card = await getCardById(id);
      if (card) cards.push(card);
    }

    if (cards.length === 0) {
      return NextResponse.json(
        { error: "No valid cards found" },
        { status: 404 }
      );
    }

    const brandingPermission = canRemoveBranding(user.planType as any);

    const html = generateBatchHTML(cards, brandingPermission.allowed, {
      grayscale,
      cardsPerPage: [1, 2, 4].includes(cardsPerPage) ? cardsPerPage : 1,
      showCutLines,
    });

    const browser = await puppeteer.launch({
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
  }
}
