import { addTokenAmounts, multiplyByRatio, type TokenAmount } from '@token-farmer/primitives';

import type { ModelPriceVersion } from './model-price';

export interface ApiUsage {
  readonly uncachedInputTokens: TokenAmount;
  readonly outputTokens: TokenAmount;
  readonly cacheWriteTokens: TokenAmount;
  readonly cacheReadTokens: TokenAmount;
}

export interface ApiChargeResult {
  readonly modelId: string;
  readonly priceVersion: string;
  readonly inputCharge: TokenAmount;
  readonly outputCharge: TokenAmount;
  readonly cacheWriteCharge: TokenAmount;
  readonly cacheReadCharge: TokenAmount;
  readonly totalCharge: TokenAmount;
}

export function calculateApiCharge(usage: ApiUsage, price: ModelPriceVersion): ApiChargeResult {
  const inputCharge = multiplyByRatio(usage.uncachedInputTokens, price.inputRate, 'ceil');
  const outputCharge = multiplyByRatio(usage.outputTokens, price.outputRate, 'ceil');
  const cacheWriteCharge = multiplyByRatio(usage.cacheWriteTokens, price.cacheWriteRate, 'ceil');
  const cacheReadCharge = multiplyByRatio(usage.cacheReadTokens, price.cacheReadRate, 'ceil');
  return {
    modelId: price.modelId,
    priceVersion: price.version,
    inputCharge,
    outputCharge,
    cacheWriteCharge,
    cacheReadCharge,
    totalCharge: addTokenAmounts(inputCharge, outputCharge, cacheWriteCharge, cacheReadCharge),
  };
}
