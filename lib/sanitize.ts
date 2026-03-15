/**
 * Strip HTML tags and dangerous characters to prevent XSS and abuse.
 * NOTE: Do NOT HTML-encode apostrophes/quotes here — data is stored as plain
 * text in MongoDB and rendered via React (which handles escaping automatically).
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
  return cells.map((cell) => sanitizeText(cell, 200));
}
