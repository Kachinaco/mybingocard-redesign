import type { Instrumentation } from "next";
import { notifyServerErrorCaptured } from "@/lib/discord";

declare global {
  // eslint-disable-next-line no-var
  var __myBingoCardServerErrorListenersRegistered: boolean | undefined;
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

function reportServerError(
  type: string,
  error: unknown,
  context: Partial<Parameters<typeof notifyServerErrorCaptured>[0]> = {}
) {
  const details = getErrorDetails(error);
  notifyServerErrorCaptured({
    type,
    message: details.message,
    stack: details.stack,
    digest: details.digest,
    buildId: process.env.NEXT_PUBLIC_APP_BUILD_ID || process.env.BUILD_ID || process.env.GIT_SHA || null,
    ...context,
  }).catch((notifyError) => {
    console.error("Server error Discord notification failed:", notifyError);
  });
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (globalThis.__myBingoCardServerErrorListenersRegistered) return;
    globalThis.__myBingoCardServerErrorListenersRegistered = true;

    // Catch unhandled promise rejections to prevent PM2 restarts
    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled Promise Rejection:", reason);
      reportServerError("unhandled_rejection", reason, { routeType: "process" });
    });

    // Catch uncaught exceptions to prevent PM2 restarts
    process.on("uncaughtException", (error) => {
      console.error("Uncaught Exception:", error);
      reportServerError("uncaught_exception", error, { routeType: "process" });
      // Don't exit — let the process continue serving requests
    });
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  reportServerError("next_request_error", error, {
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
    routerKind: context.routerKind,
  });
};
