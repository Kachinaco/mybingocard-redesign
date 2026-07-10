import type { Instrumentation } from "next";
import { notifyServerErrorCaptured } from "@/lib/discord";

declare global {
  // eslint-disable-next-line no-var
  var __myBingoCardServerErrorListenersRegistered: boolean | undefined;
  // eslint-disable-next-line no-var
  var __myBingoCardServerErrorAlertState: Map<string, { sentAt: number; suppressed: number; pending: boolean }> | undefined;
}

const SERVER_ERROR_ALERT_COOLDOWN_MS = 30 * 60 * 1000;
const SERVER_ERROR_ALERT_STATE_MAX = 500;
const FATAL_ERROR_EXIT_GRACE_MS = 3_000;

function normalizeAlertPath(value: unknown) {
  return (String(value || "").split("?")[0] || "").slice(0, 300);
}

function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message || error.name || "Unknown server error",
      stack: error.stack || null,
      digest: typeof (error as Error & { digest?: unknown }).digest === "string"
        ? (error as Error & { digest?: string }).digest || null
        : null,
    };
  }

  if (typeof error === "string") {
    return { message: error, stack: null, digest: null };
  }

  let serialized = "Unknown server error";
  try {
    serialized = JSON.stringify(error).slice(0, 1000);
  } catch {
    serialized = String(error).slice(0, 1000);
  }

  return {
    message: "Unknown server error",
    stack: serialized,
    digest: null,
  };
}

function pruneServerErrorAlertState(
  state: Map<string, { sentAt: number; suppressed: number; pending: boolean }>,
  now: number
) {
  for (const [key, value] of state) {
    if (!value.pending && now - value.sentAt >= SERVER_ERROR_ALERT_COOLDOWN_MS * 2) {
      state.delete(key);
    }
  }
  while (state.size >= SERVER_ERROR_ALERT_STATE_MAX) {
    const oldestKey = state.keys().next().value as string | undefined;
    if (!oldestKey) break;
    state.delete(oldestKey);
  }
}

async function reportServerError(
  type: string,
  error: unknown,
  context: Partial<Parameters<typeof notifyServerErrorCaptured>[0]> = {}
): Promise<boolean> {
  const details = getErrorDetails(error);
  const path = normalizeAlertPath(context.path);
  const routePath = normalizeAlertPath(context.routePath);
  const key = [
    type,
    details.message.replace(/\s+/g, " ").slice(0, 300),
    path,
    routePath,
  ].join("|");
  const state = globalThis.__myBingoCardServerErrorAlertState ||= new Map();
  const now = Date.now();
  pruneServerErrorAlertState(state, now);
  const previous = state.get(key);
  if (previous && (previous.pending || now - previous.sentAt < SERVER_ERROR_ALERT_COOLDOWN_MS)) {
    previous.suppressed += 1;
    return false;
  }
  const suppressed = previous?.suppressed || 0;
  state.set(key, { sentAt: previous?.sentAt || 0, suppressed, pending: true });

  try {
    const delivered = await notifyServerErrorCaptured({
      type,
      message: suppressed > 0
        ? `${details.message} (${suppressed} duplicate occurrence${suppressed === 1 ? "" : "s"} suppressed in the prior 30 minutes)`
        : details.message,
      stack: details.stack,
      digest: details.digest,
      buildId: process.env.NEXT_PUBLIC_APP_BUILD_ID || process.env.BUILD_ID || process.env.GIT_SHA || null,
      ...context,
      path,
      routePath,
    });

    if (delivered) {
      state.set(key, { sentAt: Date.now(), suppressed: 0, pending: false });
      return true;
    }

    state.delete(key);
    return false;
  } catch (notifyError) {
    state.delete(key);
    console.error("Server error Discord notification failed:", notifyError);
    return false;
  }
}

async function reportFatalProcessError(type: string, error: unknown) {
  // Access exit indirectly so the shared instrumentation module remains
  // parseable for Next's Edge bundle; this branch only runs in nodejs.
  const exitProcess = () => {
    const exit = Reflect.get(process, "exit") as (code?: number) => never;
    exit.call(process, 1);
  };
  const forcedExit = setTimeout(exitProcess, FATAL_ERROR_EXIT_GRACE_MS);
  try {
    await reportServerError(type, error, { routeType: "process" });
  } finally {
    clearTimeout(forcedExit);
    exitProcess();
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (globalThis.__myBingoCardServerErrorListenersRegistered) return;
    globalThis.__myBingoCardServerErrorListenersRegistered = true;

    // Report fatal process errors briefly, then exit so PM2 can replace the process.
    process.once("unhandledRejection", (reason) => {
      console.error("Unhandled Promise Rejection:", reason);
      void reportFatalProcessError("unhandled_rejection", reason);
    });

    process.once("uncaughtException", (error) => {
      console.error("Uncaught Exception:", error);
      void reportFatalProcessError("uncaught_exception", error);
    });
  }
}

export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  void reportServerError("next_request_error", error, {
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
    routerKind: context.routerKind,
  }).catch((notifyError) => {
    console.error("Server request error notification failed:", notifyError);
  });
};
