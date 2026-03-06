import { NextResponse } from "next/server";
import { createUser, getUserByEmail } from "@/lib/db/users";
import { sendWelcomeEmail } from "@/lib/email";
import { notifySignup } from "@/lib/discord";

export async function POST(request: Request) {
  try {
    const { name, email, password, utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer } = await request.json();

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Create user
    const user = await createUser({
      name,
      email,
      password,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      referrer,
    });

    // Send welcome email (don't block on failure)
    sendWelcomeEmail(email, name).catch(console.error);

    // Notify Discord
    notifySignup(name, email, {
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      referrer,
    }).catch(console.error);

    return NextResponse.json(
      {
        message: "User created successfully",
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
