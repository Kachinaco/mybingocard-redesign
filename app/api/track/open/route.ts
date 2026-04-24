import { NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";

// 1x1 transparent PNG
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQI12P4z8BQDwAEgAF/QualzQAAAABJRU5ErkJggg==",
  "base64"
);

// IPv4 ranges for known mail/security scanners that prefetch image pixels
// on inbound delivery before a human ever sees the email. We log these
// hits to drip_opens but flag them as bot=true so they don't inflate the
// "real human opens" metric. Format: [start, end] as 32-bit ints.
function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = (n << 8) + v;
  }
  return n >>> 0;
}

function cidrRange(cidr: string): [number, number] {
  const [base, bitsStr] = cidr.split("/");
  const baseInt = ipv4ToInt(base || "0.0.0.0") || 0;
  const bits = Number(bitsStr);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  const start = (baseInt & mask) >>> 0;
  const end = (start | (~mask >>> 0)) >>> 0;
  return [start, end];
}

const BOT_CIDRS: Array<[number, number]> = [
  // Microsoft Azure / Defender Safe Links / Outlook scanning
  cidrRange("13.64.0.0/11"),
  cidrRange("20.0.0.0/8"),
  cidrRange("40.64.0.0/10"),
  cidrRange("48.0.0.0/8"),
  cidrRange("52.0.0.0/8"),
  cidrRange("104.40.0.0/13"),
  cidrRange("131.107.0.0/16"),
  cidrRange("191.232.0.0/13"),
  // Google (Gmail image proxy uses ggpht/googleusercontent — no fixed range,
  // user-agent check below covers it). Google Cloud included for safety.
  cidrRange("34.64.0.0/10"),
  cidrRange("35.184.0.0/13"),
  cidrRange("66.249.64.0/19"),
  // Mimecast
  cidrRange("91.220.42.0/24"),
  cidrRange("194.106.220.0/24"),
  cidrRange("213.167.74.0/24"),
  // Proofpoint
  cidrRange("67.231.144.0/20"),
  cidrRange("148.163.128.0/19"),
  // Barracuda
  cidrRange("64.235.144.0/20"),
];

function isBotIp(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return false;
  for (const [start, end] of BOT_CIDRS) {
    if (n >= start && n <= end) return true;
  }
  return false;
}

const BOT_UA_PATTERNS = [
  /GoogleImageProxy/i,
  /Googlebot/i,
  /Mimecast/i,
  /Proofpoint/i,
  /Barracuda/i,
  /BitDefender/i,
  /SpamAssassin/i,
  /VirusTotal/i,
  /URLDefense/i,
  /Outlook-iOS/i,
  /Microsoft Office Outlook/i,
  /CFNetwork.*Darwin/i, // Apple Mail Privacy Protection often shows as CFNetwork
];

function isBotUserAgent(ua: string): boolean {
  if (!ua) return true; // empty UA is itself a strong bot signal
  return BOT_UA_PATTERNS.some((re) => re.test(ua));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("e");
  const campaign = searchParams.get("c");

  if (email && campaign) {
    try {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "";
      const ua = req.headers.get("user-agent") || "";
      const decodedEmail = decodeURIComponent(email);

      // Determine whether to count this as a bot prefetch vs a real open.
      // We always log the hit, but tag it so dashboards can filter.
      const ipBot = isBotIp(ip);
      const uaBot = isBotUserAgent(ua);
      const isBot = ipBot || uaBot;

      // Sub-10s opens almost always indicate inbox prefetching, since the
      // email cannot have been delivered + a human noticed + opened that
      // fast. We check by comparing against the latest drip_log entry for
      // this (email, campaign) pair.
      const client = await clientPromise;
      const db = client.db("mybingocard");
      let humanLikely = !isBot;
      if (humanLikely) {
        const sentRow = await db.collection("drip_log").findOne(
          { email: decodedEmail, campaignId: campaign },
          { sort: { sentAt: -1 } }
        );
        if (sentRow?.sentAt) {
          const elapsedMs = Date.now() - new Date(sentRow.sentAt).getTime();
          if (elapsedMs < 10_000) {
            humanLikely = false;
          }
        }
      }

      const update: Record<string, unknown> = {
        $set: { lastOpenedAt: new Date() },
        $inc: { openCount: 1, ...(humanLikely ? { humanOpenCount: 1 } : { botOpenCount: 1 }) },
        $setOnInsert: {
          email: decodedEmail,
          campaignId: campaign,
          firstOpenedAt: new Date(),
        },
      };
      if (humanLikely) {
        (update.$set as Record<string, unknown>).lastHumanOpenAt = new Date();
      }

      await db.collection("drip_opens").updateOne(
        { email: decodedEmail, campaignId: campaign },
        update,
        { upsert: true }
      );
    } catch {
      // Don't block pixel response on DB errors
    }
  }

  return new Response(PIXEL, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}
