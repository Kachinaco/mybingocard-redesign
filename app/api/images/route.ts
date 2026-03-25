import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserImages, deleteImage, getUserImageCount, getUploadLimits } from "@/lib/db/images";
import { getSubscriptionByUserId } from "@/lib/db/subscriptions";
import { unlink } from "node:fs/promises";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const images = await getUserImages(session.user.id);

    const subscription = await getSubscriptionByUserId(session.user.id);
    const isPremium = subscription?.plan !== "free" && subscription?.status === "active";
    const limits = getUploadLimits(isPremium);
    const count = await getUserImageCount(session.user.id);

    return NextResponse.json({
      images: images.map((img) => ({
        imageId: img._id.toString(),
        imageUrl: `/api/images/${img._id.toString()}`,
        thumbnailUrl: `/api/images/${img._id.toString()}?thumb=1`,
        filename: img.filename,
        width: img.width,
        height: img.height,
        size: img.size,
        createdAt: img.createdAt,
      })),
      usage: {
        count,
        limit: limits.maxUploads,
        canUpload: limits.canUpload,
      },
    });
  } catch (error) {
    console.error("List images error:", error);
    return NextResponse.json(
      { error: "Failed to list images" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get("imageId");

    if (!imageId) {
      return NextResponse.json({ error: "Image ID required" }, { status: 400 });
    }

    // Get image info before deleting (to remove files)
    const { getImageById } = await import("@/lib/db/images");
    const image = await getImageById(imageId);

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    if (image.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const deleted = await deleteImage(imageId, session.user.id);

    if (!deleted) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Clean up files from disk
    try {
      await unlink(image.storagePath);
      await unlink(image.thumbnailPath);
    } catch {
      // Files may already be gone — not critical
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete image error:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}
