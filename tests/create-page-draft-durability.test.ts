import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("create page draft durability", () => {
  const source = readFileSync(resolve(process.cwd(), "app/create/page.tsx"), "utf8");
  const journeySource = readFileSync(resolve(process.cwd(), "scripts/analyze-user-journeys.cjs"), "utf8");

  test("reports local persistence success and failure", () => {
    expect(source).toContain("const persistDraft = (options?: { updateState?: boolean }): boolean =>");
    expect(source).toContain("const persisted = setBrowserStorageItem");
    expect(source).toContain('setLocalDraftSaveState("saved")');
    expect(source).toContain('setLocalDraftSaveState("error")');
    expect(source).toContain("return true;");
    expect(source).toContain("return false;");
  });

  test("flushes pending edits synchronously on pagehide", () => {
    const lifecycleSource = source.slice(source.indexOf("const handlePageHide"));

    expect(lifecycleSource).toContain('window.addEventListener("pagehide", handlePageHide)');
    expect(lifecycleSource).toContain("clearTimeout(draftTimerRef.current)");
    expect(lifecycleSource).toContain("persistDraft({ updateState: false })");
    expect(source).not.toContain('window.addEventListener("beforeunload"');
  });

  test("tracks an account-unsaved exit with local persistence status", () => {
    expect(source).toContain('trackClientActivity("card_draft_left_unsaved"');
    expect(source).toContain("local_persistence_status:");
    expect(source).toContain("persisted_locally: persistedLocally");
    expect(source).not.toContain('trackClientActivity("card_draft_lost"');
  });

  test("keeps renamed and historical draft exits in journey findings", () => {
    expect(journeySource).toContain('(counts.get("card_draft_left_unsaved") || 0)');
    expect(journeySource).toContain('(counts.get("card_draft_lost") || 0)');
    expect(journeySource).toContain('add("medium", "card_draft_left_unsaved"');
    expect(journeySource).toContain("draft exit(s) without an account save");
  });

  test("explains the local draft and account save boundary to anonymous users", () => {
    expect(source).toContain("Draft saved on this device. Sign in to save it to your account.");
    expect(source).toContain("Your draft is saved on this device. Sign in to save it to your account.");
    expect(source).not.toContain("Sign in to save automatically");
  });
});
