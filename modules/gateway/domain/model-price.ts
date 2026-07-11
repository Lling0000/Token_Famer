import type { Ratio, UtcInstant } from '@token-farmer/primitives';

export interface ModelPriceVersion {
  readonly version: string;
  readonly modelId: string;
  readonly effectiveFrom: UtcInstant;
  readonly effectiveUntil?: UtcInstant;
  readonly inputRate: Ratio;
  readonly outputRate: Ratio;
  readonly cacheWriteRate: Ratio;
  readonly cacheReadRate: Ratio;
}
