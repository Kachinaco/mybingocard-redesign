import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserByEmail } from "@/lib/db/users";
import { canAccessAllTemplates } from "@/lib/permissions";
import { getTemplateById } from "@/lib/db/templates";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const template = await getTemplateById(id);

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Check if template is premium and user has access
    if (template.isPremium) {
      const session = await auth();

      if (!session?.user?.email) {
        return NextResponse.json(
          { error: "This is a premium template. Please sign in and upgrade to Pro or Business plan." },
          { status: 403 }
        );
      }

      const user = await getUserByEmail(session.user.email);

      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      const permission = canAccessAllTemplates(user.planType);

      if (!permission.allowed) {
        return NextResponse.json(
          { error: permission.reason || "Premium templates require Pro or Business plan." },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Get template error:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}
