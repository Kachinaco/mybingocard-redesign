export type HoneypotResult = {
  blocked: boolean;
  reason?: "filled_hidden_field" | "submitted_too_fast";
  elapsedMs?: number;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asTimestamp(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function evaluateHoneypot(input: {
  hiddenField?: unknown;
  startedAt?: unknown;
  now?: number;
  minElapsedMs?: number;
}): HoneypotResult {
  if (asString(input.hiddenField)) {
    return { blocked: true, reason: "filled_hidden_field" };
  }

  const startedAt = asTimestamp(input.startedAt);
  if (startedAt === null) return { blocked: false };

  const now = typeof input.now === "number" && Number.isFinite(input.now) ? input.now : Date.now();
  const elapsedMs = now - startedAt;
  const minElapsedMs = input.minElapsedMs ?? 1200;

  if (elapsedMs >= 0 && elapsedMs < minElapsedMs) {
    return { blocked: true, reason: "submitted_too_fast", elapsedMs };
  }

  return { blocked: false, elapsedMs };
}
