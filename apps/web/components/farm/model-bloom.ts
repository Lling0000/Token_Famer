import type { ModelBrand } from '@/lib/game-types';

const SPRITE_SHEET_PATH = '/assets/model-flower-sprites.png';
const BRAND_COLUMN: Record<ModelBrand, number> = {
  openai: 0,
  anthropic: 1,
  google: 2,
  grok: 3,
};

let spriteSheet: HTMLImageElement | null = null;
let spriteSheetPromise: Promise<HTMLImageElement> | null = null;

interface PlantSpriteGeometry {
  x: number;
  baseY: number;
  height: number;
  brand: ModelBrand;
}

export function loadModelPlantSprites(): Promise<HTMLImageElement> {
  if (spriteSheet?.complete && spriteSheet.naturalWidth > 0) return Promise.resolve(spriteSheet);
  if (spriteSheetPromise) return spriteSheetPromise;
  spriteSheetPromise = new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => {
      spriteSheet = image;
      resolve(image);
    });
    image.addEventListener('error', () => {
      spriteSheetPromise = null;
      reject(new Error('Unable to load model flower sprites'));
    });
    image.src = SPRITE_SHEET_PATH;
  });
  return spriteSheetPromise;
}

export function drawModelPlantSprite(
  context: CanvasRenderingContext2D,
  plant: PlantSpriteGeometry,
): boolean {
  const image = spriteSheet;
  if (!image?.complete || image.naturalWidth === 0) {
    void loadModelPlantSprites().catch(() => undefined);
    return false;
  }
  const sourceWidth = image.naturalWidth / 4;
  const sourceY = image.naturalHeight * 0.02;
  const sourceHeight = image.naturalHeight * 0.84;
  const width = plant.height * (sourceWidth / sourceHeight);
  context.drawImage(
    image,
    BRAND_COLUMN[plant.brand] * sourceWidth,
    sourceY,
    sourceWidth,
    sourceHeight,
    plant.x - width / 2,
    plant.baseY - plant.height,
    width,
    plant.height,
  );
  return true;
}

export function drawLock(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
): void {
  context.fillStyle = '#d5cbb1';
  context.fillRect(x - 8 * scale, y - scale, 16 * scale, 14 * scale);
  context.strokeStyle = '#d5cbb1';
  context.lineWidth = 3 * scale;
  context.strokeRect(x - 5 * scale, y - 10 * scale, 10 * scale, 10 * scale);
}
