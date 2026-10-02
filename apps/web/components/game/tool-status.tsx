import { Crosshair } from 'lucide-react';
import type { CropDefinition, FarmTool } from '@/lib/game-types';

const TOOL_HINTS: Record<FarmTool, { label: string; hint: string }> = {
  inspect: { label: '查看地块', hint: '点击土地查看详情，或用雷达定位' },
  seed: { label: '播种模式', hint: '选好花种，再点击一块空地' },
  water: { label: '浇水模式', hint: '点击缺水作物，补充水分' },
  weed: { label: '除草模式', hint: '点击带杂草标记的作物' },
  bug: { label: '除虫模式', hint: '点击带害虫标记的作物' },
  harvest: { label: '收获模式', hint: '点击成熟作物，Token 包收入仓库' },
};

export function ToolStatus({ tool, crop }: { tool: FarmTool; crop: CropDefinition }) {
  const { label, hint } = TOOL_HINTS[tool];
  return (
    <div className="tool-status" aria-label="当前工具说明">
      <Crosshair size={16} />
      <span>
        <strong>
          {label}
          {tool === 'seed' ? ` · ${crop.name}` : ''}
        </strong>
        <small>{hint}</small>
      </span>
    </div>
  );
}
