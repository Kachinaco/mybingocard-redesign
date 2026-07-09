/**
 * Strip HTML tags and dangerous characters to prevent XSS and abuse.
 * NOTE: Do NOT HTML-encode apostrophes/quotes here — data is stored as plain
 * text in the application database and rendered via React (which handles escaping automatically).
 * Encoding here causes double-encoding like Oscar&#x27;s Night.
 */
export function sanitizeText(input: string, maxLength = 200): string {
  return input
    .replace(/<[^>]*>/g, "")      // strip HTML tags
    .replace(/[<>&]/g, (ch) => {  // only encode actual HTML-dangerous chars
      const map: Record<string, string> = { "<": "", ">": "", "&": "" };
      return map[ch] ?? ch;
    })
    .trim()
    .slice(0, maxLength);
}

export function sanitizeCells(cells: string[]): string[] {
  return cells.map((cell) => {
    // Preserve image cell encoding — only sanitize the label inside
    if (cell.startsWith("__IMG__:")) {
      try {
        const data = JSON.parse(cell.slice(8));
        // Sanitize the label but keep imageId/imageUrl intact
        if (data.label) {
          data.label = sanitizeText(data.label, 100);
        }
        // Validate imageId looks like an ObjectId or system ID
        if (!/^[a-zA-Z0-9_-]+$/.test(data.imageId)) {
          return ""; // reject malformed image cell
        }
        return "__IMG__:" + JSON.stringify(data);
      } catch {
        return ""; // reject unparseable image cells
      }
    }
    return sanitizeText(cell, 200);
  });
}
