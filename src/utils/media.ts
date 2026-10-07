import { ENV } from '../constants/env';

/** Absolute URLs also work inside the sandboxed srcdoc iframe. Native and
 * production builds keep the original server URL. No tokens go into URLs. */
export function webDevMediaUrl(url: string): string {
  const browserOrigin =
    typeof window !== 'undefined' && typeof window.location?.origin === 'string'
      ? window.location.origin
      : null;
  if (!browserOrigin || typeof __DEV__ === 'undefined' || !__DEV__) return url;
  const parsed = new URL(url);
  if (parsed.origin !== new URL(ENV.API_BASE_URL).origin
    || !/^\/flipbooks\/.*\.(jpe?g|png|webp)$/i.test(parsed.pathname)) return url;
  return `${browserOrigin}/__mekobook_media${parsed.pathname}${parsed.search}`;
}
