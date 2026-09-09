// Thin fetch wrapper standing in for MAUI's Constants.httpClient (60s timeout,
// a TokenHeader added after login). No extra HTTP library needed.

const TIMEOUT_MS = 60000;

let authToken: string | null = null;

/** Mirrors `Constants.httpClient.DefaultRequestHeaders.Add("TokenHeader", authtoken)`. */
export function setAuthToken(token: string | null) {
  authToken = token;
}

export class ApiError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

function headers(extra?: Record<string, string>): Record<string, string> {
  const base: Record<string, string> = { ...extra };
  if (authToken) {
    base.TokenHeader = authToken;
  }
  return base;
}

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fn(controller.signal);
  } catch (err) {
    if ((err as any)?.name === 'AbortError') {
      throw new ApiError('Request timed out', err);
    }
    throw new ApiError('Network request failed', err);
  } finally {
    clearTimeout(timer);
  }
}

/** GET returning the raw response body as text (some endpoints reply with a bare `true`/`false`). */
export async function getText(url: string): Promise<string> {
  return withTimeout(async signal => {
    const res = await fetch(url, { method: 'GET', headers: headers(), signal });
    return res.text();
  });
}

/** GET returning the response body parsed as JSON. */
export async function getJson<T>(url: string): Promise<T> {
  const text = await getText(url);
  return JSON.parse(text) as T;
}

/** POST with a JSON string body, returning the raw response text. */
export async function postJsonRaw(url: string, jsonBody: string): Promise<string> {
  return withTimeout(async signal => {
    const res = await fetch(url, {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: jsonBody,
      signal,
    });
    return res.text();
  });
}

/** POST with a JSON string body, returning the response parsed as JSON. */
export async function postJson<T>(url: string, jsonBody: string): Promise<T> {
  const text = await postJsonRaw(url, jsonBody);
  return JSON.parse(text) as T;
}
