'use client';

import { useEffect, useRef } from 'react';
import type { ModelDefinition } from '@/lib/game-types';
import { drawModelPlantSprite, loadModelPlantSprites } from '../farm/model-bloom';
import { getModelPlantVisual } from './model-plant-visual';

export function CropPreview({ model }: { model: ModelDefinition }) {
  const visual = getModelPlantVisual(model);
  return (
    <span
      className="crop-art"
      style={
        {
          '--flower-center-color': visual.centerColor,
          '--flower-leaf-color': visual.leafColor,
          '--flower-leaf-edge-color': visual.leafEdgeColor,
          '--flower-petal-color': visual.petalColor,
          '--flower-stem-color': visual.stemColor,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      <FlowerPlant brand={model.brand} />
    </span>
  );
}

function FlowerPlant({ brand }: Pick<ModelDefinition, 'brand'>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let active = true;
    void loadModelPlantSprites()
      .then(() => {
        const context = canvasRef.current?.getContext('2d');
        if (!active || !context) return;
        context.clearRect(0, 0, 96, 96);
        context.imageSmoothingEnabled = false;
        drawModelPlantSprite(context, { x: 48, baseY: 96, height: 92, brand });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [brand]);
  return (
    <canvas
      aria-hidden="true"
      className="crop-preview-plant-image"
      height="96"
      ref={canvasRef}
      width="96"
    />
  );
}
