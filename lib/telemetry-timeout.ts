const TIMED_OUT = Symbol("telemetry-timeout");

export async function withTelemetryTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
): Promise<{ timedOut: boolean; value?: T }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), timeoutMs);
  });

  try {
    const result = await Promise.race([operation, timeout]);
    if (result === TIMED_OUT) {
      return { timedOut: true };
    }
    return { timedOut: false, value: result as T };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
