import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserByEmail } from "@/lib/db/users";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { confirmation } = await request.json();
    if (confirmation !== "DELETE") {
      return NextResponse.json(
        { error: "Please type DELETE to confirm account deletion" },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const client = await clientPromise;
    const db = client.db("mybingocard");
    const userId = user._id.toString();

    // Cancel Stripe subscription if active
    if (user.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(user.stripeSubscriptionId);
      } catch (e) {
        console.error("Failed to cancel Stripe subscription:", e);
      }
    }

    // Delete user data
    await Promise.all([
      db.collection("cards").deleteMany({ userId }),
      db.collection("gameHistory").deleteMany({ userId }),
      db.collection("game_states").deleteMany({ userId }),
      db.collection("favorites").deleteMany({ userId }),
      db.collection("accounts").deleteMany({ userId }),
      db.collection("sessions").deleteMany({ userId }),
      db.collection("email_preferences").deleteOne({ email: user.email }),
      db.collection("drip_opens").deleteMany({ email: user.email }),
      db.collection("users").deleteOne({ _id: new ObjectId(userId) }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
