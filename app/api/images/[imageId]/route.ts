import { NextResponse } from "next/server";
import { getImageById } from "@/lib/db/images";
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

    const filePath = wantThumb ? image.thumbnailPath : image.storagePath;

    const fileBuffer = await readFile(filePath);

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Image serve error:", error);
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
}
