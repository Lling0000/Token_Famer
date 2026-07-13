'use client';

import { Check, Coins, Dog, Info, Palette, ShoppingCart, Sprout } from 'lucide-react';
import { useState } from 'react';
import { CROPS, getModel } from '@/lib/game-data';
import { formatTokenAmount } from '@/lib/game-engine';
import type { CropDefinition, FarmDecoration } from '@/lib/game-types';
import { CropPreview } from '../model/crop-preview';
import { PanelShell } from './panel-shell';
import { DecorationCatalog, PetCatalog } from './shop-items';

type ShopCategory = 'seeds' | 'pets' | 'decorations';

interface ShopPanelProps {
  selectedCrop: CropDefinition;
  level: number;
  balance: bigint;
  ownedDecorations: readonly FarmDecoration[];
  equippedDecoration: FarmDecoration;
  onSelectCrop: (crop: CropDefinition) => void;
  onBuyDogFood: (itemId: string, durationHours: number, priceToken: bigint) => void;
  onDecorationAction: (decoration: FarmDecoration, priceToken: bigint) => void;
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
  ownedDecorations,
  equippedDecoration,
  onSelectCrop,
  onBuyDogFood,
  onDecorationAction,
  onClose,
  onBuyTokens,
}: ShopPanelProps) {
  const [category, setCategory] = useState<ShopCategory>('seeds');
  return (
    <PanelShell
      wide
      eyebrow="FARM MARKET"
      title="Token 农场商店"
      description="花种、萌犬用品和场景装扮统一使用 Token 结算。"
      onClose={onClose}
      actions={
        <button className="secondary-command" type="button" onClick={onBuyTokens}>
          <Coins size={17} />
          购买 Token
        </button>
      }
    >
      <div className="shop-category-bar">
        <div className="segmented-control" aria-label="商店分类">
          <button
            className={category === 'seeds' ? 'active' : ''}
            type="button"
            onClick={() => setCategory('seeds')}
          >
            <Sprout size={15} /> 花种
          </button>
          <button
            className={category === 'pets' ? 'active' : ''}
            type="button"
            onClick={() => setCategory('pets')}
          >
            <Dog size={15} /> 萌犬用品
          </button>
          <button
            className={category === 'decorations' ? 'active' : ''}
            type="button"
            onClick={() => setCategory('decorations')}
          >
            <Palette size={15} /> 农场装扮
          </button>
        </div>
        <span>
          钱包余额 <strong>{formatTokenAmount(balance)} Token</strong>
        </span>
      </div>
      {category === 'seeds' && (
        <SeedCatalog
          selectedCrop={selectedCrop}
          level={level}
          balance={balance}
          onSelectCrop={onSelectCrop}
        />
      )}
      {category === 'pets' && <PetCatalog balance={balance} onBuyDogFood={onBuyDogFood} />}
      {category === 'decorations' && (
        <DecorationCatalog
          balance={balance}
          owned={ownedDecorations}
          equipped={equippedDecoration}
          onDecorationAction={onDecorationAction}
        />
      )}
    </PanelShell>
  );
}

function SeedCatalog({
  selectedCrop,
  level,
  balance,
  onSelectCrop,
}: Pick<ShopPanelProps, 'selectedCrop' | 'level' | 'balance' | 'onSelectCrop'>) {
  return (
    <>
      <div className="shop-summary">
        <span>
          <Sprout size={17} /> 当前花种 <strong>{selectedCrop.name}</strong>
        </span>
        <span className={balance < selectedCrop.cost * 12n ? 'reserve-warning' : 'reserve-ok'}>
          <Info size={15} /> 两轮储备建议 {formatTokenAmount(selectedCrop.cost * 12n)}
        </span>
      </div>
      <div className="crop-grid">
        {CROPS.map((crop) => (
          <SeedCard
            crop={crop}
            level={level}
            selected={crop.id === selectedCrop.id}
            onSelectCrop={onSelectCrop}
            key={crop.id}
          />
        ))}
      </div>
    </>
  );
}

function SeedCard({
  crop,
  level,
  selected,
  onSelectCrop,
}: {
  crop: CropDefinition;
  level: number;
  selected: boolean;
  onSelectCrop: (crop: CropDefinition) => void;
}) {
  const locked = crop.level > level;
  return (
    <button
      className={selected ? 'crop-card selected' : 'crop-card'}
      type="button"
      disabled={locked}
      onClick={() => onSelectCrop(crop)}
    >
      <CropPreview crop={crop} model={getModel(crop.modelId)} />
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
        <ShoppingCart size={14} /> {formatTokenAmount(crop.cost)}
      </span>
      {selected && (
        <span className="selected-check">
          <Check size={13} />
        </span>
      )}
      {locked && <span className="crop-locked">LV.{crop.level} 解锁</span>}
    </button>
  );
}
