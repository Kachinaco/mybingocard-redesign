import { NextResponse } from "next/server";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";
import { trackActivity } from "@/lib/activity";

const STEPS = ["createAccount", "createCard", "exportCard", "tryGame", "exploreTemplates"] as const;

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ show: false });
  }

  const client = await clientPromise;
  const db = client.db("mybingocard");

  const user = await db.collection("users").findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ show: false });

  // Only show for users in first 7 days
  const daysSinceSignup = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceSignup > 7) return NextResponse.json({ show: false });

  // Check if dismissed
  if (user.onboardingDismissed) return NextResponse.json({ show: false });

  const userId = user._id.toString();
  const onboarding = user.onboardingCompleted || {};

  // Auto-detect completions
  const cardCount = await db.collection("cards").countDocuments({ userId });
  const hasSharedOrExported = cardCount > 0 ?
    await db.collection("activity_events").findOne({
      userId,
      event: { $in: ["card_exported", "share_link_generated", "share_link_reused"] }
    }) : null;
  const hasPlayedGame = await db.collection("activity_events").findOne({
    userId,
    event: { $in: ["game_created", "game_joined"] }
  });

  const completed = {
    createAccount: true,
    createCard: cardCount > 0 || !!onboarding.createCard,
    exportCard: !!hasSharedOrExported || !!onboarding.exportCard,
    tryGame: !!hasPlayedGame || !!onboarding.tryGame,
    exploreTemplates: !!onboarding.exploreTemplates,
  };

  const completedCount = Object.values(completed).filter(Boolean).length;
  const allDone = completedCount === STEPS.length;

  return NextResponse.json({
    show: !allDone,
    completed,
    completedCount,
    totalSteps: STEPS.length,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { step, dismiss } = await request.json();

  const client = await clientPromise;
  const db = client.db("mybingocard");

  if (dismiss) {
    await db.collection("users").updateOne(
      { email: session.user.email },
      { $set: { onboardingDismissed: true } }
    );

    trackActivity({
      event: "onboarding_dismissed",
      source: "server",
      userId: session.user.id || null,
      email: session.user.email,
      pathname: "/api/onboarding",
      metadata: {},
    }).catch(() => {});

    return NextResponse.json({ success: true });
  }

  if (step && STEPS.includes(step)) {
    await db.collection("users").updateOne(
      { email: session.user.email },
      { $set: { [`onboardingCompleted.${step}`]: true } }
    );

    trackActivity({
      event: "onboarding_step_completed",
      source: "server",
      userId: session.user.id || null,
      email: session.user.email,
      pathname: "/api/onboarding",
      metadata: {
        step,
      },
    }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
