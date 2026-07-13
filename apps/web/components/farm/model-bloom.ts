import type { ModelBrand } from '@/lib/game-types';

interface BloomGeometry {
  x: number;
  y: number;
  size: number;
  brand: ModelBrand;
  petalColor: string;
  centerColor: string;
}

export function drawModelBloom(context: CanvasRenderingContext2D, bloom: BloomGeometry): void {
  const pixel = Math.max(1, Math.round(bloom.size / 5));
  drawFlowerHead(context, bloom, pixel);
  context.fillStyle = '#fffdf0';
  if (bloom.brand === 'openai') drawOpenAiMark(context, bloom, pixel);
  else if (bloom.brand === 'anthropic') drawAnthropicMark(context, bloom, pixel);
  else if (bloom.brand === 'deepseek') drawDeepSeekMark(context, bloom, pixel);
  else if (bloom.brand === 'google') drawGeminiMark(context, bloom, pixel);
  else drawZhipuMark(context, bloom, pixel);
}

function drawFlowerHead(
  context: CanvasRenderingContext2D,
  bloom: BloomGeometry,
  pixel: number,
): void {
  const radius = pixel * 4;
  context.fillStyle = bloom.centerColor;
  context.fillRect(
    bloom.x - radius - pixel,
    bloom.y - radius - pixel,
    radius * 2 + pixel * 2,
    radius * 2 + pixel * 2,
  );
  context.fillStyle = bloom.petalColor;
  context.fillRect(bloom.x - radius, bloom.y - radius, radius * 2, radius * 2);
}

function drawOpenAiMark(
  context: CanvasRenderingContext2D,
  bloom: BloomGeometry,
  pixel: number,
): void {
  const offsets = [
    [-2, -2],
    [0, -3],
    [2, -2],
    [2, 1],
    [0, 2],
    [-2, 1],
  ];
  for (const [x, y] of offsets)
    context.fillRect(bloom.x + x * pixel, bloom.y + y * pixel, pixel * 2, pixel * 2);
  context.clearRect(bloom.x - pixel / 2, bloom.y - pixel / 2, pixel, pixel);
}

function drawAnthropicMark(
  context: CanvasRenderingContext2D,
  bloom: BloomGeometry,
  pixel: number,
): void {
  for (let row = 0; row < 5; row += 1) {
    context.fillRect(bloom.x - (row + 1) * pixel, bloom.y + (row - 3) * pixel, pixel, pixel);
    context.fillRect(bloom.x + row * pixel, bloom.y + (row - 3) * pixel, pixel, pixel);
  }
  context.fillRect(bloom.x - pixel * 2, bloom.y, pixel * 4, pixel);
}

function drawDeepSeekMark(
  context: CanvasRenderingContext2D,
  bloom: BloomGeometry,
  pixel: number,
): void {
  context.fillRect(bloom.x - pixel * 3, bloom.y - pixel, pixel * 5, pixel * 3);
  context.fillRect(bloom.x + pixel, bloom.y - pixel * 2, pixel * 2, pixel * 3);
  context.clearRect(bloom.x - pixel * 2, bloom.y, pixel * 3, pixel);
  context.fillRect(bloom.x - pixel * 4, bloom.y - pixel * 2, pixel * 2, pixel);
}

function drawGeminiMark(
  context: CanvasRenderingContext2D,
  bloom: BloomGeometry,
  pixel: number,
): void {
  context.fillRect(bloom.x - pixel, bloom.y - pixel * 4, pixel * 2, pixel * 8);
  context.fillRect(bloom.x - pixel * 4, bloom.y - pixel, pixel * 8, pixel * 2);
  context.fillRect(bloom.x - pixel * 2, bloom.y - pixel * 2, pixel * 4, pixel * 4);
}

function drawZhipuMark(
  context: CanvasRenderingContext2D,
  bloom: BloomGeometry,
  pixel: number,
): void {
  context.fillRect(bloom.x - pixel * 3, bloom.y - pixel * 3, pixel * 6, pixel);
  context.fillRect(bloom.x + pixel * 2, bloom.y - pixel * 2, pixel, pixel * 2);
  context.fillRect(bloom.x - pixel, bloom.y, pixel * 2, pixel);
  context.fillRect(bloom.x - pixel * 3, bloom.y + pixel, pixel, pixel * 2);
  context.fillRect(bloom.x - pixel * 3, bloom.y + pixel * 3, pixel * 6, pixel);
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
