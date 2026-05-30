import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const stripeConfigSource = readSource("lib/stripe/config.ts");
const imageDbSource = readSource("lib/db/images.ts");
const createPageSource = readSource("app/create/page.tsx");
const imagePickerSource = readSource("components/ImagePickerModal.tsx");
const uploadRouteSource = readSource("app/api/images/upload/route.ts");
const imageServeRouteSource = readSource("app/api/images/[imageId]/route.ts");

describe("free image bingo access", () => {
  test("allows free plans to create image bingo cells with a bounded upload limit", () => {
    expect(stripeConfigSource).toContain('"Image bingo cards"');
    expect(stripeConfigSource).toContain("canUploadImages: true");
    expect(stripeConfigSource).toContain("maxImageUploads: 25");
    expect(imageDbSource).toContain("const MAX_UPLOADS_FREE = 25");
    expect(imageDbSource).toContain("canUpload: true");
  });

  test("does not route free logged-in users to the upgrade modal for image picking", () => {
    expect(createPageSource).not.toContain('setUpgradeReason("image_picker")');
    expect(createPageSource).toContain("setImagePickerCellIndex(index)");
    expect(createPageSource).toContain("canUploadImages={true}");
  });

  test("uses upload permission instead of premium status inside the picker", () => {
    expect(imagePickerSource).toContain("canUploadImages: boolean");
    expect(imagePickerSource).not.toContain("isPremium: boolean");
    expect(imagePickerSource).toContain("canUploadImages || !isLoggedIn");
  });

  test("the upload API uses the shared image upload limits", () => {
    expect(uploadRouteSource).toContain("const limits = getUploadLimits(isPremium)");
    expect(uploadRouteSource).toContain("currentCount >= limits.maxUploads");
  });

  test("public shared image cards can render their uploaded images", () => {
    expect(imageServeRouteSource).toContain("function isImageReferencedByPublicCard");
    expect(imageServeRouteSource).toContain("isPublic: true");
    expect(imageServeRouteSource).toContain("cells: { $elemMatch: { $regex: imageIdPattern } }");
    expect(imageServeRouteSource).toContain("publicSharedImage");
  });
});
