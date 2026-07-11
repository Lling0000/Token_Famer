import type { CropDefinition, ModelDefinition } from '@/lib/game-types';
import { ModelMark } from './model-mark';

export function CropPreview({ crop, model }: { crop: CropDefinition; model: ModelDefinition }) {
  return (
    <span
      className="crop-art"
      style={
        {
          '--crop-color': crop.color,
          '--crop-accent': crop.accent,
          '--model-color': model.color,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      {[0, 1, 2].map((index) => (
        <i className="crop-preview-plant" key={index}>
          <span className="crop-preview-leaf left" />
          <span className="crop-preview-leaf right" />
          <span className="crop-preview-flower">
            <ModelMark brand={model.brand} color={model.color} />
          </span>
        </i>
      ))}
    </span>
  );
}
