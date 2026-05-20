import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export type CurrentBuildInfo = {
  buildId: string | null;
  buildCreatedAt: Date | null;
  gitSha: string | null;
  gitShortSha: string | null;
  source: "next-build" | "env" | "unknown";
};

function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readGitSha(rootDir: string): string | null {
  try {
    return cleanString(execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 3000,
    }));
  } catch {
    return null;
  }
}

export function getCurrentBuildInfo(rootDir = process.cwd()): CurrentBuildInfo {
  const buildIdPath = join(rootDir, ".next", "BUILD_ID");
  const gitSha = cleanString(process.env.GIT_SHA) || readGitSha(rootDir);

  if (existsSync(buildIdPath)) {
    const stat = statSync(buildIdPath);
    return {
      buildId: cleanString(readFileSync(buildIdPath, "utf8")),
      buildCreatedAt: stat.mtime,
      gitSha,
      gitShortSha: gitSha ? gitSha.slice(0, 12) : null,
      source: "next-build",
    };
  }

  const envBuildId = cleanString(process.env.NEXT_PUBLIC_APP_BUILD_ID) ||
    cleanString(process.env.BUILD_ID) ||
    gitSha;

  return {
    buildId: envBuildId,
    buildCreatedAt: null,
    gitSha,
    gitShortSha: gitSha ? gitSha.slice(0, 12) : null,
    source: envBuildId ? "env" : "unknown",
  };
}
