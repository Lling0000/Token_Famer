'use client';

import { Check, ShoppingBasket } from 'lucide-react';
import { CROPS, getModel } from '@/lib/game-data';
import { formatTokenAmount } from '@/lib/game-engine';
import type { CropDefinition } from '@/lib/game-types';
import { ModelMark } from '../model/model-mark';

interface SeedTrayProps {
  level: number;
  selectedCrop: CropDefinition;
  onSelectCrop: (crop: CropDefinition) => void;
  onOpenShop: () => void;
}

export function SeedTray({ level, selectedCrop, onSelectCrop, onOpenShop }: SeedTrayProps) {
  const model = getModel(selectedCrop.modelId);
  const availableCrops = CROPS.filter((crop) => crop.level <= level);
  return (
    <div className="seed-tray" role="dialog" aria-label="选择要播种的花种">
      <header>
        <ModelMark brand={model.brand} color={model.color} />
        <span>
          <small>当前花种模型</small>
          <strong>{model.shortLabel}</strong>
        </span>
        <button type="button" onClick={onOpenShop}>
          <ShoppingBasket size={14} />
          全部花种
        </button>
      </header>
      <div className="seed-options">
        {availableCrops.map((crop) => (
          <button
            className={crop.id === selectedCrop.id ? 'selected' : ''}
            type="button"
            key={crop.id}
            onClick={() => onSelectCrop(crop)}
            aria-pressed={crop.id === selectedCrop.id}
          >
            <ModelMark brand={getModel(crop.modelId).brand} color={getModel(crop.modelId).color} />
            <span>
              <strong>{crop.name}</strong>
              <small>{crop.cost === 0n ? '免费' : `${formatTokenAmount(crop.cost)} Token`}</small>
            </span>
            {crop.id === selectedCrop.id && <Check size={13} />}
          </button>
        ))}
      </div>
    </div>
  );
}
