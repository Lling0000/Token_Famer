'use client';

import { Wheat } from 'lucide-react';
import type { CropDefinition, FarmTool } from '@/lib/game-types';
import { SeedTray } from './seed-tray';
import { ToolStatus } from './tool-status';
import { FarmToolIcon } from '../farm/tool-icon';

interface ToolDockProps {
  activeTool: FarmTool;
  level: number;
  selectedCrop: CropDefinition;
  matureCount: number;
  onToolChange: (tool: FarmTool) => void;
  onSelectCrop: (crop: CropDefinition) => void;
  onOpenShop: () => void;
  onBatchHarvest: () => void;
}

const TOOLS = [
  { id: 'inspect', label: '查看' },
  { id: 'seed', label: '播种' },
  { id: 'water', label: '浇水' },
  { id: 'weed', label: '除草' },
  { id: 'bug', label: '除虫' },
  { id: 'harvest', label: '收获' },
] as const;

export function ToolDock({
  activeTool,
  level,
  selectedCrop,
  matureCount,
  onToolChange,
  onSelectCrop,
  onOpenShop,
  onBatchHarvest,
}: ToolDockProps) {
  return (
    <>
      <ToolStatus tool={activeTool} crop={selectedCrop} />
      {activeTool === 'seed' && (
        <SeedTray
          level={level}
          selectedCrop={selectedCrop}
          onSelectCrop={onSelectCrop}
          onOpenShop={onOpenShop}
        />
      )}
      <div className="tool-dock" role="group" aria-label="农场工具">
        {TOOLS.map(({ id, label }) => (
          <button
            type="button"
            key={id}
            className={activeTool === id ? 'tool-button active' : 'tool-button'}
            onClick={() => onToolChange(id)}
            title={label}
            aria-pressed={activeTool === id}
          >
            <FarmToolIcon tool={id} />
            <span>{label}</span>
          </button>
        ))}
        <span className="tool-separator" />
        <button
          className="batch-command"
          type="button"
          onClick={onBatchHarvest}
          disabled={!matureCount}
          title={matureCount ? `${matureCount} 块地可收获` : '等待作物成熟'}
        >
          <Wheat size={19} />
          一键收获
        </button>
      </div>
    </>
  );
}
