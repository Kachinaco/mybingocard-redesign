import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCardById } from "@/lib/db/cards";
import { getUserByEmail } from "@/lib/db/users";
import { canExportHD, canRemoveBranding } from "@/lib/permissions";
import puppeteer from "puppeteer";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

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

    const hdPermission = canExportHD(user.planType);
    const brandingPermission = canRemoveBranding(user.planType);

    // Generate HTML for the bingo card
    const html = generateCardHTML(card, brandingPermission.allowed, hdPermission.allowed);

    // Launch headless browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

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

    // Generate PNG screenshot
    const pngBuffer = await page.screenshot({
      type: "png",
      fullPage: false,
      omitBackground: false,
    });

    await browser.close();

    // Return PNG as downloadable file
    return new NextResponse(Buffer.from(pngBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${sanitizeFilename(card.title)}.png"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("PNG export error:", error);
    return NextResponse.json(
      { error: "Failed to generate PNG" },
      { status: 500 }
    );
  }
}

function generateCardHTML(card: any, removeBranding: boolean, isHD: boolean): string {
  const { title, description, size, cells, freeSpace, style } = card;
  const freeSpaceIndex = freeSpace ? Math.floor((size * size) / 2) : -1;

  // Scale factors based on HD permission
  const scaleFactor = isHD ? 2 : 1;
  const canvasSize = isHD ? 2400 : 1200;
  const padding = isHD ? 80 : 40;
  const maxWidth = isHD ? 2000 : 1000;
  const headerMargin = isHD ? 60 : 30;
  const titleSize = isHD ? 72 : 36;
  const descriptionSize = isHD ? 36 : 18;
  const gridGap = isHD ? 16 : 8;
  const cellPadding = isHD ? 24 : 12;
  const borderWidth = isHD ? 4 : 2;
  const borderRadius = isHD ? 16 : 8;
  const baseFontSize = parseInt(style.fontSize || "16") * scaleFactor;
  const freeSpaceSize = isHD ? 48 : 24;
  const footerMargin = isHD ? 60 : 30;
  const footerSize = isHD ? 28 : 14;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: ${style.fontFamily || "Arial"}, sans-serif;
            padding: ${padding}px;
            background: white;
            width: ${canvasSize}px;
            height: ${canvasSize}px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .container {
            width: 100%;
            max-width: ${maxWidth}px;
          }

          .header {
            text-align: center;
            margin-bottom: ${headerMargin}px;
          }

          .title {
            font-size: ${titleSize}px;
            font-weight: bold;
            margin-bottom: ${Math.floor(titleSize / 3.6)}px;
            color: #000;
          }

          .description {
            font-size: ${descriptionSize}px;
            color: #666;
          }

          .bingo-grid {
            display: grid;
            grid-template-columns: repeat(${size}, 1fr);
            gap: ${gridGap}px;
            width: 100%;
            aspect-ratio: 1;
          }

          .cell {
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: ${cellPadding}px;
            border: ${borderWidth}px solid ${style.borderColor || "#000000"};
            border-radius: ${borderRadius}px;
            background-color: ${style.backgroundColor || "#ffffff"};
            color: ${style.textColor || "#000000"};
            font-size: ${baseFontSize}px;
            font-family: ${style.fontFamily || "Arial"}, sans-serif;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }

          .free-space {
            font-size: ${freeSpaceSize}px;
            font-weight: bold;
          }

          .footer {
            text-align: center;
            margin-top: ${footerMargin}px;
            font-size: ${footerSize}px;
            color: #999;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="title">${escapeHtml(title)}</div>
            ${description ? `<div class="description">${escapeHtml(description)}</div>` : ""}
          </div>

          <div class="bingo-grid">
            ${cells
              .map((cell: string, index: number) => {
                const isFreeSpace = freeSpace && index === freeSpaceIndex;
                return `
                  <div class="cell ${isFreeSpace ? "free-space" : ""}">
                    ${isFreeSpace ? "FREE" : escapeHtml(cell)}
                  </div>
                `;
              })
              .join("")}
          </div>

          ${!removeBranding ? `<div class="footer">Created with MyBingoCard.com</div>` : ""}
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
