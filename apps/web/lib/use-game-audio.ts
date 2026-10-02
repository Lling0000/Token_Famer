'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FarmTool } from './game-types';
import { FarmAudioEngine } from './farm-audio-engine';

export function useGameAudio(active: boolean) {
  const engineRef = useRef<FarmAudioEngine | null>(null);
  const [muted, setMuted] = useState(false);
  const [musicMuted, setMusicMuted] = useState(true);
  const preferences = useRef({ muted, musicMuted });
  preferences.current = { muted, musicMuted };
  const ensureEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new FarmAudioEngine();
      engineRef.current.setMuted(preferences.current.muted);
      engineRef.current.setMusicMuted(preferences.current.musicMuted);
    }
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
    return () => {
      document.removeEventListener('pointerdown', playButtonClick, true);
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [active, ensureEngine]);

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
  const toggleMusic = () => {
    const nextMuted = !musicMuted;
    ensureEngine().setMusicMuted(nextMuted);
    setMusicMuted(nextMuted);
  };

  return { muted, toggleMuted, musicMuted, toggleMusic, playFarmEffect, playDogBark };
}
