import type { FarmPlot } from './game-types';

export interface FarmViewport {
  width: number;
  height: number;
}
export interface Projection {
  offsetX: number;
  offsetY: number;
  tileWidth: number;
  tileHeight: number;
  scale: number;
}

// Pixel coordinates calibrated against the 1536 × 1024 farm background.
const PLOT_CENTERS = Array.from({ length: 24 }, (_, index) => {
  const row = Math.floor(index / 5);
  const column = index % 5;
  return { x: 834 + (column - row) * 119, y: 248 + (column + row) * 63 };
});

export function projection(view: FarmViewport): Projection {
  const scale = Math.max(view.width / 1536, view.height / 1024);
  return {
    offsetX: (view.width - 1536 * scale) / 2,
    offsetY: (view.height - 1024 * scale) / 2,
    tileWidth: 208 * scale,
    tileHeight: 104 * scale,
    scale,
  };
}

export function plotCenter(plot: Pick<FarmPlot, 'id'>, project: Projection) {
  const slot = PLOT_CENTERS[plot.id - 1];
  if (!slot) throw new Error(`Unknown farm plot ${plot.id}`);
  return {
    x: project.offsetX + slot.x * project.scale,
    y: project.offsetY + slot.y * project.scale,
  };
}

export function hitTestPlot(x: number, y: number, view: FarmViewport, plots: readonly FarmPlot[]) {
  const project = projection(view);
  for (const plot of plots) {
    const center = plotCenter(plot, project);
    const distance =
      Math.abs(x - center.x) / (project.tileWidth / 2) +
      Math.abs(y - center.y) / (project.tileHeight / 2);
    if (distance <= 1) return plot.id;
  }
  return null;
}
