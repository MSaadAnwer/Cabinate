import { requestJson } from "./http.ts";
import { accessToken, credentialsRejected } from "./credentials.ts";

export async function authenticatedJson<T>(url: string, options: RequestInit = {}, timeoutMs = 15000): Promise<T> {
  const token = await accessToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  try { return await requestJson<T>(url, { ...options, headers }, timeoutMs); }
  catch (error) {
    if ((error as { status?: number }).status === 401) credentialsRejected(token);
    throw error;
  }
}
