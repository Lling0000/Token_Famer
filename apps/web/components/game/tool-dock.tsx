'use client';

import { MousePointer2, PaintBucket, Shovel, SprayCan, Sprout, Wheat } from 'lucide-react';
import type { CropDefinition, FarmTool } from '@/lib/game-types';
import { SeedTray } from './seed-tray';

interface ToolDockProps {
  activeTool: FarmTool;
  level: number;
  selectedCrop: CropDefinition;
  onToolChange: (tool: FarmTool) => void;
  onSelectCrop: (crop: CropDefinition) => void;
  onOpenShop: () => void;
  onBatchHarvest: () => void;
}

const TOOLS = [
  { id: 'inspect', label: '查看', Icon: MousePointer2 },
  { id: 'seed', label: '播种', Icon: Sprout },
  { id: 'water', label: '浇水', Icon: PaintBucket },
  { id: 'weed', label: '除草', Icon: Shovel },
  { id: 'bug', label: '除虫', Icon: SprayCan },
  { id: 'harvest', label: '收获', Icon: Wheat },
] as const;

export function ToolDock({
  activeTool,
  level,
  selectedCrop,
  onToolChange,
  onSelectCrop,
  onOpenShop,
  onBatchHarvest,
}: ToolDockProps) {
  return (
    <>
      {activeTool === 'seed' && (
        <SeedTray
          level={level}
          selectedCrop={selectedCrop}
          onSelectCrop={onSelectCrop}
          onOpenShop={onOpenShop}
        />
      )}
      <div className="tool-dock" role="toolbar" aria-label="农场工具">
        {TOOLS.map(({ id, label, Icon }) => (
          <button
            type="button"
            key={id}
            className={activeTool === id ? 'tool-button active' : 'tool-button'}
            onClick={() => onToolChange(id)}
            title={label}
            aria-pressed={activeTool === id}
          >
            <Icon size={21} strokeWidth={2.2} />
            <span>{label}</span>
          </button>
        ))}
        <span className="tool-separator" />
        <button className="batch-command" type="button" onClick={onBatchHarvest}>
          <Wheat size={19} />
          一键收获
        </button>
      </div>
    </>
  );
}
