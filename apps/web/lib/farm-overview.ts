import { getPlotPhase } from './game-engine';
import type { FarmPlot, FarmTool } from './game-types';

export interface FarmOverview {
  unlocked: number;
  emptyIds: number[];
  matureIds: number[];
  waterIds: number[];
  weedIds: number[];
  bugIds: number[];
  careCount: number;
  growingCount: number;
}

// A read-only projection of the sandbox farm; settlement stays in the action engine.
export function getFarmOverview(plots: readonly FarmPlot[], nowMs: number): FarmOverview {
  const unlocked = plots.filter((plot) => plot.unlocked);
  const planted = unlocked.filter((plot) => plot.cropId);
  const growing = planted.filter((plot) => getPlotPhase(plot, nowMs) !== 'mature');
  return {
    unlocked: unlocked.length,
    emptyIds: unlocked.filter((plot) => !plot.cropId).map((plot) => plot.id),
    matureIds: planted
      .filter((plot) => getPlotPhase(plot, nowMs) === 'mature')
      .map((plot) => plot.id),
    waterIds: growing.filter((plot) => !plot.watered).map((plot) => plot.id),
    weedIds: growing.filter((plot) => plot.issue === 'weed').map((plot) => plot.id),
    bugIds: growing.filter((plot) => plot.issue === 'bug').map((plot) => plot.id),
    careCount: growing.filter((plot) => !plot.watered || plot.issue).length,
    growingCount: growing.length,
  };
}

export interface PlotAction {
  tool: FarmTool;
  label: string;
}

export function getPlotAction(plot: FarmPlot, nowMs: number): PlotAction | null {
  if (!plot.unlocked) return null;
  if (!plot.cropId) return { tool: 'seed', label: '选择花种' };
  if (getPlotPhase(plot, nowMs) === 'mature') return { tool: 'harvest', label: '收获这块地' };
  if (plot.issue === 'weed') return { tool: 'weed', label: '清除杂草' };
  if (plot.issue === 'bug') return { tool: 'bug', label: '清除害虫' };
  if (!plot.watered) return { tool: 'water', label: '浇水这块地' };
  return null;
}
