import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("AI generation privacy", () => {
  const componentSource = readSource("components/AiGenerateSection.tsx");
  const routeSource = readSource("app/api/generate-cells/route.ts");
  const discordSource = readSource("lib/discord.ts");
  const firstAiNotificationSource = discordSource.slice(
    discordSource.indexOf("export async function notifyFirstAiGeneration"),
    discordSource.indexOf("export async function notifyUpgradeDismissed")
  );

  test("keeps raw themes out of client and server telemetry", () => {
    expect(componentSource).not.toContain("theme: theme.substring");
    expect(componentSource).toContain("theme_length: theme.trim().length");
    expect(componentSource).toContain("prompt_detail_count: promptDetailKeys.length");

    expect(routeSource).not.toContain("theme: cleanedTheme.substring");
    expect(routeSource).toContain("const themeLength = cleanedTheme.length;");
    expect(routeSource).toContain("const promptDetailCount = promptDetailKeys.length;");
  });

  test("keeps raw themes out of the first-generation Discord notification", () => {
    expect(routeSource).not.toContain(
      'cleanedTheme.substring(0, 100) || cleanedUseCase || "Custom bingo card"'
    );
    expect(firstAiNotificationSource).not.toContain("Topic");
    expect(firstAiNotificationSource).toContain('{ name: "Use Case", value: useCase || "custom"');
  });

  test("still sends private input to generation without placing it in telemetry", () => {
    expect(componentSource).toContain("theme: theme.trim()");
    expect(componentSource).toContain("promptDetails: structuredDetails");
    expect(routeSource).toContain("theme: cleanedTheme || cleanedUseCase || \"custom bingo card\"");
    expect(routeSource).toContain("promptDetails: cleanedPromptDetails");
  });
});
