import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("create page anonymous save UX", () => {
  const source = readFileSync(resolve(process.cwd(), "app/create/page.tsx"), "utf8");

  test("does not show a separate oversized signup nudge in the sticky bottom bar", () => {
    expect(source).not.toContain("Free to create — no credit card needed");
    expect(source).not.toContain("Free — takes 10 seconds. Your card will be waiting.");
    expect(source).not.toContain("Sign up to save, share, and download your card.");
    expect(source).not.toContain('t("btn.signup_to_save")');
    expect(source).not.toContain('t("btn.signup_to_save_full")');
    expect(source).toContain('session?.user ? "Save Card" : "Save This Card Free"');
    expect(source).toContain("Your draft is saved on this device. Sign in to save it to your account.");
  });

  test("redirects anonymous saves before posting oversized local-image drafts", () => {
    const saveCardSource = source.slice(source.indexOf("const saveCard = async"));
    const anonymousGuardIndex = saveCardSource.indexOf("if (!session?.user && !currentCardIdRef.current)");
    const createPostIndex = saveCardSource.indexOf('response = await fetch("/api/cards"');

    expect(anonymousGuardIndex).toBeGreaterThan(-1);
    expect(createPostIndex).toBeGreaterThan(anonymousGuardIndex);
    expect(saveCardSource).toContain('server_error: "client_redirect_to_signup"');
    expect(saveCardSource).toContain('trackClientActivity("save_blocked_auth_required"');
    expect(saveCardSource).toContain('next_step: "auth_then_free_save"');
    expect(saveCardSource).toContain("redirectToSignupForCreation();");
    expect(saveCardSource).not.toContain("redirectToSignupForCreation({ autoCheckoutAfterAuth: true });");
  });

  test("keeps explicit checkout intent separate from ordinary save auth", () => {
    expect(source).toContain('const pendingSaveCheckoutIntentKey = "mybingo_pending_save_checkout_intent";');
    expect(source).toContain('const saveCheckoutCallbackUrl = "/create?checkout=save";');
    expect(source).toContain('setBrowserStorageItem("sessionStorage", pendingSaveCheckoutIntentKey, "1")');
    expect(source).toContain('searchParams.get("checkout") === "save"');
    expect(source).toContain('trackClientActivity("checkout_auto_started_after_auth"');
    expect(source).toContain('next_step: "auth_then_free_save"');
    expect(source).toContain('router.push("/dashboard")');
    expect(source).toContain('removeBrowserStorageItem("sessionStorage", pendingSaveCheckoutIntentKey)');
  });

  test("uploads pending data-url draft images after sign-in before creating the card", () => {
    expect(source).toContain("const dataUrlToBlob = (dataUrl: string): Blob =>");
    expect(source).not.toContain("await fetch(imgData.imageUrl)");
    expect(source).toContain("const draftCells = Array.isArray(draft.cells) ? draft.cells : [];");
    expect(source).toContain("const cellsForDraft = await uploadDataUrlImages(draftCells);");
    expect(source).toContain("cells: cellsForDraft,");
  });

  test("guards pending draft saves after sign-in from duplicate effect runs", () => {
    const pendingDraftSource = source.slice(source.indexOf("const pendingDraftSaveLockKey"));

    expect(pendingDraftSource).toContain('const pendingDraftSaveLockKey = "mybingo_pending_draft_save_in_progress";');
    expect(pendingDraftSource).toContain("!createInFlightRef.current");
    expect(pendingDraftSource).toContain('getBrowserStorageItem("sessionStorage", pendingDraftSaveLockKey) !== "1"');
    expect(pendingDraftSource).toContain('setBrowserStorageItem("sessionStorage", pendingDraftSaveLockKey, "1")');
    expect(pendingDraftSource).toContain('removeBrowserStorageItem("sessionStorage", pendingDraftSaveLockKey)');
  });

  test("redirects anonymous batch generation before posting card payloads", () => {
    const batchSource = source.slice(source.indexOf("const handleBatchGenerate = async"));
    const anonymousGuardIndex = batchSource.indexOf("if (!session?.user)");
    const batchPostIndex = batchSource.indexOf('const response = await fetch("/api/cards/batch"');

    expect(anonymousGuardIndex).toBeGreaterThan(-1);
    expect(batchPostIndex).toBeGreaterThan(anonymousGuardIndex);
    expect(batchSource.slice(anonymousGuardIndex, batchPostIndex)).toContain("redirectToSignupForCreation();");
  });
});
