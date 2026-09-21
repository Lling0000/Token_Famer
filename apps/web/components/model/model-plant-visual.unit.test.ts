import { describe, expect, it } from 'vitest';
import { MODELS } from '../../lib/game-data';
import { getModelPlantVisual } from './model-plant-visual';

describe('model plant visuals', () => {
  it('uses exactly the four approved flower brands', () => {
    expect(new Set(MODELS.map((model) => model.brand))).toEqual(
      new Set(['openai', 'anthropic', 'google', 'grok']),
    );
  });

  it('gives every model from one brand the same flower visual', () => {
    for (const brand of ['openai', 'anthropic', 'google', 'grok'] as const) {
      const visuals = MODELS.filter((model) => model.brand === brand).map(getModelPlantVisual);
      expect(visuals.length).toBeGreaterThan(0);
      expect(new Set(visuals).size).toBe(1);
    }
  });
});
