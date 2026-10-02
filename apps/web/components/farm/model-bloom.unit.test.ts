import { afterEach, describe, expect, it, vi } from 'vitest';
import { drawModelPlantSprite, loadModelPlantSprites } from './model-bloom';
import atlas from '../../lib/model-flower-atlas.json';

describe('ground planted model flowers', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('selects all twelve pot-free growth frames and anchors their roots to the ground', async () => {
    class TestImage extends EventTarget {
      complete = true;
      naturalWidth = 1536;
      naturalHeight = 1024;
      set src(_value: string) {
        this.dispatchEvent(new Event('load'));
      }
    }
    vi.stubGlobal('Image', TestImage);
    await loadModelPlantSprites();
    const drawImage = vi.fn();
    const context = {
      drawImage,
      fillRect: vi.fn(),
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D;
    for (const brand of ['openai', 'anthropic', 'google', 'grok'] as const) {
      for (const stage of ['seedling', 'flowering', 'mature'] as const) {
        const frame = atlas.frames[brand][stage];
        expect(
          drawModelPlantSprite(context, { x: 200, baseY: 300, height: 80, brand, stage }),
        ).toBe(true);
        const call = drawImage.mock.calls.at(-1)!;
        expect(call.slice(1, 5)).toEqual([frame.x, frame.y, frame.width, frame.height]);
        expect(frame.x + frame.width).toBeLessThanOrEqual(atlas.width);
        expect(frame.y + frame.height).toBeLessThanOrEqual(atlas.height);
        expect(call[5] + (call[7] * frame.anchorX) / frame.width).toBeCloseTo(200);
        expect(call[6] + (call[8] * frame.anchorY) / frame.height).toBeCloseTo(300);
      }
    }
    expect(drawImage).toHaveBeenCalledTimes(12);
  });
});
