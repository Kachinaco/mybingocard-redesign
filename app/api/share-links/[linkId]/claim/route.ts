import { NextResponse } from "next/server";
import crypto from "crypto";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";
import {
  claimSharedLink,
  getSharedLinkByLinkId,
} from "@/lib/db/sharedLinks";
import { getCardById } from "@/lib/db/cards";
import type { User } from "@/lib/db/users";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";

function serializeCard(card: NonNullable<Awaited<ReturnType<typeof getCardById>>>) {
  return {
    _id: card._id.toString(),
    title: card.title,
    description: card.description,
    size: card.size,
    cells: card.cells,
    freeSpace: card.freeSpace,
    style: card.style ?? {},
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params;
    const session = await auth();
    const requestContext = getRequestActivityContext(request);

    if (!linkId || typeof linkId !== "string") {
      return NextResponse.json(
        { error: "Invalid link" },
        { status: 400 }
      );
    }

    // Parse body (may be empty) to detect guest claim flag.
    // Reject malformed JSON outright — empty body is fine.
    let body: any = {};
    const rawBody = await request.text().catch(() => null);
    if (rawBody === null) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }
    if (rawBody.length > 0) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        return NextResponse.json(
          { error: "Invalid request body" },
          { status: 400 }
        );
      }
    }
    const isGuestClaim = body?.guest === true;

    const existing = await getSharedLinkByLinkId(linkId);

    if (!existing) {
      return NextResponse.json(
        { error: "Share link not found" },
        { status: 404 }
      );
    }

    const now = new Date();

    if (existing.status === "expired" || existing.status === "refunded") {
      return NextResponse.json(
        { error: "This share link is no longer valid" },
        { status: 410 }
      );
    }

    if (existing.expiresAt && new Date(existing.expiresAt) < now) {
      return NextResponse.json(
        { error: "This share link has expired" },
        { status: 410 }
      );
    }

    // Reject owner self-claim before any mutation happens. Previewing the link
    // as the owner should never burn it.
    if (session?.user?.id && existing.ownerUserId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot claim your own share link", isOwner: true },
        { status: 400 }
      );
    }

    // Signed-in path: require session unless guest flag is set
    if (!isGuestClaim && !session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in to claim this link" },
        { status: 401 }
      );
    }

    // If this link was addressed to a specific email, only that recipient
    // can claim it via the signed-in branch. Guests use synthetic emails,
    // so we skip the check for them.
    if (
      !isGuestClaim &&
      session?.user?.id &&
      existing.recipientEmail &&
      session.user.email?.toLowerCase() !==
        existing.recipientEmail.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "This link was sent to a different email address" },
        { status: 403 }
      );
    }

    // If already claimed by the current signed-in user, return the card (idempotent).
    if (existing.status === "claimed") {
      if (session?.user?.id && existing.claimedByUserId === session.user.id) {
        const card = await getCardById(existing.cardId);
        if (!card) {
          return NextResponse.json(
            { error: "Card not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({
          ok: true,
          alreadyClaimed: true,
          card: serializeCard(card),
        });
      }

      if (isGuestClaim && !session?.user?.id && existing.claimedByUserId) {
        const client = await clientPromise;
        const db = client.db("mybingocard");

        let guestObjectId: ObjectId | null = null;
        try {
          guestObjectId = new ObjectId(existing.claimedByUserId);
        } catch {
          guestObjectId = null;
        }

        if (guestObjectId) {
          const guestUser = await db.collection("users").findOne({
            _id: guestObjectId,
            customerType: "guest",
            guestClaimToken: { $exists: true, $ne: null },
            guestClaimTokenExpiresAt: { $gt: now },
          });

          if (guestUser) {
            const card = await getCardById(existing.cardId);
            if (!card) {
              return NextResponse.json(
                { error: "This share link is no longer valid" },
                { status: 410 }
              );
            }

            return NextResponse.json({
              ok: true,
              alreadyClaimed: true,
              card: serializeCard(card),
              guestAuth: {
                userId: existing.claimedByUserId,
                guestToken: String(
                  (guestUser as unknown as { guestClaimToken: string }).guestClaimToken
                ),
              },
            });
          }
        }
      }

      return NextResponse.json(
        { error: "This share link has already been claimed by someone else" },
        { status: 410 }
      );
    }

    // ------ Guest claim branch ------
    if (isGuestClaim && !session?.user?.id) {
      const client = await clientPromise;
      const db = client.db("mybingocard");

      // Pre-allocate the user id so we can claim atomically before inserting
      // the guest user document. This prevents orphan guests-with-tokens if
      // anything crashes between the two writes.
      const newUserObjectId = new ObjectId();
      const newUserId = newUserObjectId.toString();

      const claimed = await claimSharedLink(linkId, newUserId);

      if (!claimed) {
        return NextResponse.json(
          {
            error:
              "This share link could not be claimed. It may have just been used.",
          },
          { status: 409 }
        );
      }

      const randomId = crypto.randomBytes(8).toString("hex");
      const guestEmail = `guest-${randomId}@guest.mybingocard.com`;
      const guestToken = crypto.randomBytes(16).toString("hex");
      const guestTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const guestUser: Partial<User> & {
        _id: ObjectId;
        guestClaimToken?: string;
        guestClaimTokenExpiresAt?: Date;
      } = {
        _id: newUserObjectId,
        email: guestEmail,
        name: "Guest Player",
        planType: "FREE",
        subscriptionStatus: "inactive",
        customerType: "guest",
        signupMethod: "share_link",
        createdAt: now,
        updatedAt: now,
        guestClaimToken: guestToken,
        guestClaimTokenExpiresAt: guestTokenExpiresAt,
      };

      try {
        await db.collection("users").insertOne(guestUser as any);
      } catch (insertErr) {
        console.error("Guest user insert failed, reverting claim:", insertErr);
        // Revert the claim so the link can be used again.
        try {
          await db.collection("shared_links").updateOne(
            { linkId, claimedByUserId: newUserId },
            {
              $set: { status: "pending", updatedAt: new Date() },
              $unset: { claimedByUserId: "", claimedAt: "" },
            }
          );
        } catch (revertErr) {
          console.error("Failed to revert claim after insert error:", revertErr);
        }
        return NextResponse.json(
          { error: "Failed to create guest session" },
          { status: 500 }
        );
      }

      const card = await getCardById(claimed.cardId);

      if (!card) {
        // Card was deleted between claim and fetch — revert the claim so the
        // link returns to a clean state (though the card is gone anyway).
        try {
          await db.collection("shared_links").updateOne(
            { linkId, claimedByUserId: newUserId },
            {
              $set: { status: "pending", updatedAt: new Date() },
              $unset: { claimedByUserId: "", claimedAt: "" },
            }
          );
        } catch (revertErr) {
          console.error("Failed to revert claim after missing card:", revertErr);
        }
        return NextResponse.json(
          { error: "This share link is no longer valid" },
          { status: 410 }
        );
      }

      trackActivity({
        event: "share_link_claimed",
        source: "server",
        userId: newUserId,
        email: guestEmail,
        pathname: `/play/${linkId}`,
        domain: requestContext.domain,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        metadata: {
          linkId,
          batchId: claimed.batchId,
          cardId: claimed.cardId,
          ownerUserId: claimed.ownerUserId,
          method: "guest",
        },
      }).catch((e) => console.error("Activity tracking failed:", e));

      return NextResponse.json({
        ok: true,
        card: serializeCard(card),
        guestAuth: {
          userId: newUserId,
          guestToken,
        },
      });
    }

    // ------ Signed-in claim branch ------
    const signedInUserId = session!.user!.id!;
    const claimed = await claimSharedLink(linkId, signedInUserId);

    if (!claimed) {
      return NextResponse.json(
        {
          error:
            "This share link could not be claimed. It may have just been used.",
        },
        { status: 409 }
      );
    }

    const card = await getCardById(claimed.cardId);

    if (!card) {
      // Revert the claim so the link isn't left in a broken claimed state
      // pointing at a deleted card.
      try {
        const client = await clientPromise;
        const db = client.db("mybingocard");
        await db.collection("shared_links").updateOne(
          { linkId, claimedByUserId: signedInUserId },
          {
            $set: { status: "pending", updatedAt: new Date() },
            $unset: { claimedByUserId: "", claimedAt: "" },
          }
        );
      } catch (revertErr) {
        console.error("Failed to revert claim after missing card:", revertErr);
      }
      return NextResponse.json(
        { error: "This share link is no longer valid" },
        { status: 410 }
      );
    }

    trackActivity({
      event: "share_link_claimed",
      source: "server",
      userId: signedInUserId,
      email: session!.user!.email || null,
      pathname: `/play/${linkId}`,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        linkId,
        batchId: claimed.batchId,
        cardId: claimed.cardId,
        ownerUserId: claimed.ownerUserId,
        method: "signed_in",
      },
    }).catch((e) => console.error("Activity tracking failed:", e));

    return NextResponse.json({
      ok: true,
      card: serializeCard(card),
    });
  } catch (error) {
    console.error("Claim share link error:", error);
    return NextResponse.json(
      { error: "Failed to claim share link" },
      { status: 500 }
    );
  }
}
