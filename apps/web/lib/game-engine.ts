import type { FarmActionInput, FarmActionResult, FarmPlot, ModelId, PlotPhase } from './game-types';

const CROP_CYCLE = ['radish', 'carrot', 'cabbage', 'corn', 'lettuce', 'rapeseed'];
const MODEL_CYCLE = [
  'gpt-5.4',
  'claude-sonnet-4-6',
  'gemini-3.1-pro-preview',
  'gemini-3.5-flash',
  'gpt-5.6-terra',
  'claude-sonnet-5',
] satisfies readonly ModelId[];

export function createFarmPlots(nowMs: number, demo = false): FarmPlot[] {
  return Array.from({ length: 24 }, (_, index) =>
    demo ? createDemoPlot(index, nowMs) : createEmptyPlot(index),
  );
}

function createEmptyPlot(index: number): FarmPlot {
  return {
    id: index + 1,
    row: Math.floor(index / 6),
    column: index % 6,
    unlocked: index < 6,
    cropId: null,
    modelId: null,
    plantedAtMs: null,
    durationMs: null,
    watered: false,
    issue: null,
    quality: index < 6 ? 2 : 1,
  };
}

// eslint-disable-next-line complexity -- Deterministic demo fixtures deliberately vary crop, care, and maturity states.
function createDemoPlot(index: number, nowMs: number): FarmPlot {
  const planted = index < 14 && index % 5 !== 4;
  const durationMs = 70_000 + (index % 5) * 18_000;
  const elapsed = durationMs * ((index % 6) / 5);
  const issue = index % 7 === 2 ? 'weed' : index % 11 === 3 ? 'bug' : null;
  return {
    id: index + 1,
    row: Math.floor(index / 6),
    column: index % 6,
    unlocked: true,
    cropId: planted ? (CROP_CYCLE[index % CROP_CYCLE.length] ?? null) : null,
    modelId: planted ? (MODEL_CYCLE[index % MODEL_CYCLE.length] ?? 'gpt-5.4-mini') : null,
    plantedAtMs: planted ? nowMs - elapsed : null,
    durationMs: planted ? durationMs : null,
    watered: index % 3 === 0,
    issue: planted ? issue : null,
    quality: index < 6 ? 2 : 1,
  };
}

export function getPlotPhase(plot: FarmPlot, nowMs: number): PlotPhase {
  if (!plot.cropId || plot.plantedAtMs === null || plot.durationMs === null) return 'empty';
  const progress = Math.max(0, (nowMs - plot.plantedAtMs) / plot.durationMs);
  if (progress >= 1) return 'mature';
  if (progress >= 0.72) return 'flowering';
  if (progress >= 0.38) return 'growing';
  if (progress >= 0.12) return 'sprout';
  return 'seed';
}

export function getPlotProgress(plot: FarmPlot, nowMs: number): number {
  if (!plot.cropId || plot.plantedAtMs === null || plot.durationMs === null) return 0;
  return Math.min(1, Math.max(0, (nowMs - plot.plantedAtMs) / plot.durationMs));
}

export function applyFarmAction(input: FarmActionInput): FarmActionResult {
  if (!input.plot.unlocked) return unchanged(input.plot, '这块土地还没有解锁');
  if (input.tool === 'inspect') {
    return unchanged(input.plot, input.plot.cropId ? '已选中作物' : '这块土地可以播种');
  }
  if (input.tool === 'seed') return plantSeed(input);
  if (!input.plot.cropId) return unchanged(input.plot, '空地不需要处理');
  if (input.tool === 'water' || input.tool === 'weed' || input.tool === 'bug') {
    return maintainCrop(input);
  }
  return harvestCrop(input);
}

function plantSeed(input: FarmActionInput): FarmActionResult {
  if (input.plot.cropId) return unchanged(input.plot, '这块土地已经有作物了');
  if (input.walletBalance < input.crop.cost) return unchanged(input.plot, 'Token Credit 余额不足');
  return changed(
    {
      ...input.plot,
      cropId: input.crop.id,
      modelId: input.modelId,
      plantedAtMs: input.nowMs,
      durationMs: input.crop.durationMs,
      watered: false,
      issue: null,
    },
    -input.crop.cost,
    0n,
    `已种下${input.crop.name}`,
  );
}

function maintainCrop(input: FarmActionInput): FarmActionResult {
  if (input.tool === 'water') {
    if (input.plot.watered) return unchanged(input.plot, '水分很充足');
    return changed({ ...input.plot, watered: true }, 0n, 0n, '浇水完成');
  }
  if (input.plot.issue !== input.tool) {
    return unchanged(input.plot, input.tool === 'weed' ? '没有发现杂草' : '没有发现害虫');
  }
  return changed({ ...input.plot, issue: null }, 0n, 0n, '维护完成');
}

function harvestCrop(input: FarmActionInput): FarmActionResult {
  if (getPlotPhase(input.plot, input.nowMs) !== 'mature') {
    return unchanged(input.plot, '作物还没有成熟');
  }
  const baseReward = input.crop.baseReward ?? input.crop.cost;
  const qualityBonus = BigInt(100 + (input.plot.quality - 1) * 5);
  const amount = input.crop.level === 0 ? baseReward : (baseReward * qualityBonus) / 100n;
  const plot = {
    ...input.plot,
    cropId: null,
    modelId: null,
    plantedAtMs: null,
    durationMs: null,
    watered: false,
    issue: null,
  };
  return changed(plot, 0n, amount, `收获 ${formatTokenAmount(amount)} Token 包`);
}

function unchanged(plot: FarmPlot, message: string): FarmActionResult {
  return { plot, balanceDelta: 0n, packageAmount: 0n, message, changed: false };
}

function changed(
  plot: FarmPlot,
  balanceDelta: bigint,
  packageAmount: bigint,
  message: string,
): FarmActionResult {
  return { plot, balanceDelta, packageAmount, message, changed: true };
}

export function formatTokenAmount(amount: bigint): string {
  const negative = amount < 0n;
  const absolute = negative ? -amount : amount;
  const sign = negative ? '-' : '';
  if (absolute >= 1_000_000n) return `${sign}${trimDecimal(absolute, 1_000_000n)}M`;
  if (absolute >= 1_000n) return `${sign}${trimDecimal(absolute, 1_000n)}K`;
  return `${sign}${absolute}`;
}

function trimDecimal(value: bigint, unit: bigint): string {
  const whole = value / unit;
  const decimal = ((value % unit) * 10n) / unit;
  return decimal === 0n ? `${whole}` : `${whole}.${decimal}`;
}
