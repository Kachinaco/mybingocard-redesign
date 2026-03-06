/**
 * Strip HTML tags and limit string length to prevent XSS and abuse.
 */
export function sanitizeText(input: string, maxLength = 200): string {
  return input
    .replace(/<[^>]*>/g, "")   // strip HTML tags
    .replace(/[<>"'&]/g, (ch) => {
      const map: Record<string, string> = { "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#x27;", "&": "&amp;" };
      return map[ch] || ch;
    })
    .trim()
    .slice(0, maxLength);
}

export function sanitizeCells(cells: string[]): string[] {
  return cells.map((cell) => sanitizeText(cell, 200));
}
