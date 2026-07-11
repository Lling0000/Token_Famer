import type { ModelBrand } from '@/lib/game-types';

const BRAND_LABELS: Record<ModelBrand, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  deepseek: 'DeepSeek',
  google: 'Google',
  zhipu: '智谱',
};

export function ModelMark({ brand, color }: { brand: ModelBrand; color: string }) {
  return (
    <span
      className={`model-mark model-mark-${brand}`}
      style={{ '--model-color': color } as React.CSSProperties}
      aria-label={BRAND_LABELS[brand]}
      role="img"
    >
      <i aria-hidden="true" />
    </span>
  );
}

export function modelBrandLabel(brand: ModelBrand): string {
  return BRAND_LABELS[brand];
}
