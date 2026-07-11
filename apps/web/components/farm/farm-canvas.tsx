'use client';

import { useEffect, useRef } from 'react';
import { getCrop, getModel } from '@/lib/game-data';
import { getPlotPhase, getPlotProgress } from '@/lib/game-engine';
import type { FarmPlot } from '@/lib/game-types';
import { drawLock, drawModelBloom } from './model-bloom';

interface FarmCanvasProps {
  plots: FarmPlot[];
  selectedPlotId: number | null;
  onPlotClick: (plotId: number) => void;
  onPlotHover: (plotId: number | null) => void;
}

interface ViewState {
  width: number;
  height: number;
  hoverId: number | null;
}

interface Projection {
  offsetX: number;
  offsetY: number;
  tileWidth: number;
  tileHeight: number;
  scale: number;
}

const INITIAL_VIEW: ViewState = {
  width: 1,
  height: 1,
  hoverId: null,
};

const BACKGROUND_WIDTH = 1536;
const BACKGROUND_HEIGHT = 1024;
const BACKGROUND_PLOT_ORIGIN = { x: 834, y: 245 };
const BACKGROUND_GRID_STEP = { x: 119, y: 60 };
const BACKGROUND_PLOT_CENTERS = Array.from({ length: 25 }, (_, index) => {
  const row = Math.floor(index / 5);
  const column = index % 5;
  return {
    x: BACKGROUND_PLOT_ORIGIN.x + (column - row) * BACKGROUND_GRID_STEP.x,
    y: BACKGROUND_PLOT_ORIGIN.y + (column + row) * BACKGROUND_GRID_STEP.y,
  };
}).filter((_, index) => index !== 12);

// eslint-disable-next-line max-lines-per-function -- Canvas lifecycle keeps pointer input, sizing, and the animation frame synchronized in one effect.
export function FarmCanvas({ plots, selectedPlotId, onPlotClick, onPlotHover }: FarmCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const plotsRef = useRef(plots);
  const selectedRef = useRef(selectedPlotId);
  const callbacksRef = useRef({ onPlotClick, onPlotHover });
  const viewRef = useRef<ViewState>({ ...INITIAL_VIEW });

  plotsRef.current = plots;
  selectedRef.current = selectedPlotId;
  callbacksRef.current = { onPlotClick, onPlotHover };

  // eslint-disable-next-line max-lines-per-function -- One canvas lifecycle owns listeners, resize state, and animation cleanup.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      viewRef.current.width = rect.width;
      viewRef.current.height = rect.height;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.imageSmoothingEnabled = false;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    let animationFrame = 0;
    const drawFrame = (time: number) => {
      drawFarm(context, viewRef.current, plotsRef.current, selectedRef.current, time);
      animationFrame = requestAnimationFrame(drawFrame);
    };
    animationFrame = requestAnimationFrame(drawFrame);

    const pointerPosition = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const handlePointerMove = (event: PointerEvent) => {
      const point = pointerPosition(event);
      const view = viewRef.current;
      const hit = hitTestPlot(point.x, point.y, view, plotsRef.current);
      if (hit !== view.hoverId) {
        view.hoverId = hit;
        callbacksRef.current.onPlotHover(hit);
        canvas.style.cursor = hit === null ? 'default' : 'pointer';
      }
    };
    const handleClick = (event: PointerEvent) => {
      const point = pointerPosition(event);
      const view = viewRef.current;
      const hit = hitTestPlot(point.x, point.y, view, plotsRef.current);
      if (hit !== null) callbacksRef.current.onPlotClick(hit);
    };
    const handlePointerLeave = () => {
      viewRef.current.hoverId = null;
      canvas.style.cursor = 'default';
      callbacksRef.current.onPlotHover(null);
    };

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('pointerleave', handlePointerLeave);
    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="farm-canvas"
      aria-label="24格等距 Token 农场"
      data-land-layout="ground-anchored"
      draggable={false}
    />
  );
}

function projection(view: ViewState): Projection {
  const scale = Math.max(view.width / BACKGROUND_WIDTH, view.height / BACKGROUND_HEIGHT);
  return {
    offsetX: (view.width - BACKGROUND_WIDTH * scale) / 2,
    offsetY: (view.height - BACKGROUND_HEIGHT * scale) / 2,
    tileWidth: 196 * scale,
    tileHeight: 86 * scale,
    scale,
  };
}

function plotCenter(plot: FarmPlot, project: Projection) {
  const slot = BACKGROUND_PLOT_CENTERS[plot.id - 1] ?? BACKGROUND_PLOT_CENTERS[0];
  return {
    x: project.offsetX + slot.x * project.scale,
    y: project.offsetY + slot.y * project.scale,
  };
}

function hitTestPlot(x: number, y: number, view: ViewState, plots: FarmPlot[]): number | null {
  const project = projection(view);
  for (let index = plots.length - 1; index >= 0; index -= 1) {
    const plot = plots[index];
    const center = plotCenter(plot, project);
    const normalized =
      Math.abs(x - center.x) / (project.tileWidth * 0.48) +
      Math.abs(y - center.y) / (project.tileHeight * 0.48);
    if (normalized <= 1) return plot.id;
  }
  return null;
}

function drawFarm(
  context: CanvasRenderingContext2D,
  view: ViewState,
  plots: FarmPlot[],
  selectedPlotId: number | null,
  time: number,
) {
  context.clearRect(0, 0, view.width, view.height);
  const project = projection(view);
  const ordered = [...plots].sort(
    (left, right) => left.row + left.column - right.row - right.column,
  );
  for (const plot of ordered) drawPlot(context, plot, project, selectedPlotId, view.hoverId, time);
}

// eslint-disable-next-line max-params, complexity -- Canvas drawing keeps scalar hot-path coordinates allocation-free.
function drawPlot(
  context: CanvasRenderingContext2D,
  plot: FarmPlot,
  project: Projection,
  selectedPlotId: number | null,
  hoverId: number | null,
  time: number,
) {
  const center = plotCenter(plot, project);
  const halfWidth = project.tileWidth * 0.46;
  const halfHeight = project.tileHeight * 0.46;
  const highlighted = plot.id === selectedPlotId || plot.id === hoverId;
  if (!plot.unlocked) {
    context.fillStyle = 'rgba(44, 61, 52, .58)';
    fillDiamond(context, center.x, center.y, halfWidth, halfHeight);
  }
  if (highlighted) {
    context.strokeStyle = plot.id === selectedPlotId ? '#ffd45f' : 'rgba(255,255,255,.7)';
    context.lineWidth = plot.id === selectedPlotId ? 3 : 2;
    strokeDiamond(context, center.x, center.y, halfWidth, halfHeight);
  }
  if (!plot.unlocked) drawLock(context, center.x, center.y - 2, project.scale);
  if (plot.watered && plot.unlocked)
    drawWater(context, center.x, center.y, halfWidth, halfHeight, time);
  if (plot.cropId) drawCrop(context, plot, center.x, center.y, project.scale, time);
  if (plot.issue)
    drawIssue(
      context,
      plot.issue,
      center.x + halfWidth * 0.58,
      center.y - halfHeight * 0.8,
      project.scale,
    );
}

function fillDiamond(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  context.beginPath();
  context.moveTo(x, y - height);
  context.lineTo(x + width, y);
  context.lineTo(x, y + height);
  context.lineTo(x - width, y);
  context.closePath();
  context.fill();
}

function strokeDiamond(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  context.beginPath();
  context.moveTo(x, y - height);
  context.lineTo(x + width, y);
  context.lineTo(x, y + height);
  context.lineTo(x - width, y);
  context.closePath();
  context.stroke();
}

// eslint-disable-next-line max-params -- Animated water rendering uses scalar geometry every frame.
function drawWater(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  time: number,
) {
  context.strokeStyle = `rgba(72, 176, 190, ${0.2 + Math.sin(time / 550) * 0.06})`;
  context.lineWidth = 3;
  strokeDiamond(context, x, y, width * 0.84, height * 0.84);
}

// eslint-disable-next-line max-lines-per-function, max-params -- Crop rendering is one per-frame pixel drawing primitive.
function drawCrop(
  context: CanvasRenderingContext2D,
  plot: FarmPlot,
  x: number,
  y: number,
  scale: number,
  time: number,
) {
  const crop = getCrop(plot.cropId);
  if (!crop) return;
  const model = getModel(plot.modelId ?? 'gpt-5.4-mini');
  const nowMs = new Date().getTime();
  const phase = getPlotPhase(plot, nowMs);
  const phaseSize = {
    seed: 0.16,
    sprout: 0.34,
    growing: 0.62,
    flowering: 0.82,
    mature: 1,
    empty: 0,
  }[phase];
  const sway = Math.round(Math.sin(time / 480 + plot.id) * 2) * scale;
  const positions = [
    [-22, 1],
    [0, -9],
    [22, 1],
    [-10, 10],
    [12, 10],
  ];
  for (const [offsetX, offsetY] of positions) {
    const baseX = x + offsetX * scale;
    const baseY = y + offsetY * scale;
    const height = 28 * phaseSize * scale;
    context.fillStyle = crop.accent;
    context.fillRect(baseX - 2 * scale, baseY - height, 4 * scale, height);
    if (phaseSize > 0.25) {
      context.fillStyle = '#4f954c';
      context.fillRect(baseX - 8 * scale + sway, baseY - height * 0.65, 7 * scale, 5 * scale);
      context.fillRect(baseX + scale + sway, baseY - height * 0.48, 7 * scale, 5 * scale);
    }
    if (phaseSize > 0.7) {
      const bloomSize = (phase === 'mature' ? 13 : 9) * scale;
      drawModelBloom(context, {
        x: baseX + sway,
        y: baseY - height,
        size: bloomSize,
        brand: model.brand,
        petalColor: model.color,
        centerColor: crop.color,
      });
    }
  }
  if (phase !== 'mature')
    drawProgressBar(context, x, y + 29 * scale, 52 * scale, getPlotProgress(plot, nowMs));
}

function drawProgressBar(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  progress: number,
) {
  context.fillStyle = 'rgba(20, 39, 31, .72)';
  context.fillRect(x - width / 2, y, width, 4);
  context.fillStyle = '#7fe08b';
  context.fillRect(x - width / 2, y, width * progress, 4);
}

function drawIssue(
  context: CanvasRenderingContext2D,
  issue: 'weed' | 'bug',
  x: number,
  y: number,
  scale: number,
) {
  context.fillStyle = issue === 'bug' ? '#dc5b4d' : '#e4b94d';
  context.fillRect(x - 9 * scale, y - 9 * scale, 18 * scale, 18 * scale);
  context.fillStyle = '#18291f';
  context.font = `bold ${12 * scale}px monospace`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(issue === 'bug' ? '!' : '*', x, y);
}
