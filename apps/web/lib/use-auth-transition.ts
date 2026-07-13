'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { AuthenticatedAccount } from './use-auth-flow';

type AppScreen = 'auth' | 'onboarding' | 'game';

export const useAuthTransition = (
  setNickname: Dispatch<SetStateAction<string>>,
  setScreen: Dispatch<SetStateAction<AppScreen>>,
) =>
  useCallback(
    (account: AuthenticatedAccount) => {
      setNickname(account.displayName);
      setScreen(account.firstLoginGrant ? 'onboarding' : 'game');
    },
    [setNickname, setScreen],
  );
