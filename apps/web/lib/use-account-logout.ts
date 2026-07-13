'use client';

import { useCallback, useState } from 'react';
import { logoutAccount } from './auth-client';

export function useAccountLogout() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logout = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await logoutAccount();
      window.location.assign('/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '退出失败，请稍后重试');
      setBusy(false);
    }
  }, []);
  return { busy, error, logout };
}
