import type { FarmTool } from '@/lib/game-types';

export const TOOL_PATHS: Record<FarmTool, string[]> = {
  inspect: ['M4 2h3v3h3v3h3v3h3v3h-6v6H7v-9H4z'],
  seed: ['M6 3h12v3h-2v2h3v13H5V8h3V6H6z', 'M9 11h2v2H9zM14 15h2v2h-2zM9 17h2v2H9z'],
  water: [
    'M6 9h10v11H6zM8 6h6v3H8z',
    'M16 11h3V8h3v2h-1v4h-5zM2 10h4v2H4v4h2v2H2z',
    'M20 16h2v2h-2zM22 20h2v2h-2z',
  ],
  weed: ['M11 6h3v16h-3z', 'M3 3h16v3H3zM3 6h4v3H3z'],
  bug: [
    'M7 10h10v12H7zM9 7h6v3H9z',
    'M8 3h10v3h-5v1H9V6H8z',
    'M19 4h2v2h-2zM22 2h2v2h-2zM22 7h2v2h-2z',
  ],
  harvest: ['M3 16h3v6H3zM6 13h3v6H6z', 'M8 3h10v3h3v7h-3v3H9v-3h6v-3h3V6H8z'],
};

export function FarmToolIcon({ tool, size = 24 }: { tool: FarmTool; size?: number }) {
  return (
    <svg
      className="farm-tool-icon"
      data-tool-icon={tool}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      {TOOL_PATHS[tool].map((path, index) => (
        <path key={path} d={path} opacity={index === 1 && tool === 'seed' ? 0.4 : 1} />
      ))}
    </svg>
  );
}
