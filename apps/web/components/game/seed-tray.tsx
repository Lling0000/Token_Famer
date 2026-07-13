'use client';

import { Check, ChevronLeft, ChevronRight, ShoppingBasket } from 'lucide-react';
import { useState } from 'react';
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

interface SeedTrayHeaderProps {
  selectedCrop: CropDefinition;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  onOpenShop: () => void;
}

export function SeedTray({ level, selectedCrop, onSelectCrop, onOpenShop }: SeedTrayProps) {
  const availableCrops = CROPS.filter((crop) => crop.level <= level);
  const pageSize = 8;
  const pageCount = Math.ceil(availableCrops.length / pageSize);
  const initialPage = Math.floor(
    Math.max(
      0,
      availableCrops.findIndex((crop) => crop.id === selectedCrop.id),
    ) / pageSize,
  );
  const [page, setPage] = useState(initialPage);
  const visibleCrops = availableCrops.slice(page * pageSize, (page + 1) * pageSize);
  return (
    <div className="seed-tray" role="dialog" aria-label="选择要播种的花种">
      <SeedTrayHeader
        selectedCrop={selectedCrop}
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
        onOpenShop={onOpenShop}
      />
      <div className="seed-options">
        {visibleCrops.map((crop) => (
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

function SeedTrayHeader({
  selectedCrop,
  page,
  pageCount,
  onPageChange,
  onOpenShop,
}: SeedTrayHeaderProps) {
  const model = getModel(selectedCrop.modelId);
  return (
    <header>
      <ModelMark brand={model.brand} color={model.color} />
      <span>
        <small>当前花种</small>
        <strong>{selectedCrop.name}</strong>
      </span>
      <div className="seed-page-controls">
        <button
          type="button"
          aria-label="上一页花种"
          title="上一页"
          disabled={page === 0}
          onClick={() => onPageChange(Math.max(0, page - 1))}
        >
          <ChevronLeft size={15} />
        </button>
        <b>
          {page + 1} / {pageCount}
        </b>
        <button
          type="button"
          aria-label="下一页花种"
          title="下一页"
          disabled={page === pageCount - 1}
          onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
        >
          <ChevronRight size={15} />
        </button>
      </div>
      <button type="button" onClick={onOpenShop}>
        <ShoppingBasket size={14} />
        全部花种
      </button>
    </header>
  );
}
