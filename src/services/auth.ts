import * as SecureStore from './sessionStorage';
import { ENV, getApiUrl } from '../constants/env';
import { SESSION_KEY } from '../constants/storage';
import { authHttp, errorMessage } from './http';
import { AuthSession, UserAccount } from '../types';
import { setApiAccessToken } from './api';

const REQUEST_TIMEOUT_MS = 15_000;
const EXPIRY_SAFETY_WINDOW_MS = 30_000;
let authEpoch = 0;
let sessionWrites: Promise<void> = Promise.resolve();

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

interface AuthResponse {
  ok: boolean;
  status: number;
  json: () => Promise<any>;
}

async function requestAuth(url: string, init: RequestInit): Promise<AuthResponse> {
  try {
    const response = await authHttp.request({ url, method: init.method || 'GET',
      headers: init.headers as Record<string, string>, data: init.body, timeout: REQUEST_TIMEOUT_MS,
      validateStatus: () => true });
    return { ok: response.status >= 200 && response.status < 300, status: response.status,
      json: async () => response.data };
  } catch (error) {
    throw new AuthHttpError(errorMessage(error));
  }
}

async function readErrorMessage(response: AuthResponse): Promise<string> {
  try {
    const body = await response.json();
    return body.error_description || body.title || body.message || body.error || '';
  } catch {
    return '';
  }
}

async function requestToken(values: Record<string, string>): Promise<OAuthTokenResponse> {
  if (!ENV.OAUTH.CLIENT_ID || !ENV.OAUTH.CLIENT_SECRET) {
    throw new Error('Chưa hoàn tất cấu hình OAuth. Cần xác nhận cơ chế đăng nhập an toàn hoặc cấu hình dev được phê duyệt.');
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

  const response = await requestAuth(getApiUrl(ENV.API_PATHS.OAUTH_TOKEN), {
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
    const body = await response.json();
    if (body?.error === 'invalid_client') {
      throw new AuthHttpError('Máy chủ từ chối cấu hình OAuth client. Vui lòng kiểm tra với quản trị viên.', response.status);
    }
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

export async function getCurrentUser(accessToken: string): Promise<UserAccount> {
  const response = await requestAuth(
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
    givenName: typeof account.givenName === 'string' ? account.givenName : '',
    familyName: typeof account.familyName === 'string' ? account.familyName : '',
    alternateName: typeof account.alternateName === 'string' ? account.alternateName : '',
    accountBriefs: Array.isArray(account.accountBriefs) ? account.accountBriefs : [],
  };
}

function createFallbackUser(username: string, reason: unknown): UserAccount {
  const message = reason instanceof Error ? reason.message : 'API hồ sơ không khả dụng.';
  console.info('[Auth] OAuth succeeded but profile could not be loaded:', message);
  return {
    id: 0,
    name: username.trim(),
    emailAddress: username.includes('@') ? username.trim() : '',
    profileUnavailable: true,
    profileError: message,
  };
}

async function persistSession(session: AuthSession, epoch = authEpoch): Promise<AuthSession> {
  const write = sessionWrites.then(async () => {
    if (epoch !== authEpoch) throw new Error('Phiên đăng nhập đã thay đổi.');
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
    if (epoch !== authEpoch) throw new Error('Phiên đăng nhập đã thay đổi.');
    setApiAccessToken(session.accessToken);
  });
  sessionWrites = write.catch(() => {});
  await write;
  return session;
}

export async function login(username: string, password: string): Promise<AuthSession> {
  const epoch = ++authEpoch;
  const normalizedUsername = username.trim();
  if (!normalizedUsername || !password) {
    throw new Error('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
  }

  const token = await requestToken({
    grant_type: 'password',
    username: normalizedUsername,
    password,
  });
  if (!token.refresh_token) throw new AuthHttpError('Máy chủ chưa cấp refresh token để duy trì phiên. Vui lòng kiểm tra cấu hình OAuth.');
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
  }, epoch);
}

export async function refreshSession(session: AuthSession): Promise<AuthSession> {
  const epoch = authEpoch;
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
  }, epoch);
}

export async function reloadUserProfile(session: AuthSession): Promise<AuthSession> {
  const epoch = authEpoch;
  const user = await getCurrentUser(session.accessToken);
  return persistSession({ ...session, user }, epoch);
}

export async function restoreSession(): Promise<AuthSession | null> {
  const epoch = authEpoch;
  try {
    const stored = await SecureStore.getItemAsync(SESSION_KEY);
    if (epoch !== authEpoch) return null;
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
        return await persistSession({ ...session, user }, epoch);
      } catch (error) {
        if (error instanceof AuthHttpError && error.status === 401 && session.refreshToken) {
          return await refreshSession(session);
        }
      }
    }

    return session;
  } catch (error) {
    console.warn('[Auth] Stored session could not be restored:', error);
    if (epoch === authEpoch) await logout();
    return null;
  }
}

export async function logout(): Promise<void> {
  authEpoch++;
  setApiAccessToken(null);
  const write = sessionWrites.then(() => SecureStore.deleteItemAsync(SESSION_KEY));
  sessionWrites = write.catch(() => {});
  await write;
}
