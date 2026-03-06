import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserByEmail, updateUser } from "@/lib/db/users";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check linked OAuth providers from NextAuth accounts collection
    const client = await clientPromise;
    const db = client.db("mybingocard");
    const accounts = await db.collection("accounts").find({
      $or: [
        { userId: user._id },
        { userId: user._id.toString() },
      ],
    }).toArray();

    const providers = accounts.map((a: any) => a.provider);

    return NextResponse.json({
      name: user.name || "",
      email: user.email,
      image: user.image || null,
      hasPassword: !!user.password,
      connectedProviders: providers,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await request.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (name.trim().length > 100) {
      return NextResponse.json({ error: "Name is too long" }, { status: 400 });
    }

    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await updateUser(user._id.toString(), { name: name.trim() });

    return NextResponse.json({ success: true, name: name.trim() });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
