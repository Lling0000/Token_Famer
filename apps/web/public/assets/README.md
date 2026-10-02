# Token Farmer visual assets

The desktop client currently consumes:

- `token-farm-background.webp`: pixel farm atmosphere used behind authentication and the playable canvas.
- `model-flowers-v2.png`: transparent four-brand, three-stage flower atlas used for growing farm plants and shop previews. Source rectangles and root anchors are in `apps/web/lib/model-flower-atlas.json`.

The canvas draws crops, water, issues, selection edges, locks, and action feedback over the background. Land hit tests use the same projection as drawing. Small fallback stems and leaves remain available while the sprite sheet loads.
