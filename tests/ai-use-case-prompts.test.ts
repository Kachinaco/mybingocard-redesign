import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildBingoPrompt } from "@/lib/ai-generation";

describe("AI use-case prompt generation", () => {
  test("adds teacher-specific structured context to the prompt", () => {
    const prompt = buildBingoPrompt("ecosystems review", "serious", 8, "Science Review", "teacher", {
      gradeLevel: "5th grade",
      subject: "Science",
      vocabularyList: "habitat, ecosystem, food chain",
      difficulty: "unit review",
    });

    expect(prompt).toContain("Use case: Teacher");
    expect(prompt).toContain("- Grade Level: 5th grade");
    expect(prompt).toContain("- Subject: Science");
    expect(prompt).toContain("- Vocabulary List: habitat, ecosystem, food chain");
    expect(prompt).toContain("classroom-safe");
    expect(prompt).toContain("prioritize those exact terms");
  });

  test("adds event and social instructions for non-classroom use cases", () => {
    const weddingPrompt = buildBingoPrompt("cocktail hour", "mix", 24, "Reception Bingo", "wedding", {
      coupleNames: "Maya and Jordan",
      venueVibe: "garden reception",
      avoidMoments: "embarrassing speeches",
    });
    const socialPrompt = buildBingoPrompt("new year board", "funny", 24, "2026 Bingo", "social", {
      format: "2026 bingo board",
      vibe: "optimistic",
    });

    expect(weddingPrompt).toContain("Use case: Wedding");
    expect(weddingPrompt).toContain("- Couple Names: Maya and Jordan");
    expect(weddingPrompt).toContain("Avoid anything the user explicitly asked to avoid.");
    expect(socialPrompt).toContain("Use case: Social");
    expect(socialPrompt).toContain("- Format: 2026 bingo board");
    expect(socialPrompt).toContain("short, shareable");
  });

  test("creator UI sends structured use-case details to the AI API", () => {
    const componentSource = readFileSync(join(process.cwd(), "components/AiGenerateSection.tsx"), "utf8");
    const routeSource = readFileSync(join(process.cwd(), "app/api/generate-cells/route.ts"), "utf8");

    expect(componentSource).toContain('type AiUseCase = "custom" | "teacher" | "wedding" | "baby-shower" | "office" | "social"');
    expect(componentSource).toContain('["Gift bingo", "Prediction bingo", "Name bingo", "Emoji bingo"]');
    expect(componentSource).toContain('["Goals bingo", "Dating bingo", "Not on my bingo card", "2026 bingo board"]');
    expect(componentSource).toContain("promptDetails: structuredDetails");
    expect(componentSource).toContain('use_case: useCase');

    expect(routeSource).toContain("function cleanPromptDetails(");
    expect(routeSource).toContain("const { theme, tone, size, title, freeSpace, useCase, promptDetails } = await req.json();");
    expect(routeSource).toContain("useCase: cleanedUseCase");
    expect(routeSource).toContain("promptDetails: cleanedPromptDetails");
  });
});
