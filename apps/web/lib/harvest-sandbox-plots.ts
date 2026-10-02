import { getCrop } from './game-data';
import { applyFarmAction, getPlotPhase } from './game-engine';
import type { FarmPlot, ModelId, TokenPackage } from './game-types';

interface HarvestInput {
  plots: readonly FarmPlot[];
  nowMs: number;
  modelId: ModelId;
  balance: bigint;
}

export function harvestSandboxPlots(input: HarvestInput) {
  const packages: TokenPackage[] = [];
  const plots = input.plots.map((plot) => {
    if (getPlotPhase(plot, input.nowMs) !== 'mature') return plot;
    const crop = getCrop(plot.cropId);
    if (!crop) return plot;
    const modelId = plot.modelId ?? input.modelId;
    const result = applyFarmAction({
      plot,
      tool: 'harvest',
      crop,
      modelId,
      nowMs: input.nowMs,
      walletBalance: input.balance,
    });
    if (result.packageAmount > 0n)
      packages.push({
        id: `${plot.id}-${input.nowMs}`,
        cropName: crop.name,
        modelId,
        amount: result.packageAmount,
        createdAt: '刚刚',
        source: 'harvest',
      });
    return result.plot;
  });
  return { plots, packages };
}
