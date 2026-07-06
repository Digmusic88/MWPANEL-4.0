const SECRETARIA_API = process.env.SECRETARIA_API_URL || 'http://mw-secretaria-api:3010/api';

export async function getFicha(mwStudentId: string, token: string): Promise<{ status: number; body: any }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${SECRETARIA_API}/secretaria/ficha/by-mwpanel/${mwStudentId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
    });
    let body: any = null;
    try { body = await res.json(); } catch { body = null; }
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}
