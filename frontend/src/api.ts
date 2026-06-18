import axios from 'axios';
export const api = axios.create({ baseURL: '/api/secretaria' });
api.interceptors.request.use((c) => {
  const t = localStorage.getItem('secretaria_token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});
export function setToken(t: string) { localStorage.setItem('secretaria_token', t); localStorage.removeItem(ADMIN_KEY); }
export function clearToken() { localStorage.removeItem('secretaria_token'); localStorage.removeItem(ADMIN_KEY); }
export function getToken() { return localStorage.getItem('secretaria_token'); }

// ACCESO INTERNO (impersonación): guarda el token de admin y activa el del usuario destino;
// al volver, restaura el de admin.
const ADMIN_KEY = 'secretaria_admin_token';
export function beginImpersonation(impToken: string) {
  const cur = localStorage.getItem('secretaria_token');
  if (cur) localStorage.setItem(ADMIN_KEY, cur);
  localStorage.setItem('secretaria_token', impToken);
}
export function endImpersonation() {
  const admin = localStorage.getItem(ADMIN_KEY);
  if (admin) localStorage.setItem('secretaria_token', admin);
  localStorage.removeItem(ADMIN_KEY);
}
export function isImpersonating() { return !!localStorage.getItem(ADMIN_KEY); }
