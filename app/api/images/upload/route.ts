import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createImage, getUserImageCount, getUploadLimits, isAllowedMimeType } from "@/lib/db/images";
import { getSubscriptionByUserId } from "@/lib/db/subscriptions";
import { trackActivity, getRequestActivityContext } from "@/lib/activity";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_BASE = "/var/www/mybingocard.com/uploads";
const MAX_DIMENSION = 800;
const THUMB_DIMENSION = 150;
const WEBP_QUALITY = 80;
const THUMB_QUALITY = 70;

export async function POST(request: Request) {
  const requestContext = getRequestActivityContext(request);

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Check plan limits
    const subscription = await getSubscriptionByUserId(userId);
    const isPremium = subscription?.plan !== "free" && subscription?.status === "active";
    const limits = getUploadLimits(isPremium);

    if (!limits.canUpload) {
      return NextResponse.json(
        { error: "Image uploads require a Premium plan.", upgradeRequired: true },
        { status: 403 }
      );
    }

    // Check upload count
    const currentCount = await getUserImageCount(userId);
    if (currentCount >= limits.maxUploads) {
      return NextResponse.json(
        { error: `Upload limit reached (${limits.maxUploads} images). Delete some images to upload more.` },
        { status: 403 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    // Validate MIME type
    if (!isAllowedMimeType(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > limits.maxFileSize) {
      const maxMB = limits.maxFileSize / (1024 * 1024);
      return NextResponse.json(
        { error: `File too large. Maximum size: ${maxMB}MB` },
        { status: 400 }
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process image with sharp
    const image = sharp(buffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      return NextResponse.json({ error: "Could not read image dimensions" }, { status: 400 });
    }

    // Resize and convert to WebP (main image)
    const mainImage = await image
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    const mainMeta = await sharp(mainImage).metadata();

    // Generate thumbnail
    const thumbImage = await sharp(buffer)
      .resize(THUMB_DIMENSION, THUMB_DIMENSION, { fit: "cover" })
      .webp({ quality: THUMB_QUALITY })
      .toBuffer();

    // Create DB record first to get the ID
    const sanitizedFilename = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 100);

    const imageRecord = await createImage({
      userId,
      filename: sanitizedFilename,
      mimeType: "image/webp",
      size: mainImage.length,
      width: mainMeta.width || MAX_DIMENSION,
      height: mainMeta.height || MAX_DIMENSION,
      storagePath: "", // will update after saving
      thumbnailPath: "",
      isSystem: false,
    });

    const imageId = imageRecord._id.toString();

    // Save files to disk
    const userDir = path.join(UPLOAD_BASE, userId);
    await mkdir(userDir, { recursive: true });

    const mainPath = path.join(userDir, `${imageId}.webp`);
    const thumbPath = path.join(userDir, `${imageId}_thumb.webp`);

    await writeFile(mainPath, mainImage);
    await writeFile(thumbPath, thumbImage);

    // Update record with paths
    const { ObjectId } = await import("mongodb");
    const clientPromise = (await import("@/lib/mongodb")).default;
    const client = await clientPromise;
    const db = client.db("mybingocard");
    await db.collection("images").updateOne(
      { _id: new ObjectId(imageId) },
      { $set: { storagePath: mainPath, thumbnailPath: thumbPath } }
    );

    await trackActivity({
      event: "image_uploaded",
      source: "server",
      userId,
      email: session.user.email || null,
      pathname: requestContext.pathname,
      domain: requestContext.domain,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        imageId,
        filename: sanitizedFilename,
        size: mainImage.length,
        width: mainMeta.width,
        height: mainMeta.height,
      },
    });

    return NextResponse.json({
      imageId,
      imageUrl: `/api/images/${imageId}`,
      thumbnailUrl: `/api/images/${imageId}?thumb=1`,
      width: mainMeta.width,
      height: mainMeta.height,
    }, { status: 201 });
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
