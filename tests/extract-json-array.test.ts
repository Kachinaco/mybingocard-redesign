import { describe, expect, test } from "bun:test";
import { extractJsonArray } from "@/lib/ai-generation";

describe("extractJsonArray", () => {
  test("parses the final JSON array from a Codex transcript even when the prompt contains example arrays", () => {
    const transcript = `Reading prompt from stdin...
user
Generate exactly 9 unique bingo card items.
Example format: ["Item one", "Item two", "Item three"]
codex
["Alpha", "Beta", "Gamma"]`;

    expect(extractJsonArray(transcript)).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  test("parses provider JSON objects that wrap the cells in an array field", () => {
    expect(extractJsonArray('{"items":["Alpha","Beta","Gamma"]}')).toEqual(["Alpha", "Beta", "Gamma"]);
  });
});
