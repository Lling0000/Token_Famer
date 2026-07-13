'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  loadAuthSession,
  loginAccount,
  registerAccount,
  verifyAccountEmail,
  type RegistrationResult,
} from './auth-client';

export type AuthMode = 'login' | 'register' | 'verify';

export interface AuthenticatedAccount {
  email: string;
  displayName: string;
  firstLoginGrant: boolean;
}

export interface AuthDraft {
  inviteCode: string;
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
  totp: string;
  verificationCode: string;
}

const INITIAL_DRAFT: AuthDraft = {
  inviteCode: '',
  displayName: '',
  email: '',
  password: '',
  confirmPassword: '',
  totp: '',
  verificationCode: '',
};

export function useAuthFlow(onAuthenticated: (account: AuthenticatedAccount) => void) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [draft, setDraft] = useState<AuthDraft>(INITIAL_DRAFT);
  const [registration, setRegistration] = useState<RegistrationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void loadAuthSession()
      .then((session) =>
        onAuthenticated({
          email: session.email,
          displayName: session.displayName,
          firstLoginGrant: false,
        }),
      )
      .catch(() => undefined);
  }, [onAuthenticated]);

  const updateDraft = (field: keyof AuthDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setError(null);
  };

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setNotice(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') await submitLogin(draft, onAuthenticated);
      else if (mode === 'register') {
        const result = await submitRegistration(draft);
        setRegistration(result);
        setMode('verify');
      } else {
        await verifyAccountEmail(draft.email, draft.verificationCode);
        setNotice('邮箱验证完成，请输入身份验证器中的 6 位动态码登录。');
        setMode('login');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '请求失败，请稍后重试');
    } finally {
      setBusy(false);
    }
  };

  return { mode, draft, registration, busy, error, notice, updateDraft, changeMode, submit };
}

const submitRegistration = async (draft: AuthDraft): Promise<RegistrationResult> => {
  if (draft.password !== draft.confirmPassword) throw new Error('两次输入的密码不一致');
  return registerAccount({
    inviteCode: draft.inviteCode.trim(),
    displayName: draft.displayName.trim(),
    email: draft.email.trim().toLowerCase(),
    password: draft.password,
  });
};

const submitLogin = async (
  draft: AuthDraft,
  onAuthenticated: (account: AuthenticatedAccount) => void,
): Promise<void> => {
  const result = await loginAccount(draft.email.trim().toLowerCase(), draft.password, draft.totp);
  onAuthenticated({
    email: result.email,
    displayName: result.displayName,
    firstLoginGrant: result.firstLoginGrant,
  });
};
