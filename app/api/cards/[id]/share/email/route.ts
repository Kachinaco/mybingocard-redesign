import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCardById } from "@/lib/db/cards";
import { getUserById } from "@/lib/db/users";
import { createSharedLink } from "@/lib/db/sharedLinks";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";
import { sendShareLinkInvitationEmail } from "@/lib/email";
import { hasPremiumAccess } from "@/lib/subscription-status";

const MAX_RECIPIENTS = 500;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmails(input: unknown): string[] {
  const rawEmails = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(/[,;\n]+/)
      : [];

  return Array.from(
    new Set(
      rawEmails
        .map((email) => String(email).trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const requestContext = getRequestActivityContext(request);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }
    const sessionUserId = session.user.id;
    const sessionUserEmail = session.user.email || "";

    const body = await request.json().catch(() => ({}));
    const emails = normalizeEmails(body.emails ?? body.recipients);

    if (!emails.length) {
      return NextResponse.json(
        { error: "Enter at least one email address." },
        { status: 400 }
      );
    }

    if (emails.length > MAX_RECIPIENTS) {
      return NextResponse.json(
        { error: `You can send to up to ${MAX_RECIPIENTS} emails at a time.` },
        { status: 400 }
      );
    }

    const invalidEmails = emails.filter((email) => !EMAIL_PATTERN.test(email));
    if (invalidEmails.length) {
      return NextResponse.json(
        {
          error: `These emails do not look right: ${invalidEmails.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const { id } = await params;
    const card = await getCardById(id);

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    if (card.userId.toString() !== sessionUserId) {
      return NextResponse.json(
        { error: "You don't have permission to share this card" },
        { status: 403 }
      );
    }

    const user = await getUserById(sessionUserId);
    if (!hasPremiumAccess(user)) {
      return NextResponse.json(
        {
          error: "Upgrade to Premium or choose lifetime access to email share links.",
          checkoutRequired: true,
          upgradeRequired: true,
          recipientCount: emails.length,
        },
        { status: 402 }
      );
    }

    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      "https://mybingocard.com"
    ).replace(/\/$/, "");
    const ownerName = session.user.name || session.user.email || null;

    const results = await Promise.all(
      emails.map(async (email) => {
        const sharedLink = await createSharedLink({
          batchId: `email-share:${id}`,
          cardId: id,
          ownerUserId: sessionUserId,
          ownerEmail: sessionUserEmail,
          recipientEmail: email,
          amountCents: 0,
        });
        const linkUrl = `${appUrl}/play/${sharedLink.linkId}`;

        return {
          email,
          linkId: sharedLink.linkId,
          sent: await sendShareLinkInvitationEmail(
            email,
            null,
            ownerName,
            linkUrl,
            card.title
          ),
        };
      })
    );

    const sent = results.filter((result) => result.sent).map((result) => result.email);
    const failed = results.filter((result) => !result.sent).map((result) => result.email);

    await trackActivity({
      event: "share_link_email_sent",
      source: "server",
      userId: sessionUserId,
      email: sessionUserEmail || null,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        cardId: id,
        delivery: "premium_email_share_batch",
        requestedCount: emails.length,
        sentCount: sent.length,
        failedCount: failed.length,
      },
    });

    if (!sent.length) {
      return NextResponse.json(
        { error: "The email could not be sent. Please try again.", failed },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      sent: sent.length,
      failed,
    });
  } catch (error) {
    console.error("Send share link email error:", error);
    return NextResponse.json(
      { error: "Failed to send share email" },
      { status: 500 }
    );
  }
}
