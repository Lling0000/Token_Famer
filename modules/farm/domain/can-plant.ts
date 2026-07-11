import {
  DomainInvariantError,
  multiplyByRatios,
  type Ratio,
  type TokenAmount,
} from '@token-farmer/primitives';

import type { CropRuleVersion } from './farm-rules';

export interface PlantWalletSnapshot {
  readonly availableTokens: TokenAmount;
  readonly rewardReserveAvailable: TokenAmount;
}

export interface PlantPlotSnapshot {
  readonly status: 'idle' | 'growing' | 'mature' | 'locked';
  readonly plotLevel: number;
  readonly farmerLevel: number;
  readonly yieldRate: Ratio;
}

export type PlantRejectionReason =
  | 'plot_not_idle'
  | 'farmer_level_too_low'
  | 'plot_level_too_low'
  | 'insufficient_wallet_balance'
  | 'insufficient_reward_reserve';

export type PlantDecision =
  | {
      readonly allowed: true;
      readonly seedCost: TokenAmount;
      readonly rewardReserveRequired: TokenAmount;
    }
  | {
      readonly allowed: false;
      readonly reason: PlantRejectionReason;
      readonly seedCost: TokenAmount;
      readonly rewardReserveRequired: TokenAmount;
    };

function validateCrop(crop: CropRuleVersion): void {
  if (crop.seedCost === 0n || crop.baseFruitCount === 0n) {
    throw new DomainInvariantError(
      'INVALID_CROP_RULE',
      'Crop cost and fruit count must be positive',
    );
  }
}

export function canPlant(
  wallet: PlantWalletSnapshot,
  plot: PlantPlotSnapshot,
  crop: CropRuleVersion,
): PlantDecision {
  validateCrop(crop);
  const rewardReserveRequired = multiplyByRatios(crop.seedCost, [
    crop.maximumReturnRate,
    plot.yieldRate,
  ]);
  const common = { seedCost: crop.seedCost, rewardReserveRequired };
  if (plot.status !== 'idle') return { allowed: false, reason: 'plot_not_idle', ...common };
  if (plot.farmerLevel < crop.requiredFarmerLevel)
    return { allowed: false, reason: 'farmer_level_too_low', ...common };
  if (plot.plotLevel < crop.requiredPlotLevel)
    return { allowed: false, reason: 'plot_level_too_low', ...common };
  if (wallet.availableTokens < crop.seedCost)
    return { allowed: false, reason: 'insufficient_wallet_balance', ...common };
  if (wallet.rewardReserveAvailable < rewardReserveRequired) {
    return { allowed: false, reason: 'insufficient_reward_reserve', ...common };
  }
  return { allowed: true, ...common };
}
