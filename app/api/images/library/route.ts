import { NextResponse } from "next/server";
import { getSystemImages, getSystemImageCategories } from "@/lib/db/images";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;

    const [images, categories] = await Promise.all([
      getSystemImages(category),
      getSystemImageCategories(),
    ]);

    return NextResponse.json({
      images: images.map((img) => ({
        imageId: img._id.toString(),
        imageUrl: `/api/images/${img._id.toString()}`,
        thumbnailUrl: `/api/images/${img._id.toString()}?thumb=1`,
        filename: img.filename,
        category: img.category,
        width: img.width,
        height: img.height,
      })),
      categories,
    });
  } catch (error) {
    console.error("Library images error:", error);
    return NextResponse.json(
      { error: "Failed to load image library" },
      { status: 500 }
    );
  }
}
