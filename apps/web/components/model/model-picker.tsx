'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { MODELS } from '@/lib/game-data';
import type { ModelBrand, ModelId } from '@/lib/game-types';
import { ModelMark, modelBrandLabel } from './model-mark';

interface ModelPickerProps {
  modelId: ModelId;
  balanceLabel: string;
  onModelChange: (modelId: ModelId) => void;
}

const BRAND_ORDER: ModelBrand[] = ['openai', 'anthropic', 'google', 'deepseek', 'zhipu'];

export function ModelPicker({ modelId, balanceLabel, onModelChange }: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = MODELS.find((model) => model.id === modelId) ?? MODELS[0];
  useClosePicker(open, rootRef, () => setOpen(false));

  return (
    <div className="model-picker" ref={rootRef}>
      <button
        className="model-picker-trigger"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <ModelMark brand={selected.brand} color={selected.color} />
        <span>
          <small>调用 / 种植模型</small>
          <strong>{selected.shortLabel}</strong>
        </span>
        <ChevronDown size={15} aria-hidden="true" />
        <b>{balanceLabel}</b>
      </button>
      {open && (
        <div className="model-picker-menu" role="listbox" aria-label="选择模型">
          {BRAND_ORDER.map((brand) => {
            return (
              <ModelGroup
                brand={brand}
                modelId={modelId}
                key={brand}
                onSelect={(nextModelId) => {
                  onModelChange(nextModelId);
                  setOpen(false);
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ModelGroup({
  brand,
  modelId,
  onSelect,
}: {
  brand: ModelBrand;
  modelId: ModelId;
  onSelect: (modelId: ModelId) => void;
}) {
  return (
    <section className="model-picker-group">
      <span>{modelBrandLabel(brand)}</span>
      {MODELS.filter((model) => model.brand === brand).map((model) => (
        <button
          type="button"
          role="option"
          aria-selected={model.id === modelId}
          key={model.id}
          onClick={() => onSelect(model.id)}
        >
          <ModelMark brand={model.brand} color={model.color} />
          <span>{model.label}</span>
          {model.id === modelId && <Check size={14} />}
        </button>
      ))}
    </section>
  );
}

function useClosePicker(
  open: boolean,
  rootRef: React.RefObject<HTMLDivElement | null>,
  close: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [close, open, rootRef]);
}
