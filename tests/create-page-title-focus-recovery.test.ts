import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const editorPath = existsSync(resolve(process.cwd(), "app/create/_components/CreateCardEditorClient.tsx"))
  ? "app/create/_components/CreateCardEditorClient.tsx"
  : "app/create/page.tsx";
const source = readFileSync(resolve(process.cwd(), editorPath), "utf8");

describe("create page blank-title focus recovery", () => {
  test("explicit Save focuses and reveals the rendered title input", () => {
    expect(source).toContain("const titleInputRef = useRef<HTMLInputElement | null>(null)");
    expect(source).toContain('ref={titleInputRef}');
    expect(source).toContain('id="card-title"');
    expect(source).toContain('htmlFor="card-title"');
    expect(source).toContain('id="create-card-error" role="alert"');
    expect(source).toContain('aria-describedby={error && !title.trim() ? "create-card-error" : undefined}');
    expect(source).toContain("input.focus({ preventScroll: true })");
    expect(source).toContain("input.scrollIntoView({");
    expect(source).toContain('block: "center"');
    expect(source).toContain("await saveCard({ redirectAfterSave: true, recoverTitleInput: true })");
  });

  test("respects reduced motion when revealing the title", () => {
    expect(source).toContain('window.matchMedia("(prefers-reduced-motion: reduce)").matches');
    expect(source).toContain('behavior: prefersReducedMotion ? "auto" : "smooth"');
  });

  test("suppressed autosave validation never requests focus recovery", () => {
    const autosaveCalls = source.match(/saveCard\(\{\s*suppressValidationErrors:\s*true[^}]*\}\)/g) || [];
    expect(autosaveCalls).toEqual(["saveCard({ suppressValidationErrors: true })"]);
    expect(autosaveCalls.every((call) => !call.includes("recoverTitleInput"))).toBe(true);

    const blankTitleGuard = source.slice(
      source.indexOf("if (!payload.title)"),
      source.indexOf("if (!session?.user && !currentCardIdRef.current)"),
    );
    const suppressedBranch = blankTitleGuard.slice(
      blankTitleGuard.indexOf("if (options?.suppressValidationErrors)"),
      blankTitleGuard.indexOf("} else {"),
    );
    expect(suppressedBranch).not.toContain("focusAndRevealTitleInput");
    expect(blankTitleGuard).toContain("if (options?.recoverTitleInput)");
  });
});
