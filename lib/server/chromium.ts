import { existsSync } from "node:fs";
import type { LaunchOptions } from "puppeteer";

const CHROME_ENV_KEYS = [
  "PUPPETEER_EXECUTABLE_PATH",
  "GOOGLE_CHROME_BIN",
  "CHROME_BIN",
] as const;

export function getChromiumExecutablePath(): string | undefined {
  for (const key of CHROME_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }

  if (process.platform === "darwin") {
    const defaultPath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    return existsSync(defaultPath) ? defaultPath : undefined;
  }

  if (process.platform === "linux") {
    const defaultPath = "/usr/bin/google-chrome";
    return existsSync(defaultPath) ? defaultPath : undefined;
  }

  return undefined;
}

export function getPuppeteerLaunchOptions(): LaunchOptions {
  const executablePath = getChromiumExecutablePath();
  return {
    ...(executablePath ? { executablePath } : {}),
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  };
}
