export interface RegisterAccountInput {
  inviteCode: string;
  email: string;
  displayName: string;
  password: string;
}

export interface RegistrationResult {
  userId: string;
  email: string;
  totpUri: string;
  sandboxVerificationCode?: string;
}

export interface LoginResult {
  expiresInSeconds: number;
  firstLoginGrant: boolean;
  email: string;
  displayName: string;
}

export interface SessionResult {
  authenticated: true;
  email: string;
  displayName: string;
  expiresAt: string;
}

interface ApiErrorBody {
  error?: { message?: string };
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'Email is already registered': '这个邮箱已经注册，请直接登录。',
  'Invitation is invalid or expired': '邀请码无效或已过期。',
  'Verification code is invalid or expired': '邮箱验证码错误或已过期。',
  'Email or password is invalid': '邮箱或密码错误。',
  'Two-factor code is invalid': '两步验证码错误，请确认设备时间正确。',
  'Two-factor authentication is not configured': '账号尚未完成两步验证设置。',
};

const requestError = (message: string | undefined): Error =>
  new Error((message && AUTH_ERROR_MESSAGES[message]) ?? message ?? '请求失败，请稍后重试');

const authRequest = async <T>(
  path: string,
  options: { method?: 'GET' | 'POST'; body?: object } = {},
): Promise<T> => {
  const method = options.method ?? 'GET';
  const response = await fetch(path, {
    method,
    credentials: 'include',
    headers:
      method === 'POST'
        ? { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }
        : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  }).catch(() => {
    throw new Error('无法连接账号服务，请检查网络后重试。');
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw requestError(body.error?.message);
  }
  return (await response.json()) as T;
};

export const registerAccount = (input: RegisterAccountInput): Promise<RegistrationResult> =>
  authRequest('/api/auth/register', { method: 'POST', body: input });

export const verifyAccountEmail = (email: string, code: string): Promise<{ verified: true }> =>
  authRequest('/api/auth/verify-email', { method: 'POST', body: { email, code } });

export const loginAccount = (email: string, password: string, totp: string): Promise<LoginResult> =>
  authRequest('/api/auth/login', { method: 'POST', body: { email, password, totp } });

export const loadAuthSession = (): Promise<SessionResult> => authRequest('/api/auth/session');

export const logoutAccount = (): Promise<{ loggedOut: true }> =>
  authRequest('/api/auth/logout', { method: 'POST' });
