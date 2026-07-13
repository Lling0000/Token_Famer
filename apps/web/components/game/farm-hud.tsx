'use client';

import { AlertTriangle, CloudSun, Droplets, Layers3, Sprout } from 'lucide-react';
import { getCrop, getModel } from '@/lib/game-data';
import { getPlotPhase, getPlotProgress } from '@/lib/game-engine';
import type { FarmPlot } from '@/lib/game-types';

interface FarmHudProps {
  plots: FarmPlot[];
  selectedPlot: FarmPlot | null;
  nowMs: number;
  farmName?: string;
  friendFarm?: boolean;
}

const PHASE_LABEL = {
  empty: '空地',
  seed: '种子期',
  sprout: '幼苗期',
  growing: '生长期',
  flowering: '开花期',
  mature: '已成熟',
} as const;

export function FarmHud({
  plots,
  selectedPlot,
  nowMs,
  farmName = '晨露 Token 农场',
  friendFarm = false,
}: FarmHudProps) {
  const matureCount = plots.filter((plot) => getPlotPhase(plot, nowMs) === 'mature').length;
  const issueCount = plots.filter((plot) => plot.issue).length;
  return (
    <>
      <div className="farm-title-hud">
        <div>
          <span className="section-kicker">{friendFarm ? 'FRIEND FARM' : 'MY HOMESTEAD'}</span>
          <h1>{farmName}</h1>
        </div>
        <span>
          <Layers3 size={15} />
          {plots.filter((plot) => plot.unlocked).length}/24 地块
        </span>
        <span className={matureCount ? 'hud-success' : ''}>
          <Sprout size={15} />
          {matureCount} 成熟
        </span>
        <span className={issueCount ? 'hud-alert' : ''}>
          <AlertTriangle size={15} />
          {issueCount} 待照料
        </span>
      </div>
      <div className="weather-hud">
        <CloudSun size={19} />
        <span>
          <strong>晴 · 24°C</strong>
          <small>成长速度正常</small>
        </span>
      </div>
      {selectedPlot && <PlotInspector plot={selectedPlot} nowMs={nowMs} />}
    </>
  );
}

function PlotInspector({ plot, nowMs }: { plot: FarmPlot; nowMs: number }) {
  const crop = getCrop(plot.cropId);
  const phase = getPlotPhase(plot, nowMs);
  const progress = getPlotProgress(plot, nowMs);
  const remainingMs = Math.max(0, (plot.durationMs ?? 0) - (nowMs - (plot.plantedAtMs ?? nowMs)));
  return (
    <div className="plot-inspector">
      <span className="plot-number">#{String(plot.id).padStart(2, '0')}</span>
      {!plot.unlocked ? (
        <span>
          <strong>未解锁土地</strong>
          <small>提升农场等级后开放</small>
        </span>
      ) : crop ? (
        <>
          <span className="plot-crop-dot" style={{ backgroundColor: crop.color }} />
          <span className="plot-main-meta">
            <strong>{crop.name}</strong>
            <small>
              {getModel(plot.modelId ?? 'gpt-5.4-mini').shortLabel} · {PHASE_LABEL[phase]}
            </small>
          </span>
          <div className="plot-progress">
            <i style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <b>{phase === 'mature' ? '可以收获' : formatCountdown(remainingMs)}</b>
          <span className={plot.watered ? 'plot-condition good' : 'plot-condition'}>
            <Droplets size={14} />
            {plot.watered ? '水分充足' : '需要浇水'}
          </span>
        </>
      ) : (
        <span>
          <strong>肥沃空地</strong>
          <small>使用播种工具种下花种</small>
        </span>
      )}
    </div>
  );
}

function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  if (totalSeconds < 60) return `${totalSeconds}秒`;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours ? `${hours}时${minutes}分` : `${minutes}分钟`;
}
