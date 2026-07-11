'use client';

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import type { FarmDecoration } from './game-types';

interface GameShopInput {
  balance: bigint;
  setBalance: Dispatch<SetStateAction<bigint>>;
  setToast: Dispatch<SetStateAction<string | null>>;
  playDogBark: () => void;
  nowMs: number;
}

export function useGameShop(input: GameShopInput) {
  const [dogGuardUntilMs, setDogGuardUntilMs] = useState(() => input.nowMs + 24_000_000);
  const [ownedDecorations, setOwnedDecorations] = useState<FarmDecoration[]>(['none']);
  const [equippedDecoration, setEquippedDecoration] = useState<FarmDecoration>('none');

  const buyDogFood = useCallback(
    (itemId: string, durationHours: number, priceToken: bigint) => {
      if (input.balance < priceToken) return input.setToast('Token 余额不足，无法购买狗粮');
      input.setBalance((current) => current - priceToken);
      setDogGuardUntilMs((current) => Math.max(current, input.nowMs) + durationHours * 3_600_000);
      input.playDogBark();
      input.setToast(`${itemId} 已喂给萌犬，守护时间延长 ${durationHours / 24} 天`);
    },
    [input],
  );

  const useDecoration = useCallback(
    (decoration: FarmDecoration, priceToken: bigint) => {
      if (ownedDecorations.includes(decoration)) {
        setEquippedDecoration(decoration);
        return input.setToast('农场装扮已切换');
      }
      if (input.balance < priceToken) return input.setToast('Token 余额不足，无法购买装扮');
      input.setBalance((current) => current - priceToken);
      setOwnedDecorations((current) => [...current, decoration]);
      setEquippedDecoration(decoration);
      input.setToast('农场装扮已购买并装备');
    },
    [input, ownedDecorations],
  );

  return {
    dogGuardUntilMs,
    ownedDecorations,
    equippedDecoration,
    buyDogFood,
    useDecoration,
  };
}
