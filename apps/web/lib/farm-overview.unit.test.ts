import { describe, expect, it } from 'vitest';
import { createFarmPlots } from './game-engine';
import { getFarmOverview, getPlotAction } from './farm-overview';
import { harvestSandboxPlots } from './harvest-sandbox-plots';

describe('farm action guidance', () => {
  it('counts thirsty crops and counts a thirsty, weedy plot only once', () => {
    const plot = {
      ...createFarmPlots(0)[0],
      cropId: 'radish',
      plantedAtMs: 0,
      durationMs: 10000,
      watered: false,
      issue: 'weed' as const,
    };
    const overview = getFarmOverview([plot], 1000);
    expect(overview.careCount).toBe(1);
    expect(overview.waterIds).toEqual([1]);
    expect(overview.weedIds).toEqual([1]);
    expect(getPlotAction(plot, 1000)).toEqual({ tool: 'weed', label: '清除杂草' });
    expect(getPlotAction({ ...plot, issue: null }, 1000)?.tool).toBe('water');
  });
  it('prioritizes harvest over care and ignores locked or empty land', () => {
    const plots = createFarmPlots(0);
    const mature = { ...plots[0], cropId: 'radish', plantedAtMs: 0, durationMs: 1000 };
    const overview = getFarmOverview([mature, plots[1], plots[6]], 1000);
    expect(overview.matureIds).toEqual([1]);
    expect(overview.waterIds).toEqual([]);
    expect(overview.emptyIds).toEqual([2]);
    expect(getPlotAction(mature, 1000)?.tool).toBe('harvest');
    expect(getPlotAction(plots[6], 1000)).toBeNull();
  });
  it('keeps planted model identity and produces no second batch reward', () => {
    const plot = {
      ...createFarmPlots(0)[0],
      cropId: 'radish',
      plantedAtMs: 0,
      durationMs: 1000,
      modelId: 'grok-4.6' as const,
    };
    const input = { plots: [plot], nowMs: 1000, modelId: 'gpt-5.4' as const, balance: 0n };
    const harvest = harvestSandboxPlots(input);
    expect(harvest.packages).toHaveLength(1);
    expect(harvest.packages[0].modelId).toBe('grok-4.6');
    expect(harvestSandboxPlots({ ...input, plots: harvest.plots }).packages).toEqual([]);
  });
});
