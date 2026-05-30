export type JsonObject = Record<string, any>;

export type JsonObjectResult<T extends JsonObject = JsonObject> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function readJsonObject<T extends JsonObject = JsonObject>(
  request: Request,
  errorMessage = "Invalid JSON body"
): Promise<JsonObjectResult<T>> {
  try {
    const data = await request.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return { ok: false, error: errorMessage };
    }

    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: errorMessage };
  }
}
