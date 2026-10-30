export class HttpError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** GET JSON with a timeout. Throws HttpError on network failure, non-2xx, or bad JSON. */
export async function fetchJson<T>(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const { timeoutMs = 20_000, ...rest } = init;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...rest, signal: rest.signal ?? ctrl.signal });
    if (!res.ok) throw new HttpError(`${res.status} ${res.statusText}`, res.status);
    try {
      return (await res.json()) as T;
    } catch {
      throw new HttpError('Invalid JSON response', res.status);
    }
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if ((err as Error).name === 'AbortError') throw new HttpError('Request timed out');
    throw new HttpError((err as Error).message || 'Network error');
  } finally {
    clearTimeout(timer);
  }
}

export function qs(params: Record<string, string | number | boolean | string[] | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    sp.set(k, Array.isArray(v) ? v.join(',') : String(v));
  }
  return sp.toString();
}
