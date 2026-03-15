import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getAllTemplates,
  searchTemplates,
  getPopularTemplates,
  getTemplatesByCategory,
  incrementTemplateUses,
} from "@/lib/db/templates";
import { getRequestActivityContext, trackActivity } from "@/lib/activity";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const popular = searchParams.get("popular");
    const limit = searchParams.get("limit");
    const isPremium = searchParams.get("isPremium");
    const isFeatured = searchParams.get("isFeatured");

    let templates;

    // Search query
    if (search) {
      templates = await searchTemplates(search);
    }
    // Popular templates
    else if (popular === "true") {
      const limitNum = limit ? parseInt(limit) : 10;
      templates = await getPopularTemplates(limitNum);
    }
    // Category filter
    else if (category) {
      templates = await getTemplatesByCategory(category);
    }
    // All templates with optional filters
    else {
      const filters: any = {};
      if (isPremium !== null && isPremium !== undefined) {
        filters.isPremium = isPremium === "true";
      }
      if (isFeatured !== null && isFeatured !== undefined) {
        filters.isFeatured = isFeatured === "true";
      }
      templates = await getAllTemplates(filters);
    }

    // Return all templates - UI handles premium gating with lock icons
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Get templates error:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const session = await auth();
    const requestContext = getRequestActivityContext(request);

    if (!data.templateId) {
      return NextResponse.json(
        { error: "Template ID required" },
        { status: 400 }
      );
    }

    // Increment template usage count
    await incrementTemplateUses(data.templateId);

    await trackActivity({
      event: "template_used",
      source: "server",
      userId: session?.user?.id || null,
      email: session?.user?.email || null,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        templateId: data.templateId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Increment template uses error:", error);
    return NextResponse.json(
      { error: "Failed to track template usage" },
      { status: 500 }
    );
  }
}
