import { browserLanguage, validLanguage, storeLanguage } from './language';
import en from '@/locales/en.json';
import sw from '@/locales/sw.json';
import keys from '@/locales/source-keys.json';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
function errorMessage(message: string, code: string, status: number, translationKey?: string) {
  const language = browserLanguage();
  const key = translationKey || (keys as Record<string, string>)[message] || `errors.${status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : status === 413 ? 'upload_size' : code === 'NETWORK_ERROR' ? 'network' : status >= 500 ? 'server' : 'request'}`;
  const read = (messages: any) => key.split('.').reduce((obj, part) => obj?.[part], messages);
  return read(language === 'sw' ? sw : en) || read(en) || 'An unexpected error occurred. Please try again.';
}
export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept-Language': browserLanguage(), ...(options.headers as Record<string, string>) };
  let response: Response;
  try { response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers, credentials: 'include' }); }
  catch { const error: any = new Error(errorMessage('', 'NETWORK_ERROR', 0)); error.code = 'NETWORK_ERROR'; throw error; }
  let data: any;
  try { data = await response.json(); } catch { const error: any = new Error(errorMessage('', 'API_ERROR', response.status)); error.status = response.status; throw error; }
  if (!response.ok || !data.success) {
    const code = data.error?.code || 'API_ERROR';
    const error: any = new Error(errorMessage(data.error?.message || '', code, response.status, data.error?.translationKey));
    error.code = code; error.status = response.status; throw error;
  }
  if (typeof window !== 'undefined') {
    if (/^\/auth\/(verify-|register)/.test(endpoint) && data.data?.token && data.data?.user) {
      if (validLanguage(data.data.user.language)) storeLanguage(data.data.user.language);
      window.dispatchEvent(new CustomEvent('lumo:authenticated', { detail: data.data.user }));
    }
    if (endpoint === '/auth/logout') window.dispatchEvent(new Event('lumo:logout'));
  }
  return data.data;
}
