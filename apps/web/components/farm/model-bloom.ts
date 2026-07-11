interface BloomGeometry {
  x: number;
  y: number;
  size: number;
  shape: 'star' | 'round' | 'lotus' | 'crystal' | 'double';
  petalColor: string;
  centerColor: string;
}

export function drawModelBloom(context: CanvasRenderingContext2D, bloom: BloomGeometry): void {
  const unit = bloom.size / 3;
  context.fillStyle = bloom.petalColor;
  if (bloom.shape === 'star') drawStar(context, bloom, unit);
  else if (bloom.shape === 'lotus') drawLotus(context, bloom, unit);
  else if (bloom.shape === 'crystal') drawCrystal(context, bloom, unit);
  else drawRound(context, bloom);
  context.fillStyle = bloom.centerColor;
  const centerSize = bloom.shape === 'double' ? unit * 1.5 : unit;
  context.fillRect(bloom.x - centerSize / 2, bloom.y - centerSize / 2, centerSize, centerSize);
}

function drawStar(context: CanvasRenderingContext2D, bloom: BloomGeometry, unit: number): void {
  context.fillRect(bloom.x - unit / 2, bloom.y - bloom.size, unit, bloom.size * 2);
  context.fillRect(bloom.x - bloom.size, bloom.y - unit / 2, bloom.size * 2, unit);
}

function drawLotus(context: CanvasRenderingContext2D, bloom: BloomGeometry, unit: number): void {
  context.fillRect(bloom.x - bloom.size, bloom.y - unit / 2, bloom.size, unit);
  context.fillRect(bloom.x, bloom.y - unit / 2, bloom.size, unit);
  context.fillRect(bloom.x - unit / 2, bloom.y - bloom.size, unit, bloom.size);
}

function drawCrystal(context: CanvasRenderingContext2D, bloom: BloomGeometry, unit: number): void {
  context.fillRect(bloom.x - unit / 2, bloom.y - bloom.size, unit, bloom.size * 2);
  context.fillRect(bloom.x - unit * 1.5, bloom.y - unit, unit, bloom.size);
  context.fillRect(bloom.x + unit / 2, bloom.y - unit, unit, bloom.size);
}

function drawRound(context: CanvasRenderingContext2D, bloom: BloomGeometry): void {
  context.fillRect(bloom.x - bloom.size, bloom.y - bloom.size, bloom.size, bloom.size);
  context.fillRect(bloom.x, bloom.y - bloom.size, bloom.size, bloom.size);
  context.fillRect(bloom.x - bloom.size, bloom.y, bloom.size, bloom.size);
  context.fillRect(bloom.x, bloom.y, bloom.size, bloom.size);
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
