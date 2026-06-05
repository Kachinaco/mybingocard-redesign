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
  test("allows free drafts to use image cells while new free uploads stay blocked", () => {
    expect(stripeConfigSource).toContain('"Image bingo cards"');
    expect(stripeConfigSource).toContain("canUploadImages: false");
    expect(stripeConfigSource).toContain("maxImageUploads: 0");
    expect(imageDbSource).toContain("const MAX_UPLOADS_FREE = 0");
    expect(imageDbSource).toContain("const MAX_UPLOADS_LEGACY_FREE = 25");
    expect(imageDbSource).toContain("canUpload: maxUploads > 0");
  });

  test("uses entitlement-aware upload permission in the image picker", () => {
    expect(createPageSource).not.toContain('setUpgradeReason("image_picker")');
    expect(createPageSource).toContain("setImagePickerCellIndex(index)");
    expect(createPageSource).toContain("canUploadImages={Boolean(permissionStatus?.allowed)}");
  });

  test("uses upload permission instead of premium status inside the picker", () => {
    expect(imagePickerSource).toContain("canUploadImages: boolean");
    expect(imagePickerSource).not.toContain("isPremium: boolean");
    expect(imagePickerSource).toContain("canUploadImages || !isLoggedIn");
  });

  test("the upload API uses the shared image upload limits", () => {
    expect(uploadRouteSource).toContain("isLegacyFreeUser");
    expect(uploadRouteSource).toContain("const limits = getUploadLimits(isPremium, isLegacyFree)");
    expect(uploadRouteSource).toContain("currentCount >= limits.maxUploads");
  });

  test("public shared image cards can render their uploaded images", () => {
    expect(imageServeRouteSource).toContain("function isImageReferencedByPublicCard");
    expect(imageServeRouteSource).toContain("isPublic: true");
    expect(imageServeRouteSource).toContain("cells: { $elemMatch: { $regex: imageIdPattern } }");
    expect(imageServeRouteSource).toContain("publicSharedImage");
  });
});
