/**
 * Parse a User-Agent string into a human-readable device summary.
 * e.g. "Chrome 146 / Windows", "Safari 18 / macOS", "Mobile Safari / iOS"
 * No external dependencies — just regex matching.
 */
export function parseUserAgent(ua: string): string {
  if (!ua) return "Unknown";

  // Detect OS
  let os = "Unknown OS";
  if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Windows NT/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/CrOS/.test(ua)) os = "ChromeOS";
  else if (/Linux/.test(ua)) os = "Linux";

  // Detect browser (order matters — check specific before generic)
  let browser = "Unknown Browser";
  const edgeMatch = ua.match(/Edg(?:e|A|iOS)?\/(\d+)/);
  const operaMatch = ua.match(/OPR\/(\d+)/);
  const chromeMatch = ua.match(/Chrome\/(\d+)/);
  const firefoxMatch = ua.match(/Firefox\/(\d+)/);
  const safariMatch = ua.match(/Version\/(\d+).*Safari/);
  const samsungMatch = ua.match(/SamsungBrowser\/(\d+)/);

  if (samsungMatch) browser = `Samsung Browser ${samsungMatch[1]}`;
  else if (edgeMatch) browser = `Edge ${edgeMatch[1]}`;
  else if (operaMatch) browser = `Opera ${operaMatch[1]}`;
  else if (firefoxMatch) browser = `Firefox ${firefoxMatch[1]}`;
  else if (safariMatch) browser = `Safari ${safariMatch[1]}`;
  else if (chromeMatch) browser = `Chrome ${chromeMatch[1]}`;
  else if (/Safari/.test(ua) && /Mobile/.test(ua)) browser = "Mobile Safari";

  // Bot detection
  if (/bot|crawl|spider|headless/i.test(ua)) {
    return "Bot";
  }

  return `${browser} / ${os}`;
}
