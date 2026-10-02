import { describe, expect, it } from 'vitest';
import { createFarmPlots } from './game-engine';
import { hitTestPlot, plotCenter, projection } from './farm-layout';

describe('ground-aligned farm hit testing', () => {
  for (const view of [
    { width: 1012, height: 648 },
    { width: 1144, height: 828 },
    { width: 1624, height: 1008 },
    { width: 2264, height: 1368 },
  ]) {
    it(`hits all 24 plot centers at ${view.width} × ${view.height}`, () => {
      const plots = createFarmPlots(0, true);
      const project = projection(view);
      for (const plot of plots) {
        const point = plotCenter(plot, project);
        expect(hitTestPlot(point.x, point.y, view, plots)).toBe(plot.id);
      }
      const center = plotCenter({ id: 13 }, project);
      expect(center.x).toBe(project.offsetX + 834 * project.scale);
      expect(center.y).toBe(project.offsetY + 500 * project.scale);
      const first = plotCenter({ id: 1 }, project);
      expect(hitTestPlot(first.x + 110 * project.scale, first.y, view, plots)).toBeNull();
      expect(
        hitTestPlot(
          project.offsetX + 834 * project.scale,
          project.offsetY + 752 * project.scale,
          view,
          plots,
        ),
      ).toBeNull();
    });
  }
});
