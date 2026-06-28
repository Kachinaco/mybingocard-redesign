import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCardById } from "@/lib/db/cards";
import { getUserByEmail, incrementUserCounter } from "@/lib/db/users";
import { canExportHD, canRemoveBranding } from "@/lib/permissions";
import puppeteer from "puppeteer";
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

    const hdPermission = canExportHD(user.planType);
    const brandingPermission = canRemoveBranding(user.planType);

    // Generate HTML for the bingo card
    const html = generateCardHTML(card, brandingPermission.allowed, hdPermission.allowed);

    // Launch headless browser
    const browser = await puppeteer.launch({
      executablePath: "/usr/bin/google-chrome",
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

    await trackActivity({
      event: "export_png",
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
      "png"
    ).catch(() => {});

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
  const variant = normalizeBingoVariant(card.bingoVariant);
  const shape = getBingoGridShape(card);
  const freeSpaceIndex = getFreeSpaceIndexForGrid({
    freeSpace,
    rows: shape.rows,
    columns: shape.columns,
    bingoVariant: variant,
  });

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
            position: relative;
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
            grid-template-columns: repeat(${shape.columns}, 1fr);
            gap: ${gridGap}px;
            width: 100%;
            aspect-ratio: ${shape.columns} / ${shape.rows};
          }

          .classic-header {
            display: grid;
            grid-template-columns: repeat(${shape.columns}, 1fr);
            gap: ${gridGap}px;
            margin-bottom: ${Math.floor(gridGap / 2)}px;
            color: ${variant === "classic90" ? "#b45309" : "#047857"};
            font-weight: 900;
            text-align: center;
          }

          .classic-header div {
            background: ${variant === "classic90" ? "#fff7ed" : "#ecfdf5"};
            border-radius: ${borderRadius}px;
            padding: ${Math.max(4, Math.floor(cellPadding / 3))}px 0;
            font-size: ${variant === "classic90" ? Math.floor(baseFontSize * 0.62) : baseFontSize}px;
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
            font-size: ${isHD ? 96 : 48}px;
            font-weight: 900;
            color: rgba(100, 100, 120, 0.13);
            transform: rotate(-30deg);
            white-space: nowrap;
            letter-spacing: 0.05em;
            user-select: none;
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
          \${!removeBranding ? '<div class="watermark-overlay"><div class="watermark-text">MyBingoCard.com</div></div>' : ""}
          <div class="header">
            <div class="title">${escapeHtml(title)}</div>
            ${description ? `<div class="description">${escapeHtml(description)}</div>` : ""}
          </div>

          ${variant === "classic75" ? `<div class="classic-header">${"BINGO".split("").map((letter) => `<div>${letter}</div>`).join("")}</div>` : ""}
          ${variant === "classic90" ? `<div class="classic-header">${["1-9", "10s", "20s", "30s", "40s", "50s", "60s", "70s", "80-90"].map((label) => `<div>${label}</div>`).join("")}</div>` : ""}
          <div class="bingo-grid">
            ${cells
              .map((cell: string, index: number) => {
                const isFreeSpace = freeSpace && index === freeSpaceIndex;
                const isBlank = isBlankClassicCell(cell, variant);
                let cellContent = escapeHtml(formatClassicCellLabel(cell, variant));
                let extraStyle = "";
                if (!isFreeSpace && cell.startsWith("__IMG__:")) {
                  try {
                    const imgData = JSON.parse(cell.slice(8));
                    const imgUrl = imgData.imageUrl?.startsWith("/")
                      ? "https://mybingocard.com" + imgData.imageUrl
                      : imgData.imageUrl;
                    const labelStyle = imgData.fit === 'cover' ? 'position:relative;z-index:1;background:rgba(0,0,0,0.4);color:#fff;border-radius:3px;padding:1px 3px;' : '';
                    const label = imgData.label ? '<div style="font-size:0.65em;margin-top:4px;text-align:center;' + labelStyle + '">' + escapeHtml(imgData.label) + '</div>' : "";
                    if (imgData.fit === "cover") {
                      cellContent = '<img src="' + imgUrl + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit;" />' + label;
                      extraStyle = "position:relative;overflow:hidden;";
                    } else {
                      const maxH = label ? "65%" : "85%";
                      cellContent = '<img src="' + imgUrl + '" style="max-width:90%;max-height:' + maxH + ';object-fit:contain;" />' + label;
                      extraStyle = "flex-direction:column;";
                    }
                  } catch { /* fall through to text */ }
                }
                if (isBlank) {
                  extraStyle += "background:#fff7ed;border-style:dashed;border-color:#fed7aa;";
                }
                return '<div class="cell ' + (isFreeSpace ? "free-space" : "") + '" style="' + extraStyle + '">'
                  + (isBlank ? "" : isFreeSpace ? "FREE" : cellContent)
                  + '</div>';
              })
              .join("")}
          </div>

          ${!removeBranding ? `<div class="footer">Created with https://mybingocard.com</div>` : ""}
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
