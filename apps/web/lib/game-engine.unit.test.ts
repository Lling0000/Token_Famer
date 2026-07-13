import { describe, expect, it } from 'vitest';
import { getCrop } from './game-data';
import { applyFarmAction, createFarmPlots, formatTokenAmount, getPlotPhase } from './game-engine';

describe('farm engine', () => {
  it('creates 24 plots and only unlocks the starter six', () => {
    const plots = createFarmPlots(0);
    expect(plots).toHaveLength(24);
    expect(plots.filter((plot) => plot.unlocked)).toHaveLength(6);
  });

  it('plants using integer token amounts', () => {
    const crop = requireCrop('radish');
    const plot = createFarmPlots(0)[0];
    const result = applyFarmAction({
      plot,
      tool: 'seed',
      crop,
      modelId: 'gpt-5.4-mini',
      nowMs: 100,
      walletBalance: 20_000n,
    });
    expect(result.changed).toBe(true);
    expect(result.balanceDelta).toBe(-10_000n);
    expect(result.plot.cropId).toBe('radish');
  });

  it('does not harvest before maturity', () => {
    const crop = requireCrop('radish');
    const planted = applyFarmAction({
      plot: createFarmPlots(0)[0],
      tool: 'seed',
      crop,
      modelId: 'gpt-5.4-mini',
      nowMs: 0,
      walletBalance: 20_000n,
    }).plot;
    expect(getPlotPhase(planted, 10_000)).not.toBe('mature');
    const result = applyFarmAction({
      plot: planted,
      tool: 'harvest',
      crop,
      modelId: 'gpt-5.4-mini',
      nowMs: 10_000,
      walletBalance: 10_000n,
    });
    expect(result.changed).toBe(false);
  });

  it('keeps the free starter seed at a fixed small return', () => {
    const crop = requireCrop('starter-bloom');
    const planted = applyFarmAction({
      plot: createFarmPlots(0)[0],
      tool: 'seed',
      crop,
      modelId: 'glm-5.2',
      nowMs: 0,
      walletBalance: 0n,
    });
    const harvested = applyFarmAction({
      plot: planted.plot,
      tool: 'harvest',
      crop,
      modelId: 'glm-5.2',
      nowMs: crop.durationMs,
      walletBalance: 0n,
    });
    expect(planted.balanceDelta).toBe(0n);
    expect(harvested.packageAmount).toBe(100n);
  });

  it('formats token values without floating point arithmetic', () => {
    expect(formatTokenAmount(20_000n)).toBe('20K');
    expect(formatTokenAmount(1_340_000n)).toBe('1.3M');
  });
});

function requireCrop(id: string) {
  const crop = getCrop(id);
  if (!crop) throw new Error(`Missing test crop: ${id}`);
  return crop;
}
