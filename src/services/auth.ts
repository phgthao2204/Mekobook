import * as SecureStore from 'expo-secure-store';
import { ENV, getApiUrl } from '../config/env';
import { AuthSession, UserAccount } from '../types';
import { setApiAccessToken } from './api';

const SESSION_KEY = 'mekobook.auth.session';
const REQUEST_TIMEOUT_MS = 15_000;
const EXPIRY_SAFETY_WINDOW_MS = 30_000;

class AuthHttpError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = 'AuthHttpError';
  }
}

interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
}

function formEncode(values: Record<string, string>): string {
  return Object.entries(values)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AuthHttpError('Máy chủ phản hồi quá lâu. Vui lòng kiểm tra mạng và thử lại.');
    }
    throw new AuthHttpError('Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối Internet.');
  } finally {
    clearTimeout(timeout);
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body.error_description || body.title || body.message || body.error || '';
  } catch {
    return '';
  }
}

async function requestToken(values: Record<string, string>): Promise<OAuthTokenResponse> {
  if (!ENV.OAUTH.CLIENT_ID || !ENV.OAUTH.CLIENT_SECRET) {
    throw new Error('Thiếu EXPO_PUBLIC_OAUTH_CLIENT_ID hoặc EXPO_PUBLIC_OAUTH_CLIENT_SECRET.');
  }

  const oauthValues: Record<string, string> = {
    ...values,
    client_id: ENV.OAUTH.CLIENT_ID,
    client_secret: ENV.OAUTH.CLIENT_SECRET,
  };
  // The current Liferay server assigns its configured c_*.everything scopes
  // automatically. Sending an unsupported generic scope causes invalid_grant.
  if (ENV.OAUTH.SCOPE.trim()) {
    oauthValues.scope = ENV.OAUTH.SCOPE.trim();
  }

  const response = await fetchWithTimeout(getApiUrl(ENV.API_PATHS.OAUTH_TOKEN), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: formEncode(oauthValues),
  });

  if (!response.ok) {
    const details = await readErrorMessage(response);
    const invalidCredentials =
      response.status === 400 || response.status === 401 || response.status === 403;
    throw new AuthHttpError(
      invalidCredentials
        ? 'Tên đăng nhập hoặc mật khẩu không chính xác, hoặc tài khoản chưa được cấp quyền.'
        : `Không thể xác thực tài khoản (${response.status})${details ? `: ${details}` : '.'}`,
      response.status
    );
  }

  const token: OAuthTokenResponse = await response.json();
  if (!token.access_token || typeof token.access_token !== 'string') {
    throw new AuthHttpError('Máy chủ không trả về access token hợp lệ.');
  }
  return token;
}

async function getCurrentUser(accessToken: string): Promise<UserAccount> {
  const response = await fetchWithTimeout(
    getApiUrl(ENV.API_PATHS.MY_USER_ACCOUNT),
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
    }
  );

  if (!response.ok) {
    throw new AuthHttpError(`Không thể tải thông tin tài khoản (${response.status}).`, response.status);
  }

  const account = await response.json();
  return {
    ...account,
    id: Number(account.id || 0),
    name: account.name || account.givenName || account.alternateName || 'Người đọc',
    emailAddress: account.emailAddress || '',
  };
}

function createFallbackUser(username: string, reason: unknown): UserAccount {
  const message = reason instanceof Error ? reason.message : 'API hồ sơ không khả dụng.';
  console.warn('[Auth] OAuth succeeded but profile could not be loaded:', message);
  return {
    id: 0,
    name: username.trim(),
    emailAddress: username.includes('@') ? username.trim() : '',
    profileUnavailable: true,
    profileError: message,
  };
}

async function persistSession(session: AuthSession): Promise<AuthSession> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
  setApiAccessToken(session.accessToken);
  return session;
}

export async function login(username: string, password: string): Promise<AuthSession> {
  const normalizedUsername = username.trim();
  if (!normalizedUsername || !password) {
    throw new Error('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
  }

  const token = await requestToken({
    grant_type: 'password',
    username: normalizedUsername,
    password,
  });
  let user: UserAccount;
  try {
    user = await getCurrentUser(token.access_token);
  } catch (error) {
    // Liferay may issue a valid token while denying the profile endpoint (403).
    // Authentication remains valid, so the rest of the app can still use the token.
    if (error instanceof AuthHttpError && error.status === 401) {
      throw new Error('Access token không hợp lệ. Vui lòng đăng nhập lại.');
    }
    user = createFallbackUser(normalizedUsername, error);
  }

  return persistSession({
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    tokenType: token.token_type || 'Bearer',
    expiresAt: Date.now() + (token.expires_in || 600) * 1000,
    user,
  });
}

export async function refreshSession(session: AuthSession): Promise<AuthSession> {
  if (!session.refreshToken) {
    throw new Error('Phiên đăng nhập không có refresh token.');
  }

  const token = await requestToken({
    grant_type: 'refresh_token',
    refresh_token: session.refreshToken,
  });
  const accessToken = token.access_token;
  let user = session.user;
  try {
    user = await getCurrentUser(accessToken);
  } catch (error) {
    user = {
      ...session.user,
      profileUnavailable: true,
      profileError: error instanceof Error ? error.message : 'API hồ sơ không khả dụng.',
    };
  }

  return persistSession({
    accessToken,
    refreshToken: token.refresh_token || session.refreshToken,
    tokenType: token.token_type || 'Bearer',
    expiresAt: Date.now() + (token.expires_in || 600) * 1000,
    user,
  });
}

export async function restoreSession(): Promise<AuthSession | null> {
  try {
    const stored = await SecureStore.getItemAsync(SESSION_KEY);
    if (!stored) return null;

    const session: AuthSession = JSON.parse(stored);
    const isValidSession =
      typeof session.accessToken === 'string' &&
      session.accessToken.length > 0 &&
      Number.isFinite(session.expiresAt) &&
      Boolean(session.user?.name);
    if (!isValidSession) {
      await logout();
      return null;
    }

    if (session.expiresAt <= Date.now() + EXPIRY_SAFETY_WINDOW_MS) {
      return await refreshSession(session);
    }

    setApiAccessToken(session.accessToken);

    // Repair a session saved while the profile endpoint previously returned
    // 403. This removes the stale warning automatically after server rights
    // have been corrected, without forcing the reader to clear app data.
    if (session.user.profileUnavailable) {
      try {
        const user = await getCurrentUser(session.accessToken);
        return await persistSession({ ...session, user });
      } catch (error) {
        if (error instanceof AuthHttpError && error.status === 401 && session.refreshToken) {
          return await refreshSession(session);
        }
      }
    }

    return session;
  } catch (error) {
    console.warn('[Auth] Stored session could not be restored:', error);
    await logout();
    return null;
  }
}

export async function logout(): Promise<void> {
  setApiAccessToken(null);
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
