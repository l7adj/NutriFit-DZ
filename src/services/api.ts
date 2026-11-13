export const API_ENABLED = import.meta.env.VITE_API_ENABLED === 'true';
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/,'');

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin' | 'kitchen' | 'delivery';
}
export interface ApiSession {
  token: string;
  user: ApiUser;
}
export async function apiRequest<T>(
  path: string,
  token?: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type','application/json');
  if (token) headers.set('Authorization','Bearer ' + token);
  const response = await fetch(API_BASE + path,{...init,headers});
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload?.error === 'string' ? payload.error : 'تعذر الاتصال بالخدمة.');
  }
  return payload as T;
}
