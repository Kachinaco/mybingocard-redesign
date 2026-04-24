import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserByEmail, addFeatureUsed } from "@/lib/db/users";
import { PLANS } from "@/lib/stripe/config";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
import { getTrialDaysLeft, isUserOnTrial } from "@/lib/subscription-status";
import clientPromise from "@/lib/mongodb";
import { notifyFirstAiGeneration } from "@/lib/discord";

const PROXY_URL = "http://127.0.0.1:3456/v1/chat/completions";

// Rate limiter: 50 generations per hour per IP
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 50;
const RATE_WINDOW_MS = 3_600_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of rateBuckets) {
    if (now >= bucket.resetAt) rateBuckets.delete(ip);
  }
}, 5 * 60_000);

function getIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

const TONE_MAP: Record<string, string> = {
  funny: "Humorous and playful. Include witty observations, exaggerations, and things that would make people laugh.",
  serious: "Straightforward and realistic. Items should be genuine, commonly expected occurrences.",
  mix: "A mix of funny and serious. Some items humorous, some genuine and relatable.",
};

function buildPrompt(theme: string, tone: string, cellCount: number, title?: string): string {
  const toneDesc = TONE_MAP[tone] || `Tone: ${tone}`;
  return `Generate exactly ${cellCount} unique bingo card items for the theme: "${theme}"
${title ? `The card is titled "${title}".` : ""}

Tone: ${toneDesc}

Rules:
- Each item should be 2-6 words
- All items must be unique and specific to the theme
- Be creative, not generic
- Items should be things that might happen, be observed, or relate to the theme
- Return ONLY a JSON array of strings, no other text

Example format: ["Item one", "Item two", "Item three"]`;
}

export async function POST(req: NextRequest) {
  try {
    // Auth: premium only
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.planType !== "PREMIUM") {
      return NextResponse.json({ error: "Premium required" }, { status: 403 });
    }

    // Rate limit
    const ip = getIp(req);
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
    }

    // Parse input
    const { theme, tone, size, title, freeSpace } = await req.json();
    if (!theme || typeof theme !== "string" || theme.trim().length === 0) {
      return NextResponse.json({ error: "Theme is required" }, { status: 400 });
    }
    if (![3, 4, 5].includes(size)) {
      return NextResponse.json({ error: "Size must be 3, 4, or 5" }, { status: 400 });
    }

    const totalCells = size * size;
    const cellCount = freeSpace ? totalCells - 1 : totalCells;

    // Call Claude via proxy
    const proxyRes = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        messages: [{ role: "user", content: buildPrompt(theme.trim().substring(0, 500), tone || "mix", cellCount, title) }],
        max_tokens: 1024,
      }),
    });

    if (!proxyRes.ok) {
      console.error("Proxy error:", proxyRes.status, await proxyRes.text().catch(() => ""));
      return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 500 });
    }

    const proxyData = await proxyRes.json();
    const responseText = proxyData.choices?.[0]?.message?.content || "";

    // Parse JSON array from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to generate cells. Try again." }, { status: 500 });
    }

    let items: string[];
    try {
      items = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({ error: "Failed to parse generated cells. Try again." }, { status: 500 });
    }

    // Ensure correct count and truncate
    items = items.map(item => String(item).trim().substring(0, 50));
    while (items.length < cellCount) items.push("");
    items = items.slice(0, cellCount);

    // Insert free space at center
    let cells: string[];
    if (freeSpace) {
      const centerIdx = Math.floor(totalCells / 2);
      cells = [...items.slice(0, centerIdx), "", ...items.slice(centerIdx)];
    } else {
      cells = items;
    }

    // Track activity + first-generation detection + feature usage
    try {
      const ctx = getRequestActivityContext(req as any);

      // Compute trial metadata
      const isTrialUser = isUserOnTrial(user);
      let trialDay: number | null = null;
      const trialDaysLeft = getTrialDaysLeft(user.trialEndsAt);
      if (isTrialUser && trialDaysLeft !== null) {
        trialDay = Math.max(1, 8 - trialDaysLeft);
      }

      await trackActivity({
        event: "ai_cells_generated",
        userId: session.user.id,
        email: session.user.email,
        metadata: {
          theme: theme.substring(0, 100),
          tone,
          size,
          cellCount,
          isTrialUser,
          ...(trialDay !== null ? { trialDay } : {}),
        },
        ...ctx,
      });

      // Check if this is the user's first AI generation
      const client = await clientPromise;
      const db = client.db("mybingocard");
      const priorCount = await db.collection("activity_events").countDocuments({
        event: "ai_cells_generated",
        userId: session.user.id,
      });
      // priorCount === 1 means the event we just inserted is the only one
      if (priorCount === 1) {
        await trackActivity({
          event: "first_ai_generation",
          userId: session.user.id,
          email: session.user.email,
          metadata: { theme: theme.substring(0, 100), tone, size },
          ...ctx,
        });
        notifyFirstAiGeneration(
          user.name || session.user.name || "Unknown",
          session.user.email,
          theme.substring(0, 100)
        ).catch(() => {});
      }
    } catch {}

    addFeatureUsed(session.user.id, "ai_generate").catch(() => {});

    return NextResponse.json({ cells });
  } catch (err: any) {
    console.error("Generate cells error:", err?.message || err);
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 500 });
  }
}
