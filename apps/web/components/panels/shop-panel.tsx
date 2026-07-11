'use client';

import { Check, Coins, Info, ShoppingCart, Sprout } from 'lucide-react';
import { CROPS } from '@/lib/game-data';
import { formatTokenAmount } from '@/lib/game-engine';
import type { CSSProperties } from 'react';
import type { CropDefinition } from '@/lib/game-types';
import { PanelShell } from './panel-shell';

interface ShopPanelProps {
  selectedCrop: CropDefinition;
  level: number;
  balance: bigint;
  onSelectCrop: (crop: CropDefinition) => void;
  onClose: () => void;
  onBuyTokens: () => void;
}

function formatDuration(durationMs: number): string {
  const minutes = durationMs / 60_000;
  if (minutes < 60) return `${minutes}分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}时${rest}分` : `${hours}小时`;
}

// eslint-disable-next-line max-lines-per-function -- The crop catalog is a data-driven repeated-item view with no embedded economy rules.
export function ShopPanel({
  selectedCrop,
  level,
  balance,
  onSelectCrop,
  onClose,
  onBuyTokens,
}: ShopPanelProps) {
  return (
    <PanelShell
      wide
      eyebrow="SEED MARKET"
      title="Token 花种商店"
      description="种子成本从当前模型钱包扣除，成熟后生成同模型 Token 包。"
      onClose={onClose}
      actions={
        <button className="secondary-command" type="button" onClick={onBuyTokens}>
          <Coins size={17} />
          购买 Token
        </button>
      }
    >
      <div className="shop-summary">
        <span>
          <Sprout size={17} />
          当前花种 <strong>{selectedCrop.name}</strong>
        </span>
        <span>
          钱包余额 <strong>{formatTokenAmount(balance)}</strong>
        </span>
        <span className={balance < selectedCrop.cost * 12n ? 'reserve-warning' : 'reserve-ok'}>
          <Info size={15} />
          两轮储备建议 {formatTokenAmount(selectedCrop.cost * 12n)}
        </span>
      </div>
      <div className="crop-grid">
        {CROPS.map((crop) => {
          const locked = crop.level > level;
          const selected = crop.id === selectedCrop.id;
          return (
            <button
              className={selected ? 'crop-card selected' : 'crop-card'}
              type="button"
              key={crop.id}
              disabled={locked}
              onClick={() => onSelectCrop(crop)}
            >
              <span
                className="crop-art"
                style={
                  { '--crop-color': crop.color, '--crop-accent': crop.accent } as CSSProperties
                }
              >
                <i />
                <i />
                <i />
              </span>
              <span className="crop-card-title">
                <strong>{crop.name}</strong>
                <small>{crop.level === 0 ? 'FREE' : `LV.${crop.level}`}</small>
              </span>
              <span className="crop-stats">
                <small>成熟</small>
                <b>{formatDuration(crop.durationMs)}</b>
              </span>
              <span className="crop-stats">
                <small>基础果实</small>
                <b>{crop.fruitCount}</b>
              </span>
              <span className="crop-price">
                <ShoppingCart size={14} />
                {formatTokenAmount(crop.cost)}
              </span>
              {selected && (
                <span className="selected-check">
                  <Check size={13} />
                </span>
              )}
              {locked && <span className="crop-locked">LV.{crop.level} 解锁</span>}
            </button>
          );
        })}
      </div>
    </PanelShell>
  );
}
