'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FarmTool } from './game-types';
import { FarmAudioEngine } from './farm-audio-engine';

export function useGameAudio(active: boolean) {
  const engineRef = useRef<FarmAudioEngine | null>(null);
  const [muted, setMuted] = useState(false);
  const ensureEngine = useCallback(() => {
    engineRef.current ??= new FarmAudioEngine();
    void engineRef.current.resumeAndStart();
    return engineRef.current;
  }, []);

  useEffect(() => {
    if (!active) return;
    const playButtonClick = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const engine = ensureEngine();
      if (target?.closest('button, [role="button"]')) engine.playClick();
    };
    document.addEventListener('pointerdown', playButtonClick, true);
    return () => document.removeEventListener('pointerdown', playButtonClick, true);
  }, [active, ensureEngine]);

  useEffect(() => {
    return () => engineRef.current?.destroy();
  }, []);

  const toggleMuted = useCallback(() => {
    const engine = ensureEngine();
    const nextMuted = !engine.isMuted();
    engine.setMuted(nextMuted);
    setMuted(nextMuted);
  }, [ensureEngine]);

  const playFarmEffect = useCallback(
    (tool: FarmTool) => ensureEngine().playFarmEffect(tool),
    [ensureEngine],
  );
  const playDogBark = useCallback(() => ensureEngine().playDogBark(), [ensureEngine]);

  return { muted, toggleMuted, playFarmEffect, playDogBark };
}
