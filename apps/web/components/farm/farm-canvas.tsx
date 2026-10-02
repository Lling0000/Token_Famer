'use client';

import { useEffect, useRef } from 'react';
import { FarmToolIcon, TOOL_PATHS } from './tool-icon';
import { projection, plotCenter, hitTestPlot } from '@/lib/farm-layout';
import type { Projection } from '@/lib/farm-layout';
import { getCrop, getModel } from '@/lib/game-data';
import { getPlotPhase, getPlotProgress } from '@/lib/game-engine';
import type { FarmPlot, FarmTool, PlotPhase } from '@/lib/game-types';
import { getModelPlantVisual } from '../model/model-plant-visual';
import { drawLock, drawModelPlantSprite } from './model-bloom';
import type { PlantGrowthStage } from './model-bloom';

interface FarmCanvasProps {
  plots: FarmPlot[];
  activeTool: FarmTool;
  selectedPlotId: number | null;
  onPlotClick: (plotId: number | null) => FarmTool | void;
}

interface ViewState {
  width: number;
  height: number;
  hoverId: number | null;
  feedback?: { plotId: number; tool: FarmTool; startedAt: number };
}

const INITIAL_VIEW: ViewState = {
  width: 1,
  height: 1,
  hoverId: null,
};

// eslint-disable-next-line max-lines-per-function -- Canvas lifecycle keeps pointer input, sizing, and the animation frame synchronized in one effect.
export function FarmCanvas({ plots, activeTool, selectedPlotId, onPlotClick }: FarmCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const plotsRef = useRef(plots);
  const activeToolRef = useRef(activeTool);
  const selectedRef = useRef(selectedPlotId);
  const onPlotClickRef = useRef(onPlotClick);
  const viewRef = useRef<ViewState>({ ...INITIAL_VIEW });

  plotsRef.current = plots;
  activeToolRef.current = activeTool;
  selectedRef.current = selectedPlotId;
  onPlotClickRef.current = onPlotClick;

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
      const cursor = cursorRef.current;
      if (cursor) {
        cursor.style.display =
          activeToolRef.current === 'inspect' || hit === null ? 'none' : 'grid';
        cursor.style.transform = `translate3d(${point.x + 10}px, ${point.y + 10}px, 0)`;
      }
      if (hit !== view.hoverId) {
        view.hoverId = hit;
      }
      canvas.style.cursor =
        hit === null ? 'default' : activeToolRef.current === 'inspect' ? 'pointer' : 'none';
    };
    const handleClick = (event: PointerEvent) => {
      const point = pointerPosition(event);
      const view = viewRef.current;
      const hit = hitTestPlot(point.x, point.y, view, plotsRef.current);
      const tool = onPlotClickRef.current(hit);
      if (tool && hit !== null) {
        view.feedback = { plotId: hit, tool, startedAt: performance.now() };
        canvas.dataset.lastAction = tool;
      }
    };
    const handlePointerLeave = () => {
      viewRef.current.hoverId = null;
      canvas.style.cursor = 'default';
      if (cursorRef.current) cursorRef.current.style.display = 'none';
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

  useEffect(() => {
    if (cursorRef.current) cursorRef.current.style.display = 'none';
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
  }, [activeTool]);
  return (
    <>
      <canvas
        ref={canvasRef}
        className="farm-canvas"
        aria-label="24格等距 Token 农场"
        data-active-tool={activeTool}
        data-land-layout="ground-anchored"
        data-plot-footprint="104x52"
        data-selection-style="edge-glow"
        draggable={false}
      />
      <span ref={cursorRef} className="farm-tool-cursor" data-tool={activeTool} aria-hidden="true">
        <FarmToolIcon tool={activeTool} size={24} />
      </span>
    </>
  );
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
  drawEntranceMarker(context, project);
  const ordered = [...plots].sort(
    (left, right) => plotCenter(left, project).y - plotCenter(right, project).y,
  );
  for (const plot of ordered) drawPlot(context, plot, project, selectedPlotId, view.hoverId, time);
  drawToolFeedback(context, view, project, time);
}

function drawToolFeedback(
  context: CanvasRenderingContext2D,
  view: ViewState,
  project: Projection,
  time: number,
) {
  const feedback = view.feedback;
  if (!feedback) return;
  const elapsed = time - feedback.startedAt;
  if (elapsed > 850) return;
  const point = plotCenter({ id: feedback.plotId }, project);
  context.save();
  context.globalAlpha = Math.max(0, 1 - elapsed / 850);
  context.translate(point.x - 15, point.y - 28 - elapsed / 35);
  context.fillStyle = '#18382a';
  context.fillRect(-4, -4, 38, 38);
  context.scale(1.25, 1.25);
  context.fillStyle = feedback.tool === 'water' ? '#8fd8ed' : '#f4d477';
  for (const path of TOOL_PATHS[feedback.tool]) context.fill(new Path2D(path));
  context.restore();
}

function drawEntranceMarker(context: CanvasRenderingContext2D, project: Projection) {
  const x = project.offsetX + 834 * project.scale;
  const y = project.offsetY + 752 * project.scale;
  const scale = project.scale;
  context.fillStyle = '#553d29';
  context.fillRect(x - 3 * scale, y - 20 * scale, 6 * scale, 28 * scale);
  context.fillStyle = '#e2c07a';
  context.fillRect(x - 39 * scale, y - 35 * scale, 78 * scale, 25 * scale);
  context.strokeStyle = '#695034';
  context.lineWidth = 2 * scale;
  context.strokeRect(x - 39 * scale, y - 35 * scale, 78 * scale, 25 * scale);
  context.font = `bold ${11 * scale}px "Microsoft YaHei", sans-serif`;
  context.textAlign = 'center';
  context.fillStyle = '#3a3927';
  context.fillText('农场入口', x, y - 18 * scale);
}

// eslint-disable-next-line max-params -- Canvas drawing keeps scalar hot-path coordinates allocation-free.
function drawPlot(
  context: CanvasRenderingContext2D,
  plot: FarmPlot,
  project: Projection,
  selectedPlotId: number | null,
  hoverId: number | null,
  time: number,
) {
  const center = plotCenter(plot, project);
  const halfWidth = project.tileWidth / 2;
  const halfHeight = project.tileHeight / 2;
  const highlighted = plot.id === selectedPlotId || plot.id === hoverId;
  if (!plot.unlocked) {
    context.fillStyle = 'rgba(44, 61, 52, .58)';
    fillDiamond(context, center.x, center.y, halfWidth, halfHeight);
  }
  if (highlighted) {
    drawPlotHighlight(
      context,
      center.x,
      center.y,
      halfWidth,
      halfHeight,
      plot.id === selectedPlotId,
      project.scale,
    );
  }
  if (!plot.unlocked) drawLock(context, center.x, center.y - 2, project.scale);
  if (plot.watered && plot.unlocked) drawWater(context, center.x, center.y, halfWidth, halfHeight);
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

// eslint-disable-next-line max-params -- Canvas highlight drawing uses scalar geometry in the render hot path.
function drawPlotHighlight(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  selected: boolean,
  scale: number,
) {
  context.save();
  context.lineJoin = 'miter';
  if (selected) {
    context.shadowColor = '#ffd34f';
    context.shadowBlur = 7 * Math.max(1, scale);
  }
  context.strokeStyle = selected ? '#ffe88a' : 'rgba(255, 255, 255, .72)';
  context.lineWidth = (selected ? 2.5 : 1.5) * Math.max(1, scale);
  strokeDiamond(context, x, y, width, height);
  context.restore();
}

function drawWater(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  context.save();
  context.fillStyle = 'rgba(117, 222, 236, .34)';
  const droplets = [
    { x: -0.52, y: -0.08 },
    { x: 0.45, y: 0.12 },
    { x: 0.12, y: 0.55 },
  ];
  for (const droplet of droplets) {
    const size = Math.max(2, width * 0.025);
    context.fillRect(
      x + width * droplet.x - size / 2,
      y + height * droplet.y - size,
      size,
      size * 2,
    );
  }
  context.restore();
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
  const plantVisual = getModelPlantVisual(model);
  const nowMs = new Date().getTime();
  const phase = getPlotPhase(plot, nowMs);
  const sprite = plantGrowthSprite(phase, scale);
  const phaseSize = {
    seed: 0.16,
    sprout: 0.34,
    growing: 0.62,
    flowering: 0.82,
    mature: 1,
    empty: 0,
  }[phase];
  const sway = Math.round(Math.sin(time / 480 + plot.id) * 2) * scale;
  const positions = [[0, 5]];
  for (const [offsetX, offsetY] of positions) {
    const baseX = x + offsetX * scale;
    const baseY = y + offsetY * scale;
    const height = 28 * phaseSize * scale;
    if (
      phaseSize > 0.25 &&
      drawModelPlantSprite(context, {
        x: baseX + sway,
        baseY,
        height: sprite.height,
        brand: model.brand,
        stage: sprite.stage,
      })
    ) {
      continue;
    }
    context.fillStyle = plantVisual.stemColor;
    context.fillRect(baseX - 2 * scale, baseY - height, 4 * scale, height);
    if (phaseSize > 0.25) {
      context.fillStyle = plantVisual.leafEdgeColor;
      context.fillRect(baseX - 9 * scale + sway, baseY - height * 0.65, 9 * scale, 7 * scale);
      context.fillRect(baseX + scale + sway, baseY - height * 0.48, 9 * scale, 7 * scale);
      context.fillStyle = plantVisual.leafColor;
      context.fillRect(baseX - 8 * scale + sway, baseY - height * 0.65, 7 * scale, 5 * scale);
      context.fillRect(baseX + 2 * scale + sway, baseY - height * 0.48, 7 * scale, 5 * scale);
    }
  }
  if (phase !== 'mature')
    drawProgressBar(context, x, y + 29 * scale, 52 * scale, getPlotProgress(plot, nowMs));
}

function plantGrowthSprite(
  phase: PlotPhase,
  scale: number,
): { height: number; stage: PlantGrowthStage } {
  const height =
    { empty: 0, seed: 8, sprout: 25, growing: 44, flowering: 72, mature: 92 }[phase] * scale;
  const stage = phase === 'mature' ? 'mature' : phase === 'flowering' ? 'flowering' : 'seedling';
  return { height, stage };
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
