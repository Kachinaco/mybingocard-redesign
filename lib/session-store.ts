const LAST_VISIT_KEY = "mbc_last_visit_date";
const SESSION_COUNT_KEY = "mbc_session_count";
const CORE_ACTION_KEY = "mbc_core_action_taken";
const HAD_ERRORS_KEY = "mbc_had_errors";

export function getSessionStats(): {
  lastVisit: string | null;
  sessionCount: number;
} | null {
  if (typeof window === "undefined") return null;
  const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
  const sessionCount = parseInt(localStorage.getItem(SESSION_COUNT_KEY) || "0");
  return { lastVisit, sessionCount };
}

export function updateSessionStats(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
  const count = parseInt(localStorage.getItem(SESSION_COUNT_KEY) || "0");
  localStorage.setItem(SESSION_COUNT_KEY, String(count + 1));
}

export function markCoreAction(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CORE_ACTION_KEY, "1");
}

export function hasCoreAction(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(CORE_ACTION_KEY) === "1";
}

export function markError(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(HAD_ERRORS_KEY, "1");
}

export function hadErrors(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(HAD_ERRORS_KEY) === "1";
}
