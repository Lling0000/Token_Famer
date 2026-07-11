'use client';

import { Bug, Droplets, Hand, MousePointer2, Sprout, Wheat } from 'lucide-react';
import type { FarmTool } from '@/lib/game-types';

interface ToolDockProps {
  activeTool: FarmTool;
  onToolChange: (tool: FarmTool) => void;
  onBatchHarvest: () => void;
}

const TOOLS = [
  { id: 'inspect', label: '查看', Icon: MousePointer2 },
  { id: 'seed', label: '播种', Icon: Sprout },
  { id: 'water', label: '浇水', Icon: Droplets },
  { id: 'weed', label: '除草', Icon: Hand },
  { id: 'bug', label: '除虫', Icon: Bug },
  { id: 'harvest', label: '收获', Icon: Wheat },
] as const;

export function ToolDock({ activeTool, onToolChange, onBatchHarvest }: ToolDockProps) {
  return (
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
  );
}
