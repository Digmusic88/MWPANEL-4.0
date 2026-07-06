const SECRETARIA_API = process.env.SECRETARIA_API_URL || 'http://mw-secretaria-api:3010/api';

export function buildUrl(base: string, path: string, query: Record<string, string | undefined>): string {
  const qs = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `${base}/${path}${qs ? `?${qs}` : ''}`;
}

export interface ForwardOpts {
  query?: Record<string, string | undefined>;
  body?: any;
}

/** Reenvía una petición al backend de Secretaría con el JWT (crudo) del profesor. */
export async function forwardToSecretaria(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  token: string,
  opts: ForwardOpts = {},
): Promise<{ status: number; body: any }> {
  const url = buildUrl(SECRETARIA_API, path, opts.query || {});
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: ctrl.signal,
    });
    let body: any = null;
    try { body = await res.json(); } catch { body = null; }
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}
