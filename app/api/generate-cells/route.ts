import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { auth } from "@/auth";
import { getUserByEmail, addFeatureUsed, type User } from "@/lib/db/users";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
import { getTrialDaysLeft, hasPremiumAccess, isUserOnTrial } from "@/lib/subscription-status";
import clientPromise from "@/lib/mongodb";
import { notifyFirstAiGeneration } from "@/lib/discord";
import { generateBingoCells } from "@/lib/ai-generation";
import { readJsonObject } from "@/lib/request-json";

const configuredFreeDailyLimit = Number.parseInt(process.env.AI_FREE_DAILY_LIMIT || "5", 10);
const FREE_DAILY_LIMIT = Number.isFinite(configuredFreeDailyLimit) && configuredFreeDailyLimit > 0 ? configuredFreeDailyLimit : 5;

function getIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

function getErrorSummary(err: unknown): string {
  if (err instanceof Error) return err.message.replace(/\s+/g, " ").trim().substring(0, 500);
  return String(err || "Unknown error").replace(/\s+/g, " ").trim().substring(0, 500);
}

function cleanPromptDetails(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  const entries = Object.entries(value as Record<string, unknown>)
    .map(([key, detail]) => {
      if (typeof detail !== "string") return null;
      const cleaned = detail.replace(/\s+/g, " ").trim().substring(0, 500);
      return cleaned ? [key, cleaned] as const : null;
    })
    .filter((entry): entry is readonly [string, string] => Boolean(entry));

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function isUnlimitedAiUser(user?: { planType?: string; customerType?: string; email?: string | null; subscriptionStatus?: string | null; trialEndsAt?: Date | string | null } | null) {
  if (!user) return false;
  if (hasPremiumAccess(user as any)) return true;
  if (user.customerType === "admin") return true;
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  return Boolean(adminEmail && user.email?.toLowerCase() === adminEmail);
}

function getAnonymousQuotaKey(req: NextRequest, ip: string): string {
  const userAgent = req.headers.get("user-agent") || "";
  const acceptLanguage = req.headers.get("accept-language") || "";
  return createHash("sha256")
    .update(`${ip}|${userAgent}|${acceptLanguage}`)
    .digest("hex")
    .slice(0, 32);
}

async function getRecentAiGenerationCount({
  userId,
  anonymousQuotaKey,
}: {
  userId?: string | null;
  anonymousQuotaKey?: string | null;
}): Promise<number> {
  const client = await clientPromise;
  const db = client.db("mybingocard");
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  if (userId) {
    return db.collection("activity_events").countDocuments({
      event: "ai_cells_generated",
      userId,
      createdAt: { $gte: since },
    });
  }

  if (anonymousQuotaKey) {
    return db.collection("activity_events").countDocuments({
      event: "ai_cells_generated",
      userId: null,
      "metadata.aiQuotaKey": anonymousQuotaKey,
      createdAt: { $gte: since },
    });
  }

  return 0;
}

async function getPriorUserAiGenerationCount(userId: string): Promise<number> {
  const client = await clientPromise;
  const db = client.db("mybingocard");
  return db.collection("activity_events").countDocuments({
    event: "ai_cells_generated",
    userId,
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const sessionUserId = session?.user?.id || null;
    const sessionUserEmail = session?.user?.email || null;
    const sessionUserName = session?.user?.name || null;

    let user: User | null = null;
    if (sessionUserEmail) {
      user = await getUserByEmail(sessionUserEmail);
    }

    const ip = getIp(req);
    const anonymousQuotaKey = sessionUserId ? null : getAnonymousQuotaKey(req, ip);

    const body = await readJsonObject(req);
    if (!body.ok) {
      return NextResponse.json({ error: body.error }, { status: 400 });
    }

    const { theme, tone, size, title, freeSpace, useCase, promptDetails } = body.data;
    const cleanedTheme = typeof theme === "string" ? theme.trim().substring(0, 500) : "";
    const cleanedPromptDetails = cleanPromptDetails(promptDetails);
    const promptDetailKeys = cleanedPromptDetails ? Object.keys(cleanedPromptDetails) : [];
    const cleanedUseCase = typeof useCase === "string" ? useCase.trim().substring(0, 40) : undefined;

    if (!cleanedTheme && promptDetailKeys.length === 0) {
      return NextResponse.json({ error: "Theme or prompt details are required" }, { status: 400 });
    }
    if (![3, 4, 5].includes(size)) {
      return NextResponse.json({ error: "Size must be 3, 4, or 5" }, { status: 400 });
    }

    const unlimitedAi = isUnlimitedAiUser(user ? { ...user, email: sessionUserEmail } : null);
    let freeGenerationsUsed = 0;
    if (!unlimitedAi) {
      freeGenerationsUsed = await getRecentAiGenerationCount({ userId: sessionUserId, anonymousQuotaKey });
      if (freeGenerationsUsed >= FREE_DAILY_LIMIT) {
        const ctx = getRequestActivityContext(req as any);
        await trackActivity({
          event: "ai_generate_quota_exceeded",
          userId: sessionUserId,
          email: sessionUserEmail,
          metadata: {
            limit: FREE_DAILY_LIMIT,
            used: freeGenerationsUsed,
            theme: cleanedTheme.substring(0, 100),
            useCase: cleanedUseCase || "custom",
            aiAccess: sessionUserId ? "free_limited" : "anonymous_limited",
            ...(anonymousQuotaKey ? { aiQuotaKey: anonymousQuotaKey } : {}),
          },
          ...ctx,
        }).catch(() => {});

        return NextResponse.json(
          {
            error: `Free AI limit reached. You get ${FREE_DAILY_LIMIT} AI generations every 24 hours.`,
            quota: { limit: FREE_DAILY_LIMIT, used: freeGenerationsUsed, remaining: 0 },
          },
          { status: 429 }
        );
      }
    }

    const generationInput = {
      theme: cleanedTheme || cleanedUseCase || "custom bingo card",
      tone: tone || "mix",
      size,
      title,
      freeSpace: Boolean(freeSpace),
      useCase: cleanedUseCase,
      promptDetails: cleanedPromptDetails,
    };

    const cells = await generateBingoCells(generationInput).catch(async (generationErr) => {
      const ctx = getRequestActivityContext(req as any);
      await trackActivity({
        event: "ai_generate_failed",
        userId: sessionUserId,
        email: sessionUserEmail,
        metadata: {
          source: "server",
          theme: cleanedTheme.substring(0, 100),
          tone,
          size,
          useCase: cleanedUseCase || "custom",
          promptDetailKeys,
          aiAccess: sessionUserId ? "free_limited" : "anonymous_limited",
          ...(anonymousQuotaKey ? { aiQuotaKey: anonymousQuotaKey } : {}),
          error: getErrorSummary(generationErr),
        },
        ...ctx,
      }).catch(() => {});
      throw generationErr;
    });

    try {
      const ctx = getRequestActivityContext(req as any);
      const totalCells = size * size;
      const cellCount = freeSpace ? totalCells - 1 : totalCells;
      const isTrialUser = isUserOnTrial(user);
      let trialDay: number | null = null;
      const trialDaysLeft = getTrialDaysLeft(user?.trialEndsAt);
      if (isTrialUser && trialDaysLeft !== null) {
        trialDay = Math.max(1, 8 - trialDaysLeft);
      }

      await trackActivity({
        event: "ai_cells_generated",
        userId: sessionUserId,
        email: sessionUserEmail,
        metadata: {
          theme: cleanedTheme.substring(0, 100),
          tone,
          size,
          cellCount,
          useCase: cleanedUseCase || "custom",
          promptDetailKeys,
          provider: cells.provider,
          model: cells.model,
          aiAccess: unlimitedAi ? "unlimited" : sessionUserId ? "free_limited" : "anonymous_limited",
          ...(unlimitedAi ? {} : { freeGenerationsUsedBefore: freeGenerationsUsed, freeDailyLimit: FREE_DAILY_LIMIT }),
          ...(anonymousQuotaKey ? { aiQuotaKey: anonymousQuotaKey } : {}),
          isTrialUser,
          ...(trialDay !== null ? { trialDay } : {}),
        },
        ...ctx,
      });

      const priorCount = sessionUserId ? await getPriorUserAiGenerationCount(sessionUserId) : 0;
      if (sessionUserId && sessionUserEmail && priorCount === 1) {
        await trackActivity({
          event: "first_ai_generation",
          userId: sessionUserId,
          email: sessionUserEmail,
          metadata: {
            theme: cleanedTheme.substring(0, 100),
            tone,
            size,
            useCase: cleanedUseCase || "custom",
            promptDetailKeys,
            provider: cells.provider,
            model: cells.model,
            aiAccess: unlimitedAi ? "unlimited" : "free_limited",
          },
          ...ctx,
        });
        notifyFirstAiGeneration(
          user?.name || sessionUserName || "Unknown",
          sessionUserEmail,
          cleanedTheme.substring(0, 100) || cleanedUseCase || "Custom bingo card"
        ).catch(() => {});
      }
    } catch {}

    if (sessionUserId) {
      addFeatureUsed(sessionUserId, "ai_generate").catch(() => {});
    }

    return NextResponse.json({
      cells: cells.cells,
      quota: unlimitedAi
        ? { limit: null, used: null, remaining: null }
        : { limit: FREE_DAILY_LIMIT, used: freeGenerationsUsed + 1, remaining: Math.max(0, FREE_DAILY_LIMIT - freeGenerationsUsed - 1) },
    });
  } catch (err: any) {
    console.error("Generate cells error:", err?.message || err);
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 500 });
  }
}
