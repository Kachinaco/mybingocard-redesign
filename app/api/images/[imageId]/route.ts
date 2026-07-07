import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getImageById, isImageReferencedByPublicCard } from "@/lib/db/images";
import { readFile } from "node:fs/promises";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const { imageId } = await params;
    const { searchParams } = new URL(request.url);
    const wantThumb = searchParams.get("thumb") === "1";

    const image = await getImageById(imageId);
    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // System/library images (clip-art) are public. User uploads stay private
    // unless the owner has placed them on a public shared bingo card.
    let publicSharedImage = false;
    if (!image.isSystem) {
      const session = await auth();
      publicSharedImage = await isImageReferencedByPublicCard(imageId, image.userId);
      if (!publicSharedImage) {
        if (!session?.user?.id) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (image.userId !== session.user.id) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    const filePath = wantThumb ? image.thumbnailPath : image.storagePath;

    const fileBuffer = await readFile(filePath);

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": image.isSystem || publicSharedImage
          ? "public, max-age=31536000, immutable"
          : "private, max-age=31536000, immutable",
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Image serve error:", error);
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
}
