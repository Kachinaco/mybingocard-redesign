import {
  getBrowserStorageItem,
  setBrowserStorageItem,
} from "@/lib/browser-storage";

const LAST_VISIT_KEY = "mbc_last_visit_date";
const SESSION_COUNT_KEY = "mbc_session_count";
const CORE_ACTION_KEY = "mbc_core_action_taken";
const HAD_ERRORS_KEY = "mbc_had_errors";

let memoryLastVisit: string | null = null;
let memorySessionCount = 0;
let memoryCoreAction = false;
let memoryHadErrors = false;

function parseCount(value: string): number {
  const parsed = parseInt(value || "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getSessionStats(): {
  lastVisit: string | null;
  sessionCount: number;
} | null {
  if (typeof window === "undefined") return null;
  const lastVisit = getBrowserStorageItem("localStorage", LAST_VISIT_KEY) || memoryLastVisit;
  const sessionCount = parseCount(getBrowserStorageItem("localStorage", SESSION_COUNT_KEY)) || memorySessionCount;
  return { lastVisit, sessionCount };
}

export function updateSessionStats(): void {
  if (typeof window === "undefined") return;
  const now = new Date().toISOString();
  memoryLastVisit = now;
  const count = parseCount(getBrowserStorageItem("localStorage", SESSION_COUNT_KEY)) || memorySessionCount;
  memorySessionCount = count + 1;
  setBrowserStorageItem("localStorage", LAST_VISIT_KEY, now);
  setBrowserStorageItem("localStorage", SESSION_COUNT_KEY, String(memorySessionCount));
}

export function markCoreAction(): void {
  if (typeof window === "undefined") return;
  memoryCoreAction = true;
  setBrowserStorageItem("sessionStorage", CORE_ACTION_KEY, "1");
}

export function hasCoreAction(): boolean {
  if (typeof window === "undefined") return false;
  return getBrowserStorageItem("sessionStorage", CORE_ACTION_KEY) === "1" || memoryCoreAction;
}

export function markError(): void {
  if (typeof window === "undefined") return;
  memoryHadErrors = true;
  setBrowserStorageItem("sessionStorage", HAD_ERRORS_KEY, "1");
}

export function hadErrors(): boolean {
  if (typeof window === "undefined") return false;
  return getBrowserStorageItem("sessionStorage", HAD_ERRORS_KEY) === "1" || memoryHadErrors;
}
