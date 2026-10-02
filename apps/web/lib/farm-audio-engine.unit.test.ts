import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FarmAudioEngine } from './farm-audio-engine';

class AudioNodeStub {
  gain = {
    value: 1,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
  };
  frequency = { value: 0, setValueAtTime: vi.fn() };
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

describe('effects-only farm audio', () => {
  const oscillators: AudioNodeStub[] = [];
  const close = vi.fn();
  beforeEach(() => {
    oscillators.length = 0;
    vi.useFakeTimers();
    vi.stubGlobal('window', { setInterval, clearInterval });
    vi.stubGlobal(
      'AudioContext',
      class {
        currentTime = 0;
        state = 'running';
        destination = {};
        sampleRate = 8000;
        close = close;
        createGain() {
          return new AudioNodeStub();
        }
        createOscillator() {
          const node = new AudioNodeStub();
          oscillators.push(node);
          return node;
        }
        createBuffer(_channels: number, length: number) {
          return { getChannelData: () => new Float32Array(length) };
        }
        createBufferSource() {
          return new AudioNodeStub();
        }
        createBiquadFilter() {
          return new AudioNodeStub();
        }
      },
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('does not schedule background tones until explicitly enabled', async () => {
    const engine = new FarmAudioEngine();
    await engine.resumeAndStart();
    expect(oscillators).toHaveLength(0);
    engine.playFarmEffect('water');
    expect(oscillators).toHaveLength(3);
    engine.setMusicMuted(false);
    vi.advanceTimersByTime(150);
    expect(oscillators.length).toBeGreaterThan(3);
    engine.destroy();
    expect(close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps tool effects audible with music off and suppresses them when globally muted', () => {
    const engine = new FarmAudioEngine();
    engine.setMusicMuted(true);
    engine.playFarmEffect('harvest');
    expect(oscillators).toHaveLength(3);
    engine.setMuted(true);
    engine.playFarmEffect('harvest');
    expect(oscillators).toHaveLength(3);
    engine.destroy();
  });
});
