'use client';

import {
  BarChart3,
  Boxes,
  CircleUserRound,
  KeyRound,
  ListChecks,
  Settings,
  ShoppingBasket,
  Sprout,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatTokenAmount } from '@/lib/game-engine';
import type { GamePanel, ModelId } from '@/lib/game-types';
import { ModelPicker } from '../model/model-picker';

interface TopBarProps {
  modelId: ModelId;
  balance: bigint;
  nickname: string;
  level: number;
  onModelChange: (modelId: ModelId) => void;
  onOpenPanel: (panel: Exclude<GamePanel, null>) => void;
  onOpenSocial: () => void;
  muted: boolean;
  onToggleAudio: () => void;
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
  muted,
  onToggleAudio,
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

      <ModelPicker
        modelId={modelId}
        balanceLabel={formatTokenAmount(balance)}
        onModelChange={onModelChange}
      />

      <div className="resource-strip" aria-label="农场资源">
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
          className="icon-button audio-toggle"
          type="button"
          title={muted ? '开启农场声音' : '静音农场声音'}
          aria-label={muted ? '开启农场声音' : '静音农场声音'}
          aria-pressed={muted}
          onClick={onToggleAudio}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
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
