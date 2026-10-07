import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ENV } from '../constants/env';
export const authHttp = axios.create({ timeout: 15000,
  headers: { Accept: 'application/json', 'ngrok-skip-browser-warning': 'true' } });
export const apiHttp = axios.create({ baseURL: ENV.API_BASE_URL, timeout: 15000,
  headers: { Accept: 'application/json', 'ngrok-skip-browser-warning': 'true' } });
let token: string | null = null;
let renewSession: (() => Promise<string>) | null = null;
let renewal: Promise<string> | null = null;
function useWebDevProxy(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const browserOrigin =
    typeof window !== 'undefined' && typeof window.location?.origin === 'string'
      ? window.location.origin
      : null;
  if (browserOrigin && typeof __DEV__ !== 'undefined' && __DEV__) {
    const url = new URL(config.url || '', config.baseURL || ENV.API_BASE_URL);
    if (url.origin === new URL(ENV.API_BASE_URL).origin && url.pathname.startsWith('/o/')) {
      config.baseURL = browserOrigin;
      config.url = `/__mekobook_api${url.pathname}${url.search}`;
    }
  }
  return config;
}
authHttp.interceptors.request.use(useWebDevProxy);
export function setApiAccessToken(value: string | null) { token = value; }
export function setSessionRenewal(handler: (() => Promise<string>) | null) { renewSession = handler; }
apiHttp.interceptors.request.use(config => {
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return useWebDevProxy(config);
});
apiHttp.interceptors.response.use(response => response, async (error: AxiosError) => {
  const config = error.config as (InternalAxiosRequestConfig & { retried?: boolean }) | undefined;
  if (error.response?.status === 401 && config && !config.retried && renewSession) {
    config.retried = true;
    renewal ??= renewSession().finally(() => { renewal = null; });
    config.headers.Authorization = `Bearer ${await renewal}`;
    return apiHttp.request(config);
  }
  throw error;
});
export function getMediaRequestHeaders(mediaUrl: string): Record<string, string> {
  let sameOrigin = false;
  try { sameOrigin = new URL(mediaUrl).origin === new URL(ENV.API_BASE_URL).origin; } catch {}
  return { 'ngrok-skip-browser-warning': 'true', ...(token && sameOrigin ? { Authorization: `Bearer ${token}` } : {}) };
}
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Không thể kết nối máy chủ. Kiểm tra mạng hoặc domain API.';
    if (error.response.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (error.response.status === 403) return 'Tài khoản chưa được cấp quyền truy cập dữ liệu này.';
    return `Máy chủ trả lỗi ${error.response.status}. Vui lòng thử lại.`;
  }
  return error instanceof Error ? error.message : 'Không thể tải dữ liệu. Vui lòng thử lại.';
}
