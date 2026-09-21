import { describe, expect, it } from 'vitest';
import { SHOP_CROPS, getModel } from './game-data';

describe('shop crop catalog', () => {
  it('shows one flower for each approved brand', () => {
    expect(SHOP_CROPS.map((crop) => crop.name)).toEqual([
      'ChatGPT 花',
      'Claude 花',
      'Gemini 花',
      'Grok 花',
    ]);
    expect(new Set(SHOP_CROPS.map((crop) => getModel(crop.modelId).brand))).toEqual(
      new Set(['openai', 'anthropic', 'google', 'grok']),
    );
  });
});
