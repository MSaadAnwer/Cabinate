import type { ApiErrorResponse } from "../types/common";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

/** A deadline covers response headers and the body. Mutations are never retried. */
export async function requestJson<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs = 15000,
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const cancel = () => controller.abort();
  options.signal?.addEventListener("abort", cancel, { once: true });
  if (options.signal?.aborted) controller.abort();
  try {
    const headers = new Headers(options.headers);
    if (!headers.has("Accept")) headers.set("Accept", "application/json");
    if (!headers.has("Content-Type"))
      headers.set("Content-Type", "application/json");
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    if (!response.ok) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        /* An error page may be empty or HTML. */
      }
      throw {
        status: response.status,
        error: response.statusText || "Request Error",
        message:
          isRecord(body) && typeof body.message === "string" && body.message
            ? body.message
            : `Could not complete the request (${response.status}). Please try again.`,
        ...(isRecord(body) &&
        isRecord(body.fieldErrors) &&
        Object.values(body.fieldErrors).every(
          (value) => typeof value === "string",
        )
          ? { fieldErrors: body.fieldErrors as Record<string, string> }
          : {}),
      } satisfies ApiErrorResponse;
    }
    if (response.status === 204) return undefined as T;
    return await response.json();
  } catch (error: unknown) {
    if (
      isRecord(error) &&
      typeof error.status === "number" &&
      typeof error.message === "string"
    )
      throw error;
    const mutation =
      options.method && !["GET", "HEAD"].includes(options.method.toUpperCase());
    throw {
      status: 0,
      error: timedOut ? "Timeout" : "Network Error",
      message: mutation
        ? "Could not confirm your change. Check the saved content before trying again."
        : timedOut
          ? "Cabinate took too long to respond. Please try again."
          : "Could not connect to Cabinate. Check your connection and try again.",
    } satisfies ApiErrorResponse;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", cancel);
  }
}
