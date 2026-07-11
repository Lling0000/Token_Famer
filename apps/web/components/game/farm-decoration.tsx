import type { FarmDecoration as FarmDecorationType } from '@/lib/game-types';

export function FarmDecoration({ decoration }: { decoration: FarmDecorationType }) {
  if (decoration === 'none') return null;
  return (
    <div className={`farm-decoration ${decoration}`} aria-label="已装备农场装扮">
      {Array.from({ length: decoration === 'lantern-line' ? 10 : 6 }, (_, index) => (
        <i key={index} />
      ))}
    </div>
  );
}
