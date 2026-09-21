import type { ModelBrand, ModelDefinition } from '@/lib/game-types';

export interface ModelPlantVisual {
  centerColor: string;
  leafColor: string;
  leafEdgeColor: string;
  petalColor: string;
  stemColor: string;
}

const BRAND_PLANT_VISUALS = {
  openai: {
    centerColor: '#fff4dc',
    leafColor: '#62a94d',
    leafEdgeColor: '#34723d',
    petalColor: '#0d6d73',
    stemColor: '#429647',
  },
  anthropic: {
    centerColor: '#fff1dc',
    leafColor: '#62a94d',
    leafEdgeColor: '#34723d',
    petalColor: '#b75d43',
    stemColor: '#429647',
  },
  google: {
    centerColor: '#75b2ff',
    leafColor: '#62a94d',
    leafEdgeColor: '#34723d',
    petalColor: '#2867c7',
    stemColor: '#429647',
  },
  grok: {
    centerColor: '#fff4dc',
    leafColor: '#62a94d',
    leafEdgeColor: '#34723d',
    petalColor: '#202323',
    stemColor: '#429647',
  },
} as const satisfies Record<ModelBrand, ModelPlantVisual>;

export function getModelPlantVisual(model: Pick<ModelDefinition, 'brand'>): ModelPlantVisual {
  return BRAND_PLANT_VISUALS[model.brand];
}
