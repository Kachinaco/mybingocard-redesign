import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCardById } from "@/lib/db/cards";
import { getUserByEmail } from "@/lib/db/users";
import puppeteer from "puppeteer";

function shuffleArray<T>(arr: T[], seed: number): T[] {
  const array = [...arr];
  // Seeded Fisher-Yates shuffle
  let s = seed;
  for (let i = array.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [array[i], array[j]] = [array[j]!, array[i]!];
  }
  return array;
}

function generateShuffledCells(cells: string[], size: number, cardIndex: number): string[] {
  const freeSpaceIndex = Math.floor((size * size) / 2);
  const nonFreeCells = cells.filter((_, i) => i !== freeSpaceIndex);
  const shuffled = shuffleArray(nonFreeCells, cardIndex * 31337 + 42);
  const result = [...shuffled];
  result.splice(freeSpaceIndex, 0, "FREE");
  return result;
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
  const { title, size, style } = card;
  const freeSpaceIndex = Math.floor((size * size) / 2);

  return `
    <div class="page">
      <div class="container">
        <div class="header">
          <div class="card-num">Card ${cardNum} of ${totalCards}</div>
          <div class="title">${escapeHtml(title)}</div>
        </div>
        <div class="bingo-grid" style="grid-template-columns: repeat(${size}, 1fr);">
          ${cardCells.map((cell: string, index: number) => {
            const isFreeSpace = index === freeSpaceIndex;
            return `<div class="cell ${isFreeSpace ? "free-space" : ""}" style="
              background-color: ${isFreeSpace ? "#6366f1" : (style.backgroundColor || "#ffffff")};
              color: ${isFreeSpace ? "#ffffff" : (style.textColor || "#000000")};
              border-color: ${style.borderColor || "#e2e8f0"};
              font-size: ${style.fontSize || "14px"};
              font-family: ${style.fontFamily || "Arial"}, sans-serif;
            ">${isFreeSpace ? "FREE" : escapeHtml(cell)}</div>`;
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
          .cell {
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 8px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            word-wrap: break-word;
            overflow-wrap: break-word;
            font-weight: 600;
            font-size: 13px;
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
        { error: "Bulk PDF export requires Pro or Business plan.", upgradeRequired: true },
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
      allCardCells.push(generateShuffledCells(card.cells, card.size, i));
    }

    // Generate multi-page PDF
    const html = generateBulkHTML(card, allCardCells, count);

    const browser = await puppeteer.launch({
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
