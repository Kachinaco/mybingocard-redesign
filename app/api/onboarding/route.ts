import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { countUserCards } from "@/lib/db/cards";
import { hasUserActivityEvent } from "@/lib/db/activity-events";
import {
  getUserByEmail,
  markUserOnboardingStepCompletedByEmail,
  setUserOnboardingDismissedByEmail,
} from "@/lib/db/users";
import { trackActivity } from "@/lib/activity";

const STEPS = ["createAccount", "createCard", "exportCard", "tryGame", "exploreTemplates"] as const;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ show: false });
    }

    const user = await getUserByEmail(session.user.email);
    if (!user) return NextResponse.json({ show: false });

    // Only show for users in first 7 days
    const daysSinceSignup = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceSignup > 7) return NextResponse.json({ show: false });

    // Check if dismissed
    if (user.onboardingDismissed) return NextResponse.json({ show: false });

    const userId = user._id.toString();
    const onboarding = user.onboardingCompleted || {};

    // Auto-detect completions
    const cardCount = await countUserCards(userId);
    const hasSharedOrExported = cardCount > 0 ?
      await hasUserActivityEvent(userId, ["card_exported", "share_link_generated", "share_link_reused"]) : false;
    const hasPlayedGame = await hasUserActivityEvent(
      userId,
      ["game_created", "game_joined"]
    );

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
  } catch (error) {
    console.error("Onboarding GET error:", error);
    return NextResponse.json({ show: false });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { step, dismiss } = await request.json();

    if (dismiss) {
      await setUserOnboardingDismissedByEmail(session.user.email, true);

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
      await markUserOnboardingStepCompletedByEmail(session.user.email, step);

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
  } catch (error) {
    console.error("Onboarding POST error:", error);
    return NextResponse.json({ error: "Failed to update onboarding" }, { status: 500 });
  }
}
