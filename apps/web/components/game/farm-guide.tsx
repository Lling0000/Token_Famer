'use client';

import { Boxes, Crosshair, Droplets, Shovel, SprayCan, Sprout, Wheat } from 'lucide-react';
import type { FarmOverview } from '@/lib/farm-overview';
import type { FarmTool } from '@/lib/game-types';

interface FarmGuideProps {
  overview: FarmOverview;
  packageCount: number;
  onLocate: (tool: FarmTool, plotId: number) => void;
  onWarehouse: () => void;
}

export function FarmGuide({ overview, packageCount, onLocate, onWarehouse }: FarmGuideProps) {
  const actions = [
    { tool: 'harvest', label: '可收获', ids: overview.matureIds, Icon: Wheat },
    { tool: 'water', label: '缺水', ids: overview.waterIds, Icon: Droplets },
    { tool: 'weed', label: '杂草', ids: overview.weedIds, Icon: Shovel },
    { tool: 'bug', label: '害虫', ids: overview.bugIds, Icon: SprayCan },
    { tool: 'seed', label: '空地', ids: overview.emptyIds, Icon: Sprout },
  ] as const;
  return (
    <aside className="farm-guide" aria-label="农场行动指南">
      <header>
        <Crosshair size={15} />
        <strong>农场雷达</strong>
        <small>点击定位 · 确认操作</small>
      </header>
      <div className="farm-radar-actions">
        {actions.map(({ tool, label, ids, Icon }) => (
          <button
            type="button"
            key={tool}
            disabled={!ids.length}
            aria-label={`定位${label}地块`}
            onClick={() => onLocate(tool, ids[0]!)}
          >
            <Icon size={16} />
            <b>{ids.length}</b>
            <span>{label}</span>
          </button>
        ))}
      </div>
      <button className="warehouse-shortcut" type="button" onClick={onWarehouse}>
        <Boxes size={16} />
        <span>
          {packageCount ? `${packageCount} 个 Token 包待激活` : '收获后，在仓库激活 Token'}
        </span>
        <b>仓库 →</b>
      </button>
    </aside>
  );
}
