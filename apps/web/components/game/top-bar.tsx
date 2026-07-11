'use client';

import {
  BarChart3,
  Boxes,
  ChevronDown,
  CircleUserRound,
  KeyRound,
  ListChecks,
  Settings,
  ShoppingBasket,
  Sparkles,
  Sprout,
} from 'lucide-react';
import { formatTokenAmount } from '@/lib/game-engine';
import { MODELS } from '@/lib/game-data';
import type { GamePanel, ModelId } from '@/lib/game-types';

interface TopBarProps {
  modelId: ModelId;
  balance: bigint;
  nickname: string;
  level: number;
  onModelChange: (modelId: ModelId) => void;
  onOpenPanel: (panel: Exclude<GamePanel, null>) => void;
  onOpenSocial: () => void;
}

const NAV_ITEMS = [
  { panel: 'shop', label: '商店', Icon: ShoppingBasket },
  { panel: 'warehouse', label: '仓库', Icon: Boxes },
  { panel: 'leaderboard', label: '排行', Icon: BarChart3 },
  { panel: 'api', label: 'API', Icon: KeyRound },
  { panel: 'tasks', label: '任务', Icon: ListChecks },
] as const;

// eslint-disable-next-line max-lines-per-function -- The top bar composes independent navigation and resource controls without business calculation.
export function TopBar({
  modelId,
  balance,
  nickname,
  level,
  onModelChange,
  onOpenPanel,
  onOpenSocial,
}: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="top-brand" title="Token Farmer">
        <span className="brand-mark">
          <Sprout size={20} strokeWidth={2.6} />
        </span>
        <span className="top-brand-name">TOKEN FARMER</span>
        <span className="environment-chip">沙箱</span>
      </div>

      <div className="wallet-switcher">
        <span
          className="model-color"
          style={{ backgroundColor: MODELS.find((model) => model.id === modelId)?.color }}
        />
        <label>
          <span>调用 / 种植模型</span>
          <select
            value={modelId}
            onChange={(event) => onModelChange(event.target.value as ModelId)}
          >
            {MODELS.map((model) => (
              <option value={model.id} key={model.id}>
                {model.label}
              </option>
            ))}
          </select>
        </label>
        <ChevronDown size={15} aria-hidden="true" />
        <strong>{formatTokenAmount(balance)}</strong>
      </div>

      <div className="resource-strip" aria-label="农场资源">
        <span className="resource-item">
          <Sparkles size={15} />
          <b>1,280</b>
          <small>花瓣</small>
        </span>
        <span className="resource-item level-resource">
          <b>LV.{level}</b>
          <span className="level-track">
            <i style={{ width: '68%' }} />
          </span>
        </span>
      </div>

      <nav className="primary-nav" aria-label="主要功能">
        {NAV_ITEMS.map(({ panel, label, Icon }) => (
          <button type="button" key={panel} onClick={() => onOpenPanel(panel)} title={label}>
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="profile-controls">
        <button
          className="profile-button"
          type="button"
          title="账号与社交设置"
          onClick={onOpenSocial}
        >
          <span className="pixel-avatar">
            <CircleUserRound size={22} />
          </span>
          <span>
            <strong>{nickname}</strong>
            <small>农场主 #{level}027</small>
          </span>
        </button>
        <button
          className="icon-button"
          type="button"
          title="设置"
          aria-label="设置"
          onClick={onOpenSocial}
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
