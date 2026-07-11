import type { FarmDecoration as FarmDecorationType } from '@/lib/game-types';
import { FarmAmbience } from '../farm/farm-ambience';

interface FarmDecorationProps {
  decoration: FarmDecorationType;
  onDogBark: () => void;
}

export function FarmDecoration({ decoration, onDogBark }: FarmDecorationProps) {
  return (
    <>
      <FarmAmbience onDogBark={onDogBark} />
      {decoration !== 'none' && (
        <div className={`farm-decoration ${decoration}`} aria-label="已装备农场装扮">
          {Array.from({ length: decoration === 'lantern-line' ? 10 : 6 }, (_, index) => (
            <i key={index} />
          ))}
        </div>
      )}
    </>
  );
}
